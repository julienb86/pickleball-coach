import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CreateSessionButton } from "@/components/create-session";
import { ExerciseBrowser, type Shelf } from "@/components/exercise-browser";
import { ExerciseForm } from "@/components/exercise-form";
import {
  useCreateExercise,
  useDeleteExercise,
  useUpdateExercise,
  type LibraryExercise,
} from "@/lib/queries/exercises";

const SHARED_NOTE = "Modifie la bibliothèque pour tous les coachs. Les séances déjà construites ne changent pas.";

/** The library shared by all coaches: browse, add, edit, delete. */
export default function ExercisesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <CreateSessionButton />
      <ExerciseBrowser>
        {(exercises, shelf) => <ShelfList key={shelf.label} exercises={exercises} shelf={shelf} />}
      </ExerciseBrowser>
    </ScrollView>
  );
}

function ShelfList({ exercises, shelf }: { exercises: LibraryExercise[]; shelf: Shelf }) {
  const create = useCreateExercise();
  const [adding, setAdding] = useState(false);

  return (
    <>
      {exercises.length === 0 && <Text style={styles.muted}>Aucun exercice pour l’instant.</Text>}
      {exercises.map((exercise, index) => (
        <LibraryItem key={exercise.id} exercise={exercise} index={index} />
      ))}

      {adding ? (
        <View style={styles.card}>
          <ExerciseForm
            submitLabel="Ajouter"
            note={`Nouvel exercice en ${shelf.label}, visible par tous les coachs.`}
            pending={create.isPending}
            error={create.error}
            onCancel={() => setAdding(false)}
            onSubmit={(text) =>
              create.mutate(
                {
                  ...text,
                  category: shelf.principle,
                  difficulty: shelf.level,
                  position: Math.max(0, ...exercises.map((e) => e.position)) + 1,
                },
                { onSuccess: () => setAdding(false) },
              )
            }
          />
        </View>
      ) : (
        <Pressable style={styles.addButton} onPress={() => setAdding(true)}>
          <Text style={styles.addText}>+ Ajouter un exercice</Text>
        </Pressable>
      )}
    </>
  );
}

function LibraryItem({ exercise, index }: { exercise: LibraryExercise; index: number }) {
  const update = useUpdateExercise();
  const remove = useDeleteExercise();
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");

  if (mode === "edit") {
    return (
      <View style={styles.card}>
        <ExerciseForm
          initial={{ title: exercise.title, description: exercise.description ?? "" }}
          submitLabel="Enregistrer"
          note={SHARED_NOTE}
          pending={update.isPending}
          error={update.error}
          onCancel={() => setMode("view")}
          onSubmit={(text) => update.mutate({ id: exercise.id, ...text }, { onSuccess: () => setMode("view") })}
        />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {index + 1}. {exercise.title}
      </Text>
      {!!exercise.description && <Text style={styles.cardText}>{exercise.description}</Text>}

      {mode === "delete" ? (
        <>
          <Text style={styles.error}>
            Supprimer cet exercice de la bibliothèque pour tous les coachs ? Les séances déjà construites le
            gardent.
          </Text>
          {remove.isError && <Text style={styles.error}>{remove.error.message}</Text>}
          <View style={styles.actions}>
            <Pressable onPress={() => setMode("view")} disabled={remove.isPending} hitSlop={8}>
              <Text>Annuler</Text>
            </Pressable>
            <Pressable
              style={styles.deleteButton}
              disabled={remove.isPending}
              onPress={() => remove.mutate(exercise.id)}>
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.actions}>
          <Pressable onPress={() => setMode("edit")} hitSlop={8}>
            <Text style={styles.link}>Modifier</Text>
          </Pressable>
          <Pressable onPress={() => setMode("delete")} hitSlop={8}>
            <Text style={styles.error}>Supprimer</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  muted: { color: "#666" },
  error: { color: "#c0392b" },
  card: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8, padding: 14, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardText: { color: "#444", lineHeight: 20 },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 20, marginTop: 4 },
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
  deleteButton: { backgroundColor: "#c0392b", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  deleteText: { color: "#fff", fontWeight: "600" },
});
