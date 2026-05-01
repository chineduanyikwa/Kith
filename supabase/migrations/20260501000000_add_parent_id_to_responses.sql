-- Adds reply threading to responses. Top-level responses have parent_id null;
-- replies point at the response they answer. The 2-level depth limit
-- (helper → post author → helper) is enforced in application logic for now.

alter table public.responses
  add column parent_id bigint references public.responses(id) on delete cascade;

create index responses_parent_id_idx on public.responses(parent_id);
