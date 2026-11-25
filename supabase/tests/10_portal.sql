\set ON_ERROR_STOP on
do $$
declare v_uid uuid; v_n integer; v_msg text;
begin
  -- a new login becomes a read-only viewer
  insert into auth.users (email) values ('viewer@example.test') returning id into v_uid;
  if (select role from public.profiles where id = v_uid) <> 'viewer' then raise exception 'new login should be viewer'; end if;

  -- a signed-in portal user can read the scope; an anonymous caller cannot
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid)::text, true);
  set local role authenticated;
  select count(*) into v_n from public.modules;
  if v_n <> 18 then raise exception 'signed-in user should see 18 modules, saw %', v_n; end if;
  begin
    insert into public.modules (n, name, amount_cents) values (99, 'x', 1);
    raise exception 'signed-in user must not be able to write';
  exception when insufficient_privilege then null; end;
  reset role;

  set local role anon;
  begin
    perform count(*) from public.modules;
    raise exception 'anonymous must not read';
  exception when insufficient_privilege then null; end;
  reset role;

  -- a login with no profile sees nothing
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid())::text, true);
  set local role authenticated;
  select count(*) into v_n from public.modules;
  if v_n <> 0 then raise exception 'stranger should see 0 modules, saw %', v_n; end if;
  reset role;

  -- acceptances and status history cannot be changed
  insert into public.acceptances (module_n, by_name, by_email, typed_name, amount_cents) values (1, 'A', 'a@example.test', 'A', 100);
  begin
    update public.acceptances set comment = 'x';
    raise exception 'acceptance update must fail';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg <> 'append_only' then raise; end if;
  end;
  begin
    delete from public.acceptances;
    raise exception 'acceptance delete must fail';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg <> 'append_only' then raise; end if;
  end;
end $$;

-- email notifications: switched on by default; the log is readable by the owner only
do $$
declare v_viewer uuid; v_owner uuid; v_n integer;
begin
  select id into v_viewer from public.profiles where email = 'viewer@example.test';
  if not (select notify_email from public.profiles where id = v_viewer) then raise exception 'notify_email should default to true'; end if;

  insert into auth.users (email) values ('owner@example.test') returning id into v_owner;
  update public.profiles set role = 'owner' where id = v_owner;
  insert into public.notification_log (event, module_n, to_email, subject, ok, detail) values ('test', null, 'x@example.test', 's', true, 'id');

  perform set_config('request.jwt.claims', json_build_object('sub', v_owner)::text, true);
  set local role authenticated;
  select count(*) into v_n from public.notification_log;
  if v_n <> 1 then raise exception 'owner should read the email log, saw %', v_n; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', v_viewer)::text, true);
  set local role authenticated;
  select count(*) into v_n from public.notification_log;
  if v_n <> 0 then raise exception 'viewer must not read the email log, saw %', v_n; end if;
  begin
    insert into public.notification_log (event, to_email, subject, ok) values ('test', 'y@example.test', 's', true);
    raise exception 'signed-in user must not be able to write the email log';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;
do $$
begin
  if (select paid_cents from public.modules where n = 1) <> 500000 then raise exception 'module 1 should be marked paid ($5,000)'; end if;
  if (select count(*) from public.modules where paid_cents > 0) <> 1 then raise exception 'only module 1 should be marked paid'; end if;
end $$;
do $$
begin
  if (select title from public.features where module_n = 1 and sort = 1) not like '%Practice ID%' then raise exception 'module 1 line 1 should show the agreed Practice ID wording'; end if;
  if (select note from public.features where module_n = 1 and sort = 1) not like '%approved by Dee in writing%' then raise exception 'module 1 line 1 should record the approval'; end if;
end $$;
select 'ALL PORTAL DATABASE TESTS PASSED' as result;
