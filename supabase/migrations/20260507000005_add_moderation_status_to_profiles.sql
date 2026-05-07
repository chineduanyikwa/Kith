-- Track per-user moderation state. `banned` is a permanent block; the auth
-- page and middleware refuse access when it's true. `suspended_until` is a
-- temporary block enforced while the timestamp is in the future.

alter table public.profiles
  add column if not exists banned boolean not null default false;

alter table public.profiles
  add column if not exists suspended_until timestamptz;
