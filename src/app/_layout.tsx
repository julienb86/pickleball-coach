import { AppState, Platform } from "react-native";
import { Stack } from "expo-router";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/hooks/use-auth";

const queryClient = new QueryClient();

// On a phone, refresh the data when the app comes back to the foreground, as
// the web does on tab focus: a validated account gets in, and the pending
// badge is current when the administrator opens the app after the email.
if (Platform.OS !== "web") {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener("change", (state) => setFocused(state === "active"));
    return () => subscription.remove();
  });
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
