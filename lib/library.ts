import "server-only";
import { requireUser, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Views } from "@/lib/database.types";
import type { LibraryQuery, LibrarySort } from "@/lib/movie-utils";

export type MovieStatus = Enums<"movie_status">;
export type LibraryItem = Views<"library">;

const SORT_COLUMNS: Record<LibrarySort, keyof LibraryItem> = {
  added: "created_at",
  year: "year",
  director: "director",
  genre: "primary_genre",
  rating: "rating",
  title: "title",
};

export async function getLibrary(status: MovieStatus, { sort, dir, genre }: LibraryQuery) {
  const user = await requireUser();
  const supabase = await createClient();

  // Always scope by user_id: RLS also lets everyone read *public notes*, so
  // without this filter other users' reviewed movies would show up here.
  let query = supabase
    .from("library")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", status)
    .order(SORT_COLUMNS[sort], { ascending: dir === "asc", nullsFirst: false });

  if (sort !== "title") query = query.order("title", { ascending: true });
  if (genre) query = query.contains("genre_ids", [genre]);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Genre ids present in the user's list, for the filter dropdown. */
export async function getLibraryGenreIds(status: MovieStatus) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library")
    .select("genre_ids")
    .eq("user_id", user.id)
    .eq("status", status);
  if (error) throw error;
  return [...new Set(data.flatMap((row) => row.genre_ids ?? []))];
}

/** The signed-in user's entry for a movie, or null (also null when signed out). */
export async function getUserEntry(tmdbId: number) {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_movies")
    .select("status, rating, note, note_visibility, watched_at")
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type UserEntry = NonNullable<Awaited<ReturnType<typeof getUserEntry>>>;

/** The signed-in user's entries for these movies, keyed by tmdb_id (for search results). */
export async function getEntriesFor(tmdbIds: number[]) {
  const user = await getCurrentUser();
  const entries = new Map<number, UserEntry>();
  if (!user || tmdbIds.length === 0) return entries;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_movies")
    .select("tmdb_id, status, rating, note, note_visibility, watched_at")
    .eq("user_id", user.id)
    .in("tmdb_id", tmdbIds);
  if (error) throw error;
  for (const { tmdb_id, ...entry } of data) entries.set(tmdb_id, entry);
  return entries;
}

export async function getPublicReviews(tmdbId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_movies")
    .select("id, rating, note, updated_at, profiles(display_name, avatar_url)")
    .eq("tmdb_id", tmdbId)
    // A reviewed movie moved back to the watchlist keeps its note, hidden until watched again.
    .eq("status", "watched")
    .eq("note_visibility", "public")
    .not("note", "is", null)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}
