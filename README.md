# Reel Log

A personal movie tracker. Search any film, keep a **watchlist**, log what you've **watched** with a half-star rating and a short review, and share reviews publicly on each movie's page — alongside **Rotten Tomatoes**, **Metacritic**, IMDb and TMDB scores.

## Features

- **Google sign-in** via Supabase Auth (OAuth2 + PKCE)
- **Search** the full TMDB catalogue and add movies to *Watched* or *Watchlist*
- **Mark as watched** opens a dialog for a rating (½–5 stars) and an optional review, private or public; cancelling leaves the movie where it was
- **Library** with Watched / Watchlist tabs, sortable by date added, year, director, genre, rating or title, and filterable by genre
- **Movie pages** with poster, synopsis, director, cast, trailer, genres, critic scores, public Reel Log reviews and TMDB user reviews
- Light and dark themes that follow the OS setting

## Tech stack

| Area | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Actions, Cache Components), React 19, TypeScript |
| UI | [shadcn/ui](https://ui.shadcn.com) (`base-nova`, Base UI primitives), Tailwind CSS v4, lucide icons |
| Auth + database | [Supabase](https://supabase.com): Google OAuth, Postgres with Row Level Security |
| Movie data | [TMDB API](https://developer.themoviedb.org) |
| Critic scores | [OMDb API](https://www.omdbapi.com) (Rotten Tomatoes, Metacritic, IMDb) |
| Tests | Vitest |

## Getting started

### 1. Prerequisites

- Node.js 22+
- A [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) OAuth client
- A TMDB **API Read Access Token** and an OMDb API key (both free)

### 2. Install

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
```

### 3. Environment variables

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | Supabase → API Keys (`sb_secret_…`). **Server-only**, used to write the shared movie cache |
| `TMDB_API_READ_TOKEN` | themoviedb.org → Settings → API → *API Read Access Token* (the long `eyJ…` token, not the short API key) |
| `OMDB_API_KEY` | omdbapi.com → API Key |

### 4. Database

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies supabase/migrations
```

### 5. Google OAuth

1. **Google Cloud Console → Google Auth Platform**
   - *Branding*: set the app name and support email.
   - *Audience*: while in *Testing*, add your Google account as a **test user**.
   - *Clients → Create client → Web application*:
     - Authorized JavaScript origins: `http://localhost:3000`
     - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Sign In / Providers → Google**: enable it and paste the client ID and secret.
3. **Supabase → Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: add `http://localhost:3000/auth/callback` (and your production URL later)

### 6. Run

```bash
npm run dev
```

Open **http://localhost:3000**.

> **Use `localhost`, not `127.0.0.1` or a LAN/WSL IP.** Auth cookies are tied to the hostname, and Next.js blocks its dev scripts on other origins. Opening the app on a different host makes buttons unresponsive and sign-in fail.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

After changing the schema, regenerate the database types:

```bash
npx supabase gen types typescript --linked > lib/database.types.ts
```

## Project structure

```
app/
  actions/            Server Actions: library (add/move/remove, rate, review), auth (sign out)
  auth/login          Starts Google OAuth on the server
  auth/callback       Exchanges the OAuth code for a session
  library/[status]    Watched / Watchlist tabs with sorting and filters
  movie/[tmdbId]      Movie details, scores, your entry, reviews
  search/             TMDB search results
components/
  ui/                 shadcn/ui components
  WatchedDialog.tsx   "Mark as watched" rating/review dialog
  StatusButtons.tsx   Watched / Watchlist toggles
lib/
  tmdb.ts, omdb.ts    External APIs, cached with 'use cache'
  library.ts          Per-user queries (data access layer)
  auth.ts             Current-user helpers
  supabase/server.ts  Supabase clients (user-scoped and admin)
proxy.ts              Refreshes the Supabase session and protects /library
supabase/migrations/  Schema, `library` view and RLS policies
```

## Data model and security

- **`profiles`**: one per user, created by a trigger on sign-up.
- **`movies`, `genres`, `movie_genres`**: a shared cache of TMDB data, denormalized for sorting. Anyone can read it; only the server (secret key) writes to it, using data fetched from TMDB rather than taken from the client.
- **`user_movies`**: a user's library entry: status (`watched` / `watchlist`), rating, review and its visibility.
- **`library`** view: entries joined with movie data (`security_invoker`, so RLS still applies).

Row Level Security limits each user to their own entries. Other users see only **public reviews on watched movies**. Ratings and reviews can only be set on watched movies, and this is enforced in the Server Actions.

## Deployment

Deploys to Vercel or any Node host:

1. Set the environment variables above.
2. Add the production URL to Supabase's Site URL / Redirect URLs (`https://your-domain/auth/callback`) and to the Google client's JavaScript origins.
3. Run `npx supabase db push` for any new migrations.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Critic scores are provided by OMDb.
