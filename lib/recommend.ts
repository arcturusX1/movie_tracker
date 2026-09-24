// Pure recommendation logic: taste profile + candidate scoring. No I/O here.

import { yearOf } from "@/lib/movie-utils";

export type TasteEntry = {
  status: "watched" | "watchlist";
  rating: number | null;
  genreIds: number[];
  directors: { id: number; name: string }[];
};

export type TasteProfile = {
  /** Genre id → weight, normalized so the favourite genre is 1. */
  genres: Map<number, number>;
  /** Director person id → name and weight, normalized so the favourite director is 1. */
  directors: Map<number, { name: string; weight: number }>;
};

export type Candidate = {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  /** Set when the candidate came from a director's filmography. */
  directorId?: number;
};

export type Recommendation = {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  score: number;
  reason: string;
};

const WEIGHTS = { genre: 0.55, director: 0.35, quality: 0.1 };
const MIN_VOTES = 50;

/**
 * How much one library entry shapes the profile. Watched counts double a watchlist
 * entry, scaled by rating: 5★ → 3.33, 3★ → 2, 1★ → 0.67; unrated watched → 2.
 */
export function entryWeight(status: TasteEntry["status"], rating: number | null) {
  if (status === "watchlist") return 1;
  return rating === null ? 2 : 2 * (rating / 3);
}

export function buildTasteProfile(entries: TasteEntry[]): TasteProfile {
  const genres = new Map<number, number>();
  const directors = new Map<number, { name: string; weight: number }>();

  for (const entry of entries) {
    const weight = entryWeight(entry.status, entry.rating);
    for (const id of entry.genreIds) genres.set(id, (genres.get(id) ?? 0) + weight);
    for (const { id, name } of entry.directors) {
      const current = directors.get(id);
      directors.set(id, { name, weight: (current?.weight ?? 0) + weight });
    }
  }

  const maxGenre = Math.max(0, ...genres.values());
  for (const [id, w] of genres) genres.set(id, maxGenre ? w / maxGenre : 0);
  const maxDirector = Math.max(0, ...[...directors.values()].map((d) => d.weight));
  for (const d of directors.values()) d.weight = maxDirector ? d.weight / maxDirector : 0;

  return { genres, directors };
}

/** Highest-weighted ids first. */
export function topGenres(profile: TasteProfile, n: number) {
  return [...profile.genres].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
}

export function topDirectors(profile: TasteProfile, n: number) {
  return [...profile.directors].sort((a, b) => b[1].weight - a[1].weight).slice(0, n).map(([id]) => id);
}

type ScoreOptions = {
  /** Movies already in the user's library. */
  exclude: Set<number>;
  genreNames: Map<number, string>;
  limit?: number;
  perDirector?: number;
};

export function scoreCandidates(
  profile: TasteProfile,
  candidates: Candidate[],
  { exclude, genreNames, limit = 12, perDirector = 3 }: ScoreOptions,
): Recommendation[] {
  // Best-scoring version of each movie (it can come from several sources).
  const best = new Map<number, Recommendation & { directorId?: number }>();

  for (const c of candidates) {
    if (exclude.has(c.id) || !c.poster_path || c.vote_count < MIN_VOTES) continue;

    const genreIds = c.genre_ids ?? [];
    const genreScore = genreIds.length
      ? genreIds.reduce((sum, g) => sum + (profile.genres.get(g) ?? 0), 0) / genreIds.length
      : 0;
    const director = c.directorId !== undefined ? profile.directors.get(c.directorId) : undefined;
    const directorScore = director?.weight ?? 0;
    const score =
      WEIGHTS.genre * genreScore +
      WEIGHTS.director * directorScore +
      WEIGHTS.quality * (c.vote_average / 10);

    const previous = best.get(c.id);
    if (previous && previous.score >= score) continue;
    best.set(c.id, {
      id: c.id,
      title: c.title,
      year: yearOf(c.release_date),
      posterPath: c.poster_path,
      score,
      reason: director ? `Directed by ${director.name}` : genreReason(profile, genreIds, genreNames),
      directorId: director ? c.directorId : undefined,
    });
  }

  // Keep a variety of directors rather than one filmography filling the list.
  const perDirectorCount = new Map<number, number>();
  const results: Recommendation[] = [];
  for (const rec of [...best.values()].sort((a, b) => b.score - a.score)) {
    if (rec.directorId !== undefined) {
      const count = perDirectorCount.get(rec.directorId) ?? 0;
      if (count >= perDirector) continue;
      perDirectorCount.set(rec.directorId, count + 1);
    }
    results.push({
      id: rec.id,
      title: rec.title,
      year: rec.year,
      posterPath: rec.posterPath,
      score: rec.score,
      reason: rec.reason,
    });
    if (results.length === limit) break;
  }
  return results;
}

function genreReason(profile: TasteProfile, genreIds: number[], genreNames: Map<number, string>) {
  const liked = genreIds
    .filter((g) => (profile.genres.get(g) ?? 0) > 0 && genreNames.has(g))
    .sort((a, b) => (profile.genres.get(b) ?? 0) - (profile.genres.get(a) ?? 0))
    .slice(0, 2)
    .map((g) => genreNames.get(g));
  return liked.length ? `Because you like ${liked.join(" & ")}` : "Popular pick";
}
