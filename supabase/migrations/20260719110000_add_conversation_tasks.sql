begin;

do $$ begin
  create type public.conversation_task_status as enum ('running','awaiting_input','awaiting_confirmation','completed','failed','cancelled');
exception when duplicate_object then null;
end $$;

create table public.conversation_tasks (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversation_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_intent text not null,
  source_text text not null,
  gathered_facts jsonb not null default '{}'::jsonb,
  unresolved_ambiguity jsonb not null default '[]'::jsonb,
  current_step integer not null default 0 check (current_step >= 0),
  plan jsonb not null default '[]'::jsonb,
  status public.conversation_task_status not null default 'running',
  retry_count integer not null default 0 check (retry_count >= 0),
  last_error text,
  verified_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index conversation_tasks_active_by_conversation
  on public.conversation_tasks(conversation_id, updated_at desc)
  where status in ('running','awaiting_input','awaiting_confirmation');

alter table public.conversation_tasks enable row level security;
grant select, insert, update, delete on public.conversation_tasks to jarvis_schema;

commit;
