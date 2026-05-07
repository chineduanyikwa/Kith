-- Add target_user_id to reports so user-targeted reports (vs post/response targets)
-- can reference a profile UUID instead of a numeric content id.
-- Existing rows keep target_id; new user reports set target_user_id with target_type='user'.

alter table public.reports
  add column if not exists target_user_id uuid references public.profiles(id) on delete cascade;

create index if not exists reports_target_user_id_idx on public.reports(target_user_id);
