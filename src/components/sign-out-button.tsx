import { useState } from "react";
import { Alert, Pressable, Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export function SignOutButton() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    // Local scope: the user's other devices stay signed in.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    setBusy(false);
    if (error) {
      Alert.alert("Déconnexion impossible", error.message);
      return;
    }
    // The next account on this device must not see this account's cached data.
    queryClient.clear();
  }

  return (
    <Pressable onPress={handleSignOut} disabled={busy} hitSlop={12} accessibilityRole="button">
      <Text style={{ color: "#1a73e8", fontSize: 16, fontWeight: "600", opacity: busy ? 0.5 : 1 }}>
        Déconnexion
      </Text>
    </Pressable>
  );
}
