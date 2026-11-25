-- Email notifications --------------------------------------------------------------------------
-- Each person can switch portal emails off (the owner does this on the People page).
alter table public.profiles add column if not exists notify_email boolean not null default true;

-- A simple record of every email the portal tried to send, so a missing email can be traced.
-- Written only by the server (service role). Only the owner can read it.
create table if not exists public.notification_log (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  event       text not null,             -- ready_for_review | accepted | changes_requested | test
  module_n    integer references public.modules (n),
  to_email    text not null,
  subject     text not null,
  ok          boolean not null,
  detail      text                       -- provider id on success, a short reason on failure or skip
);
create index if not exists notification_log_created_idx on public.notification_log (created_at desc);

create or replace function public.portal_is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
$$;
revoke all on function public.portal_is_owner() from public, anon;
grant execute on function public.portal_is_owner() to authenticated, service_role;

alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon, authenticated;
grant select on public.notification_log to authenticated;
drop policy if exists notification_log_owner_read on public.notification_log;
create policy notification_log_owner_read on public.notification_log for select to authenticated using (public.portal_is_owner());

grant all on public.notification_log to service_role;
grant usage, select on all sequences in schema public to service_role;
