-- Run once in the Supabase SQL editor, after 004_admin_coaches.sql.
-- Lets the administrator see every account with its email, and delete one.

begin;

-- Emails are hidden from everyone else (see 003), so the list is a function.
create function public.list_accounts()
returns table (id uuid, role text, full_name text, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Reserve a l''administrateur' using errcode = '42501';
  end if;

  return query
    select p.id, p.role, p.full_name, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.role, lower(coalesce(p.full_name, u.email));
end;
$$;

-- Deleting the login deletes the profile with it, and with the profile
-- everything that belongs to it: attendance, ratings, goals, and a coach's
-- exercises. Sessions stay in the calendar, without a coach.
create function public.delete_account(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Reserve a l''administrateur' using errcode = '42501';
  end if;
  -- Covers the administrator's own account: the app would lose its admin.
  if exists (select 1 from private.admins a where a.user_id = p_user_id) then
    raise exception 'Un compte administrateur ne peut pas etre supprime' using errcode = '42501';
  end if;

  delete from auth.users u where u.id = p_user_id;

  if not found then
    raise exception 'Compte introuvable' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.list_accounts() from public, anon;
revoke all on function public.delete_account(uuid) from public, anon;
grant execute on function public.list_accounts() to authenticated;
grant execute on function public.delete_account(uuid) to authenticated;

commit;
