import { router, type Href } from "expo-router";
import { Pressable } from "react-native";

import { Avatar } from "@/components/avatar";
import { TEST_COLOR } from "@/components/test-database-badge";
import { useAuth } from "@/hooks/use-auth";
import { IS_TEST_DATABASE } from "@/lib/supabase";

/**
 * "Coach · Julie" (first name only), or just "Coach" when the user has no name.
 * Prefixed with "TEST ·" on the test database.
 */
export function withName(role: string, fullName: string | null | undefined): string {
  const firstName = fullName?.trim().split(/\s+/)[0];
  const title = firstName ? `${role} · ${firstName}` : role;
  return IS_TEST_DATABASE ? `TEST · ${title}` : title;
}

/** Orange header on the test database, default header otherwise. */
export const testHeaderStyle = IS_TEST_DATABASE ? { backgroundColor: TEST_COLOR } : undefined;
export const testHeaderTintColor = IS_TEST_DATABASE ? "#fff" : undefined;

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
