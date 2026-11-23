// Figures for the coach dashboard, computed from the calendar data already
// loaded for the calendar screen: no query of its own.

import { parseISODate, slotsOn, toISODate, upcomingSessionDates, type Slot } from "@/lib/dates";
import {
  participationSummary,
  sessionFor,
  type CalendarData,
  type CalendarSession,
  type Participation,
  type Person,
} from "@/lib/queries/sessions";

export type UpcomingSlot = {
  date: string;
  slot: Slot;
  session: CalendarSession | undefined;
  coach: Person | undefined;
};

export type KeyStats = {
  /** Sessions held this month so far (with a coach, up to today). */
  sessionsThisMonth: number;
  /** Sessions I lead this month, held or planned. */
  mineThisMonth: number;
  /** Players present per session over the last 3 months, null without any presence. */
  averageAttendance: number | null;
  /** Players present at least once in the last 30 days. */
  activePlayers: number;
  totalPlayers: number;
};

export type LapsedPlayer = Participation & { daysAgo: number };

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole days from one date to another (rounded: a DST change shifts an hour). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000);
}

function toSlots(data: CalendarData, dates: string[]): UpcomingSlot[] {
  return dates.flatMap((date) =>
    slotsOn(date).map((slot) => {
      const session = sessionFor(data, date, slot.key);
      return { date, slot, session, coach: data.people.find((p) => p.id === session?.coach_id) };
    }),
  );
}

/** The next `count` sessions, today's included. */
export function upcomingSlots(data: CalendarData, today: string, count: number): UpcomingSlot[] {
  // Every session day has at least one slot, so `count` days are enough.
  return toSlots(data, upcomingSessionDates(today, count)).slice(0, count);
}

/** Sessions of the next `weeks` weeks that no coach has taken yet. */
export function openSlots(data: CalendarData, today: string, weeks = 4): UpcomingSlot[] {
  const end = addDays(today, weeks * 7);
  // At most 7 session days a week: an upper bound, cut at `end`.
  const dates = upcomingSessionDates(today, weeks * 7).filter((date) => date < end);
  return toSlots(data, dates).filter((s) => !s.session?.coach_id);
}

function players(data: CalendarData): Person[] {
  return data.people.filter((p) => p.role === "player");
}

export function keyStats(data: CalendarData, today: string, myId: string | undefined): KeyStats {
  const month = today.slice(0, 7);
  const playerIds = new Set(players(data).map((p) => p.id));
  const dateOf = new Map(data.sessions.map((s) => [s.id, s.date]));

  const sessionsThisMonth = data.sessions.filter(
    (s) => s.coach_id && s.date <= today && s.date.startsWith(month),
  ).length;
  const mineThisMonth = data.sessions.filter(
    (s) => !!myId && s.coach_id === myId && s.date.startsWith(month),
  ).length;

  const since3Months = addDays(today, -91);
  const since30Days = addDays(today, -30);
  const perSession = new Map<string, number>();
  const active = new Set<string>();
  for (const presence of data.presences) {
    const date = dateOf.get(presence.session_id);
    if (!date || date > today || !playerIds.has(presence.player_id)) continue;
    if (date > since3Months) {
      perSession.set(presence.session_id, (perSession.get(presence.session_id) ?? 0) + 1);
    }
    if (date > since30Days) active.add(presence.player_id);
  }

  const counts = [...perSession.values()];
  const averageAttendance =
    counts.length > 0 ? counts.reduce((sum, n) => sum + n, 0) / counts.length : null;

  return {
    sessionsThisMonth,
    mineThisMonth,
    averageAttendance,
    activePlayers: active.size,
    totalPlayers: playerIds.size,
  };
}

function playerParticipation(data: CalendarData, today: string): Participation[] {
  return participationSummary(data, today).filter((p) => p.player.role === "player");
}

/** The most regular players, most sessions first. */
export function regularPlayers(data: CalendarData, today: string, limit = 5): Participation[] {
  return playerParticipation(data, today).slice(0, limit);
}

/** Players who came before but not in the last `days` days (longest absence first), and those who never came. */
export function inactivePlayers(
  data: CalendarData,
  today: string,
  days = 21,
): { lapsed: LapsedPlayer[]; never: Person[] } {
  const participation = playerParticipation(data, today);
  const lapsed = participation
    .map((p) => ({ ...p, daysAgo: daysBetween(p.lastDate, today) }))
    .filter((p) => p.daysAgo > days)
    .sort((a, b) => b.daysAgo - a.daysAgo);

  const came = new Set(participation.map((p) => p.player.id));
  const never = players(data).filter((p) => !came.has(p.id));
  return { lapsed, never };
}
