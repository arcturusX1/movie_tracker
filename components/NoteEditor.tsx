"use client";

import { useState, useTransition } from "react";
import { saveNote } from "@/app/actions/library";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX = 500;

type Props = {
  tmdbId: number;
  note: string | null;
  visibility: "private" | "public";
};

export function NoteEditor({ tmdbId, note, visibility }: Props) {
  const [text, setText] = useState(note ?? "");
  const [isPublic, setIsPublic] = useState(visibility === "public");
  const [status, setStatus] = useState<{ message: string; failed: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = text !== (note ?? "") || isPublic !== (visibility === "public");

  function submit() {
    setStatus(null);
    startTransition(async () => {
      const result = await saveNote(tmdbId, {
        note: text,
        visibility: isPublic ? "public" : "private",
      });
      setStatus(result.ok ? { message: "Saved", failed: false } : { message: result.error, failed: true });
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-2"
    >
      <Label htmlFor="note">Your review / note</Label>
      <Textarea
        id="note"
        value={text}
        maxLength={MAX}
        rows={4}
        onChange={(e) => {
          setText(e.target.value);
          setStatus(null);
        }}
        placeholder="What did you think?"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Label className="font-normal">
          <Checkbox
            checked={isPublic}
            onCheckedChange={(checked) => {
              setIsPublic(checked);
              setStatus(null);
            }}
          />
          Public, shown on the movie page
        </Label>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {text.length}/{MAX}
        </span>
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {status ? (
        <p className={status.failed ? "text-xs text-destructive-text" : "text-xs text-muted-foreground"}>
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
