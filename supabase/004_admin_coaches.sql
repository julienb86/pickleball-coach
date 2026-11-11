-- Run once in the Supabase SQL editor, after 003_shared_calendar.sql.
-- Nobody can make themselves a coach any more: every signup is a player, and
-- only the administrator account can turn a player into a coach.
-- Before running: check that the email in the "YOUR ACCOUNT" block is the one
-- you log into the app with.

begin;

-- ========== ADMINISTRATOR ==========
-- In the private schema, so it cannot be read or changed through the API.

create table private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.admins from public, anon, authenticated;
-- No policy on purpose: only the functions below (run by the table owner,
-- which RLS does not apply to) read it.
alter table private.admins enable row level security;

create function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admins a where a.user_id = auth.uid());
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- ========== SIGNUP: ALWAYS A PLAYER ==========
-- The role sent at signup is ignored: anyone can call the signup API directly.

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (new.id, 'player', new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$;

-- The trigger above creates every profile, the app never inserts one. Left
-- open, an account without a profile could create itself a coach profile.
drop policy "profiles_insert_own" on public.profiles;
revoke insert on public.profiles from authenticated;

-- ========== ROLE CHANGES ==========
-- A logged-in user, the administrator included, still cannot change a role
-- with a plain update. Only promote_to_coach() below (it runs with the owner's
-- rights) and this SQL editor can.

create or replace function private.profiles_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and current_user = 'authenticated' then
    raise exception 'Le role ne peut pas etre modifie' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ========== API FUNCTIONS ==========

-- Lets the app show the coach management tab to the administrator only.
create function public.is_admin()
returns boolean language sql stable set search_path = '' as $$
  select private.is_admin();
$$;

-- The future coach signs up in the app (as a player), then the administrator
-- enters their email here.
create function public.promote_to_coach(p_email text)
returns table (id uuid, full_name text)
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_role text;
begin
  if not private.is_admin() then
    raise exception 'Reserve a l''administrateur' using errcode = '42501';
  end if;

  -- The email from auth.users, not profiles.email which each user can edit.
  -- An unconfirmed email may not belong to whoever signed up with it.
  select p.id, p.role into v_id, v_role
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is not null;

  if v_id is null then
    raise exception 'Aucun compte confirme avec cet email' using errcode = 'P0002';
  end if;
  if v_role = 'coach' then
    raise exception 'Ce compte est deja coach' using errcode = '23505';
  end if;

  update public.profiles p set role = 'coach' where p.id = v_id;

  return query select p.id, p.full_name from public.profiles p where p.id = v_id;
end;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.promote_to_coach(text) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.promote_to_coach(text) to authenticated;

-- ========== YOUR ACCOUNT ==========
-- Becomes the administrator, and a coach if it is not one already.
-- If the email is wrong the whole script is cancelled: fix it and run again.

do $$
declare
  v_email text := 'julienbouafia@gmail.com';
  v_id uuid;
begin
  select p.id into v_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(v_email);

  if v_id is null then
    raise exception 'Aucun compte avec un profil pour %. Corrigez l''email et relancez.', v_email;
  end if;

  insert into private.admins (user_id) values (v_id);
  update public.profiles set role = 'coach' where id = v_id and role <> 'coach';
end;
$$;

commit;

-- The coaches as of now, including any account that made itself a coach
-- before this script. To turn one back into a player, run in this editor:
--   update public.profiles set role = 'player' where id = '<id>';
select p.id, p.full_name, u.email, p.created_at
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'coach'
order by p.created_at;
