import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlayerProgressScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Mon progrès</Text>
      <Text>À construire (M6) : tendance de compétences + objectifs.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: "700" },
});
