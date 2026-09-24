"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { defaultDir, type LibraryQuery, type LibrarySort } from "@/lib/movie-utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SORT_LABELS: Record<LibrarySort, string> = {
  added: "Date added",
  year: "Year",
  director: "Director",
  genre: "Genre",
  rating: "Your rating",
  title: "Title",
};

const ALL_GENRES = "all";

type Props = {
  query: LibraryQuery;
  genres: { id: number; name: string }[];
};

export function SortControls({ query, genres }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  const genreItems: Record<string, string> = {
    [ALL_GENRES]: "All genres",
    ...Object.fromEntries(genres.map((g) => [String(g.id), g.name])),
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor="sort-by" className="text-muted-foreground">
        Sort by
      </Label>
      <Select
        items={SORT_LABELS}
        value={query.sort}
        onValueChange={(value) => {
          if (!value) return;
          const sort = value as LibrarySort;
          update({ sort, dir: defaultDir(sort) });
        }}
      >
        <SelectTrigger id="sort-by" size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={() => update({ dir: query.dir === "asc" ? "desc" : "asc" })}
        aria-label={`Sorted ${query.dir === "asc" ? "ascending" : "descending"}; click to reverse`}
      >
        {query.dir === "asc" ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
        {query.dir === "asc" ? "Asc" : "Desc"}
      </Button>

      {genres.length > 0 ? (
        <Select
          items={genreItems}
          value={query.genre ? String(query.genre) : ALL_GENRES}
          onValueChange={(value) => update({ genre: !value || value === ALL_GENRES ? null : value })}
        >
          <SelectTrigger size="sm" className="w-40" aria-label="Filter by genre">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(genreItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
