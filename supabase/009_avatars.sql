-- Run once in the Supabase SQL editor, after 008_exercise_library_seed.sql.
-- Each user can show a profile photo or an emoji avatar.

begin;

-- ========== PROFILE ==========
-- The photo always lives at avatars/<user id>/avatar.jpg, so a profile can
-- never point to an image somewhere else on the internet. avatar_photo_at
-- says there is one and changes with each new photo, so phones reload it.

alter table public.profiles
  add column avatar_photo_at timestamptz,
  add column avatar_emoji text check (char_length(avatar_emoji) <= 8);

grant select (avatar_photo_at, avatar_emoji) on public.profiles to authenticated;
-- Updating is already allowed on one's own profile (profiles_update_own).

-- ========== STORAGE ==========
-- Public bucket: whoever has a photo's link can see it, without logging in.
-- The links contain the user id, so they cannot be guessed from outside.
-- At most 2 MB (the app sends about 50 KB), images only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

-- An approved user writes only in their own folder. Replacing a photo needs
-- select and update as well as insert. The administrator can also remove a
-- photo, which the app does when deleting an account.

create policy "avatars_select_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or private.is_admin())
  );

create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.is_approved()
  );

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.is_approved()
  );

create policy "avatars_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or private.is_admin())
  );

commit;
