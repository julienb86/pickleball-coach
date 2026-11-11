import { supabase } from "@/lib/supabase";

/** What any screen needs to draw someone's avatar. */
export type AvatarOwner = {
  id: string;
  full_name: string | null;
  avatar_photo_at?: string | null;
  avatar_emoji?: string | null;
};

/** The avatars offered when someone prefers not to use a photo. */
export const AVATAR_EMOJIS = [
  "🏓", "🎾", "🦊", "🐼", "🐯", "🦁", "🐸", "🐙",
  "🦄", "🐻", "🐨", "🐵", "⚡", "🔥", "🌟", "🚀",
];

/** One fixed file per user, replaced by each new photo. */
export const avatarPath = (userId: string) => `${userId}/avatar.jpg`;

/** Public link of the photo; the date in it makes phones fetch a new photo instead of a cached one. */
export function avatarPhotoUrl(owner: AvatarOwner): string | null {
  if (!owner.avatar_photo_at) return null;
  const { publicUrl } = supabase.storage.from("avatars").getPublicUrl(avatarPath(owner.id)).data;
  return `${publicUrl}?v=${encodeURIComponent(owner.avatar_photo_at)}`;
}
