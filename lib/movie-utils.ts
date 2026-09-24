// Pure helpers shared by server and client code. No I/O here.

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type PosterSize = "w92" | "w185" | "w342" | "w500" | "w780" | "original";

export function posterUrl(path: string | null | undefined, size: PosterSize = "w342") {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function yearOf(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

export function findDirector(crew: { job: string; name: string }[] | undefined) {
  const directors = (crew ?? []).filter((c) => c.job === "Director").map((c) => c.name);
  return directors.length ? directors.join(", ") : null;
}

/** TMDB person ids of the director(s), for looking up their other films. */
export function findDirectorIds(crew: { job: string; id: number }[] | undefined) {
  return [...new Set((crew ?? []).filter((c) => c.job === "Director").map((c) => c.id))];
}

export type Scores = {
  rottenTomatoes: string | null;
  metacritic: string | null;
  imdb: string | null;
};

type OmdbRating = { Source: string; Value: string };

/** Extracts RT / Metacritic / IMDb scores from an OMDb response. */
export function parseOmdbScores(data: {
  Response?: string;
  Ratings?: OmdbRating[];
  Metascore?: string;
  imdbRating?: string;
}): Scores | null {
  if (data.Response !== "True") return null;
  const bySource = (source: string) =>
    data.Ratings?.find((r) => r.Source === source)?.Value ?? null;
  const na = (v: string | undefined) => (v && v !== "N/A" ? v : null);

  const metacritic =
    bySource("Metacritic")?.split("/")[0] ?? na(data.Metascore);

  return {
    rottenTomatoes: bySource("Rotten Tomatoes"),
    metacritic: metacritic ?? null,
    imdb: na(data.imdbRating),
  };
}

export const LIBRARY_SORTS = ["added", "year", "director", "genre", "rating", "title"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];
export type SortDir = "asc" | "desc";

export type LibraryQuery = {
  sort: LibrarySort;
  dir: SortDir;
  genre: number | null;
};

/** Normalizes untrusted URL search params into a library query. */
export function parseLibraryQuery(params: Record<string, string | string[] | undefined>): LibraryQuery {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const sortParam = first(params.sort);
  const sort = (LIBRARY_SORTS as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as LibrarySort)
    : "added";
  const dirParam = first(params.dir);
  const dir: SortDir =
    dirParam === "asc" || dirParam === "desc" ? dirParam : defaultDir(sort);
  const genre = Number.parseInt(first(params.genre) ?? "", 10);
  return { sort, dir, genre: Number.isInteger(genre) && genre > 0 ? genre : null };
}

/** Newest/highest first for numeric sorts, A→Z for text sorts. */
export function defaultDir(sort: LibrarySort): SortDir {
  return sort === "director" || sort === "genre" || sort === "title" ? "asc" : "desc";
}
