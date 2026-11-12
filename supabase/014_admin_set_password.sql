-- Run once in the Supabase SQL editor of each project (test first, then
-- main), after 013_demote_coach.sql.
-- Without an email provider, a forgotten password cannot be reset by email.
-- The administrator sets a temporary password instead, gives it to the
-- person, who then changes it in the Profile tab.

begin;

create function public.admin_set_password(p_user_id uuid, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Reserve a l''administrateur' using errcode = '42501';
  end if;
  -- The administrator changes their own password in the Profile tab.
  if p_user_id = auth.uid() then
    raise exception 'Changez votre propre mot de passe dans l''onglet Profil' using errcode = '42501';
  end if;
  -- Same rules as the app (src/lib/validation.ts), checked here too since
  -- this function can be called without the app.
  if char_length(p_password) < 10
     or p_password !~ '[a-z]' or p_password !~ '[A-Z]'
     or p_password !~ '[0-9]' or p_password !~ '[^A-Za-z0-9]' then
    raise exception 'Mot de passe trop faible' using errcode = '22023';
  end if;

  -- Supabase Auth stores bcrypt hashes, which pgcrypto produces.
  update auth.users u
  set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      updated_at = now()
  where u.id = p_user_id;

  if not found then
    raise exception 'Compte introuvable' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

commit;
