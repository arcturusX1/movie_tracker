import "server-only";
import { requireUser } from "@/lib/auth";
import { findDirectorIds } from "@/lib/movie-utils";
import {
  buildTasteProfile,
  scoreCandidates,
  topDirectors,
  topGenres,
  type Candidate,
  type TasteEntry,
} from "@/lib/recommend";
import { createClient } from "@/lib/supabase/server";
import { discoverByGenres, getDirectedMovies, getGenres, getMovie } from "@/lib/tmdb";

const TOP_GENRES = 3;
const TOP_DIRECTORS = 3;

/** Genre- and director-based suggestions from the signed-in user's watched movies and watchlist. */
export async function getRecommendations() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_movies")
    .select("tmdb_id, status, rating, movies(director, director_ids, movie_genres(genre_id))")
    .eq("user_id", user.id);
  if (error) throw error;
  if (data.length === 0) return [];

  const entries: TasteEntry[] = await Promise.all(
    data.map(async (row) => ({
      status: row.status,
      rating: row.rating,
      genreIds: row.movies?.movie_genres.map((g) => g.genre_id) ?? [],
      directors: await directorsFor(row.tmdb_id, row.movies),
    })),
  );

  const profile = buildTasteProfile(entries);
  const genres = topGenres(profile, TOP_GENRES);

  // A TMDB hiccup in one source shouldn't hide all suggestions.
  const safe = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
  const [byDirector, rated, popular, genreList] = await Promise.all([
    Promise.all(
      topDirectors(profile, TOP_DIRECTORS).map(async (directorId) =>
        (await safe(getDirectedMovies(directorId))).map((m): Candidate => ({ ...m, directorId })),
      ),
    ),
    safe(discoverByGenres(genres, "rated")),
    safe(discoverByGenres(genres, "popular")),
    safe(getGenres()),
  ]);

  return scoreCandidates(profile, [...byDirector.flat(), ...rated, ...popular], {
    exclude: new Set(data.map((row) => row.tmdb_id)),
    genreNames: new Map(genreList.map((g) => [g.id, g.name])),
  });
}

/**
 * Director ids + names for a library movie. Rows cached before director_ids existed
 * have an empty array; fall back to the (cached) TMDB details for those.
 */
async function directorsFor(
  tmdbId: number,
  movie: { director: string | null; director_ids: number[] } | null,
) {
  if (movie && movie.director_ids.length > 0) {
    // `director` is the same crew list joined with ", ", in the same order.
    const names = movie.director?.split(", ") ?? [];
    return movie.director_ids.map((id, i) => ({
      id,
      name: names.length === movie.director_ids.length ? names[i] : (movie.director ?? "this director"),
    }));
  }
  const details = await getMovie(tmdbId).catch(() => null);
  if (!details) return [];
  const ids = findDirectorIds(details.credits.crew);
  return ids.map((id) => ({
    id,
    name: details.credits.crew.find((c) => c.id === id)?.name ?? "this director",
  }));
}
