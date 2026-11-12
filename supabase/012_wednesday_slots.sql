-- Run once in the Supabase SQL editor of each project (test first, then
-- main), after 011_delete_own_account.sql.
-- Sessions now also take place on Wednesday, in two independent slots
-- (18h-20h and 20h-22h): each has its own coach, attendance and program.
-- Monday keeps its single session. The schedule is also written in
-- src/lib/dates.ts (SCHEDULE): change both together.

begin;

-- ========== SLOTS ==========
-- 'unique' = the only session of the day (Monday). Existing sessions get it.

alter table public.sessions add column slot text not null default 'unique';
alter table public.sessions alter column slot drop default;
alter table public.sessions
  add constraint sessions_slot_check check (slot in ('unique', '18-20', '20-22'));

-- One session per date and slot, instead of one per date.
alter table public.sessions drop constraint sessions_date_key;
alter table public.sessions add constraint sessions_date_slot_key unique (date, slot);

create function private.is_scheduled_slot(p_date date, p_slot text)
returns boolean language sql immutable set search_path = '' as $$
  select case extract(isodow from p_date)
    when 1 then p_slot = 'unique'
    when 3 then p_slot in ('18-20', '20-22')
    else false
  end;
$$;
revoke all on function private.is_scheduled_slot(date, text) from public;
grant execute on function private.is_scheduled_slot(date, text) to authenticated;

-- ========== CLAIM / RELEASE A SLOT ==========
-- Same rules as before (003), per slot instead of per date.

drop function public.claim_session(date);
drop function public.release_session(date);

create function public.claim_session(p_date date, p_slot text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not private.is_coach() then
    raise exception 'Reserve aux coachs' using errcode = '42501';
  end if;
  if not private.is_scheduled_slot(p_date, p_slot) then
    raise exception 'Pas de seance prevue a ce creneau' using errcode = '22023';
  end if;
  if p_date < (now() at time zone 'Europe/Paris')::date then
    raise exception 'Cette seance est deja passee' using errcode = '22023';
  end if;

  -- One atomic statement: if two coaches tap at once, only one gets the slot.
  insert into public.sessions (date, slot, coach_id)
  values (p_date, p_slot, auth.uid())
  on conflict (date, slot) do update
    set coach_id = excluded.coach_id
    where public.sessions.coach_id is null
  returning id into v_id;

  if v_id is null then
    raise exception 'Un coach est deja positionne sur ce creneau' using errcode = '23505';
  end if;
end;
$$;

create function public.release_session(p_date date, p_slot text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  update public.sessions s
  set coach_id = null
  where s.date = p_date
    and s.slot = p_slot
    and s.coach_id = auth.uid()
    and s.date >= (now() at time zone 'Europe/Paris')::date
  returning s.id into v_id;

  if v_id is null then
    raise exception 'Vous n''etes pas le coach de ce creneau a venir' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.claim_session(date, text) from public, anon;
revoke all on function public.release_session(date, text) from public, anon;
grant execute on function public.claim_session(date, text) to authenticated;
grant execute on function public.release_session(date, text) to authenticated;

commit;
