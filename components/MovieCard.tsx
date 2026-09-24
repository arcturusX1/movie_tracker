import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { posterUrl } from "@/lib/movie-utils";

type Props = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  subtitle?: ReactNode;
  children?: ReactNode;
};

export function MovieCard({ tmdbId, title, year, posterPath, subtitle, children }: Props) {
  const src = posterUrl(posterPath, "w342");
  return (
    <article className="flex flex-col gap-2">
      <Link
        href={`/movie/${tmdbId}`}
        className="relative block aspect-[2/3] overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 transition hover:opacity-90"
      >
        {src ? (
          <Image
            src={src}
            alt={`${title} poster`}
            fill
            sizes="(min-width: 1024px) 180px, (min-width: 640px) 25vw, 45vw"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center p-2 text-center text-sm text-muted-foreground">
            {title}
          </span>
        )}
      </Link>
      <div className="min-w-0">
        <Link href={`/movie/${tmdbId}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
          {title}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {year ?? "—"}
          {subtitle ? <> · {subtitle}</> : null}
        </p>
      </div>
      {children}
    </article>
  );
}

export function MovieGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">{children}</div>
  );
}
