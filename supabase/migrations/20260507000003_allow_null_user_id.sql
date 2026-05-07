-- Allow NULL on posts.user_id and responses.user_id so the account-deletion
-- "keep content" path can null out the author while preserving the row.
-- No-op if the columns are already nullable.

alter table public.posts
  alter column user_id drop not null;

alter table public.responses
  alter column user_id drop not null;
