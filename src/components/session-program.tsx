import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ExerciseForm } from "@/components/exercise-form";
import { ExercisePicker } from "@/components/exercise-picker";
import { principleLevelLabel } from "@/lib/exercise-library";
import {
  useAddToProgram,
  useMoveProgramItem,
  useProgram,
  useRemoveProgramItem,
  useUpdateProgramItem,
  type ProgramItem,
} from "@/lib/queries/program";

/** The exercises of a session, built and edited by the session's coach. */
export function SessionProgram({ sessionId, dateLabel }: { sessionId: string; dateLabel: string }) {
  const program = useProgram(sessionId);
  const add = useAddToProgram(sessionId);
  const move = useMoveProgramItem(sessionId);
  const [picking, setPicking] = useState(false);

  const items = program.data ?? [];
  const alreadyInProgram = new Set(items.flatMap((item) => (item.exercise_id ? [item.exercise_id] : [])));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Programme{items.length > 0 ? ` : ${items.length} exercice${items.length > 1 ? "s" : ""}` : ""}
      </Text>

      {program.isPending && <ActivityIndicator />}
      {program.isError && <Text style={styles.error}>{program.error.message}</Text>}
      {program.isSuccess && items.length === 0 && (
        <Text style={styles.muted}>Aucun exercice dans cette séance.</Text>
      )}

      {items.map((item, index) => (
        <ProgramRow
          key={item.id}
          sessionId={sessionId}
          item={item}
          index={index}
          isLast={index === items.length - 1}
          onMove={(delta) => move.mutate({ index, delta })}
          moving={move.isPending}
        />
      ))}
      {move.isError && <Text style={styles.error}>{move.error.message}</Text>}

      <Pressable style={styles.addButton} onPress={() => setPicking(true)}>
        <Text style={styles.addText}>+ Ajouter des exercices</Text>
      </Pressable>

      {/* Mounted only while open, so each opening starts with nothing ticked. */}
      {picking && (
        <ExercisePicker
          visible
          title={`Séance du ${dateLabel}`}
          alreadyInProgram={alreadyInProgram}
          pending={add.isPending}
          error={add.error}
          onClose={() => {
            add.reset();
            setPicking(false);
          }}
          onConfirm={(exercises) => add.mutate(exercises, { onSuccess: () => setPicking(false) })}
        />
      )}
    </View>
  );
}

function ProgramRow({
  sessionId,
  item,
  index,
  isLast,
  onMove,
  moving,
}: {
  sessionId: string;
  item: ProgramItem;
  index: number;
  isLast: boolean;
  onMove: (delta: -1 | 1) => void;
  moving: boolean;
}) {
  const update = useUpdateProgramItem(sessionId);
  const remove = useRemoveProgramItem(sessionId);
  const [editing, setEditing] = useState(false);
  const label = principleLevelLabel(item.category, item.difficulty);

  if (editing) {
    return (
      <View style={styles.card}>
        <ExerciseForm
          initial={{ title: item.title, description: item.description ?? "" }}
          submitLabel="Enregistrer"
          note="Modifie seulement cette séance. La bibliothèque ne change pas."
          pending={update.isPending}
          error={update.error}
          onCancel={() => setEditing(false)}
          onSubmit={(text) => update.mutate({ id: item.id, ...text }, { onSuccess: () => setEditing(false) })}
        />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>
            {index + 1}. {item.title}
          </Text>
          {!!label && <Text style={styles.label}>{label}</Text>}
        </View>
        <View style={styles.arrows}>
          <Arrow label="↑" accessibilityLabel="Monter" disabled={index === 0 || moving} onPress={() => onMove(-1)} />
          <Arrow label="↓" accessibilityLabel="Descendre" disabled={isLast || moving} onPress={() => onMove(1)} />
        </View>
      </View>
      {!!item.description && <Text style={styles.cardText}>{item.description}</Text>}
      {remove.isError && <Text style={styles.error}>{remove.error.message}</Text>}
      <View style={styles.actions}>
        <Pressable onPress={() => setEditing(true)} hitSlop={8}>
          <Text style={styles.link}>Modifier</Text>
        </Pressable>
        <Pressable onPress={() => remove.mutate(item.id)} disabled={remove.isPending} hitSlop={8}>
          <Text style={styles.error}>{remove.isPending ? "Retrait…" : "Retirer"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Arrow({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.arrow, disabled && styles.arrowDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}>
      <Text style={styles.arrowText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  muted: { color: "#667" },
  error: { color: "#c0392b" },
  card: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8, padding: 12, gap: 6 },
  cardHeader: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  cardHeaderText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  label: { color: "#667", fontSize: 13 },
  cardText: { color: "#444", lineHeight: 20 },
  arrows: { flexDirection: "row", gap: 4 },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c4c9d4",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: { opacity: 0.3 },
  arrowText: { fontSize: 18 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 20 },
  link: { color: "#1a73e8", fontWeight: "600" },
  addButton: {
    borderWidth: 1,
    borderColor: "#1a73e8",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  addText: { color: "#1a73e8", fontWeight: "600" },
});
