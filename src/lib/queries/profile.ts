import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { useAuth } from "@/hooks/use-auth";
import { avatarPath } from "@/lib/avatar";
import { CALENDAR_KEY } from "@/lib/queries/sessions";
import { supabase } from "@/lib/supabase";

/** Big enough for a sharp avatar, small enough to load fast (about 50 KB). */
const PHOTO_WIDTH = 400;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/^data:[^,]*,/, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type AvatarChange =
  | { kind: "photo"; uri: string }
  | { kind: "emoji"; emoji: string }
  | { kind: "none" };

/** Sets a photo (picked on the device), an emoji, or nothing. */
export function useSetAvatar() {
  const userId = useAuth().session?.user.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (change: AvatarChange) => {
      if (!userId) throw new Error("Vous n'êtes pas connecté");
      const photos = supabase.storage.from("avatars");

      if (change.kind === "photo") {
        const context = ImageManipulator.manipulate(change.uri).resize({ width: PHOTO_WIDTH, height: null });
        const image = await context.renderAsync();
        // Read back as base64: fetching the local file can give an empty body
        // on a phone, and the upload then "succeeds" with a blank image.
        const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
        const body = base64ToBytes(saved.base64 ?? "");
        if (body.byteLength === 0) throw new Error("La photo n'a pas pu être lue, réessayez");

        const upload = await photos.upload(avatarPath(userId), body, { contentType: "image/jpeg", upsert: true });
        if (upload.error) throw new Error(upload.error.message);
      } else {
        // No photo any more: do not keep one in storage. Nothing to remove is fine.
        await photos.remove([avatarPath(userId)]);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_photo_at: change.kind === "photo" ? new Date().toISOString() : null,
          avatar_emoji: change.kind === "emoji" ? change.emoji : null,
        })
        .eq("id", userId);
      if (error) throw new Error(error.message);
    },
    // Own profile, and the calendar that shows everyone's avatar.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
      ]),
  });
}
