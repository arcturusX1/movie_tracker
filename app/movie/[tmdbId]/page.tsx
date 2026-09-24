import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Play, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getPublicReviews, getUserEntry } from "@/lib/library";
import { findDirector, posterUrl, yearOf } from "@/lib/movie-utils";
import { getScores } from "@/lib/omdb";
import { findTrailer, getMovie, type TmdbMovie } from "@/lib/tmdb";
import { NoteEditor } from "@/components/NoteEditor";
import { RatingInput } from "@/components/RatingInput";
import { StatusButtons } from "@/components/StatusButtons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Params = PageProps<"/movie/[tmdbId]">["params"];

async function loadMovie(params: Params) {
  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const movie = await getMovie(id);
  if (!movie) notFound();
  return movie;
}

export async function generateMetadata({ params }: PageProps<"/movie/[tmdbId]">): Promise<Metadata> {
  const movie = await loadMovie(params);
  const year = yearOf(movie.release_date);
  const poster = posterUrl(movie.poster_path, "w500");
  return {
    title: year ? `${movie.title} (${year})` : movie.title,
    description: movie.overview,
    openGraph: poster ? { images: [poster] } : undefined,
  };
}

export default function MoviePage({ params }: PageProps<"/movie/[tmdbId]">) {
  return (
    <Suspense fallback={<MovieSkeleton />}>
      <MovieDetails params={params} />
    </Suspense>
  );
}

function MovieSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row">
      <Skeleton className="aspect-[2/3] w-48 self-center rounded-xl md:w-64 md:self-start" />
      <div className="flex-1 space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <ScoresSkeleton />
        <Skeleton className="h-24 w-full max-w-3xl" />
      </div>
    </div>
  );
}

async function MovieDetails({ params }: { params: Params }) {
  const movie = await loadMovie(params);
  const backdrop = posterUrl(movie.backdrop_path, "w780");
  const poster = posterUrl(movie.poster_path, "w500");
  const year = yearOf(movie.release_date);
  const director = findDirector(movie.credits.crew);
  const trailer = findTrailer(movie);
  const cast = movie.credits.cast.slice(0, 8);

  return (
    <article>
      <div className="relative">
        {backdrop ? (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover opacity-20 blur-sm"
          />
        ) : null}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row">
          <div className="relative aspect-[2/3] w-48 shrink-0 self-center overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 md:w-64 md:self-start">
            {poster ? (
              <Image src={poster} alt={`${movie.title} poster`} fill priority sizes="256px" className="object-cover" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-5">
            <header className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                {movie.title}{" "}
                {year ? <span className="font-normal text-muted-foreground">({year})</span> : null}
              </h1>
              {movie.tagline ? <p className="text-muted-foreground italic">{movie.tagline}</p> : null}
              <p className="text-sm text-muted-foreground">
                {[director && `Directed by ${director}`, movie.runtime ? `${movie.runtime} min` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {movie.genres.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {movie.genres.map((g) => (
                    <Badge key={g.id} variant="secondary">
                      {g.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </header>

            <Suspense fallback={<ScoresSkeleton />}>
              <ScoresPanel movie={movie} />
            </Suspense>

            <p className="max-w-3xl leading-relaxed">{movie.overview}</p>

            {trailer ? (
              <a
                href={`https://www.youtube.com/watch?v=${trailer.key}`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Play /> Watch trailer
              </a>
            ) : null}

            <Suspense fallback={<Skeleton className="h-24 max-w-xl rounded-xl" />}>
              <YourEntry tmdbId={movie.id} title={movie.title} />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-12">
        {cast.length ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Top cast</h2>
            <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {cast.map((c) => (
                <li key={c.id}>
                  <span className="font-medium">{c.name}</span>
                  {c.character ? <span className="block text-muted-foreground">{c.character}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
          <CommunityReviews tmdbId={movie.id} />
        </Suspense>

        <TmdbReviews movie={movie} />
      </div>
    </article>
  );
}

async function ScoresPanel({ movie }: { movie: TmdbMovie }) {
  const scores = await getScores(movie.imdb_id ?? movie.external_ids.imdb_id);
  const items = [
    { label: "TMDB", value: movie.vote_count ? `${movie.vote_average.toFixed(1)}/10` : null },
    { label: "Rotten Tomatoes", value: scores?.rottenTomatoes ?? null },
    { label: "Metacritic", value: scores?.metacritic ?? null },
    { label: "IMDb", value: scores?.imdb ? `${scores.imdb}/10` : null },
  ];
  return (
    <dl className="flex flex-wrap gap-3">
      {items.map(({ label, value }) => (
        <Card key={label} size="sm" className="min-w-28 gap-0 px-3">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-lg font-semibold tabular-nums">{value ?? "—"}</dd>
        </Card>
      ))}
    </dl>
  );
}

function ScoresSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[62px] w-28 rounded-xl" />
      ))}
    </div>
  );
}

async function YourEntry({ tmdbId, title }: { tmdbId: number; title: string }) {
  const [user, entry] = await Promise.all([getCurrentUser(), getUserEntry(tmdbId)]);

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-4">
        <StatusButtons
          tmdbId={tmdbId}
          title={title}
          status={entry?.status ?? null}
          review={
            entry
              ? { rating: entry.rating, note: entry.note ?? "", visibility: entry.note_visibility }
              : undefined
          }
          signedIn={Boolean(user)}
        />
        {entry?.status === "watched" ? (
          <>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Your rating</span>
              <RatingInput tmdbId={tmdbId} rating={entry.rating} />
            </div>
            <NoteEditor tmdbId={tmdbId} note={entry.note} visibility={entry.note_visibility} />
          </>
        ) : user ? (
          <p className="text-xs text-muted-foreground">Mark it as watched to rate and review it.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReviewCard({
  author,
  avatarUrl,
  rating,
  children,
}: {
  author: string;
  avatarUrl?: string | null;
  rating?: string | null;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center gap-2">
        <Avatar size="sm">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : null}
          <AvatarFallback>{author.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-sm">{author}</CardTitle>
        {rating ? (
          <Badge variant="outline" className="ml-auto">
            <Star className="fill-primary text-primary" /> {rating}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

async function CommunityReviews({ tmdbId }: { tmdbId: number }) {
  const reviews = await getPublicReviews(tmdbId);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">SilverScreen reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              author={r.profiles?.display_name ?? "Anonymous"}
              avatarUrl={r.profiles?.avatar_url}
              rating={r.rating ? r.rating.toFixed(1) : null}
            >
              <p className="whitespace-pre-line">{r.note}</p>
            </ReviewCard>
          ))}
        </div>
      )}
    </section>
  );
}

function TmdbReviews({ movie }: { movie: TmdbMovie }) {
  const reviews = movie.reviews.results.slice(0, 5);
  if (!reviews.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Reviews from TMDB</h2>
      <div className="space-y-3">
        {reviews.map((r) => (
          <ReviewCard
            key={r.id}
            author={r.author}
            rating={r.author_details.rating ? `${r.author_details.rating}/10` : null}
          >
            <details className="group">
              <summary className="cursor-pointer list-none">
                <span className="line-clamp-4 whitespace-pre-line group-open:hidden">{r.content}</span>
                <span className="mt-1 inline-block text-xs font-medium text-primary group-open:hidden">
                  Read more
                </span>
              </summary>
              <p className="whitespace-pre-line">{r.content}</p>
            </details>
          </ReviewCard>
        ))}
      </div>
    </section>
  );
}
