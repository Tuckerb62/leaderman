create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  app_state jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_profiles_app_state_is_object
    check (jsonb_typeof(app_state) = 'object')
);

alter table public.user_profiles enable row level security;

grant select, insert, update on table public.user_profiles to authenticated;
revoke all on table public.user_profiles from anon;

create policy "user_profiles_select_own"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_profiles_insert_own"
on public.user_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
