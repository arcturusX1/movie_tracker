import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { yearOf } from "@/lib/movie-utils";
import { getTrending } from "@/lib/tmdb";
import { MovieCard, MovieGrid } from "@/components/MovieCard";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your movie diary.
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Log what you&apos;ve watched, keep a watchlist, rate with half-stars, and share short
          reviews — with Rotten Tomatoes and Metacritic scores on every movie page.
        </p>
        <Suspense fallback={<div className="h-10" />}>
          <CallToAction />
        </Suspense>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Trending this week</h2>
        <Trending />
      </section>
    </div>
  );
}

async function CallToAction() {
  const user = await getCurrentUser();
  const [href, label] = user
    ? ["/library/watched", "Go to your library"]
    : ["/login", "Sign in with Google"];
  return (
    <Link href={href} className={buttonVariants({ size: "lg" })}>
      {label}
    </Link>
  );
}

async function Trending() {
  "use cache";
  const movies = await getTrending();
  return (
    <MovieGrid>
      {movies.slice(0, 18).map((m) => (
        <MovieCard
          key={m.id}
          tmdbId={m.id}
          title={m.title}
          year={yearOf(m.release_date)}
          posterPath={m.poster_path}
        />
      ))}
    </MovieGrid>
  );
}
