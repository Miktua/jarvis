begin;

alter table public.data_tables
  add column if not exists ai_rules jsonb not null default '[]'::jsonb,
  add constraint data_tables_ai_rules_array check (jsonb_typeof(ai_rules) = 'array');

commit;
