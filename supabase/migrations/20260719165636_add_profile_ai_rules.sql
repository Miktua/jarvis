begin;

alter table public.profiles
  add column if not exists ai_rules jsonb not null default '[]'::jsonb,
  add constraint profiles_ai_rules_array check (jsonb_typeof(ai_rules) = 'array');

commit;
