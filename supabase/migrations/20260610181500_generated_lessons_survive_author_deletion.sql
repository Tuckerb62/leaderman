-- Published lessons are shared canon and must outlive the account that
-- generated them. Deleting a user keeps their lessons, with attribution
-- cleared.
alter table public.generated_lessons alter column generated_by drop not null;
alter table public.generated_lessons drop constraint generated_lessons_generated_by_fkey;
alter table public.generated_lessons
  add constraint generated_lessons_generated_by_fkey
  foreign key (generated_by) references auth.users (id) on delete set null;
