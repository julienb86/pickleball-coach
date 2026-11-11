import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { LEVELS, PRINCIPLES, type LevelKey, type PrincipleKey } from "@/lib/exercise-library";
import { useLibrary, type LibraryExercise } from "@/lib/queries/exercises";

export type Shelf = { principle: PrincipleKey; level: LevelKey; label: string };

/**
 * Principle buttons, then level buttons, then what `children` renders for the
 * library exercises of that principle and level. Used to edit the library and
 * to pick exercises for a session.
 */
export function ExerciseBrowser({
  children,
}: {
  children: (exercises: LibraryExercise[], shelf: Shelf) => ReactNode;
}) {
  const library = useLibrary();
  const [principle, setPrinciple] = useState<PrincipleKey | null>(null);
  const [level, setLevel] = useState<LevelKey | null>(null);

  const principleLabel = PRINCIPLES.find((p) => p.key === principle)?.label;
  const levelLabel = LEVELS.find((l) => l.key === level)?.label;
  const exercises = (library.data ?? []).filter(
    (e) => e.category === principle && e.difficulty === level,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Principes</Text>
      <View style={styles.grid}>
        {PRINCIPLES.map((p) => (
          <Choice
            key={p.key}
            label={p.label}
            selected={p.key === principle}
            onPress={() => setPrinciple(p.key)}
            style={styles.principle}
          />
        ))}
      </View>

      {principle && (
        <>
          <Text style={[styles.title, styles.sectionTitle]}>Niveau</Text>
          <View style={styles.levels}>
            {LEVELS.map((l) => (
              <Choice
                key={l.key}
                label={l.label}
                selected={l.key === level}
                onPress={() => setLevel(l.key)}
                style={styles.level}
              />
            ))}
          </View>
        </>
      )}

      {principle && level && (
        <>
          <Text style={[styles.title, styles.sectionTitle]}>
            {principleLabel} · {levelLabel}
          </Text>
          {library.isPending && <ActivityIndicator />}
          {library.isError && <Text style={styles.error}>{library.error.message}</Text>}
          {library.isSuccess &&
            children(exercises, { principle, level, label: `${principleLabel} · ${levelLabel}` })}
        </>
      )}
    </View>
  );
}

function Choice({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style: object;
}) {
  return (
    <Pressable
      style={[styles.choice, style, selected && styles.choiceSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}>
      <Text style={selected ? styles.choiceTextSelected : styles.choiceText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  sectionTitle: { marginTop: 12 },
  error: { color: "#c0392b" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  principle: { flexBasis: "48%", flexGrow: 1 },
  levels: { flexDirection: "row", gap: 8 },
  level: { flex: 1 },
  choice: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceSelected: { backgroundColor: "#1a73e8", borderColor: "#1a73e8" },
  choiceText: { color: "#333", textAlign: "center" },
  choiceTextSelected: { color: "#fff", fontWeight: "600", textAlign: "center" },
});
