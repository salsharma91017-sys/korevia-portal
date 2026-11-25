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
select 'ALL PORTAL DATABASE TESTS PASSED' as result;
