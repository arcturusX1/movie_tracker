"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Eye, Plus } from "lucide-react";
import { markWatched, removeMovie, setStatus, type WatchedReview } from "@/app/actions/library";
import { useLibraryItem } from "@/components/LibraryItem";
import { WatchedDialog } from "@/components/WatchedDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "watched" | "watchlist";

type Props = {
  tmdbId: number;
  title: string;
  status: Status | null;
  /** Existing rating/review, used to prefill the "Mark as watched" dialog. */
  review?: Partial<WatchedReview>;
  signedIn: boolean;
  compact?: boolean;
};

export function StatusButtons({ tmdbId, title, status, review, signedIn, compact = false }: Props) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const libraryItem = useLibraryItem();

  if (!signedIn) {
    return (
      <Link href="/login" className={cn(buttonVariants({ variant: "link", size: "xs" }), "px-0")}>
        Sign in to track
      </Link>
    );
  }

  function run(next: Status | null) {
    const previous = optimistic;
    setOptimistic(next);
    setError(null);
    // In a Watched/Watchlist list, drop the card right away rather than after the
    // server round trip; it reappears (with the error) if the action fails.
    const leavesList = libraryItem !== null && next !== libraryItem.listStatus;
    if (leavesList) libraryItem.setHidden(true);
    startTransition(async () => {
      const result = await (next ? setStatus(tmdbId, next) : removeMovie(tmdbId)).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server. Please try again.",
      }));
      if (!result.ok) {
        setOptimistic(previous);
        setError(result.error);
        if (leavesList) libraryItem.setHidden(false);
      }
    });
  }

  function openWatchedDialog() {
    setError(null);
    setDialogError(null);
    setDialogOpen(true);
  }

  // Status only changes once the dialog is confirmed, so cancelling leaves it where it was.
  function confirmWatched(value: WatchedReview | null) {
    setDialogError(null);
    startTransition(async () => {
      const result = await markWatched(tmdbId, value);
      if (result.ok) {
        setOptimistic("watched");
        setDialogOpen(false);
      } else {
        setDialogError(result.error);
      }
    });
  }

  const size = compact ? "xs" : "default";
  const watched = optimistic === "watched";
  const onWatchlist = optimistic === "watchlist";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1.5">
        <Button
          size={size}
          variant={watched ? "default" : "outline"}
          disabled={pending}
          aria-pressed={watched}
          onClick={() => (watched ? run(null) : openWatchedDialog())}
        >
          {watched ? <Check /> : <Eye />}
          Watched
        </Button>
        <Button
          size={size}
          variant={onWatchlist ? "default" : "outline"}
          disabled={pending}
          aria-pressed={onWatchlist}
          onClick={() => run(onWatchlist ? null : "watchlist")}
        >
          {onWatchlist ? <Check /> : <Plus />}
          Watchlist
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <WatchedDialog
        open={dialogOpen}
        title={title}
        initial={{
          rating: review?.rating ?? null,
          note: review?.note ?? "",
          visibility: review?.visibility ?? "private",
        }}
        pending={pending}
        error={dialogError}
        onSubmit={confirmWatched}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
