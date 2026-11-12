import { useState } from "react";
import { Link, router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isNewPasswordReady, NewPasswordFields } from "@/components/new-password-fields";
import { TestDatabaseBadge } from "@/components/test-database-badge";
import { supabase } from "@/lib/supabase";
import { authErrorMessage, isValidEmail, normalizeEmail } from "@/lib/validation";

/**
 * Reset by email needs an email provider (custom SMTP in Supabase), which is
 * not set up yet: until then, the administrator gives a temporary password
 * (Comptes tab, 014). Set to true once the provider and the "Reset password"
 * template are ready; the code flow below is then used.
 */
const RESET_BY_EMAIL = false;

/**
 * Forgotten password, with a code sent by email rather than a link: a link
 * would have to reopen the app, which Expo Go and the web do not do reliably.
 * The "Reset password" email template in Supabase must show {{ .Token }}.
 */
export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // Set once the code is accepted: a retry then only saves the password.
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendCode() {
    if (!isValidEmail(email)) {
      setError("Adresse email invalide.");
      return;
    }
    setError(null);
    setBusy(true);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email));
    setBusy(false);
    if (sendError) {
      setError(authErrorMessage(sendError));
      return;
    }
    // Same answer whether or not the account exists, so nobody can probe emails.
    setNotice(`Si un compte existe pour ${normalizeEmail(email)}, un code vient d'y être envoyé.`);
    setStep("code");
  }

  async function saveNewPassword() {
    setSubmitted(true);
    const token = code.replace(/\s/g, "");
    if (!verified && !/^\d{6,10}$/.test(token)) {
      setError("Saisissez le code à chiffres reçu par email.");
      return;
    }
    if (!isNewPasswordReady(password, confirm)) return;

    setError(null);
    setBusy(true);
    if (!verified) {
      // A valid code signs the user in, which then allows changing the password.
      const { error: codeError } = await supabase.auth.verifyOtp({
        email: normalizeEmail(email),
        token,
        type: "recovery",
      });
      if (codeError) {
        setBusy(false);
        setError(authErrorMessage(codeError));
        return;
      }
      setVerified(true);
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(authErrorMessage(updateError));
      return;
    }
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TestDatabaseBadge />
        <Text style={styles.title}>Mot de passe oublié</Text>

        {!RESET_BY_EMAIL ? (
          <Text style={styles.muted}>
            Demandez à l’administrateur du club un mot de passe provisoire. Connectez-vous avec, puis
            choisissez votre propre mot de passe dans l’onglet Profil.
          </Text>
        ) : step === "email" ? (
          <>
            <Text style={styles.muted}>Saisissez votre email : vous recevrez un code pour choisir un nouveau mot de passe.</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={styles.button} onPress={sendCode} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Recevoir un code</Text>}
            </Pressable>
          </>
        ) : (
          <>
            {notice && <Text style={styles.muted}>{notice}</Text>}
            {!verified && (
              <TextInput
                style={styles.input}
                placeholder="Code reçu par email"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={12}
                value={code}
                onChangeText={setCode}
              />
            )}
            <NewPasswordFields
              password={password}
              confirm={confirm}
              onChangePassword={setPassword}
              onChangeConfirm={setConfirm}
              showMismatch={submitted}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={styles.button} onPress={saveNewPassword} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Enregistrer le nouveau mot de passe</Text>
              )}
            </Pressable>
            {!verified && (
              <Pressable onPress={sendCode} disabled={busy} style={styles.link} hitSlop={8}>
                <Text style={styles.linkText}>Renvoyer un code</Text>
              </Pressable>
            )}
          </>
        )}

        <Link href="/(auth)/login" style={styles.link}>
          <Text>Retour à la connexion</Text>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  muted: { color: "#555" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: "#1a73e8", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#c0392b" },
  link: { marginTop: 8, alignSelf: "center" },
  linkText: { color: "#1a73e8", fontWeight: "600" },
});
