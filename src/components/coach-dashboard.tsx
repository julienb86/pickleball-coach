import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { AdminCoachPicker } from "@/components/admin-coach-picker";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/hooks/use-auth";
import {
  inactivePlayers,
  keyStats,
  openSlots,
  regularPlayers,
  upcomingSlots,
  type UpcomingSlot,
} from "@/lib/dashboard";
import { formatSessionLabel, formatShortDate, toISODate } from "@/lib/dates";
import { personName, useCalendar, useClaimSession, type CalendarData } from "@/lib/queries/sessions";

export function CoachDashboard() {
  const { profile } = useAuth();
  const today = toISODate(new Date());
  const { data, isPending, isError, error, refetch, isRefetching } = useCalendar();

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
        <Text style={styles.error}>Impossible de charger le tableau de bord : {error.message}</Text>
        <Pressable style={styles.primaryButton} onPress={() => refetch()}>
          <Text style={styles.primaryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

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
      <KeyFigures data={data} today={today} myId={profile?.id} />
      <OpenSlots data={data} today={today} />
      <UpcomingSessions data={data} today={today} myId={profile?.id} />
      <RegularPlayers data={data} today={today} />
      <PlayersToContact data={data} today={today} />
    </ScrollView>
  );
}

type SectionProps = { data: CalendarData; today: string };

function openCalendarOn(date: string) {
  router.push({ pathname: "/(coach)/calendar", params: { date } });
}

function Section({ title, children, style }: { title: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function KeyFigures({ data, today, myId }: SectionProps & { myId: string | undefined }) {
  const stats = keyStats(data, today, myId);
  const average =
    stats.averageAttendance === null ? "–" : stats.averageAttendance.toFixed(1).replace(".", ",");

  return (
    <View style={styles.tiles}>
      <StatTile value={String(stats.sessionsThisMonth)} label="Séances ce mois" />
      <StatTile value={String(stats.mineThisMonth)} label="Mes séances ce mois" />
      <StatTile value={average} label="Joueurs / séance (3 mois)" />
      <StatTile value={`${stats.activePlayers} / ${stats.totalPlayers}`} label="Joueurs actifs (30 j)" />
    </View>
  );
}

function OpenSlots({ data, today }: SectionProps) {
  const claim = useClaimSession();
  const slots = openSlots(data, today);

  if (slots.length === 0) {
    return (
      <Section title="Créneaux à pourvoir">
        <Text style={styles.muted}>Tous les créneaux des 4 prochaines semaines ont un coach ✅</Text>
      </Section>
    );
  }

  return (
    <Section title={`Créneaux à pourvoir (${slots.length})`} style={styles.alertCard}>
      <Text style={styles.muted}>Sans coach dans les 4 prochaines semaines</Text>
      {slots.map(({ date, slot }) => {
        const pending =
          claim.isPending && claim.variables?.date === date && claim.variables?.slot === slot.key;
        return (
          <View key={`${date}-${slot.key}`} style={styles.openItem}>
            <View style={styles.openRow}>
              <Pressable style={styles.openLabel} onPress={() => openCalendarOn(date)}>
                <Text style={styles.listItem}>{formatSessionLabel(date, slot.key)}</Text>
              </Pressable>
              <Pressable
                style={styles.claimButton}
                disabled={claim.isPending}
                onPress={() => claim.mutate({ date, slot: slot.key })}>
                {pending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Me positionner</Text>
                )}
              </Pressable>
            </View>
            <AdminCoachPicker data={data} date={date} slot={slot.key} />
          </View>
        );
      })}
      {claim.error && <Text style={styles.error}>{claim.error.message}</Text>}
    </Section>
  );
}

function UpcomingSessions({ data, today, myId }: SectionProps & { myId: string | undefined }) {
  const slots = upcomingSlots(data, today, 5);

  return (
    <Section title="Prochaines séances">
      {slots.map((item) => (
        <UpcomingRow key={`${item.date}-${item.slot.key}`} item={item} myId={myId} />
      ))}
      <Pressable style={styles.linkButton} onPress={() => router.push("/(coach)/calendar")}>
        <Text style={styles.linkText}>Voir le calendrier ›</Text>
      </Pressable>
    </Section>
  );
}

function UpcomingRow({ item, myId }: { item: UpcomingSlot; myId: string | undefined }) {
  const { date, slot, session, coach } = item;
  const isMine = !!myId && session?.coach_id === myId;

  return (
    <Pressable
      style={styles.row}
      onPress={() => openCalendarOn(date)}
      accessibilityLabel={formatSessionLabel(date, slot.key)}>
      {coach ? <Avatar owner={coach} size={36} /> : <View style={styles.noCoachDot} />}
      <View style={styles.rowText}>
        <Text style={styles.listItem}>{formatSessionLabel(date, slot.key)}</Text>
        {session?.coach_id ? (
          <Text style={styles.muted}>
            {personName(coach)}
            {isMine && <Text style={styles.mine}> · vous</Text>}
          </Text>
        ) : (
          <Text style={styles.noCoach}>Sans coach</Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function RegularPlayers({ data, today }: SectionProps) {
  const players = regularPlayers(data, today);

  return (
    <Section title="Joueurs les plus réguliers">
      {players.length === 0 && <Text style={styles.muted}>Aucune présence enregistrée.</Text>}
      {players.map(({ player, count, lastDate }, index) => (
        <View key={player.id} style={styles.row}>
          <Text style={styles.rank}>{index + 1}</Text>
          <Avatar owner={player} size={36} />
          <View style={styles.rowText}>
            <Text style={styles.listItem}>{personName(player)}</Text>
            <Text style={styles.muted}>
              {count} {count > 1 ? "séances" : "séance"}, dernière le {formatShortDate(lastDate)}
            </Text>
          </View>
        </View>
      ))}
    </Section>
  );
}

function PlayersToContact({ data, today }: SectionProps) {
  const { lapsed, never } = inactivePlayers(data, today);

  return (
    <Section title="À relancer">
      <Text style={styles.muted}>Pas venus depuis plus de 3 semaines</Text>
      {lapsed.length === 0 && <Text style={styles.listItem}>Personne, bravo 👏</Text>}
      {lapsed.map(({ player, daysAgo, lastDate }) => (
        <View key={player.id} style={styles.row}>
          <Avatar owner={player} size={36} />
          <View style={styles.rowText}>
            <Text style={styles.listItem}>{personName(player)}</Text>
            <Text style={styles.muted}>
              Dernière venue il y a {daysAgo} jours ({formatShortDate(lastDate)})
            </Text>
          </View>
        </View>
      ))}
      {never.length > 0 && (
        <Text style={[styles.muted, styles.never]}>
          Jamais venus : {never.map(personName).join(", ")}
        </Text>
      )}
    </Section>
  );
}

const BLUE = "#1a73e8";
const GREEN = "#1e8e5a";
const ORANGE = "#d97a00";

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  container: { padding: 16, gap: 16 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#e2e5eb",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  tileValue: { fontSize: 28, fontWeight: "700", color: BLUE },
  tileLabel: { fontSize: 13, color: "#556" },
  card: { borderWidth: 1, borderColor: "#e2e5eb", borderRadius: 12, padding: 14, gap: 10 },
  alertCard: { borderColor: ORANGE, borderWidth: 2 },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
  rowText: { flex: 1 },
  rank: { width: 18, textAlign: "center", fontWeight: "700", color: "#667" },
  openItem: { gap: 2 },
  openRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  openLabel: { flex: 1, minHeight: 48, justifyContent: "center" },
  claimButton: {
    backgroundColor: GREEN,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  noCoachDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: ORANGE },
  noCoach: { color: ORANGE, fontWeight: "600" },
  mine: { color: GREEN, fontWeight: "600" },
  chevron: { fontSize: 24, color: "#b5bac4" },
  listItem: { fontSize: 16 },
  muted: { color: "#667" },
  never: { marginTop: 4 },
  linkButton: { minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  linkText: { color: BLUE, fontSize: 16, fontWeight: "600" },
  primaryButton: { backgroundColor: BLUE, borderRadius: 8, padding: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#c0392b" },
});
