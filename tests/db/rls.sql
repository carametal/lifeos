create schema test;
grant usage on schema test to anon, authenticated;
create function test.ok(value boolean, message text) returns void language plpgsql as $$
begin
  if value is distinct from true then raise exception 'FAIL: %', message; end if;
  raise notice 'PASS: %', message;
end;
$$;
create function test.denied(statement text, expected_state text, message text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate <> expected_state then raise; end if;
    raise notice 'PASS: %', message;
    return;
  end;
  raise exception 'FAIL: % (query unexpectedly succeeded)', message;
end;
$$;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
select test.ok((select count(*) = 2 from public.profiles), 'auth users receive profiles');
set role anon;
select test.denied('select * from public.profiles', '42501', 'anon cannot read profiles');
select test.denied('select * from public.food_logs', '42501', 'anon cannot read food');
select test.denied('select * from public.nutrition_goals', '42501', 'anon cannot read goals');
select test.denied('insert into public.food_logs(eaten_at,meal_type,content) values(now(),''snack'',''test'')', '42501', 'anon cannot write food');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select test.ok((select count(*) = 1 from public.profiles), 'user sees own profile only');
update public.profiles set display_name = 'Test A';
select test.denied('update public.profiles set id = ''00000000-0000-4000-8000-000000000002''', '42501', 'profile ownership cannot change');
insert into public.nutrition_goals(effective_from, calories_kcal) values ('2026-09-26',2000);
insert into public.nutrition_goals(effective_from, calories_kcal, revision) values ('2026-09-26',2100,99);
select test.ok((select array_agg(revision order by revision) = array[1,2] from public.nutrition_goals), 'goal revision assigned and history retained');
select test.denied('update public.nutrition_goals set calories_kcal=1', '42501', 'goals cannot be overwritten');
select test.denied('delete from public.nutrition_goals', '42501', 'goals cannot be deleted');
select test.denied('insert into public.nutrition_goals(user_id,effective_from) values (''00000000-0000-4000-8000-000000000002'',''2026-09-26'')', '42501', 'cannot insert goals for another user');
insert into public.food_logs(id,eaten_at,meal_type,content,calories_kcal) values ('10000000-0000-4000-8000-000000000001','2026-09-25T15:00:00Z','breakfast','Test meal A',0);
select test.ok((select protein_g is null and calories_kcal = 0 from public.food_logs), 'unknown and zero remain distinct');
select test.ok((select (eaten_at at time zone 'Asia/Tokyo')::date = date '2026-09-26' from public.food_logs), 'JST boundary preserved');
select test.denied('update public.food_logs set user_id = ''00000000-0000-4000-8000-000000000002''', '42501', 'food ownership cannot change');
select test.denied('insert into public.food_logs(user_id,eaten_at,meal_type,content) values(''00000000-0000-4000-8000-000000000002'',now(),''snack'',''test'')', '42501', 'cannot insert food for another user');
select test.denied('update public.food_logs set protein_g=-1', '23514', 'negative nutrition rejected');
select test.denied('update public.food_logs set calories_kcal=''NaN''', '23514', 'NaN rejected');
select test.denied('update public.food_logs set meal_type=''invalid''', '23514', 'invalid meal type rejected');
select test.denied('update public.food_logs set content=''''', '23514', 'empty content rejected');
update public.food_logs set content='Edited A';
select test.ok((select content = 'Edited A' from public.food_logs), 'owner can edit');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select test.ok((select count(*) = 0 from public.food_logs), 'other user cannot read food');
select test.ok((select count(*) = 0 from public.nutrition_goals), 'other user cannot read goals');
with changed as (update public.food_logs set content='stolen' where id='10000000-0000-4000-8000-000000000001' returning id)
select test.ok((select count(*)=0 from changed), 'other user cannot edit by ID');
with removed as (delete from public.food_logs where id='10000000-0000-4000-8000-000000000001' returning id)
select test.ok((select count(*)=0 from removed), 'other user cannot delete by ID');
insert into public.food_logs(eaten_at,meal_type,content) values(now(),'snack','Test meal B');
select test.ok((select count(*)=1 from public.food_logs), 'second owner can insert own food');
set request.jwt.claim.sub = '';
select test.ok((select count(*)=0 from public.food_logs), 'missing identity sees no rows');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
with removed as (delete from public.food_logs returning id)
select test.ok((select count(*)=1 from removed), 'owner can delete own food');
reset role;
select test.ok((select count(*)=1 from public.food_logs), 'other users food survived deletion');
select test.ok(not has_function_privilege('authenticated','public.handle_new_user()','EXECUTE'), 'profile provisioning RPC not exposed');
