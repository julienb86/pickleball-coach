-- Run once in the Supabase SQL editor of each project (test first, then
-- main), after 014_admin_set_password.sql. Does not depend on 015.
-- Lets the administrator put any coach on an upcoming session, replace the
-- coach already there, or remove them. Past sessions keep their coach, for
-- the history. The session's program stays: the new coach takes it over.

begin;

-- p_coach_id null = no coach on that slot any more.
create function public.admin_assign_session(p_date date, p_slot text, p_coach_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Reserve a l''administrateur' using errcode = '42501';
  end if;
  if not private.is_scheduled_slot(p_date, p_slot) then
    raise exception 'Pas de seance prevue a ce creneau' using errcode = '22023';
  end if;
  if p_date < (now() at time zone 'Europe/Paris')::date then
    raise exception 'Cette seance est deja passee' using errcode = '22023';
  end if;

  if p_coach_id is null then
    update public.sessions s set coach_id = null where s.date = p_date and s.slot = p_slot;
    return;
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = p_coach_id and p.role = 'coach' and p.approved
  ) then
    raise exception 'Ce compte n''est pas coach' using errcode = '22023';
  end if;

  insert into public.sessions (date, slot, coach_id)
  values (p_date, p_slot, p_coach_id)
  on conflict (date, slot) do update set coach_id = excluded.coach_id;
end;
$$;

revoke all on function public.admin_assign_session(date, text, uuid) from public, anon;
grant execute on function public.admin_assign_session(date, text, uuid) to authenticated;

commit;
