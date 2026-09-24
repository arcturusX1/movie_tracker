"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Status = "watched" | "watchlist";

type LibraryItemContextValue = {
  /** The list this card is shown in. */
  listStatus: Status;
  setHidden: (hidden: boolean) => void;
};

const LibraryItemContext = createContext<LibraryItemContextValue | null>(null);

/**
 * Wraps a card in a Watched/Watchlist list so it can disappear as soon as the movie
 * leaves that list, instead of waiting for the server round trip and re-render.
 * The card stays mounted (just hidden) so a failed action can bring it back.
 */
export function LibraryItem({ listStatus, children }: { listStatus: Status; children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <LibraryItemContext value={{ listStatus, setHidden }}>
      <div hidden={hidden}>{children}</div>
    </LibraryItemContext>
  );
}

/** Null outside a library list (search results, movie page). */
export function useLibraryItem() {
  return useContext(LibraryItemContext);
}
