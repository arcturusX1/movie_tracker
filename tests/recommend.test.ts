import { describe, expect, it } from "vitest";
import {
  buildTasteProfile,
  entryWeight,
  scoreCandidates,
  topDirectors,
  topGenres,
  type Candidate,
  type TasteEntry,
} from "@/lib/recommend";

const SCIFI = 878;
const DRAMA = 18;
const COMEDY = 35;
const NOLAN = { id: 525, name: "Christopher Nolan" };
const GERWIG = { id: 45400, name: "Greta Gerwig" };
const genreNames = new Map([
  [SCIFI, "Science Fiction"],
  [DRAMA, "Drama"],
  [COMEDY, "Comedy"],
]);

const entry = (overrides: Partial<TasteEntry>): TasteEntry => ({
  status: "watched",
  rating: null,
  genreIds: [],
  directors: [],
  ...overrides,
});

const candidate = (overrides: Partial<Candidate>): Candidate => ({
  id: 1,
  title: "Movie",
  release_date: "2020-01-01",
  poster_path: "/p.jpg",
  vote_average: 7,
  vote_count: 1000,
  genre_ids: [],
  ...overrides,
});

describe("entryWeight", () => {
  it("weights watched above watchlist and scales by rating", () => {
    expect(entryWeight("watchlist", null)).toBe(1);
    expect(entryWeight("watched", null)).toBe(2);
    expect(entryWeight("watched", 3)).toBe(2);
    expect(entryWeight("watched", 5)).toBeCloseTo(3.33, 2);
    expect(entryWeight("watched", 1)).toBeCloseTo(0.67, 2);
  });
});

describe("buildTasteProfile", () => {
  it("lets a 5★ watched movie outweigh a watchlist movie of another genre", () => {
    const profile = buildTasteProfile([
      entry({ rating: 5, genreIds: [SCIFI], directors: [NOLAN] }),
      entry({ status: "watchlist", genreIds: [DRAMA], directors: [GERWIG] }),
    ]);
    expect(profile.genres.get(SCIFI)).toBe(1);
    expect(profile.genres.get(DRAMA)).toBeCloseTo(0.3, 2);
    expect(topGenres(profile, 1)).toEqual([SCIFI]);
    expect(topDirectors(profile, 2)).toEqual([NOLAN.id, GERWIG.id]);
  });

  it("makes a 1★ watched movie count less than an unrated watchlist one", () => {
    const profile = buildTasteProfile([
      entry({ rating: 1, genreIds: [COMEDY] }),
      entry({ status: "watchlist", genreIds: [DRAMA] }),
    ]);
    expect(profile.genres.get(DRAMA)).toBe(1);
    expect(profile.genres.get(COMEDY)!).toBeLessThan(1);
  });

  it("returns an empty profile for an empty library", () => {
    const profile = buildTasteProfile([]);
    expect(profile.genres.size).toBe(0);
    expect(topGenres(profile, 3)).toEqual([]);
  });
});

describe("scoreCandidates", () => {
  const profile = buildTasteProfile([
    entry({ rating: 5, genreIds: [SCIFI], directors: [NOLAN] }),
    entry({ status: "watchlist", genreIds: [DRAMA] }),
  ]);

  it("ranks director + genre matches first and explains why", () => {
    const recs = scoreCandidates(
      profile,
      [
        candidate({ id: 2, title: "Drama pick", genre_ids: [DRAMA], vote_average: 9 }),
        candidate({ id: 3, title: "Nolan sci-fi", genre_ids: [SCIFI], directorId: NOLAN.id }),
        candidate({ id: 4, title: "Other sci-fi", genre_ids: [SCIFI] }),
      ],
      { exclude: new Set(), genreNames },
    );
    expect(recs.map((r) => r.title)).toEqual(["Nolan sci-fi", "Other sci-fi", "Drama pick"]);
    expect(recs[0].reason).toBe("Directed by Christopher Nolan");
    expect(recs[1].reason).toBe("Because you like Science Fiction");
  });

  it("excludes library movies, posterless and obscure titles", () => {
    const recs = scoreCandidates(
      profile,
      [
        candidate({ id: 10, genre_ids: [SCIFI] }),
        candidate({ id: 11, genre_ids: [SCIFI], poster_path: null }),
        candidate({ id: 12, genre_ids: [SCIFI], vote_count: 3 }),
        candidate({ id: 13, genre_ids: [SCIFI] }),
      ],
      { exclude: new Set([10]), genreNames },
    );
    expect(recs.map((r) => r.id)).toEqual([13]);
  });

  it("keeps the better-scoring copy when a movie comes from several sources", () => {
    const recs = scoreCandidates(
      profile,
      [
        candidate({ id: 20, genre_ids: [SCIFI] }),
        candidate({ id: 20, genre_ids: [SCIFI], directorId: NOLAN.id }),
      ],
      { exclude: new Set(), genreNames },
    );
    expect(recs).toHaveLength(1);
    expect(recs[0].reason).toBe("Directed by Christopher Nolan");
  });

  it("caps suggestions per director and respects the limit", () => {
    const nolanFilms = Array.from({ length: 6 }, (_, i) =>
      candidate({ id: 100 + i, genre_ids: [SCIFI], directorId: NOLAN.id }),
    );
    const others = Array.from({ length: 6 }, (_, i) => candidate({ id: 200 + i, genre_ids: [DRAMA] }));
    const recs = scoreCandidates(profile, [...nolanFilms, ...others], {
      exclude: new Set(),
      genreNames,
      limit: 5,
      perDirector: 2,
    });
    expect(recs).toHaveLength(5);
    expect(recs.filter((r) => r.reason.startsWith("Directed by"))).toHaveLength(2);
  });
});
