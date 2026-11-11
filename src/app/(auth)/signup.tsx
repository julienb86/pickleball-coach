import { useState } from "react";
import { Link, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import {
  authErrorMessage,
  getPasswordRules,
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
} from "@/lib/validation";

export default function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const emailValid = isValidEmail(email);
  const passwordRules = getPasswordRules(password);
  const passwordStrong = isStrongPassword(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = fullName.trim().length > 0 && emailValid && passwordStrong && passwordsMatch && !submitting;

  async function handleSignup() {
    setEmailTouched(true);
    setConfirmTouched(true);
    if (!canSubmit) return;

    setError(null);
    setSubmitting(true);

    // A database trigger creates the profile, always as a player: only the
    // administrator can then make someone a coach.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    setSubmitting(false);
    if (signUpError) {
      setError(authErrorMessage(signUpError));
      return;
    }

    if (!data.session) {
      // Email confirmation is enabled on the Supabase project — no session yet.
      setCheckEmail(true);
      return;
    }

    router.replace("/");
  }

  if (checkEmail) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Vérifiez votre email</Text>
        <Text>
          Un lien de confirmation a été envoyé à {normalizeEmail(email)}. Confirmez puis connectez-vous.
        </Text>
        <Link href="/(auth)/login" style={styles.link}>
          <Text>Retour à la connexion</Text>
        </Link>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>

      <TextInput
        style={styles.input}
        placeholder="Nom complet"
        autoComplete="name"
        textContentType="name"
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        style={[styles.input, emailTouched && !emailValid && styles.inputError]}
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onBlur={() => setEmailTouched(true)}
      />
      {emailTouched && !emailValid && <Text style={styles.error}>Adresse email invalide.</Text>}

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <View style={styles.rules}>
        {passwordRules.map((rule) => (
          <Text key={rule.label} style={rule.met ? styles.ruleMet : styles.ruleUnmet}>
            {rule.met ? "✓" : "•"} {rule.label}
          </Text>
        ))}
      </View>

      <TextInput
        style={[styles.input, confirmTouched && !passwordsMatch && styles.inputError]}
        placeholder="Confirmer le mot de passe"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        onBlur={() => setConfirmTouched(true)}
      />
      {confirmTouched && !passwordsMatch && (
        <Text style={styles.error}>Les mots de passe ne correspondent pas.</Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={!canSubmit}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{"S'inscrire"}</Text>}
      </Pressable>

      <Link href="/(auth)/login" style={styles.link}>
        <Text>Déjà un compte ? Se connecter</Text>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: { borderColor: "#c0392b" },
  rules: { gap: 2, paddingHorizontal: 4 },
  ruleMet: { color: "#1e8449", fontSize: 13 },
  ruleUnmet: { color: "#888", fontSize: 13 },
  button: {
    backgroundColor: "#1a73e8",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#c0392b" },
  link: { marginTop: 16, alignSelf: "center" },
});
