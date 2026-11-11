import { router, type Href } from "expo-router";
import { Pressable } from "react-native";

import { Avatar } from "@/components/avatar";
import { useAuth } from "@/hooks/use-auth";

/** "Coach · Julie" (first name only), or just "Coach" when the user has no name. */
export function withName(role: string, fullName: string | null | undefined): string {
  const firstName = fullName?.trim().split(/\s+/)[0];
  return firstName ? `${role} · ${firstName}` : role;
}

/** The signed-in user's avatar in the header of every screen; opens their profile. */
export function HeaderAvatar({ profileHref }: { profileHref: Href }) {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <Pressable
      onPress={() => router.navigate(profileHref)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Mon profil">
      <Avatar owner={profile} size={34} />
    </Pressable>
  );
}
