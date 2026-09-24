"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";
import type { WatchedReview } from "@/app/actions/library";
import { StarRating } from "@/components/RatingInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_NOTE = 500;

type Props = {
  open: boolean;
  title: string;
  initial: WatchedReview;
  pending: boolean;
  error: string | null;
  /** review === null means "skip": mark watched without touching rating/review. */
  onSubmit: (review: WatchedReview | null) => void;
  onCancel: () => void;
};

/** Asks for a rating and review when a movie is marked watched. Cancelling leaves it unchanged. */
export function WatchedDialog({ open, title, initial, pending, error, onSubmit, onCancel }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {/* The popup unmounts when closed, so each opening starts fresh from `initial`. */}
        <ReviewForm title={title} initial={initial} pending={pending} error={error} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}

function ReviewForm({
  title,
  initial,
  pending,
  error,
  onSubmit,
}: Pick<Props, "title" | "initial" | "pending" | "error" | "onSubmit">) {
  const [rating, setRating] = useState(initial.rating);
  const [note, setNote] = useState(initial.note);
  const [isPublic, setIsPublic] = useState(initial.visibility === "public");

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ rating, note, visibility: isPublic ? "public" : "private" });
      }}
    >
      <DialogHeader>
        <DialogTitle>Mark as watched</DialogTitle>
        <DialogDescription>{title}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label>Your rating</Label>
        <StarRating value={rating} onChange={setRating} disabled={pending} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="watched-note">
          Review <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="watched-note"
          value={note}
          maxLength={MAX_NOTE}
          rows={4}
          disabled={pending}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you think?"
        />
        <div className="flex items-center justify-between gap-2">
          <Label className="font-normal">
            <Checkbox checked={isPublic} onCheckedChange={setIsPublic} disabled={pending} />
            Public, shown on the movie page
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {note.length}/{MAX_NOTE}
          </span>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onSubmit(null)}>
          Skip review
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
