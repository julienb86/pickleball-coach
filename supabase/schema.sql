-- Pickleball Coach App — schema + RLS policies (v1)
-- Run this once in the Supabase SQL editor on a fresh project.

-- ========== TABLES ==========

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('coach', 'player')),
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create table public.coach_players (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, player_id)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  difficulty text check (difficulty in ('debutant', 'intermediaire', 'avance')),
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position smallint not null default 0,
  done boolean not null default false
);

create table public.session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  present boolean not null default false,
  unique (session_id, player_id)
);

create table public.skill_ratings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null,
  rating smallint not null check (rating between 1 and 5),
  rated_at timestamptz not null default now(),
  session_id uuid references public.sessions(id) on delete set null
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'achieved')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== API ACCESS ==========
-- Supabase no longer grants new public tables to the API roles automatically.
-- Logged-out visitors (anon) get nothing. What a logged-in user can actually
-- see or change is then narrowed row by row by the RLS policies below.
-- No insert on coach_players: use add_player_to_roster() instead.
-- No update on skill_ratings: each rating is a new row, to keep the history.

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, delete on public.coach_players to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.session_exercises to authenticated;
grant select, insert, update, delete on public.session_attendance to authenticated;
grant select, insert, delete on public.skill_ratings to authenticated;
grant select, insert, update, delete on public.goals to authenticated;

-- ========== RLS HELPERS ==========
-- Policies that read another RLS-protected table can loop forever
-- (sessions -> session_attendance -> sessions...). These functions run with
-- the owner's rights so they skip RLS and break the loop. They live in a
-- private schema so they are not callable through the API.

create schema if not exists private;
grant usage on schema private to authenticated;

create function private.is_coach()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach');
$$;

create function private.is_session_coach(p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sessions s where s.id = p_session_id and s.coach_id = auth.uid());
$$;

create function private.attended_session(p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.session_attendance sa
    where sa.session_id = p_session_id and sa.player_id = auth.uid() and sa.present
  );
$$;

create function private.attended_exercise(p_exercise_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.session_exercises se
    join public.session_attendance sa on sa.session_id = se.session_id
    where se.exercise_id = p_exercise_id and sa.player_id = auth.uid() and sa.present
  );
$$;

create function private.is_my_player(p_player_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.coach_players cp
    where cp.coach_id = auth.uid() and cp.player_id = p_player_id
  );
$$;

create function private.is_my_coach(p_coach_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.coach_players cp
    where cp.coach_id = p_coach_id and cp.player_id = auth.uid()
  );
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- ========== RLS POLICIES ==========

alter table public.profiles enable row level security;
alter table public.coach_players enable row level security;
alter table public.exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.session_attendance enable row level security;
alter table public.skill_ratings enable row level security;
alter table public.goals enable row level security;

-- profiles: see your own row, or (if coach) your roster players' rows
create policy "profiles_select_own_or_roster" on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.is_my_player(id));

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- coach_players: coach reads and removes; player can see who their coach is
create policy "coach_players_select" on public.coach_players
  for select to authenticated
  using (coach_id = auth.uid() or player_id = auth.uid());

create policy "coach_players_delete" on public.coach_players
  for delete to authenticated
  using (coach_id = auth.uid());

-- exercises: coach owns theirs; players read those of sessions they attended
create policy "exercises_coach_crud" on public.exercises
  for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "exercises_player_select" on public.exercises
  for select to authenticated
  using (private.attended_exercise(id));

-- sessions: coach owns theirs; players read the sessions they attended
create policy "sessions_coach_crud" on public.sessions
  for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "sessions_player_select" on public.sessions
  for select to authenticated
  using (private.attended_session(id));

-- session_exercises: follows the parent session
create policy "session_exercises_coach_crud" on public.session_exercises
  for all to authenticated
  using (private.is_session_coach(session_id))
  with check (private.is_session_coach(session_id));

create policy "session_exercises_player_select" on public.session_exercises
  for select to authenticated
  using (private.attended_session(session_id));

-- session_attendance: coach manages their sessions, for their own players
create policy "session_attendance_coach_crud" on public.session_attendance
  for all to authenticated
  using (private.is_session_coach(session_id))
  with check (private.is_session_coach(session_id) and private.is_my_player(player_id));

create policy "session_attendance_player_select" on public.session_attendance
  for select to authenticated
  using (player_id = auth.uid());

-- skill_ratings: coach rates their own players; player reads own ratings
create policy "skill_ratings_coach_crud" on public.skill_ratings
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and private.is_my_player(player_id));

create policy "skill_ratings_player_select" on public.skill_ratings
  for select to authenticated
  using (player_id = auth.uid());

-- goals: coach manages goals of their players; player reads, updates, and
-- adds their own (see goals_before_update for what a player may change)
create policy "goals_coach_crud" on public.goals
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and private.is_my_player(player_id));

create policy "goals_player_select" on public.goals
  for select to authenticated
  using (player_id = auth.uid());

create policy "goals_player_update" on public.goals
  for update to authenticated
  using (player_id = auth.uid()) with check (player_id = auth.uid());

create policy "goals_player_insert" on public.goals
  for insert to authenticated
  with check (player_id = auth.uid() and created_by = auth.uid() and private.is_my_coach(coach_id));

-- ========== TRIGGERS ==========

-- A user cannot change their own role after signup.
create function private.profiles_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Le role ne peut pas etre modifie' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function private.profiles_before_update();

-- Keeps updated_at current, stops goals being moved to someone else, and
-- stops a player rewording a goal the coach wrote (status stays editable).
create function private.goals_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.coach_id is distinct from old.coach_id
     or new.player_id is distinct from old.player_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Un objectif ne peut pas changer de proprietaire' using errcode = '42501';
  end if;
  if auth.uid() = old.player_id
     and old.created_by <> auth.uid()
     and new.title is distinct from old.title then
    raise exception 'Seul le coach peut modifier le titre de cet objectif' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger goals_before_update
  before update on public.goals
  for each row execute function private.goals_before_update();

-- ========== API FUNCTIONS ==========

-- A coach adds an already registered player by email. This has to be a
-- function: RLS rightly hides other users' profiles from a plain query.
create function public.add_player_to_roster(p_email text)
returns table (id uuid, full_name text, email text)
language plpgsql security definer set search_path = '' as $$
declare
  v_player_id uuid;
begin
  if not private.is_coach() then
    raise exception 'Reserve aux coachs' using errcode = '42501';
  end if;

  select p.id into v_player_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'player' and lower(u.email) = lower(trim(p_email));

  if v_player_id is null then
    raise exception 'Aucun joueur inscrit avec cet email' using errcode = 'P0002';
  end if;

  insert into public.coach_players (coach_id, player_id)
  values (auth.uid(), v_player_id)
  on conflict do nothing;

  return query
    select p.id, p.full_name, p.email from public.profiles p where p.id = v_player_id;
end;
$$;

revoke all on function public.add_player_to_roster(text) from public, anon;
grant execute on function public.add_player_to_roster(text) to authenticated;
