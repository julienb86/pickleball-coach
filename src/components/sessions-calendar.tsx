import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  formatLongDate,
  formatShortDate,
  formatSessionLabel,
  isSessionDay,
  monthGrid,
  monthLabel,
  nextSessionDate,
  parseISODate,
  slotsOn,
  toISODate,
  type Slot,
} from "@/lib/dates";
import {
  participationSummary,
  personName,
  sessionFor,
  useCalendar,
  useClaimSession,
  useReleaseSession,
  useSetPresence,
  type CalendarData,
} from "@/lib/queries/sessions";
import { useAuth } from "@/hooks/use-auth";
import { SessionProgram } from "@/components/session-program";
import { Avatar } from "@/components/avatar";

const WEEKDAY_HEADERS = ["L", "M", "M", "J", "V", "S", "D"];

export function SessionsCalendar() {
  const { profile } = useAuth();
  const today = toISODate(new Date());
  const { data, isPending, isError, error, refetch, isRefetching } = useCalendar();

  const [selected, setSelected] = useState(() => nextSessionDate(today));
  const [view, setView] = useState(() => {
    const d = parseISODate(nextSessionDate(today));
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  function changeMonth(delta: number) {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }

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
        <Text style={styles.error}>Impossible de charger le calendrier : {error.message}</Text>
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
      <View style={styles.monthHeader}>
        <Pressable style={styles.monthArrow} onPress={() => changeMonth(-1)} accessibilityLabel="Mois précédent">
          <Text style={styles.monthArrowText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel(view.year, view.month)}</Text>
        <Pressable style={styles.monthArrow} onPress={() => changeMonth(1)} accessibilityLabel="Mois suivant">
          <Text style={styles.monthArrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAY_HEADERS.map((label, index) => (
          <Text key={index} style={styles.weekdayHeader}>
            {label}
          </Text>
        ))}
      </View>

      {monthGrid(view.year, view.month).map((week, index) => (
        <View key={index} style={styles.week}>
          {week.map((date, dayIndex) => (
            <DayCell
              key={dayIndex}
              date={date}
              today={today}
              data={data}
              selected={date === selected}
              onSelect={setSelected}
            />
          ))}
        </View>
      ))}

      <View style={styles.legend}>
        <LegendItem style={styles.dayCovered} label="Coach prévu" />
        <LegendItem style={styles.dayOpen} label="Sans coach" />
        <LegendItem style={styles.dayPast} label="Passée" />
      </View>

      <DayDetail
        key={selected}
        date={selected}
        today={today}
        data={data}
        myId={profile?.id}
        isCoach={profile?.role === "coach"}
      />
    </ScrollView>
  );
}

function DayCell({
  date,
  today,
  data,
  selected,
  onSelect,
}: {
  date: string | null;
  today: string;
  data: CalendarData;
  selected: boolean;
  onSelect: (date: string) => void;
}) {
  if (!date) return <View style={styles.day} />;

  const dayNumber = parseISODate(date).getDate();
  if (!isSessionDay(date)) {
    return (
      <View style={styles.day}>
        <Text style={styles.dayOff}>{dayNumber}</Text>
      </View>
    );
  }

  // Green only when every slot of the day has its coach.
  const hasCoach = slotsOn(date).every((slot) => !!sessionFor(data, date, slot.key)?.coach_id);
  const statusStyle = date < today ? styles.dayPast : hasCoach ? styles.dayCovered : styles.dayOpen;

  return (
    <Pressable
      style={[styles.day, styles.dayBubble, statusStyle, selected && styles.daySelected]}
      onPress={() => onSelect(date)}
      accessibilityLabel={formatLongDate(date)}>
      <Text style={[styles.dayNumber, date >= today && hasCoach && styles.dayNumberLight]}>
        {dayNumber}
      </Text>
    </Pressable>
  );
}

function LegendItem({ style, label }: { style: object; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, style]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function DayDetail({
  date,
  today,
  data,
  myId,
  isCoach,
}: {
  date: string;
  today: string;
  data: CalendarData;
  myId: string | undefined;
  isCoach: boolean;
}) {
  const slots = slotsOn(date);

  return (
    <View style={styles.detail}>
      <Text style={styles.detailTitle}>{formatLongDate(date)}</Text>
      {slots.map((slot) => (
        <SlotDetail
          key={slot.key}
          date={date}
          slot={slot}
          showLabel={slots.length > 1}
          today={today}
          data={data}
          myId={myId}
          isCoach={isCoach}
        />
      ))}
      {date >= today && <PreviousParticipants data={data} today={today} />}
    </View>
  );
}

/** One session: its coach, its program and its attendance. */
function SlotDetail({
  date,
  slot,
  showLabel,
  today,
  data,
  myId,
  isCoach,
}: {
  date: string;
  slot: Slot;
  showLabel: boolean;
  today: string;
  data: CalendarData;
  myId: string | undefined;
  isCoach: boolean;
}) {
  const claim = useClaimSession();
  const release = useReleaseSession();
  const setPresence = useSetPresence();

  const session = sessionFor(data, date, slot.key);
  const coach = data.people.find((p) => p.id === session?.coach_id);
  const isUpcoming = date >= today;
  const isMine = !!myId && session?.coach_id === myId;
  const canMark = isMine && date <= today;
  const ref = { date, slot: slot.key };

  const players = data.people
    .filter((p) => p.role === "player")
    .sort((a, b) => personName(a).localeCompare(personName(b), "fr"));
  const presentIds = new Set(
    data.presences.filter((p) => p.session_id === session?.id).map((p) => p.player_id),
  );
  const presentPlayers = players.filter((p) => presentIds.has(p.id));
  const mutationError = claim.error ?? release.error ?? setPresence.error;

  return (
    <View style={[styles.slot, showLabel && styles.slotCard]}>
      {showLabel && slot.label && <Text style={styles.slotTitle}>{slot.label}</Text>}

      <View style={styles.personRow}>
        {coach && <Avatar owner={coach} size={32} />}
        <Text style={styles.coachLine}>
          Coach : {session?.coach_id ? personName(coach) : "aucun"}
          {isMine ? " (vous)" : ""}
        </Text>
      </View>

      {isCoach && isUpcoming && !session?.coach_id && (
        <Pressable
          style={styles.primaryButton}
          disabled={claim.isPending}
          onPress={() => claim.mutate(ref)}>
          <Text style={styles.primaryButtonText}>
            {showLabel ? `Me positionner sur ${slot.label}` : "Me positionner comme coach"}
          </Text>
        </Pressable>
      )}

      {isUpcoming && isMine && (
        <Pressable
          style={styles.secondaryButton}
          disabled={release.isPending}
          onPress={() => release.mutate(ref)}>
          <Text style={styles.secondaryButtonText}>
            {showLabel ? "Me retirer de ce créneau" : "Me retirer de cette séance"}
          </Text>
        </Pressable>
      )}

      {mutationError && <Text style={styles.error}>{mutationError.message}</Text>}

      {isMine && session && (
        <SessionProgram sessionId={session.id} dateLabel={formatSessionLabel(date, slot.key)} />
      )}

      {canMark && session && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Présents : {presentPlayers.length} / {players.length}
          </Text>
          {players.length === 0 && <Text style={styles.muted}>Aucun joueur inscrit pour l’instant.</Text>}
          <View style={styles.chips}>
            {players.map((player) => {
              const present = presentIds.has(player.id);
              return (
                <Pressable
                  key={player.id}
                  style={[styles.chip, present && styles.chipPresent]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: present }}
                  onPress={() =>
                    setPresence.mutate({ sessionId: session.id, playerId: player.id, present: !present })
                  }>
                  <Avatar owner={player} size={28} />
                  <Text style={present ? styles.chipTextPresent : styles.chipText}>
                    {personName(player)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {!canMark && date < today && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Présents</Text>
          {presentPlayers.length === 0 ? (
            <Text style={styles.muted}>Aucune présence enregistrée.</Text>
          ) : (
            presentPlayers.map((player) => (
              <View key={player.id} style={styles.personRow}>
                <Avatar owner={player} size={28} />
                <Text style={styles.listItem}>{personName(player)}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

function PreviousParticipants({ data, today }: { data: CalendarData; today: string }) {
  const participants = participationSummary(data, today);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Joueurs déjà venus</Text>
      {participants.length === 0 && <Text style={styles.muted}>Aucune participation enregistrée.</Text>}
      {participants.map(({ player, count, lastDate }) => (
        <View key={player.id} style={[styles.personRow, styles.participant]}>
          <Avatar owner={player} size={36} />
          <View>
            <Text style={styles.listItem}>{personName(player)}</Text>
            <Text style={styles.muted}>
              {count} {count > 1 ? "séances" : "séance"}, dernière le {formatShortDate(lastDate)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const BLUE = "#1a73e8";
const GREEN = "#1e8e5a";
const ORANGE = "#d97a00";

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  container: { padding: 16, gap: 4 },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  monthTitle: { fontSize: 20, fontWeight: "700" },
  monthArrow: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  monthArrowText: { fontSize: 30, color: BLUE },
  week: { flexDirection: "row" },
  weekdayHeader: { flex: 1, textAlign: "center", color: "#667", fontWeight: "600", paddingVertical: 4 },
  day: { flex: 1, height: 44, alignItems: "center", justifyContent: "center", margin: 1 },
  dayBubble: { borderRadius: 22, borderWidth: 2, borderColor: "transparent" },
  dayOff: { color: "#b5bac4" },
  dayNumber: { fontSize: 16, fontWeight: "700", color: "#222" },
  dayNumberLight: { color: "#fff" },
  dayPast: { backgroundColor: "#dfe3ea" },
  dayCovered: { backgroundColor: GREEN },
  dayOpen: { backgroundColor: "#fff", borderColor: ORANGE, borderWidth: 2 },
  daySelected: { borderColor: "#111", borderWidth: 3 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 10, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 16, height: 16, borderRadius: 8 },
  legendText: { color: "#556", fontSize: 13 },
  detail: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e2e5eb", gap: 10 },
  detailTitle: { fontSize: 20, fontWeight: "700" },
  slot: { gap: 10 },
  slotCard: { borderWidth: 1, borderColor: "#e2e5eb", borderRadius: 12, padding: 12 },
  slotTitle: { fontSize: 18, fontWeight: "700", color: BLUE },
  coachLine: { fontSize: 16 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  section: { marginTop: 8, gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  listItem: { fontSize: 16 },
  muted: { color: "#667" },
  participant: { paddingVertical: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 10,
    paddingRight: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#c4c9d4",
    justifyContent: "center",
  },
  chipPresent: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 16, color: "#333" },
  chipTextPresent: { fontSize: 16, color: "#fff", fontWeight: "600" },
  primaryButton: { backgroundColor: BLUE, borderRadius: 8, padding: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: { borderColor: BLUE, borderWidth: 1, borderRadius: 8, padding: 14, alignItems: "center" },
  secondaryButtonText: { color: BLUE, fontSize: 16, fontWeight: "600" },
  error: { color: "#c0392b" },
});
