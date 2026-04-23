-- Stage 5 security: auto-seed a profiles row for OAuth (non-email) sign-ups.
-- Email sign-ups create the profile row inline from app code with a
-- user-chosen username, so this trigger skips the 'email' provider to avoid
-- racing with that insert. OAuth providers (google, etc.) land the user on
-- their destination page directly, where there's no hook to create a
-- profile — so the database seeds one here.

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

    insert into public.profiles (id, username)
    values (new.id, picked)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
