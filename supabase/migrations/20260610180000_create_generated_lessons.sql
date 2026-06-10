create table if not exists public.generated_lessons (
  slot_id text primary key,
  lesson jsonb not null,
  model text not null,
  generated_by uuid not null references auth.users (id),
  verification_notes jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint generated_lessons_lesson_is_object
    check (jsonb_typeof(lesson) = 'object')
);

alter table public.generated_lessons enable row level security;

grant select, insert on table public.generated_lessons to authenticated;
revoke all on table public.generated_lessons from anon;

-- Shared canon: every signed-in user reads every lesson.
create policy "generated_lessons_select_all"
on public.generated_lessons
for select
to authenticated
using (true);

-- A user can fill an empty slot, but only as themselves. The primary key
-- makes the first insert win; there are no update or delete policies, so
-- published canon is immutable from the client.
create policy "generated_lessons_insert_own"
on public.generated_lessons
for insert
to authenticated
with check ((select auth.uid()) = generated_by);
