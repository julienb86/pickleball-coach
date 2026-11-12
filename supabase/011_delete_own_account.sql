-- Run once in the Supabase SQL editor of each project (test first, then
-- main), after 010_no_email_confirmation.sql.
-- Lets every user delete their own account from the Profile tab.

begin;

-- Same effect as the administrator's delete_account (005): the profile and
-- everything attached to it go with the login (attendance, ratings, goals);
-- sessions stay in the calendar without a coach, exercises stay in the
-- library. The photo is removed by the app just before.
create function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Vous n''etes pas connecte' using errcode = '42501';
  end if;
  -- The app would lose its administrator.
  if private.is_admin() then
    raise exception 'Le compte administrateur ne peut pas etre supprime' using errcode = '42501';
  end if;

  delete from auth.users u where u.id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

commit;
