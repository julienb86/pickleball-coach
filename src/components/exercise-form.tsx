import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { ExerciseText } from "@/lib/queries/exercises";

/** Title and instructions of an exercise, in the library or in a session. */
export function ExerciseForm({
  initial,
  note,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: ExerciseText;
  /** Reminds what saving changes: the library for everyone, or one session. */
  note?: string;
  submitLabel: string;
  pending: boolean;
  error: Error | null;
  onSubmit: (text: ExerciseText) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const canSubmit = title.trim().length > 0 && !pending;

  return (
    <View style={styles.form}>
      <TextInput style={styles.input} placeholder="Titre" value={title} onChangeText={setTitle} />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Consigne"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />
      {note && <Text style={styles.note}>{note}</Text>}
      {error && <Text style={styles.error}>{error.message}</Text>}
      <View style={styles.actions}>
        <Pressable onPress={onCancel} disabled={pending} hitSlop={8}>
          <Text>Annuler</Text>
        </Pressable>
        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          disabled={!canSubmit}
          onPress={() => onSubmit({ title: title.trim(), description: description.trim() })}>
          {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{submitLabel}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 96 },
  note: { color: "#666", fontSize: 13 },
  error: { color: "#c0392b" },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 16 },
  button: { backgroundColor: "#1a73e8", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
