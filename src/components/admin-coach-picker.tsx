import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { useIsAdmin } from "@/lib/queries/accounts";
import {
  personName,
  sessionFor,
  useAssignSession,
  type CalendarData,
  type Person,
} from "@/lib/queries/sessions";

/**
 * Administrator only (renders nothing for anyone else): chooses the coach of
 * an upcoming session. Replacing or removing a coach asks for a second tap,
 * rather than Alert.alert, which does nothing on the web.
 */
export function AdminCoachPicker({ data, date, slot }: { data: CalendarData; date: string; slot: string }) {
  const { data: isAdmin } = useIsAdmin();
  const assign = useAssignSession();
  const [open, setOpen] = useState(false);
  // undefined = nothing to confirm; null = "no coach" chosen.
  const [pending, setPending] = useState<Person | null | undefined>(undefined);

  if (!isAdmin) return null;

  const currentId = sessionFor(data, date, slot)?.coach_id ?? null;
  const current = data.people.find((p) => p.id === currentId);
  const coaches = data.people
    .filter((p) => p.role === "coach")
    .sort((a, b) => personName(a).localeCompare(personName(b), "fr"));

  function save(coach: Person | null) {
    assign.mutate(
      { date, slot, coachId: coach?.id ?? null },
      {
        onSuccess: () => {
          setPending(undefined);
          setOpen(false);
        },
      },
    );
  }

  function choose(coach: Person | null) {
    if ((coach?.id ?? null) === currentId) return;
    if (currentId) setPending(coach);
    else save(coach);
  }

  if (!open) {
    return (
      <Pressable style={styles.toggle} onPress={() => setOpen(true)}>
        <Text style={styles.toggleText}>
          {currentId ? "Changer le coach (admin)" : "Positionner un coach (admin)"}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Coach de cette séance</Text>

      {pending !== undefined ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>
            {pending
              ? `Remplacer ${personName(current)} par ${personName(pending)} ?`
              : `Retirer ${personName(current)} de cette séance ?`}
          </Text>
          <View style={styles.confirmButtons}>
            <Pressable
              style={styles.secondaryButton}
              disabled={assign.isPending}
              onPress={() => setPending(undefined)}>
              <Text style={styles.secondaryButtonText}>Annuler</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} disabled={assign.isPending} onPress={() => save(pending)}>
              {assign.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Confirmer</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.chips}>
          {coaches.map((coach) => {
            const selected = coach.id === currentId;
            return (
              <Pressable
                key={coach.id}
                style={[styles.chip, selected && styles.chipSelected]}
                disabled={assign.isPending}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => choose(coach)}>
                <Avatar owner={coach} size={28} />
                <Text style={selected ? styles.chipTextSelected : styles.chipText}>{personName(coach)}</Text>
              </Pressable>
            );
          })}
          {currentId && (
            <Pressable style={[styles.chip, styles.chipNone]} disabled={assign.isPending} onPress={() => choose(null)}>
              <Text style={styles.chipNoneText}>Aucun coach</Text>
            </Pressable>
          )}
          {assign.isPending && <ActivityIndicator />}
        </View>
      )}

      {assign.error && <Text style={styles.error}>{assign.error.message}</Text>}

      <Pressable
        style={styles.close}
        onPress={() => {
          setOpen(false);
          setPending(undefined);
          assign.reset();
        }}>
        <Text style={styles.toggleText}>Fermer</Text>
      </Pressable>
    </View>
  );
}

const BLUE = "#1a73e8";
const GREEN = "#1e8e5a";
const RED = "#c0392b";

const styles = StyleSheet.create({
  toggle: { minHeight: 44, justifyContent: "center" },
  toggleText: { color: BLUE, fontSize: 15, fontWeight: "600" },
  panel: { gap: 8, padding: 12, borderRadius: 10, backgroundColor: "#f3f6fb" },
  title: { fontSize: 15, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  chip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#c4c9d4",
    backgroundColor: "#fff",
  },
  chipSelected: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 15, color: "#333" },
  chipTextSelected: { fontSize: 15, color: "#fff", fontWeight: "600" },
  chipNone: { paddingLeft: 14, borderColor: RED },
  chipNoneText: { fontSize: 15, color: RED },
  confirm: { gap: 8 },
  confirmText: { fontSize: 15 },
  confirmButtons: { flexDirection: "row", gap: 8 },
  primaryButton: {
    flex: 1,
    backgroundColor: BLUE,
    borderRadius: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  secondaryButton: {
    flex: 1,
    borderColor: BLUE,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: BLUE, fontSize: 15, fontWeight: "600" },
  close: { minHeight: 40, justifyContent: "center", alignItems: "flex-end" },
  error: { color: RED },
});
