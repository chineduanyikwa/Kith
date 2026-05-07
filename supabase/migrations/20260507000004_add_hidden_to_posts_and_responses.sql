-- Allow admin moderators to temporarily hide posts and responses without
-- deleting them. Hidden content stays visible in the admin moderation view
-- but is filtered out of every public-facing fetch.

alter table public.posts
  add column if not exists hidden boolean not null default false;

alter table public.responses
  add column if not exists hidden boolean not null default false;
