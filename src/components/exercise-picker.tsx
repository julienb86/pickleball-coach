import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ExerciseBrowser } from "@/components/exercise-browser";
import type { LibraryExercise } from "@/lib/queries/exercises";

const NONE = new Set<string>();

/**
 * Full-screen picker: tick exercises across any principles and levels, then
 * add them all at once, in the order they were ticked.
 */
export function ExercisePicker({
  visible,
  title,
  alreadyInProgram = NONE,
  initialSelected = [],
  confirmLabel = (count) => `Ajouter ${count} exercice${count > 1 ? "s" : ""} à la séance`,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  /** Library ids already in the session, flagged so they are not added twice by mistake. */
  alreadyInProgram?: Set<string>;
  initialSelected?: LibraryExercise[];
  confirmLabel?: (count: number) => string;
  pending: boolean;
  error: Error | null;
  onClose: () => void;
  onConfirm: (exercises: LibraryExercise[]) => void;
}) {
  const [selected, setSelected] = useState<LibraryExercise[]>(initialSelected);

  function toggle(exercise: LibraryExercise) {
    setSelected((current) =>
      current.some((e) => e.id === exercise.id)
        ? current.filter((e) => e.id !== exercise.id)
        : [...current, exercise],
    );
  }

  const count = selected.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* A Modal is outside the app's safe area provider on some platforms. */}
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} disabled={pending}>
              <Text style={styles.link}>Fermer</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <ExerciseBrowser>
              {(exercises) => (
                <>
                  {exercises.length === 0 && <Text style={styles.muted}>Aucun exercice pour l’instant.</Text>}
                  {exercises.map((exercise) => {
                    const checked = selected.some((e) => e.id === exercise.id);
                    return (
                      <Pressable
                        key={exercise.id}
                        style={[styles.row, checked && styles.rowChecked]}
                        onPress={() => toggle(exercise)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}>
                        <View style={[styles.box, checked && styles.boxChecked]}>
                          {checked && <Text style={styles.tick}>✓</Text>}
                        </View>
                        <View style={styles.rowText}>
                          <Text style={styles.rowTitle}>{exercise.title}</Text>
                          {!!exercise.description && (
                            <Text style={styles.muted} numberOfLines={2}>
                              {exercise.description}
                            </Text>
                          )}
                          {alreadyInProgram.has(exercise.id) && (
                            <Text style={styles.already}>Déjà dans la séance</Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </>
              )}
            </ExerciseBrowser>
          </ScrollView>

          <View style={styles.footer}>
            {error && <Text style={styles.error}>{error.message}</Text>}
            <Pressable
              style={[styles.button, (count === 0 || pending) && styles.buttonDisabled]}
              disabled={count === 0 || pending}
              onPress={() => onConfirm(selected)}>
              {pending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {count === 0 ? "Cochez des exercices" : confirmLabel(count)}
                </Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e5eb",
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
  link: { color: "#1a73e8", fontWeight: "600", fontSize: 16 },
  content: { padding: 16, paddingBottom: 32 },
  muted: { color: "#666" },
  error: { color: "#c0392b" },
  row: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    alignItems: "flex-start",
  },
  rowChecked: { borderColor: "#1a73e8", backgroundColor: "#eef4fd" },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  boxChecked: { backgroundColor: "#1a73e8", borderColor: "#1a73e8" },
  tick: { color: "#fff", fontWeight: "700" },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  already: { color: "#d97a00", fontSize: 13 },
  footer: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: "#e2e5eb" },
  button: { backgroundColor: "#1a73e8", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
