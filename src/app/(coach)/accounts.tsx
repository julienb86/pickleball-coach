import { useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import {
  type Account,
  useAccounts,
  useApproveAccount,
  useDeleteAccount,
  useDemoteToPlayer,
  useIsAdmin,
  usePromoteToCoach,
} from "@/lib/queries/accounts";
import { personName } from "@/lib/queries/sessions";

export default function AccountsScreen() {
  const myId = useAuth().session?.user.id;
  const { data: isAdmin, isLoading } = useIsAdmin();
  const accounts = useAccounts(isAdmin === true);
  const promote = usePromoteToCoach();
  const [email, setEmail] = useState("");

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  // The tab is hidden for everyone else, and the database refuses them anyway.
  if (!isAdmin) {
    return <Redirect href="/(coach)/today" />;
  }

  const all = accounts.data ?? [];
  const pending = all.filter((a) => !a.approved);
  const approved = all.filter((a) => a.approved);
  const canSubmit = email.trim().length > 0 && !promote.isPending;

  function handleSubmit() {
    promote.mutate(email.trim(), { onSuccess: () => setEmail("") });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {pending.length > 0 && (
        <>
          <AccountSection title="À valider" accounts={pending} myId={myId} />
          <View style={styles.sectionTitle} />
        </>
      )}

      <Text style={styles.title}>Ajouter un coach</Text>
      <Text style={styles.muted}>
        La personne crée d’abord son compte dans l’application, puis vous saisissez son email ici.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email du futur coach"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={() => canSubmit && handleSubmit()}
      />

      {promote.isError && <Text style={styles.error}>{promote.error.message}</Text>}
      {promote.isSuccess && (
        <Text style={styles.success}>
          {personName(promote.data)} est maintenant coach. Le changement s’applique à son prochain
          lancement de l’application.
        </Text>
      )}

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}>
        {promote.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Passer coach</Text>
        )}
      </Pressable>

      {accounts.isLoading && <ActivityIndicator style={styles.sectionTitle} />}
      {accounts.isError && <Text style={styles.error}>{accounts.error.message}</Text>}
      {accounts.isSuccess && (
        <>
          <AccountSection title="Coachs" accounts={approved.filter((a) => a.role === "coach")} myId={myId} />
          <AccountSection title="Joueurs" accounts={approved.filter((a) => a.role === "player")} myId={myId} />
        </>
      )}
    </ScrollView>
  );
}

function AccountSection({
  title,
  accounts,
  myId,
}: {
  title: string;
  accounts: Account[];
  myId: string | undefined;
}) {
  return (
    <>
      <Text style={[styles.title, styles.sectionTop]}>{title}</Text>
      {accounts.length === 0 && <Text style={styles.muted}>Aucun compte.</Text>}
      {accounts.map((account) => (
        <AccountRow key={account.id} account={account} isMe={account.id === myId} />
      ))}
    </>
  );
}

// A two-step button rather than Alert.alert, which does nothing on the web.
function AccountRow({ account, isMe }: { account: Account; isMe: boolean }) {
  const remove = useDeleteAccount();
  const approve = useApproveAccount();
  const demote = useDemoteToPlayer();
  const [confirming, setConfirming] = useState<"delete" | "demote" | null>(null);
  const busy = remove.isPending || approve.isPending || demote.isPending;
  const confirmAction = confirming === "demote" ? demote : remove;

  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.name}>
          {personName(account)}
          {isMe && " (vous)"}
        </Text>
        <Text style={styles.muted}>{account.email}</Text>
        {confirming === "delete" && (
          <Text style={styles.error}>
            Supprimer définitivement ce compte et toutes ses données (présences, notes, objectifs) ?
          </Text>
        )}
        {confirming === "demote" && (
          <Text style={styles.warning}>
            Repasser ce coach en joueur ? Ses séances à venir seront libérées pour les autres coachs ; ses
            séances passées et ses exercices sont conservés.
          </Text>
        )}
        {remove.isError && <Text style={styles.error}>{remove.error.message}</Text>}
        {approve.isError && <Text style={styles.error}>{approve.error.message}</Text>}
        {demote.isError && <Text style={styles.error}>{demote.error.message}</Text>}
      </View>

      {!isMe &&
        (confirming ? (
          <View style={styles.actions}>
            <Pressable onPress={() => setConfirming(null)} disabled={busy} hitSlop={8}>
              <Text>Annuler</Text>
            </Pressable>
            <Pressable
              style={confirming === "demote" ? styles.demoteButton : styles.deleteButton}
              onPress={() => confirmAction.mutate(account.id, { onSuccess: () => setConfirming(null) })}
              disabled={busy}>
              {confirmAction.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteText}>Confirmer</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.actions}>
            {!account.approved && (
              <Pressable
                style={styles.approveButton}
                onPress={() => approve.mutate(account.id)}
                disabled={busy}>
                {approve.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteText}>Valider</Text>
                )}
              </Pressable>
            )}
            {account.role === "coach" && account.approved && (
              <Pressable onPress={() => setConfirming("demote")} disabled={busy} hitSlop={8}>
                <Text style={styles.link}>Repasser joueur</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setConfirming("delete")}
              disabled={busy}
              hitSlop={8}
              accessibilityRole="button">
              <Text style={styles.error}>{account.approved ? "Supprimer" : "Refuser"}</Text>
            </Pressable>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  sectionTitle: { marginTop: 24 },
  sectionTop: { marginTop: 12 },
  muted: { color: "#666" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#1a73e8",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#c0392b" },
  warning: { color: "#b35c00" },
  link: { color: "#1a73e8", fontWeight: "600" },
  demoteButton: { backgroundColor: "#d97a00", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  success: { color: "#1e8e3e" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },
  deleteButton: { backgroundColor: "#c0392b", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  approveButton: { backgroundColor: "#1e8e3e", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  deleteText: { color: "#fff", fontWeight: "600" },
});
