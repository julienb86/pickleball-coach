import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { isNewPasswordReady, NewPasswordFields } from "@/components/new-password-fields";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/validation";

/** In the Profile tab: set a new password while signed in. */
export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function reset() {
    setPassword("");
    setConfirm("");
    setSubmitted(false);
    setError(null);
  }

  async function save() {
    setSubmitted(true);
    if (!isNewPasswordReady(password, confirm)) return;
    setError(null);
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(authErrorMessage(updateError));
      return;
    }
    reset();
    setOpen(false);
    setSaved(true);
  }

  if (!open) {
    return (
      <View style={styles.container}>
        {saved && <Text style={styles.success}>Mot de passe modifié.</Text>}
        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            setSaved(false);
            setOpen(true);
          }}>
          <Text style={styles.secondaryText}>Changer mon mot de passe</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.box]}>
      <Text style={styles.title}>Nouveau mot de passe</Text>
      <NewPasswordFields
        password={password}
        confirm={confirm}
        onChangePassword={setPassword}
        onChangeConfirm={setConfirm}
        showMismatch={submitted}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            reset();
            setOpen(false);
          }}
          disabled={busy}
          hitSlop={8}>
          <Text>Annuler</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={save} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enregistrer</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginTop: 24 },
  box: { borderWidth: 1, borderColor: "#e2e5eb", borderRadius: 8, padding: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  success: { color: "#1e8e3e", textAlign: "center" },
  error: { color: "#c0392b" },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 20 },
  button: { backgroundColor: "#1a73e8", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: { borderColor: "#1a73e8", borderWidth: 1, borderRadius: 8, padding: 14, alignItems: "center" },
  secondaryText: { color: "#1a73e8", fontSize: 16, fontWeight: "600" },
});
