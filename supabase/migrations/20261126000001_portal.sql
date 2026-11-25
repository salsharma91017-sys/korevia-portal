-- KoreVia client portal: progress, test evidence and module acceptance for M-Powered Pathways.
-- Reads go through row level security (any signed-in portal user). All writes are made by the app's
-- server code after it has checked the person's role, using the service role.

create type public.portal_role   as enum ('owner', 'client', 'tester', 'viewer');
create type public.module_status as enum ('backlog', 'in_development', 'ready_for_review', 'accepted');

-- People ----------------------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.portal_role not null default 'viewer',
  created_at  timestamptz not null default now()
);

-- Every new login starts as a read-only viewer. The owner sets the real role (see README).
create or replace function public.portal_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger portal_on_auth_user_created
  after insert on auth.users for each row execute function public.portal_new_user();

-- Scope (Schedule A) -----------------------------------------------------------------------------
create table public.modules (
  n                   integer primary key,
  name                text not null,
  amount_cents        integer not null check (amount_cents >= 0),
  due_date            date,
  uat_url             text,
  ai_assist           text,
  status              public.module_status not null default 'backlog',
  status_changed_at   timestamptz not null default now(),
  status_changed_by   uuid references public.profiles (id)
);

create table public.features (
  id         serial primary key,
  module_n   integer not null references public.modules (n) on delete cascade,
  sort       integer not null,
  title      text not null,
  tier       text not null check (tier in ('core', 'optional')),
  phase      integer not null check (phase between 1 and 3),
  note       text
);
create index features_module_idx on public.features (module_n, sort);

-- Test guides and cases (pushed from the Pathways repo by CI) ------------------------------------
create table public.guides (
  feature_code  text primary key,           -- F05
  module_n      integer not null references public.modules (n),
  title         text not null,
  roles         text,
  body_md       text not null,
  kb_article    text,
  sort          integer not null default 0,
  updated_at    timestamptz not null default now()
);

create table public.guide_cases (
  case_id       text primary key,           -- F05-01
  feature_code  text not null references public.guides (feature_code) on delete cascade,
  module_n      integer not null references public.modules (n),
  title         text not null,
  sort          integer not null default 0,
  automated     boolean not null default true
);

-- Automatic test runs ----------------------------------------------------------------------------
create table public.runs (
  id          uuid primary key default gen_random_uuid(),
  module_n    integer not null references public.modules (n),
  commit_sha  text not null,
  branch      text,
  run_url     text,
  total       integer not null default 0,
  passed      integer not null default 0,
  failed      integer not null default 0,
  pack_path   text,
  complete    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index runs_module_idx on public.runs (module_n, created_at desc);

create table public.run_results (
  run_id    uuid not null references public.runs (id) on delete cascade,
  case_id   text not null,
  status    text not null check (status in ('pass', 'fail')),
  error     text,
  primary key (run_id, case_id)
);

create table public.run_screenshots (
  run_id  uuid not null references public.runs (id) on delete cascade,
  name    text not null,                    -- F05-01-s2-invitation-sent
  path    text not null,
  primary key (run_id, name)
);

-- Results recorded by people --------------------------------------------------------------------
create table public.manual_results (
  id                uuid primary key default gen_random_uuid(),
  module_n          integer not null references public.modules (n),
  case_id           text not null,
  status            text not null check (status in ('pass', 'fail')),
  notes             text,
  screenshot_paths  text[] not null default '{}',
  tester_id         uuid references public.profiles (id),
  tester_name       text not null,
  created_at        timestamptz not null default now()
);
create index manual_results_idx on public.manual_results (module_n, case_id, created_at desc);

-- Change notes (docs/log in the Pathways repo) ---------------------------------------------------
create table public.change_notes (
  slug            text primary key,
  module_n        integer not null references public.modules (n),
  note_date       date,
  title           text not null,
  note_type       text,
  deviation       text,
  needs_approval  text,
  migrations      text,
  body_md         text not null,
  updated_at      timestamptz not null default now()
);

-- Status history, change requests and acceptances (never edited, never deleted) -------------------
create table public.status_events (
  id           bigserial primary key,
  module_n     integer not null references public.modules (n),
  from_status  public.module_status,
  to_status    public.module_status not null,
  by_id        uuid references public.profiles (id),
  by_name      text not null,
  note         text,
  at           timestamptz not null default now()
);

create table public.change_requests (
  id            uuid primary key default gen_random_uuid(),
  module_n      integer not null references public.modules (n),
  by_id         uuid references public.profiles (id),
  by_name       text not null,
  body          text not null,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_note text
);

create table public.acceptances (
  id             uuid primary key default gen_random_uuid(),
  module_n       integer not null references public.modules (n),
  by_id          uuid references public.profiles (id),
  by_name        text not null,
  by_email       text not null,
  typed_name     text not null,
  comment        text,
  amount_cents   integer not null,
  run_id         uuid references public.runs (id),
  commit_sha     text,
  summary        jsonb not null default '{}'::jsonb,
  accepted_at    timestamptz not null default now()
);

create or replace function public.portal_block_changes()
returns trigger language plpgsql as $$
begin
  raise exception 'append_only' using hint = 'Acceptance and status history cannot be edited or deleted.';
end $$;

create trigger acceptances_append_only    before update or delete on public.acceptances    for each row execute function public.portal_block_changes();
create trigger status_events_append_only  before update or delete on public.status_events  for each row execute function public.portal_block_changes();

-- Access ----------------------------------------------------------------------------------------
create or replace function public.portal_is_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()))
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','modules','features','guides','guide_cases','runs','run_results','run_screenshots',
                           'manual_results','change_notes','status_events','change_requests','acceptances']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    if t = 'profiles' then
      execute 'create policy profiles_read on public.profiles for select to authenticated using (public.portal_is_user())';
    else
      execute format('create policy %I on public.%I for select to authenticated using (public.portal_is_user())', t || '_read', t);
    end if;
  end loop;
end $$;

revoke all on function public.portal_is_user() from public, anon;
grant execute on function public.portal_is_user() to authenticated, service_role;
grant usage, select on all sequences in schema public to service_role;

-- Private file store for screenshots and test packs. Nothing is public; the app signs short-lived links.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false) on conflict (id) do nothing;
  end if;
end $$;
