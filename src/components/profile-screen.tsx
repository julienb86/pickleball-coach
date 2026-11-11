import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { useAuth } from "@/hooks/use-auth";
import { AVATAR_EMOJIS } from "@/lib/avatar";
import { useSetAvatar } from "@/lib/queries/profile";
import { personName } from "@/lib/queries/sessions";

/** Shared by the coach and player tabs: choose a photo or an emoji avatar. */
export function ProfileScreen() {
  const { profile } = useAuth();
  const setAvatar = useSetAvatar();

  if (!profile) return null;

  async function pickPhoto() {
    // The system photo picker needs no permission request.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setAvatar.mutate({ kind: "photo", uri: result.assets[0].uri });
  }

  const hasAvatar = !!profile.avatar_photo_at || !!profile.avatar_emoji;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.identity}>
        <View>
          <Avatar owner={profile} size={120} />
          {setAvatar.isPending && (
            <View style={styles.overlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>
        <Text style={styles.name}>{personName(profile)}</Text>
        <Text style={styles.muted}>{profile.role === "coach" ? "Coach" : "Joueur"}</Text>
      </View>

      {setAvatar.isError && <Text style={styles.error}>{setAvatar.error.message}</Text>}

      <Pressable style={styles.button} onPress={pickPhoto} disabled={setAvatar.isPending}>
        <Text style={styles.buttonText}>{profile.avatar_photo_at ? "Changer de photo" : "Choisir une photo"}</Text>
      </Pressable>
      {hasAvatar && (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setAvatar.mutate({ kind: "none" })}
          disabled={setAvatar.isPending}>
          <Text style={styles.secondaryText}>Retirer l’avatar</Text>
        </Pressable>
      )}

      <Text style={styles.title}>Ou choisissez un avatar</Text>
      <View style={styles.grid}>
        {AVATAR_EMOJIS.map((emoji) => {
          const selected = !profile.avatar_photo_at && profile.avatar_emoji === emoji;
          return (
            <Pressable
              key={emoji}
              style={[styles.emoji, selected && styles.emojiSelected]}
              onPress={() => setAvatar.mutate({ kind: "emoji", emoji })}
              disabled={setAvatar.isPending}
              accessibilityRole="button"
              accessibilityState={{ selected }}>
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  identity: { alignItems: "center", gap: 6, marginBottom: 12 },
  overlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 60,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 22, fontWeight: "700", marginTop: 6 },
  muted: { color: "#666" },
  error: { color: "#c0392b", textAlign: "center" },
  title: { fontSize: 18, fontWeight: "700", marginTop: 16 },
  button: { backgroundColor: "#1a73e8", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: { borderColor: "#1a73e8", borderWidth: 1, borderRadius: 8, padding: 14, alignItems: "center" },
  secondaryText: { color: "#1a73e8", fontSize: 16, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emoji: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#eef1f6",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiSelected: { borderColor: "#1a73e8" },
  emojiText: { fontSize: 28 },
});
