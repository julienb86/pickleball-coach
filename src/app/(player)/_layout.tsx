import { Text } from "react-native";
import { Tabs } from "expo-router/js-tabs";

import { HeaderAvatar, testHeaderStyle, testHeaderTintColor, withName } from "@/components/header-avatar";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { SignOutButton } from "@/components/sign-out-button";

export default function PlayerLayout() {
  const { profile } = useAuth();

  return (
    <RoleGuard role="player">
      <Tabs
        screenOptions={{
          headerTitle: withName("Joueur", profile?.full_name),
          headerStyle: testHeaderStyle,
          headerTintColor: testHeaderTintColor,
          headerLeft: () => <HeaderAvatar profileHref="/(player)/profile" />,
          headerLeftContainerStyle: { paddingLeft: 16 },
          headerRight: () => <SignOutButton />,
          headerRightContainerStyle: { paddingRight: 16 },
        }}>
        <Tabs.Screen
          name="progress"
          options={{ title: "Mon progrès", tabBarIcon: () => <Text style={{ fontSize: 20 }}>📈</Text> }}
        />
        <Tabs.Screen
          name="sessions"
          options={{ title: "Calendrier", tabBarIcon: () => <Text style={{ fontSize: 20 }}>📅</Text> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: "Profil", tabBarIcon: () => <Text style={{ fontSize: 20 }}>🙂</Text> }}
        />
      </Tabs>
    </RoleGuard>
  );
}
