import { StyleSheet, Text, TextInput, View } from "react-native";

import { getPasswordRules, isStrongPassword } from "@/lib/validation";

/** True when both fields hold the same strong password. */
export function isNewPasswordReady(password: string, confirm: string): boolean {
  return isStrongPassword(password) && password === confirm;
}

/** New password + confirmation, with the live checklist of the password rules. */
export function NewPasswordFields({
  password,
  confirm,
  onChangePassword,
  onChangeConfirm,
  showMismatch,
}: {
  password: string;
  confirm: string;
  onChangePassword: (value: string) => void;
  onChangeConfirm: (value: string) => void;
  /** Show the "do not match" error (once the user has left the field or submitted). */
  showMismatch: boolean;
}) {
  const mismatch = showMismatch && confirm.length > 0 && password !== confirm;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nouveau mot de passe"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={onChangePassword}
      />
      <View style={styles.rules}>
        {getPasswordRules(password).map((rule) => (
          <Text key={rule.label} style={rule.met ? styles.ruleMet : styles.ruleUnmet}>
            {rule.met ? "✓" : "•"} {rule.label}
          </Text>
        ))}
      </View>
      <TextInput
        style={[styles.input, mismatch && styles.inputError]}
        placeholder="Confirmer le mot de passe"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirm}
        onChangeText={onChangeConfirm}
      />
      {mismatch && <Text style={styles.error}>Les mots de passe ne correspondent pas.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  inputError: { borderColor: "#c0392b" },
  rules: { gap: 2, paddingHorizontal: 4 },
  ruleMet: { color: "#1e8e3e" },
  ruleUnmet: { color: "#667" },
  error: { color: "#c0392b" },
});
