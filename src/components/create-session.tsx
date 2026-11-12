import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ExercisePicker } from "@/components/exercise-picker";
import { useAuth } from "@/hooks/use-auth";
import { formatSessionLabel, slotsOn, toISODate, upcomingSessionDates } from "@/lib/dates";
import type { LibraryExercise } from "@/lib/queries/exercises";
import { useCreateSessionWithExercises } from "@/lib/queries/program";
import { personName, sessionFor, useCalendar, type SlotRef } from "@/lib/queries/sessions";

/** How many upcoming session days (Mondays and Wednesdays) the coach can choose from. */
const DAYS_SHOWN = 8;

/** Tick exercises first, then pick the date: the session is created with them. */
export function CreateSessionButton() {
  const [step, setStep] = useState<"idle" | "exercises" | "date">("idle");
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [created, setCreated] = useState<(SlotRef & { count: number }) | null>(null);

  function start() {
    setCreated(null);
    setExercises([]);
    setStep("exercises");
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={start}>
        <Text style={styles.buttonText}>Créer une séance avec des exercices</Text>
      </Pressable>

      {created && (
        <Text style={styles.success}>
          Séance du {formatSessionLabel(created.date, created.slot)} : {created.count} exercice
          {created.count > 1 ? "s ajoutés" : " ajouté"}. Retrouvez-la dans le Calendrier.
        </Text>
      )}

      {step === "exercises" && (
        <ExercisePicker
          visible
          title="Nouvelle séance : cochez les exercices"
          initialSelected={exercises}
          confirmLabel={(count) => `Choisir la date (${count} exercice${count > 1 ? "s" : ""})`}
          pending={false}
          error={null}
          onClose={() => setStep("idle")}
          onConfirm={(list) => {
            setExercises(list);
            setStep("date");
          }}
        />
      )}

      {step === "date" && (
        <DatePicker
          exercises={exercises}
          onBack={() => setStep("exercises")}
          onCreated={(ref) => {
            setCreated({ ...ref, count: exercises.length });
            setStep("idle");
          }}
        />
      )}
    </View>
  );
}

function DatePicker({
  exercises,
  onBack,
  onCreated,
}: {
  exercises: LibraryExercise[];
  onBack: () => void;
  onCreated: (ref: SlotRef) => void;
}) {
  const myId = useAuth().session?.user.id;
  const calendar = useCalendar();
  const create = useCreateSessionWithExercises();
  // One row per session: Monday's, then each Wednesday slot.
  const refs: SlotRef[] = upcomingSessionDates(toISODate(new Date()), DAYS_SHOWN).flatMap((date) =>
    slotsOn(date).map((slot) => ({ date, slot: slot.key })),
  );
  const count = exercises.length;

  return (
    <Modal visible animationType="slide" onRequestClose={onBack}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Choisissez la séance</Text>
            <Pressable onPress={onBack} hitSlop={12} disabled={create.isPending}>
              <Text style={styles.link}>Retour</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.muted}>
              {count} exercice{count > 1 ? "s sélectionnés" : " sélectionné"}. Touchez une séance pour y ajouter
              ces exercices.
            </Text>

            {calendar.isPending && <ActivityIndicator />}
            {calendar.isError && <Text style={styles.error}>{calendar.error.message}</Text>}
            {create.isError && <Text style={styles.error}>{create.error.message}</Text>}

            {calendar.isSuccess &&
              refs.map(({ date, slot }) => {
                const session = sessionFor(calendar.data, date, slot);
                const mine = !!myId && session?.coach_id === myId;
                const taken = !!session?.coach_id && !mine;
                const coach = calendar.data.people.find((p) => p.id === session?.coach_id);
                const status = mine
                  ? "Votre séance : les exercices s’ajoutent à la suite du programme"
                  : taken
                    ? `Coach : ${personName(coach)}`
                    : "Libre : vous en serez le coach";
                const busy =
                  create.isPending && create.variables?.date === date && create.variables?.slot === slot;

                return (
                  <Pressable
                    key={`${date}-${slot}`}
                    style={[styles.row, taken && styles.rowDisabled]}
                    disabled={taken || create.isPending}
                    onPress={() =>
                      create.mutate({ date, slot, exercises, myId }, { onSuccess: () => onCreated({ date, slot }) })
                    }>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{formatSessionLabel(date, slot)}</Text>
                      <Text style={mine ? styles.mine : styles.muted}>{status}</Text>
                    </View>
                    {busy && <ActivityIndicator />}
                  </Pressable>
                );
              })}
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 24 },
  button: { backgroundColor: "#1a73e8", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  success: { color: "#1e8e3e" },
  screen: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e5eb",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  link: { color: "#1a73e8", fontWeight: "600", fontSize: 16 },
  content: { padding: 16, gap: 8 },
  muted: { color: "#666" },
  mine: { color: "#1e8e3e" },
  error: { color: "#c0392b" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 14,
  },
  rowDisabled: { opacity: 0.45 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: "600" },
});
