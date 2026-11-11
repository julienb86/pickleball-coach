-- Run once in the Supabase SQL editor, after schema.sql.
-- Creates the profile in the same transaction as the account, so an account
-- can never exist without a profile (whatever the email confirmation setting).

create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    -- Sent by the signup screen. Anything unexpected falls back to player.
    case when new.raw_user_meta_data->>'role' = 'coach' then 'coach' else 'player' end,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Lists the accounts created before this fix that have no profile.
-- Delete them in Authentication > Users, then sign up again in the app.
select u.email, u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
