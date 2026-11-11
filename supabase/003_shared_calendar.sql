-- Run once in the Supabase SQL editor, after 002_profile_on_signup.sql.
-- Moves from "each coach owns their sessions and players" to one shared club:
-- every coach sees every player, a Monday is claimed by one coach, and the
-- calendar (coach + attendance) is readable by everyone who is logged in.

-- ========== SESSIONS ==========
-- A session can exist without a coach, there is one per date, and removing a
-- coach's account must not erase the history.

alter table public.sessions alter column coach_id drop not null;

alter table public.sessions
  drop constraint sessions_coach_id_fkey,
  add constraint sessions_coach_id_fkey
    foreign key (coach_id) references public.profiles(id) on delete set null;

alter table public.sessions add constraint sessions_date_key unique (date);

-- ========== SHARED PLAYERS ==========
-- These keep their names so the existing policies stay valid, but "my player"
-- now means any registered player, and "my coach" any registered coach.

create or replace function private.is_my_player(p_player_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_coach() and exists (
    select 1 from public.profiles p where p.id = p_player_id and p.role = 'player'
  );
$$;

create or replace function private.is_my_coach(p_coach_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = p_coach_id and p.role = 'coach'
  );
$$;

drop function public.add_player_to_roster(text);
drop table public.coach_players;

-- ========== ACCESS ==========
-- Logged-out visitors get nothing, whatever the project's default grants are.
revoke all on all tables in schema public from anon;

-- Everyone logged in can see names (calendar, attendance), but not emails.
drop policy "profiles_select_own_or_roster" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
revoke select on public.profiles from authenticated;
grant select (id, role, full_name) on public.profiles to authenticated;

-- Sessions are read by all. Claiming goes through the functions below; the
-- assigned coach can only edit the location and notes directly.
drop policy "sessions_coach_crud" on public.sessions;
drop policy "sessions_player_select" on public.sessions;
revoke all on public.sessions from authenticated;
grant select on public.sessions to authenticated;
grant update (location, notes) on public.sessions to authenticated;

create policy "sessions_select_all" on public.sessions
  for select to authenticated using (true);
create policy "sessions_update_own" on public.sessions
  for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Attendance is read by all, written by the session's coach (existing policy).
drop policy "session_attendance_player_select" on public.session_attendance;
create policy "session_attendance_select_all" on public.session_attendance
  for select to authenticated using (true);

-- ========== CLAIM / RELEASE A DATE ==========

create function public.claim_session(p_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not private.is_coach() then
    raise exception 'Reserve aux coachs' using errcode = '42501';
  end if;
  if p_date < (now() at time zone 'Europe/Paris')::date then
    raise exception 'Cette seance est deja passee' using errcode = '22023';
  end if;

  -- One atomic statement: if two coaches tap at once, only one gets the date.
  insert into public.sessions (date, coach_id)
  values (p_date, auth.uid())
  on conflict (date) do update
    set coach_id = excluded.coach_id
    where public.sessions.coach_id is null
  returning id into v_id;

  if v_id is null then
    raise exception 'Un coach est deja positionne sur cette seance' using errcode = '23505';
  end if;
end;
$$;

create function public.release_session(p_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  update public.sessions s
  set coach_id = null
  where s.date = p_date
    and s.coach_id = auth.uid()
    and s.date >= (now() at time zone 'Europe/Paris')::date
  returning s.id into v_id;

  if v_id is null then
    raise exception 'Vous n''etes pas le coach de cette seance a venir' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.claim_session(date) from public, anon;
revoke all on function public.release_session(date) from public, anon;
grant execute on function public.claim_session(date) to authenticated;
grant execute on function public.release_session(date) to authenticated;
