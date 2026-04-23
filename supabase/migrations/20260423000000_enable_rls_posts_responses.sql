-- Stage 5 security: enable RLS on posts and responses and define access policies.

-- ---------- posts ----------

alter table public.posts enable row level security;

create policy "posts_select_all"
  on public.posts
  for select
  to anon, authenticated
  using (true);

create policy "posts_insert_own"
  on public.posts
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "posts_update_own"
  on public.posts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "posts_delete_own"
  on public.posts
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------- responses ----------

alter table public.responses enable row level security;

create policy "responses_select_all"
  on public.responses
  for select
  to anon, authenticated
  using (true);

create policy "responses_insert_own"
  on public.responses
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "responses_update_own"
  on public.responses
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "responses_delete_own"
  on public.responses
  for delete
  to authenticated
  using (user_id = auth.uid());
