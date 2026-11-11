import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "@/hooks/use-auth";

export function RoleGuard({
  role,
  children,
}: {
  role: "coach" | "player";
  children: React.ReactNode;
}) {
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

  // The home screen shows the "no profile" and "waiting for approval" messages.
  if (!profile || !profile.approved) {
    return <Redirect href="/" />;
  }

  if (profile.role !== role) {
    return <Redirect href={profile.role === "coach" ? "/(coach)/today" : "/(player)/progress"} />;
  }

  return <>{children}</>;
}
