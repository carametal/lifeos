begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  timezone text not null default 'Asia/Tokyo' check (timezone = 'Asia/Tokyo'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  effective_from date not null check (effective_from between date '1900-01-01' and date '2200-12-31'),
  revision integer not null check (revision > 0),
  calories_kcal numeric(8,2) check (calories_kcal > 0 and calories_kcal <= 100000),
  protein_g numeric(8,2) check (protein_g > 0 and protein_g <= 10000),
  fat_g numeric(8,2) check (fat_g > 0 and fat_g <= 10000),
  carbs_g numeric(8,2) check (carbs_g > 0 and carbs_g <= 10000),
  fiber_g numeric(8,2) check (fiber_g > 0 and fiber_g <= 10000),
  created_at timestamptz not null default now(),
  unique(user_id, effective_from, revision)
);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  eaten_at timestamptz not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  calories_kcal numeric(8,2) check (calories_kcal >= 0 and calories_kcal <= 100000),
  protein_g numeric(8,2) check (protein_g >= 0 and protein_g <= 10000),
  fat_g numeric(8,2) check (fat_g >= 0 and fat_g <= 10000),
  carbs_g numeric(8,2) check (carbs_g >= 0 and carbs_g <= 10000),
  fiber_g numeric(8,2) check (fiber_g >= 0 and fiber_g <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_logs_user_eaten_at_idx on public.food_logs(user_id, eaten_at);

-- Explicitly enable RLS even if the project's automatic RLS option is enabled.
alter table public.profiles enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.food_logs enable row level security;

revoke all on public.profiles, public.nutrition_goals, public.food_logs from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert on public.nutrition_goals to authenticated;
grant select, insert, update, delete on public.food_logs to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy goals_select_own on public.nutrition_goals for select to authenticated using ((select auth.uid()) = user_id);
create policy goals_insert_own on public.nutrition_goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy food_select_own on public.food_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy food_insert_own on public.food_logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy food_update_own on public.food_logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy food_delete_own on public.food_logs for delete to authenticated using ((select auth.uid()) = user_id);

create function public.set_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger food_updated_at before update on public.food_logs for each row execute function public.set_updated_at();

-- Lock the user's profile row so concurrent revisions serialize. No privileged RPC.
create function public.assign_goal_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() <> new.user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = new.user_id for no key update;
  select coalesce(max(revision), 0) + 1 into new.revision
    from public.nutrition_goals where user_id = new.user_id and effective_from = new.effective_from;
  new.created_at := now();
  return new;
end;
$$;
revoke all on function public.assign_goal_revision() from public, anon, authenticated;
create trigger goals_revision before insert on public.nutrition_goals for each row execute function public.assign_goal_revision();

-- Only the auth.users trigger uses elevated rights to provision profiles.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values(new.id);
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

-- AI data columns and usage ledger will be added in Phase 5.
commit;
