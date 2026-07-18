begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
create schema if not exists user_data;
revoke all on schema private, user_data from public, anon, authenticated;

do $$ begin create type public.profile_status as enum ('pending','active','blocked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.profile_role as enum ('user','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.table_access as enum ('read','write'); exception when duplicate_object then null; end $$;
do $$ begin create type public.workspace_node_kind as enum ('folder','table'); exception when duplicate_object then null; end $$;
do $$ begin create type public.pending_action_status as enum ('pending','approved','rejected','expired','executing','executed','failed'); exception when duplicate_object then null; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '', status public.profile_status not null default 'pending',
  role public.profile_role not null default 'user', created_at timestamptz not null default now(),
  approved_at timestamptz, approved_by uuid references public.profiles(id),
  constraint display_name_length check (length(display_name) <= 120)
);
create table public.bot_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  telegram_user_id bigint not null unique, telegram_chat_id bigint not null,
  telegram_username text, connected_at timestamptz not null default now()
);
create table public.bot_link_tokens (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique, expires_at timestamptz not null, consumed_at timestamptz, created_at timestamptz not null default now()
);
create table public.data_tables (
  id uuid primary key default gen_random_uuid(), physical_name name not null unique,
  display_name text not null, description text not null default '', owner_id uuid not null references public.profiles(id),
  schema_definition jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint data_table_display_name_length check (length(display_name) between 1 and 120),
  constraint physical_name_generated check (physical_name::text ~ '^t_[0-9a-f]{32}$')
);
create table public.data_table_permissions (
  table_id uuid not null references public.data_tables(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  access public.table_access not null, granted_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
  primary key(table_id,user_id)
);
create table public.workspace_nodes (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.workspace_nodes(id) on delete cascade, kind public.workspace_node_kind not null,
  table_id uuid references public.data_tables(id) on delete cascade, title text not null, position integer not null default 0,
  constraint node_table_shape check ((kind='table' and table_id is not null) or (kind='folder' and table_id is null))
);
create table public.conversation_threads (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  telegram_chat_id bigint not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,telegram_chat_id)
);
create table public.attachments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), storage_path text not null unique,
  media_type text not null, size_bytes bigint not null, source text not null, created_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversation_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id), telegram_message_id bigint, role text not null check(role in ('user','assistant','tool')),
  content text not null, attachment_id uuid references public.attachments(id), created_at timestamptz not null default now()
);
create table public.pending_actions (
  id uuid primary key default gen_random_uuid(), requested_by uuid not null references public.profiles(id), action_type text not null,
  frozen_payload jsonb not null, payload_hash text not null, status public.pending_action_status not null default 'pending',
  expires_at timestamptz not null, executed_at timestamptz, last_error text, created_at timestamptz not null default now()
);
create table public.inbound_events (
  id uuid primary key default gen_random_uuid(), source text not null, external_event_id text not null,
  payload jsonb not null, status text not null default 'pending' check(status in ('pending','processing','processed','failed','permanent_failure')),
  attempts integer not null default 0, last_error text, security_flag boolean not null default false,
  created_at timestamptz not null default now(), processed_at timestamptz, unique(source,external_event_id)
);
create table public.audit_log (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id), action text not null,
  table_id uuid references public.data_tables(id), affected_rows integer not null default 0, summary text not null,
  request_id text, created_at timestamptz not null default now()
);

create index on public.data_tables(owner_id) where deleted_at is null;
create index on public.data_table_permissions(user_id);
create index on public.messages(conversation_id,created_at desc);
create index on public.pending_actions(status,expires_at);
create index on public.inbound_events(status,created_at);

alter table public.profiles enable row level security;
alter table public.data_tables enable row level security;
alter table public.data_table_permissions enable row level security;
alter table public.workspace_nodes enable row level security;
alter table public.bot_connections enable row level security;
alter table public.bot_link_tokens enable row level security;
alter table public.conversation_threads enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.pending_actions enable row level security;
alter table public.inbound_events enable row level security;
alter table public.audit_log enable row level security;

create policy "read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "read accessible table registry" on public.data_tables for select to authenticated using (
  owner_id=(select auth.uid()) or exists(select 1 from public.data_table_permissions p where p.table_id=id and p.user_id=(select auth.uid()))
);
create policy "read own permissions" on public.data_table_permissions for select to authenticated using (user_id=(select auth.uid()));
create policy "read own workspace" on public.workspace_nodes for select to authenticated using (owner_id=(select auth.uid()));
create policy "read own bot connection" on public.bot_connections for select to authenticated using (user_id=(select auth.uid()));

create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name','')); return new; end $$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

insert into storage.buckets(id,name,public,file_size_limit) values('private-attachments','private-attachments',false,10485760)
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.data_tables, public.data_table_permissions, public.workspace_nodes, public.bot_connections to authenticated;

do $$ begin create role jarvis_data nologin noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role jarvis_schema nologin noinherit; exception when duplicate_object then null; end $$;
alter role jarvis_schema bypassrls;
grant usage on schema user_data to jarvis_data, jarvis_schema;
grant create on schema user_data to jarvis_schema;
grant usage on schema public to jarvis_schema;
grant select,insert,update,delete on public.profiles,public.bot_connections,public.bot_link_tokens,
  public.data_tables,public.data_table_permissions,public.workspace_nodes,public.conversation_threads,
  public.messages,public.attachments,public.pending_actions,public.inbound_events,public.audit_log to jarvis_schema;
grant usage,select on all sequences in schema public to jarvis_schema;
alter default privileges in schema user_data grant select,insert,update,delete on tables to jarvis_data;
alter default privileges in schema user_data grant all on tables to jarvis_schema;
revoke create on schema public from public;

commit;
