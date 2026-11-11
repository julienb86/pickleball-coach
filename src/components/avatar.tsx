import { useState } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { avatarPhotoUrl, type AvatarOwner } from "@/lib/avatar";

const COLORS = ["#1a73e8", "#1e8e5a", "#d97a00", "#8e44ad", "#c0392b", "#16a085", "#2c3e50"];

/** The photo, else the chosen emoji, else the initials on a color fixed per person. */
export function Avatar({ owner, size = 32 }: { owner: AvatarOwner; size?: number }) {
  const circle = { width: size, height: size, borderRadius: size / 2 };
  const photo = avatarPhotoUrl(owner);
  // A photo that cannot be loaded falls back to the initials, not an empty circle.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (photo && photo !== failedUrl) {
    return (
      <Image
        source={{ uri: photo }}
        style={circle}
        contentFit="cover"
        onError={() => setFailedUrl(photo)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  if (owner.avatar_emoji) {
    return (
      <View style={[styles.center, styles.emojiBackground, circle]}>
        <Text style={{ fontSize: size * 0.55 }}>{owner.avatar_emoji}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.center, circle, { backgroundColor: colorFor(owner.id) }]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials(owner.full_name)}</Text>
    </View>
  );
}

function initials(name: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return words.length === 0 ? "?" : words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function colorFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  emojiBackground: { backgroundColor: "#eef1f6" },
  initials: { color: "#fff", fontWeight: "700" },
});
