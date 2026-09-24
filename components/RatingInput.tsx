"use client";

import { useState, useTransition } from "react";
import { setRating } from "@/app/actions/library";

type Size = "sm" | "md";

/** Saves the rating as soon as a star is clicked. Click the current rating again to clear it. */
export function RatingInput({ tmdbId, rating, size = "md" }: { tmdbId: number; rating: number | null; size?: Size }) {
  const [value, setValue] = useState(rating);
  const [pending, startTransition] = useTransition();

  function save(next: number | null) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await setRating(tmdbId, next);
      if (!result.ok) setValue(previous);
    });
  }

  return <StarRating value={value} onChange={save} size={size} disabled={pending} />;
}

type StarRatingProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: Size;
  disabled?: boolean;
};

/** Five stars with half-star precision. Controlled; clicking the current value clears it. */
export function StarRating({ value, onChange, size = "md", disabled = false }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const star = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <div
      className={`flex items-center gap-0.5 ${disabled ? "opacity-60" : ""}`}
      onMouseLeave={() => setHover(null)}
      role="group"
      aria-label={`Rating: ${value ?? "none"} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = shown >= n ? 1 : shown >= n - 0.5 ? 0.5 : 0;
        return (
          <span key={n} className={`relative ${star}`}>
            <StarIcon fill={fill} className={star} />
            {[n - 0.5, n].map((v, i) => (
              <button
                key={v}
                type="button"
                disabled={disabled}
                aria-label={`Rate ${v} stars`}
                onMouseEnter={() => setHover(v)}
                onFocus={() => setHover(v)}
                onBlur={() => setHover(null)}
                onClick={() => onChange(value === v ? null : v)}
                className={`absolute inset-y-0 w-1/2 cursor-pointer ${i === 0 ? "left-0" : "right-0"}`}
              />
            ))}
          </span>
        );
      })}
      {size === "md" ? (
        <span className="ml-2 w-8 text-sm text-muted-foreground tabular-nums">{value ? value.toFixed(1) : ""}</span>
      ) : null}
    </div>
  );
}

function StarIcon({ fill, className }: { fill: 0 | 0.5 | 1; className: string }) {
  const path =
    "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
      {fill > 0 ? (
        <path
          d={path}
          className="fill-primary"
          style={fill === 0.5 ? { clipPath: "inset(0 50% 0 0)" } : undefined}
        />
      ) : null}
    </svg>
  );
}
