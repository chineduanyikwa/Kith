-- Stage 5 security: enable RLS on profiles and reports and define access policies.

-- ---------- profiles ----------

alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own"
  on public.profiles
  for delete
  to authenticated
  using (id = auth.uid());

-- ---------- reports ----------

alter table public.reports enable row level security;

create policy "reports_select_authenticated"
  on public.reports
  for select
  to authenticated
  using (true);

create policy "reports_insert_authenticated"
  on public.reports
  for insert
  to authenticated
  with check (true);
