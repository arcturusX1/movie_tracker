-- TMDB person ids of each movie's director(s), used to find more films by them
-- for recommendations. Names alone (movies.director) can't be looked up reliably.
alter table public.movies
  add column director_ids integer[] not null default '{}';
