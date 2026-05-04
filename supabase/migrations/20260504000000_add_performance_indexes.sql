-- Performance indexes for posts and responses. All use IF NOT EXISTS so this
-- migration is safe to re-run and tolerates indexes that may already exist
-- (e.g. responses_parent_id_idx from the threading migration is omitted here
-- because it is already created in 20260501000000_add_parent_id_to_responses.sql).

create index if not exists posts_category_idx on public.posts(category);
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);

create index if not exists responses_post_id_idx on public.responses(post_id);
create index if not exists responses_user_id_idx on public.responses(user_id);
create index if not exists responses_created_at_idx on public.responses(created_at desc);
