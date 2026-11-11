-- Run once in the Supabase SQL editor, after 006_account_approval.sql, then
-- run 008_exercise_library_seed.sql.
-- The exercises become one library shared by all coaches, who can add, edit
-- and delete them. The coach of a session builds its program by copying
-- exercises from the library: a copy can be adapted for that session without
-- changing the library, and past sessions keep what was actually done.

begin;

-- ========== LIBRARY ==========
-- category = principle (dink, drop...), difficulty = level. Their lists live
-- in src/lib/exercise-library.ts. coach_id now only records who created the
-- exercise: deleting that coach's account keeps it in the library.

alter table public.exercises alter column coach_id drop not null;
alter table public.exercises alter column coach_id set default auth.uid();
alter table public.exercises
  drop constraint exercises_coach_id_fkey,
  add constraint exercises_coach_id_fkey
    foreign key (coach_id) references public.profiles(id) on delete set null;

-- Order of the exercises within a principle and a level.
alter table public.exercises add column position smallint not null default 0;

drop policy "exercises_coach_crud" on public.exercises;
drop policy "exercises_player_select" on public.exercises;
drop function private.attended_exercise(uuid);

create policy "exercises_coaches_all" on public.exercises
  for all to authenticated
  using (private.is_coach()) with check (private.is_coach());

-- ========== SESSION PROGRAM ==========
-- Each exercise of a session is a copy. exercise_id only remembers where it
-- came from, and becomes empty if that exercise leaves the library. The
-- existing policies stay: the session's coach edits, players who attended read.

alter table public.session_exercises
  add column title text,
  add column description text,
  add column category text,
  add column difficulty text;

update public.session_exercises se
set title = e.title, description = e.description, category = e.category, difficulty = e.difficulty
from public.exercises e
where e.id = se.exercise_id;

alter table public.session_exercises alter column title set not null;
alter table public.session_exercises alter column exercise_id drop not null;
alter table public.session_exercises
  drop constraint session_exercises_exercise_id_fkey,
  add constraint session_exercises_exercise_id_fkey
    foreign key (exercise_id) references public.exercises(id) on delete set null;

commit;
