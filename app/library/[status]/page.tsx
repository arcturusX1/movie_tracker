import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Film } from "lucide-react";
import { getLibrary, getLibraryGenreIds, type MovieStatus } from "@/lib/library";
import { parseLibraryQuery } from "@/lib/movie-utils";
import { getGenres } from "@/lib/tmdb";
import { LibraryItem } from "@/components/LibraryItem";
import { MovieCard, MovieGrid } from "@/components/MovieCard";
import { RatingInput } from "@/components/RatingInput";
import { SortControls } from "@/components/SortControls";
import { StatusButtons } from "@/components/StatusButtons";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS: { status: MovieStatus; label: string }[] = [
  { status: "watched", label: "Watched" },
  { status: "watchlist", label: "Watchlist" },
];

export function generateStaticParams() {
  return TABS.map(({ status }) => ({ status }));
}

export async function generateMetadata({ params }: PageProps<"/library/[status]">): Promise<Metadata> {
  const { status } = await params;
  return { title: TABS.find((t) => t.status === status)?.label ?? "Library" };
}

export default function LibraryPage({ params, searchParams }: PageProps<"/library/[status]">) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <Suspense fallback={<Skeleton className="h-8 w-48" />}>
        <LibraryTabs params={params} />
      </Suspense>
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryList params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function resolveStatus(params: PageProps<"/library/[status]">["params"]) {
  const { status } = await params;
  if (status !== "watched" && status !== "watchlist") notFound();
  return status;
}

async function LibraryTabs({ params }: Pick<PageProps<"/library/[status]">, "params">) {
  const current = await resolveStatus(params);
  return (
    <Tabs value={current}>
      <TabsList>
        {TABS.map(({ status, label }) => (
          <TabsTrigger
            key={status}
            value={status}
            nativeButton={false}
            render={<Link href={`/library/${status}`} />}
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

async function LibraryList({ params, searchParams }: PageProps<"/library/[status]">) {
  const status = await resolveStatus(params);
  const query = parseLibraryQuery(await searchParams);

  const [items, genreIds, allGenres] = await Promise.all([
    getLibrary(status, query),
    getLibraryGenreIds(status),
    getGenres(),
  ]);
  const genres = allGenres
    .filter((g) => genreIds.includes(g.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <SortControls query={query} genres={genres} />
      {items.length === 0 ? (
        <EmptyState status={status} filtered={query.genre !== null} />
      ) : (
        <MovieGrid>
          {items.map((item) => (
            <LibraryItem key={item.id} listStatus={status}>
              <MovieCard
                tmdbId={item.tmdb_id!}
                title={item.title ?? "Untitled"}
                year={item.year}
                posterPath={item.poster_path}
                subtitle={query.sort === "genre" ? item.primary_genre : item.director}
              >
                {status === "watched" ? (
                  <RatingInput tmdbId={item.tmdb_id!} rating={item.rating} size="sm" />
                ) : null}
                <StatusButtons
                  tmdbId={item.tmdb_id!}
                  title={item.title ?? "Untitled"}
                  status={status}
                  review={{
                    rating: item.rating,
                    note: item.note ?? "",
                    visibility: item.note_visibility ?? "private",
                  }}
                  signedIn
                  compact
                />
              </MovieCard>
            </LibraryItem>
          ))}
        </MovieGrid>
      )}
    </div>
  );
}

function EmptyState({ status, filtered }: { status: MovieStatus; filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <Film className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-muted-foreground">
        {filtered
          ? "No movies in this genre."
          : status === "watched"
            ? "You haven't logged any movies yet."
            : "Your watchlist is empty."}
      </p>
      <Link href="/search" className={buttonVariants({ size: "sm" })}>
        Find a movie
      </Link>
    </div>
  );
}
