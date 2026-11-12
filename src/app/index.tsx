import { useState } from "react";
import { Redirect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { TestDatabaseBadge } from "@/components/test-database-badge";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile && !profile.approved) {
    return <PendingApproval />;
  }

  if (profile?.role === "coach") {
    return <Redirect href="/(coach)/today" />;
  }

  if (profile?.role === "player") {
    return <Redirect href="/(player)/progress" />;
  }

  // Logged in but no profile: offer a way out instead of looping on the login screen.
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Profil introuvable</Text>
      <Text style={{ textAlign: "center" }}>
        Ce compte n'a pas de profil. Déconnectez-vous, puis recréez votre compte.
      </Text>
      <Pressable
        style={{ backgroundColor: "#1a73e8", borderRadius: 8, padding: 14 }}
        onPress={() => supabase.auth.signOut()}>
        <Text style={{ color: "#fff", fontWeight: "600" }}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

function PendingApproval() {
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);

  async function checkAgain() {
    setChecking(true);
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setChecking(false);
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
      <TestDatabaseBadge />
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Compte en attente</Text>
      <Text style={{ textAlign: "center" }}>
        Votre compte doit être validé par l’administrateur avant de pouvoir utiliser l’application.
      </Text>
      <Pressable
        style={{ backgroundColor: "#1a73e8", borderRadius: 8, padding: 14 }}
        onPress={checkAgain}
        disabled={checking}>
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "600" }}>Vérifier à nouveau</Text>
        )}
      </Pressable>
      <Pressable onPress={() => supabase.auth.signOut()} hitSlop={12}>
        <Text>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}
