-- Track whether a profile still has its auto-generated username so first-time
-- OAuth users can be funneled through a username-selection step before
-- reaching the rest of the app. Email sign-ups pick a username inline, so
-- their rows are inserted with needs_username = false.

alter table public.profiles
  add column if not exists needs_username boolean not null default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  suggested text[] := array['quietriver', 'morningstone', 'stillwater', 'gentleoak', 'softrain'];
  picked text;
begin
  if new.raw_app_meta_data->>'provider' is distinct from 'email' then
    picked := suggested[1 + floor(random() * array_length(suggested, 1))::int]
              || '_' || substring(md5(random()::text) from 1 for 4);

    insert into public.profiles (id, username, needs_username)
    values (new.id, picked, true)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
