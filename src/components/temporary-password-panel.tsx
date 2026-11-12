import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useSetTemporaryPassword } from "@/lib/queries/accounts";
import { getPasswordRules, isStrongPassword } from "@/lib/validation";

const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SPECIAL = "!@#$%&*?";

/** Fixed-width font, so each character of the password is easy to read out. */
const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

/** 12 characters meeting every rule, without look-alikes (l/1, O/0) since it is read out or copied by hand. */
function generatePassword(): string {
  const random = (max: number) => {
    const buffer = new Uint32Array(1);
    // Real randomness when the platform provides it.
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buffer);
    else buffer[0] = Math.floor(Math.random() * 2 ** 32);
    return buffer[0] % max;
  };
  const pick = (set: string) => set[random(set.length)];
  const all = LOWER + UPPER + DIGITS + SPECIAL;
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Admin only: give an account a temporary password to pass on to the person. */
export function TemporaryPasswordPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const setPassword = useSetTemporaryPassword();
  const [password, setPasswordText] = useState(generatePassword);
  const strong = isStrongPassword(password);

  if (setPassword.isSuccess) {
    return (
      <View style={styles.box}>
        <Text style={styles.success}>Mot de passe provisoire enregistré :</Text>
        <Text style={styles.password} selectable>
          {setPassword.variables.password}
        </Text>
        <Text style={styles.muted}>
          Transmettez-le à la personne : elle se connecte avec, puis le change dans l’onglet Profil.
        </Text>
        <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
          <Text style={styles.link}>Fermer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Mot de passe provisoire</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPasswordText}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />
      <Pressable
        onPress={() => setPasswordText(generatePassword())}
        hitSlop={8}
        style={styles.generate}
        accessibilityRole="button">
        <Text style={styles.link}>↻ Générer un autre</Text>
      </Pressable>
      {!strong &&
        getPasswordRules(password)
          .filter((rule) => !rule.met)
          .map((rule) => (
            <Text key={rule.label} style={styles.muted}>
              • {rule.label}
            </Text>
          ))}
      {setPassword.isError && <Text style={styles.error}>{setPassword.error.message}</Text>}
      <View style={styles.actions}>
        <Pressable onPress={onClose} disabled={setPassword.isPending} hitSlop={8}>
          <Text>Annuler</Text>
        </Pressable>
        <Pressable
          style={[styles.button, !strong && styles.buttonDisabled]}
          disabled={!strong || setPassword.isPending}
          onPress={() => setPassword.mutate({ userId, password })}>
          {setPassword.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enregistrer</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: "stretch",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e5eb",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#fff",
  },
  title: { fontSize: 16, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 20,
    fontFamily: MONO,
    letterSpacing: 1,
    textAlign: "center",
    color: "#111",
    backgroundColor: "#f7f8fa",
  },
  generate: { alignSelf: "flex-start" },
  password: { fontSize: 22, fontWeight: "700", fontFamily: MONO, letterSpacing: 1, textAlign: "center" },
  muted: { color: "#666" },
  success: { color: "#1e8e3e", fontWeight: "600" },
  error: { color: "#c0392b" },
  link: { color: "#1a73e8", fontWeight: "600" },
  close: { alignSelf: "flex-end" },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 20 },
  button: { backgroundColor: "#1a73e8", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
