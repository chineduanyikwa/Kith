-- Category following. Helpers opt in to notifications and follow categories
-- they care about. One row per (user, category).

create table if not exists public.category_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists category_follows_user_id_idx
  on public.category_follows(user_id);
create index if not exists category_follows_category_idx
  on public.category_follows(category);

alter table public.category_follows enable row level security;

create policy "category_follows_insert_own"
  on public.category_follows
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "category_follows_select_own"
  on public.category_follows
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "category_follows_delete_own"
  on public.category_follows
  for delete
  to authenticated
  using (user_id = auth.uid());
