import "server-only";
import { cacheLife } from "next/cache";
import { parseOmdbScores, type Scores } from "@/lib/movie-utils";

/**
 * Rotten Tomatoes / Metacritic / IMDb scores via OMDb.
 * Successful lookups are cached for days: the free tier allows 1,000 requests per day.
 */
export async function getScores(imdbId: string | null): Promise<Scores | null> {
  "use cache";

  if (!imdbId || !process.env.OMDB_API_KEY) {
    cacheLife("days");
    return null;
  }

  const url = new URL("https://www.omdbapi.com/");
  url.search = new URLSearchParams({ i: imdbId, apikey: process.env.OMDB_API_KEY }).toString();

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OMDb ${res.status}`);
    const scores = parseOmdbScores(await res.json());
    cacheLife("days");
    return scores;
  } catch {
    // Transient failure or rate limit: retry soon rather than caching the miss for days.
    cacheLife("minutes");
    return null;
  }
}
