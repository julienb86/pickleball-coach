import { StyleSheet, Text, View } from "react-native";

import { IS_TEST_DATABASE } from "@/lib/supabase";

export const TEST_COLOR = "#e67e22";

/** Shown on screens without a header, so the test database is never mistaken for the real one. */
export function TestDatabaseBadge() {
  if (!IS_TEST_DATABASE) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>Base de test</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "center",
    backgroundColor: TEST_COLOR,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  text: { color: "#fff", fontWeight: "700" },
});
