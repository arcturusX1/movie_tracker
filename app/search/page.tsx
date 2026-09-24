import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getEntriesFor } from "@/lib/library";
import { yearOf } from "@/lib/movie-utils";
import { searchMovies } from "@/lib/tmdb";
import { MovieCard, MovieGrid } from "@/components/MovieCard";
import { StatusButtons } from "@/components/StatusButtons";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Suspense fallback={<p className="text-muted-foreground">Searching…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  if (!query) {
    return <p className="text-muted-foreground">Search for a movie using the box above.</p>;
  }

  const { results, total_results } = await searchMovies(query);
  const [user, entries] = await Promise.all([
    getCurrentUser(),
    getEntriesFor(results.map((m) => m.id)),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        {total_results.toLocaleString()} results for &ldquo;{query}&rdquo;
      </h1>
      {results.length === 0 ? (
        <p className="text-muted-foreground">No movies found. Try a different title.</p>
      ) : (
        <MovieGrid>
          {results.map((m) => {
            const entry = entries.get(m.id);
            return (
              <MovieCard
                key={m.id}
                tmdbId={m.id}
                title={m.title}
                year={yearOf(m.release_date)}
                posterPath={m.poster_path}
              >
                <StatusButtons
                  tmdbId={m.id}
                  title={m.title}
                  status={entry?.status ?? null}
                  review={
                    entry
                      ? { rating: entry.rating, note: entry.note ?? "", visibility: entry.note_visibility }
                      : undefined
                  }
                  signedIn={Boolean(user)}
                  compact
                />
              </MovieCard>
            );
          })}
        </MovieGrid>
      )}
    </div>
  );
}
