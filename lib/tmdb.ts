import "server-only";
import { cacheLife, cacheTag } from "next/cache";

const TMDB_API = "https://api.themoviedb.org/3";

export type TmdbMovieSummary = {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
};

export type TmdbGenre = { id: number; name: string };

export type TmdbReview = {
  id: string;
  author: string;
  author_details: { rating: number | null; avatar_path: string | null };
  content: string;
  created_at: string;
  url: string;
};

export type TmdbMovie = TmdbMovieSummary & {
  imdb_id: string | null;
  backdrop_path: string | null;
  runtime: number | null;
  tagline: string | null;
  genres: TmdbGenre[];
  vote_count: number;
  credits: {
    cast: { id: number; name: string; character: string; profile_path: string | null; order: number }[];
    crew: { id: number; name: string; job: string }[];
  };
  external_ids: { imdb_id: string | null };
  reviews: { results: TmdbReview[]; total_results: number };
  videos: { results: { key: string; site: string; type: string; official: boolean; name: string }[] };
};

type Paged<T> = { page: number; results: T[]; total_pages: number; total_results: number };

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(TMDB_API + path);
  url.search = new URLSearchParams({ language: "en-US", ...params }).toString();

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_READ_TOKEN}`,
      Accept: "application/json",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TMDB ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function searchMovies(query: string, page = 1) {
  "use cache";
  cacheLife("hours");
  const empty: Paged<TmdbMovieSummary> = { page: 1, results: [], total_pages: 0, total_results: 0 };
  if (!query.trim()) return empty;
  return (
    (await tmdb<Paged<TmdbMovieSummary>>("/search/movie", {
      query,
      page: String(page),
      include_adult: "false",
    })) ?? empty
  );
}

export async function getMovie(tmdbId: number) {
  "use cache";
  cacheLife("days");
  cacheTag(`tmdb-movie:${tmdbId}`);
  return tmdb<TmdbMovie>(`/movie/${tmdbId}`, {
    append_to_response: "credits,external_ids,reviews,videos",
  });
}

/** Never throws: the home page prerenders this at build time, so TMDB being down shouldn't fail builds. */
export async function getTrending() {
  "use cache";
  try {
    const data = await tmdb<Paged<TmdbMovieSummary>>("/trending/movie/week");
    cacheLife("hours");
    return data?.results ?? [];
  } catch (error) {
    console.error(error);
    cacheLife("minutes");
    return [];
  }
}

export async function getGenres() {
  "use cache";
  cacheLife("weeks");
  const data = await tmdb<{ genres: TmdbGenre[] }>("/genre/movie/list");
  return data?.genres ?? [];
}

export function findTrailer(movie: TmdbMovie) {
  const youtube = movie.videos.results.filter((v) => v.site === "YouTube");
  return (
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    null
  );
}
