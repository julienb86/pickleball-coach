import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { useAuth } from "@/hooks/use-auth";
import { formatSessionLabel, slotsOn, toISODate } from "@/lib/dates";
import { personName, useCalendar, type CalendarSession } from "@/lib/queries/sessions";

/** How many upcoming sessions are shown under each coach. */
const NEXT_SHOWN = 3;

/** Shared by the coach and player tabs: every coach, with their next sessions. */
export function CoachesScreen() {
  const myId = useAuth().profile?.id;
  const { data, isPending, isError, error, refetch, isRefetching } = useCalendar();
  const today = toISODate(new Date());

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Impossible de charger les coachs : {error.message}</Text>
        <Pressable style={styles.button} onPress={() => refetch()}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const coaches = data.people
    .filter((p) => p.role === "coach")
    .sort((a, b) => personName(a).localeCompare(personName(b), "fr"));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
          }}
        />
      }>
      <Text style={styles.title}>
        {coaches.length} coach{coaches.length > 1 ? "s" : ""}
      </Text>
      {coaches.length === 0 && <Text style={styles.muted}>Aucun coach pour l’instant.</Text>}

      {coaches.map((coach) => {
        const next = upcoming(data.sessions, coach.id, today);
        return (
          <View key={coach.id} style={styles.card}>
            <Avatar owner={coach} size={56} />
            <View style={styles.cardText}>
              <Text style={styles.name}>
                {personName(coach)}
                {coach.id === myId ? " (vous)" : ""}
              </Text>
              {next.length === 0 ? (
                <Text style={styles.muted}>Aucune séance prévue</Text>
              ) : (
                <>
                  <Text style={styles.label}>Prochaines séances</Text>
                  {next.slice(0, NEXT_SHOWN).map((s) => (
                    <Text key={s.id} style={styles.session}>
                      {formatSessionLabel(s.date, s.slot)}
                    </Text>
                  ))}
                  {next.length > NEXT_SHOWN && (
                    <Text style={styles.muted}>et {next.length - NEXT_SHOWN} autre(s)</Text>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

/** The coach's sessions from today on, by date then by slot time. */
function upcoming(sessions: CalendarSession[], coachId: string, today: string): CalendarSession[] {
  const slotIndex = (s: CalendarSession) => slotsOn(s.date).findIndex((slot) => slot.key === s.slot);
  return sessions
    .filter((s) => s.coach_id === coachId && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || slotIndex(a) - slotIndex(b));
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  muted: { color: "#667" },
  error: { color: "#c0392b", textAlign: "center" },
  card: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#e2e5eb",
    borderRadius: 12,
    padding: 14,
  },
  cardText: { flex: 1, gap: 3 },
  name: { fontSize: 17, fontWeight: "700" },
  label: { color: "#667", fontSize: 13, marginTop: 2 },
  session: { fontSize: 15 },
  button: { backgroundColor: "#1a73e8", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
