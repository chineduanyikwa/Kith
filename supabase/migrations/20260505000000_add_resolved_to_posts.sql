-- Add a resolved flag to posts so authors can mark their post as resolved.

alter table public.posts
  add column if not exists resolved boolean not null default false;
