"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";
import { findDirector, findDirectorIds, yearOf } from "@/lib/movie-utils";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getMovie } from "@/lib/tmdb";

export type ActionResult = { ok: true } | { ok: false; error: string };

const tmdbIdSchema = z.number().int().positive();
const statusSchema = z.enum(["watched", "watchlist"]);
const ratingSchema = z
  .number()
  .min(0.5)
  .max(5)
  .refine((r) => Number.isInteger(r * 2), "Ratings go in half-star steps")
  .nullable();
const noteSchema = z.object({
  note: z.string().trim().max(500),
  visibility: z.enum(["private", "public"]),
});
const reviewSchema = noteSchema.extend({ rating: ratingSchema });

function revalidate(tmdbId: number) {
  revalidatePath("/library", "layout");
  revalidatePath(`/movie/${tmdbId}`);
}

function fail(error: unknown): ActionResult {
  // Let redirect() from requireUser() propagate instead of reporting it as an error.
  unstable_rethrow(error);
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input" };
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Copies TMDB data into the shared movies cache (bypasses RLS; data comes from TMDB, not the client). */
async function cacheMovie(tmdbId: number) {
  const movie = await getMovie(tmdbId);
  if (!movie) throw new Error(`TMDB movie ${tmdbId} not found`);

  const admin = createAdminClient();
  const { error: movieError } = await admin.from("movies").upsert({
    tmdb_id: movie.id,
    imdb_id: movie.imdb_id ?? movie.external_ids.imdb_id,
    title: movie.title,
    year: yearOf(movie.release_date),
    release_date: movie.release_date || null,
    poster_path: movie.poster_path,
    overview: movie.overview,
    runtime: movie.runtime,
    director: findDirector(movie.credits.crew),
    director_ids: findDirectorIds(movie.credits.crew),
    updated_at: new Date().toISOString(),
  });
  if (movieError) throw movieError;

  if (movie.genres.length) {
    const { error: genreError } = await admin.from("genres").upsert(movie.genres);
    if (genreError) throw genreError;
    const { error: linkError } = await admin.from("movie_genres").upsert(
      movie.genres.map((g, position) => ({ tmdb_id: movie.id, genre_id: g.id, position })),
    );
    if (linkError) throw linkError;
  }
}

/** Ratings and reviews are only allowed on watched movies, not watchlist entries. */
async function updateWatchedEntry(
  userId: string,
  tmdbId: number,
  changes: TablesUpdate<"user_movies">,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_movies")
    .update(changes)
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .eq("status", "watched")
    .select("tmdb_id");
  if (error) throw error;
  if (data.length === 0) return { ok: false, error: "Mark this movie as watched first." };
  return { ok: true };
}

/** Creates or updates the user's entry. Columns not in `fields` keep their stored values. */
async function upsertEntry(
  userId: string,
  tmdbId: number,
  fields: Omit<TablesInsert<"user_movies">, "user_id" | "tmdb_id">,
) {
  await cacheMovie(tmdbId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_movies")
    .upsert({ user_id: userId, tmdb_id: tmdbId, ...fields }, { onConflict: "user_id,tmdb_id" });
  if (error) throw error;
  revalidate(tmdbId);
}

/** Adds a movie to the library, or moves it between watched and watchlist. */
export async function setStatus(tmdbId: number, status: "watched" | "watchlist"): Promise<ActionResult> {
  try {
    const user = await requireUser();
    tmdbIdSchema.parse(tmdbId);
    statusSchema.parse(status);
    await upsertEntry(user.id, tmdbId, {
      status,
      watched_at: status === "watched" ? new Date().toISOString() : null,
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export type WatchedReview = { rating: number | null; note: string; visibility: "private" | "public" };

/**
 * Marks a movie watched, saving the rating and review from the "Mark as watched" dialog.
 * Pass null to skip the review; any rating/note stored earlier is kept.
 */
export async function markWatched(tmdbId: number, review: WatchedReview | null): Promise<ActionResult> {
  try {
    const user = await requireUser();
    tmdbIdSchema.parse(tmdbId);
    const fields: Omit<TablesInsert<"user_movies">, "user_id" | "tmdb_id"> = {
      status: "watched",
      watched_at: new Date().toISOString(),
    };
    if (review) {
      const { rating, note, visibility } = reviewSchema.parse(review);
      Object.assign(fields, { rating, note: note || null, note_visibility: visibility });
    }
    await upsertEntry(user.id, tmdbId, fields);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function removeMovie(tmdbId: number): Promise<ActionResult> {
  try {
    const user = await requireUser();
    tmdbIdSchema.parse(tmdbId);
    const supabase = await createClient();
    const { error } = await supabase
      .from("user_movies")
      .delete()
      .eq("user_id", user.id)
      .eq("tmdb_id", tmdbId);
    if (error) throw error;
    revalidate(tmdbId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setRating(tmdbId: number, rating: number | null): Promise<ActionResult> {
  try {
    const user = await requireUser();
    tmdbIdSchema.parse(tmdbId);
    ratingSchema.parse(rating);
    const result = await updateWatchedEntry(user.id, tmdbId, { rating });
    if (result.ok) revalidate(tmdbId);
    return result;
  } catch (error) {
    return fail(error);
  }
}

export async function saveNote(
  tmdbId: number,
  input: { note: string; visibility: "private" | "public" },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    tmdbIdSchema.parse(tmdbId);
    const { note, visibility } = noteSchema.parse(input);
    const result = await updateWatchedEntry(user.id, tmdbId, {
      note: note || null,
      note_visibility: visibility,
    });
    if (result.ok) revalidate(tmdbId);
    return result;
  } catch (error) {
    return fail(error);
  }
}
