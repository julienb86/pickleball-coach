-- Run once in the Supabase SQL editor of each project (test first, then
-- main), after 012_wednesday_slots.sql.
-- Lets the administrator turn a coach back into a player.

begin;

-- Upcoming sessions the coach had taken are released, so another coach can
-- take them. Past sessions keep their coach, for the history. Exercises the
-- coach added stay in the library.
create function public.demote_to_player(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Reserve a l''administrateur' using errcode = '42501';
  end if;
  -- The administrator needs the coach space to manage the app.
  if exists (select 1 from private.admins a where a.user_id = p_user_id) then
    raise exception 'L''administrateur doit rester coach' using errcode = '42501';
  end if;

  update public.profiles p set role = 'player' where p.id = p_user_id and p.role = 'coach';
  if not found then
    raise exception 'Ce compte n''est pas coach' using errcode = 'P0002';
  end if;

  update public.sessions s
  set coach_id = null
  where s.coach_id = p_user_id
    and s.date >= (now() at time zone 'Europe/Paris')::date;
end;
$$;

revoke all on function public.demote_to_player(uuid) from public, anon;
grant execute on function public.demote_to_player(uuid) to authenticated;

-- A former coach still recorded on past sessions must no longer be able to
-- edit their attendance or program: being that session's coach now also
-- requires being a coach today.
create or replace function private.is_session_coach(p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_coach()
    and exists (select 1 from public.sessions s where s.id = p_session_id and s.coach_id = auth.uid());
$$;

commit;
