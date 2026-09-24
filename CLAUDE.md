@AGENTS.md

# SilverScreen: project context

Movie tracker: Google sign-in, TMDB search, Watched/Watchlist library with half-star ratings and private/public reviews, movie pages with RT/Metacritic/IMDb scores, and genre/director recommendations. See README.md for setup and features.

## Stack
- Next.js 16.3 App Router with `cacheComponents: true`, React 19, TypeScript, Tailwind v4
- shadcn/ui `base-nova` preset, i.e. **Base UI** primitives, not Radix (`components/ui/`)
- Supabase: Auth (Google OAuth, PKCE) + Postgres with RLS, via `@supabase/ssr`. No ORM. **Supabase only; no SQLite or other local DB.**
- TMDB (movie data), OMDb (RT/Metacritic/IMDb scores, 1,000 req/day limit)
- Vitest for pure logic (`tests/`)

## Commands
- `npm run dev` / `build` / `lint` / `test`
- `npx tsc --noEmit`. Run `npx next typegen` first if `PageProps<"/route">` types are missing.
- DB: add SQL under `supabase/migrations/`, then `npx supabase db push`. The CLI is linked to the project.
- `lib/database.types.ts` is **hand-maintained** in generator format (Docker isn't available for local Supabase). Update it with every migration, or regenerate with `npx supabase gen types typescript --linked > lib/database.types.ts`.

## Architecture
- `lib/tmdb.ts`, `lib/omdb.ts`: server-only fetchers cached with `'use cache'` + `cacheLife`. Cache failures briefly (`cacheLife("minutes")`) rather than for days.
- `lib/library.ts`: per-user data access layer. `lib/auth.ts`: `getCurrentUser()` (React `cache`, uses `getClaims`) and `requireUser()`.
- `app/actions/library.ts`: all mutations as Server Actions returning `ActionResult`. Call `unstable_rethrow` in catch blocks so `redirect()` from `requireUser` propagates.
- `lib/recommend.ts`: pure scoring (unit-tested). `lib/recommendations.ts`: fetches library + TMDB candidates.
- Pure helpers that tests import must not import `server-only`; put them in `lib/movie-utils.ts` or `lib/recommend.ts`.

## Next 16 / Cache Components rules
- `middleware.ts` is now **`proxy.ts`** (refreshes the Supabase session and guards `/library`).
- Anything reading `cookies()`, `searchParams` or dynamic `params` must render inside `<Suspense>`. Pages pass the `params`/`searchParams` promises down and await them inside the boundary. Don't await the session at the top level of a layout.
- `'use cache'` functions can't read cookies. Only cache public TMDB/OMDb data; per-user Supabase queries stay uncached.
- Check `node_modules/next/dist/docs/` before using unfamiliar Next APIs; they differ from older versions.

## Data and security rules
- The `movies`/`genres`/`movie_genres` cache is written **only** by `cacheMovie()` using the secret key (`createAdminClient`), with data fetched server-side from TMDB. Clients can't write to it (RLS).
- RLS lets everyone read *public notes* in `user_movies`, so **always filter `user_id` explicitly** when querying a user's own library (including the `library` view).
- Ratings and reviews are only allowed on **watched** movies. This is enforced in `updateWatchedEntry` and `markWatched`. Public reviews only show for watched entries; moving back to the watchlist keeps the note but hides it.
- `movies.director` holds names; `movies.director_ids` holds TMDB person ids (added later). Older rows may have empty ids, and `lib/recommendations.ts` falls back to `getMovie()`.
- Auth: sign-in starts server-side at `app/auth/login/route.ts`, so the button is a plain link that works before hydration. `app/auth/callback/route.ts` only redirects to same-origin paths.

## UI conventions
- Base UI API: use `render={<Link href=… />}` instead of `asChild`, and add `nativeButton={false}` when a Tab or Button renders a non-button. `DropdownMenuLabel` must sit inside `DropdownMenuGroup` or it crashes.
- When styling links with `buttonVariants` and adding conflicting classes, wrap them in `cn(buttonVariants(...), "...")`. `buttonVariants` alone doesn't merge, so the base `inline-flex` beats `hidden`.
- Colors come only from the palette in `app/globals.css`: `#CCCCFF`, `#A3A3CC`, `#5C5C99`, `#292966`, plus tints mixed with white/black. **`#660033` (`destructive`) is reserved for errors and failures.** Use `Alert variant="destructive"` (solid maroon) or `text-destructive-text` for inline errors. No other hard-coded colors, except the Google logo's official ones.
- Dark mode follows the OS: `@custom-variant dark` is a `prefers-color-scheme` media query, and there's no toggle or `.dark` class.
- Optimistic updates: `StatusButtons` hides cards via `LibraryItem` context (`listStatus`, or `null` for recommendations) and restores them on failure. The "Mark as watched" dialog closes only after the save succeeds, so typed reviews aren't lost. Server-action calls `.catch()` network failures into an `ActionResult`.
- App name is **SilverScreen** everywhere.

## Dev environment gotchas
- Runs in WSL2; the user browses from Windows. **Always use `http://localhost:3000`**. Opening the WSL IP or `127.0.0.1` blocks Next dev scripts (buttons do nothing) and breaks OAuth cookies. For "UI does nothing" or "auth failed once", check `.next/dev/logs/next-development.log` for "Blocked cross-origin request".
- `darkreader-lock` meta tag is set in `app/layout.tsx`. Hydration mismatches with `darkreader` attributes come from the extension, not the app.
- Each Supabase round trip takes ~300 ms from here; dev mode adds ~0.5 s per action. Prefer optimistic UI over extra round trips.
- `gh` is installed in `~/.local/bin`. GitHub auth is pending: the user must run `gh auth login` before any push. The plan is a private repo named `movie_tracker`.

## Testing approach
- Unit: `npm test` (pure functions only).
- End-to-end: headless Playwright from the session scratchpad (not a project dependency) against the running dev server. Log in as a **temporary Supabase user** created with the secret key (`auth.admin.createUser`), mint cookies via `@supabase/ssr` `signInWithPassword`, and **delete the user in `finally`**. Never touch the owner's account. Seed `user_movies` only with movies already in the `movies` cache (foreign key).
- Never commit or print `.env.local` values. Only `.env.example` is tracked.
