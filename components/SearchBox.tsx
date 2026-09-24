"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = pathname === "/search" ? (searchParams.get("q") ?? "") : "";
  const [query, setQuery] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // When the URL changes from outside (back button, links), reflect it in the input
  // unless it's just catching up with what the user typed.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    if (urlQuery !== query.trim()) setQuery(urlQuery);
  }

  function go(value: string, replace: boolean) {
    const q = value.trim();
    if (!q) return;
    const href = `/search?q=${encodeURIComponent(q)}`;
    if (replace && pathname === "/search") router.replace(href);
    else router.push(href);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        go(query, false);
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            clearTimeout(timer.current);
            // Live-update results only once the user is already on the search page.
            if (pathname === "/search") timer.current = setTimeout(() => go(value, true), 400);
          }}
          placeholder="Search movies…"
          aria-label="Search movies"
          className="pl-8"
        />
      </div>
    </form>
  );
}
