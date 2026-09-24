-- Movie tracker schema: profiles, TMDB movie cache, per-user library entries.

create type public.movie_status as enum ('watched', 'watchlist');
create type public.note_visibility as enum ('private', 'public');

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by trigger on sign-up
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- movies / genres: shared cache of TMDB data, denormalized for sorting.
-- Written only by the server (secret key); readable by everyone.
-- ---------------------------------------------------------------------------
create table public.movies (
  tmdb_id integer primary key,
  imdb_id text,
  title text not null,
  year integer,
  release_date date,
  poster_path text,
  overview text,
  runtime integer,
  director text,
  updated_at timestamptz not null default now()
);

create table public.genres (
  id integer primary key,
  name text not null
);

create table public.movie_genres (
  tmdb_id integer not null references public.movies (tmdb_id) on delete cascade,
  genre_id integer not null references public.genres (id) on delete cascade,
  position smallint not null default 0,
  primary key (tmdb_id, genre_id)
);

-- ---------------------------------------------------------------------------
-- user_movies: a movie in a user's library
-- ---------------------------------------------------------------------------
create table public.user_movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  tmdb_id integer not null references public.movies (tmdb_id) on delete cascade,
  status public.movie_status not null,
  rating numeric(2, 1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  note text check (char_length(note) <= 500),
  note_visibility public.note_visibility not null default 'private',
  watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tmdb_id)
);

create index user_movies_user_status_idx on public.user_movies (user_id, status);
create index user_movies_public_notes_idx on public.user_movies (tmdb_id)
  where note_visibility = 'public' and note is not null;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_movies_set_updated_at
  before update on public.user_movies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- library view: a user's entries joined with movie data, flattened for sorting
-- security_invoker so the caller's RLS on user_movies applies.
-- ---------------------------------------------------------------------------
create view public.library
with (security_invoker = true)
as
select
  um.id,
  um.user_id,
  um.tmdb_id,
  um.status,
  um.rating,
  um.note,
  um.note_visibility,
  um.watched_at,
  um.created_at,
  m.title,
  m.year,
  m.poster_path,
  m.director,
  (
    select g.name
    from public.movie_genres mg
    join public.genres g on g.id = mg.genre_id
    where mg.tmdb_id = m.tmdb_id
    order by mg.position
    limit 1
  ) as primary_genre,
  coalesce(
    (select array_agg(mg.genre_id order by mg.position) from public.movie_genres mg where mg.tmdb_id = m.tmdb_id),
    '{}'
  ) as genre_ids
from public.user_movies um
join public.movies m on m.tmdb_id = um.tmdb_id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.genres enable row level security;
alter table public.movie_genres enable row level security;
alter table public.user_movies enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select using (true);
create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Movies are publicly readable"
  on public.movies for select using (true);
create policy "Genres are publicly readable"
  on public.genres for select using (true);
create policy "Movie genres are publicly readable"
  on public.movie_genres for select using (true);

create policy "Users read their own library"
  on public.user_movies for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Public notes are readable by everyone"
  on public.user_movies for select
  using (note_visibility = 'public' and note is not null);
create policy "Users add to their own library"
  on public.user_movies for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their own library"
  on public.user_movies for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete from their own library"
  on public.user_movies for delete to authenticated
  using ((select auth.uid()) = user_id);
