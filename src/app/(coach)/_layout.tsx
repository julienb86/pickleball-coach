import { Text } from "react-native";
import { Tabs } from "expo-router/js-tabs";

import { HeaderAvatar, withName } from "@/components/header-avatar";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { SignOutButton } from "@/components/sign-out-button";
import { useAccounts, useIsAdmin } from "@/lib/queries/accounts";

export default function CoachLayout() {
  const { profile } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: accounts } = useAccounts(isAdmin === true);
  const pendingCount = accounts?.filter((a) => !a.approved).length ?? 0;

  return (
    <RoleGuard role="coach">
      <Tabs
        screenOptions={{
          headerTitle: withName("Coach", profile?.full_name),
          headerLeft: () => <HeaderAvatar profileHref="/(coach)/profile" />,
          headerLeftContainerStyle: { paddingLeft: 16 },
          headerRight: () => <SignOutButton />,
          headerRightContainerStyle: { paddingRight: 16 },
        }}>
        <Tabs.Screen
          name="today"
          options={{ title: "Aujourd'hui", tabBarIcon: () => <Text style={{ fontSize: 20 }}>🎾</Text> }}
        />
        <Tabs.Screen
          name="calendar"
          options={{ title: "Calendrier", tabBarIcon: () => <Text style={{ fontSize: 20 }}>📅</Text> }}
        />
        <Tabs.Screen
          name="exercises"
          options={{ title: "Exercices", tabBarIcon: () => <Text style={{ fontSize: 20 }}>📚</Text> }}
        />
        <Tabs.Screen
          name="accounts"
          options={{
            title: "Comptes",
            href: isAdmin ? undefined : null,
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: "Profil", tabBarIcon: () => <Text style={{ fontSize: 20 }}>🙂</Text> }}
        />
      </Tabs>
    </RoleGuard>
  );
}
