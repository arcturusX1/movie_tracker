import { Suspense } from "react";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { SearchBox } from "@/components/SearchBox";
import { UserMenu } from "@/components/UserMenu";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight">
          <Clapperboard className="size-5 text-primary" aria-hidden />
          <span className="hidden sm:inline">Reel Log</span>
        </Link>
        <div className="min-w-0 flex-1">
          <Suspense>
            <SearchBox />
          </Suspense>
        </div>
        <Suspense fallback={<Skeleton className="h-8 w-20" />}>
          <Account />
        </Suspense>
      </div>
    </header>
  );
}

async function Account() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link href="/login" className={buttonVariants({ size: "sm" })}>
        Sign in
      </Link>
    );
  }

  return (
    <nav className="flex shrink-0 items-center gap-1 text-sm">
      <Link href="/library/watched" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
        Watched
      </Link>
      <Link href="/library/watchlist" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
        Watchlist
      </Link>
      {/* On phones these links live in the account menu to leave room for search. */}
      <UserMenu name={user.name} avatarUrl={user.avatarUrl} />
    </nav>
  );
}
