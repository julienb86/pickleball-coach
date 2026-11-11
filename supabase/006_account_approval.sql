-- Run once in the Supabase SQL editor, after 005_delete_accounts.sql.
-- A new account sees nothing until the administrator approves it, and the
-- administrator gets an email for every signup.
--
-- Before running, store your Resend API key in the Vault. Run this line on
-- its own in the SQL editor, and do not save it in a file:
--   select vault.create_secret('re_...', 'resend_api_key');

begin;

create extension if not exists pg_net with schema extensions;

-- ========== APPROVAL ==========
-- Everyone already registered stays in; only new signups wait.

alter table public.profiles add column approved boolean not null default true;
alter table public.profiles alter column approved set default false;
grant select (approved) on public.profiles to authenticated;

create function private.is_approved()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.approved from public.profiles p where p.id = auth.uid()), false);
$$;
revoke all on function private.is_approved() from public;
grant execute on function private.is_approved() to authenticated;

-- Restrictive policies are added on top of the existing ones (both must
-- pass), so a pending account is locked out of every table without
-- rewriting each policy. It still sees its own profile, to know it waits.

create policy "profiles_approved_only" on public.profiles as restrictive
  for all to authenticated
  using (id = auth.uid() or private.is_approved())
  with check (id = auth.uid() or private.is_approved());

create policy "exercises_approved_only" on public.exercises as restrictive
  for all to authenticated using (private.is_approved()) with check (private.is_approved());
create policy "sessions_approved_only" on public.sessions as restrictive
  for all to authenticated using (private.is_approved()) with check (private.is_approved());
create policy "session_exercises_approved_only" on public.session_exercises as restrictive
  for all to authenticated using (private.is_approved()) with check (private.is_approved());
create policy "session_attendance_approved_only" on public.session_attendance as restrictive
  for all to authenticated using (private.is_approved()) with check (private.is_approved());
create policy "skill_ratings_approved_only" on public.skill_ratings as restrictive
  for all to authenticated using (private.is_approved()) with check (private.is_approved());
create policy "goals_approved_only" on public.goals as restrictive
  for all to authenticated using (private.is_approved()) with check (private.is_approved());

-- Nobody may approve themselves with a plain update, like the role.
create or replace function private.profiles_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated'
     and (new.role is distinct from old.role or new.approved is distinct from old.approved) then
    raise exception 'Le role et la validation ne peuvent pas etre modifies' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ========== API FUNCTIONS ==========

create function public.approve_account(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Reserve a l''administrateur' using errcode = '42501';
  end if;

  update public.profiles p set approved = true where p.id = p_user_id and not p.approved;

  if not found then
    raise exception 'Compte introuvable ou deja valide' using errcode = 'P0002';
  end if;
end;
$$;

-- Making someone a coach approves them too.
create or replace function public.promote_to_coach(p_email text)
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

  update public.profiles p set role = 'coach', approved = true where p.id = v_id;

  return query select p.id, p.full_name from public.profiles p where p.id = v_id;
end;
$$;

-- Now also returns whether each account is approved (a new return type
-- means drop and create, so the grants are given again).
drop function public.list_accounts();
create function public.list_accounts()
returns table (id uuid, role text, full_name text, email text, approved boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Reserve a l''administrateur' using errcode = '42501';
  end if;

  return query
    select p.id, p.role, p.full_name, u.email::text, p.approved
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.role, lower(coalesce(p.full_name, u.email));
end;
$$;

revoke all on function public.approve_account(uuid) from public, anon;
revoke all on function public.list_accounts() from public, anon;
grant execute on function public.approve_account(uuid) to authenticated;
grant execute on function public.list_accounts() to authenticated;

-- ========== EMAIL ON SIGNUP ==========
-- pg_net sends the request after the signup is saved, in the background:
-- a missing key or a Resend outage never blocks a signup. The email is
-- plain text, since the name is typed by whoever signs up.

create function private.notify_admins_of_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  v_to jsonb;
begin
  select s.decrypted_secret into v_key
  from vault.decrypted_secrets s where s.name = 'resend_api_key';

  select jsonb_agg(u.email) into v_to
  from private.admins a join auth.users u on u.id = a.user_id;

  if v_key is null or v_to is null then
    raise warning 'Email de nouveau compte non envoye : cle Resend ou administrateur manquant';
    return new;
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Pickleball Coach <onboarding@resend.dev>',
      'to', v_to,
      'subject', 'Nouveau compte à valider',
      'text', format(
        E'Nouveau compte : %s (%s).\n\nOuvrez l''application, onglet Comptes, pour le valider ou le refuser.',
        coalesce(nullif(trim(new.full_name), ''), 'sans nom'),
        new.email
      )
    )
  );
  return new;
exception when others then
  raise warning 'Email de nouveau compte non envoye : %', sqlerrm;
  return new;
end;
$$;

revoke all on function private.notify_admins_of_signup() from public;

create trigger notify_admins_of_signup
  after insert on public.profiles
  for each row when (not new.approved)
  execute function private.notify_admins_of_signup();

commit;
