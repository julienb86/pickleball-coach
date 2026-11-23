import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TodaySessionScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Séance du jour</Text>
      <Text>À construire (M4) : présence + exercices de la séance.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: "700" },
});
