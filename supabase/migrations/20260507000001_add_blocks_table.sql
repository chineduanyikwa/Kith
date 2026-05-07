-- User blocking. A blocker prevents responses/replies in either direction
-- between themselves and the blocked user on any post.

create table if not exists public.blocks (
  id bigint primary key generated always as identity,
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create index if not exists blocks_blocker_id_idx on public.blocks(blocker_id);
create index if not exists blocks_blocked_id_idx on public.blocks(blocked_id);

alter table public.blocks enable row level security;

create policy "blocks_insert_own"
  on public.blocks
  for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "blocks_select_own"
  on public.blocks
  for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "blocks_select_blocked"
  on public.blocks
  for select
  to authenticated
  using (blocked_id = auth.uid());

create policy "blocks_delete_own"
  on public.blocks
  for delete
  to authenticated
  using (blocker_id = auth.uid());
