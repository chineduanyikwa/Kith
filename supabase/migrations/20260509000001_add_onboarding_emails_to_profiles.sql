-- Track which behaviour-triggered onboarding emails have been sent to each
-- profile so the daily cron in app/api/cron/onboarding/route.ts never
-- double-sends. Values appended to this array: 'day3_nudge',
-- 'day7_checkin', 'first_action', 'first_action_followup'.

alter table public.profiles
  add column if not exists onboarding_emails text[] not null default '{}';
