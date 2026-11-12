import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type Person = {
  id: string;
  role: "coach" | "player";
  full_name: string | null;
  avatar_photo_at?: string | null;
  avatar_emoji?: string | null;
};
export type CalendarSession = { id: string; date: string; slot: string; coach_id: string | null };
/** A player who was present at a session. */
export type Presence = { session_id: string; player_id: string };
export type CalendarData = {
  sessions: CalendarSession[];
  presences: Presence[];
  people: Person[];
};
export type Participation = { player: Person; count: number; lastDate: string };

export const CALENDAR_KEY = ["calendar"];

async function fetchCalendar(): Promise<CalendarData> {
  const [sessions, presences, people] = await Promise.all([
    supabase.from("sessions").select("id, date, slot, coach_id").order("date"),
    supabase.from("session_attendance").select("session_id, player_id").eq("present", true),
    supabase.from("profiles").select("id, role, full_name, avatar_photo_at, avatar_emoji"),
  ]);
  if (sessions.error) throw sessions.error;
  if (presences.error) throw presences.error;
  if (people.error) throw people.error;
  return {
    sessions: sessions.data as CalendarSession[],
    presences: presences.data as Presence[],
    people: people.data as Person[],
  };
}

export function useCalendar() {
  return useQuery({ queryKey: CALENDAR_KEY, queryFn: fetchCalendar });
}

/** The session of that date and slot, if a coach has ever taken it. */
export function sessionFor(data: CalendarData, date: string, slot: string): CalendarSession | undefined {
  return data.sessions.find((s) => s.date === date && s.slot === slot);
}

export function personName(person: Person | undefined): string {
  return person?.full_name?.trim() || "Sans nom";
}

/** Every player who attended a session up to today, most regular first. */
export function participationSummary(data: CalendarData, today: string): Participation[] {
  const dateOf = new Map(data.sessions.map((s) => [s.id, s.date]));
  const byPlayer = new Map<string, Participation>();

  for (const presence of data.presences) {
    const date = dateOf.get(presence.session_id);
    const player = data.people.find((p) => p.id === presence.player_id);
    if (!date || date > today || !player) continue;

    const entry = byPlayer.get(player.id);
    if (entry) {
      entry.count += 1;
      if (date > entry.lastDate) entry.lastDate = date;
    } else {
      byPlayer.set(player.id, { player, count: 1, lastDate: date });
    }
  }

  return [...byPlayer.values()].sort(
    (a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate),
  );
}

/** A session is identified by its date and its slot (see slotsOn in dates.ts). */
export type SlotRef = { date: string; slot: string };

async function callSlotFunction(name: "claim_session" | "release_session", { date, slot }: SlotRef) {
  const { error } = await supabase.rpc(name, { p_date: date, p_slot: slot });
  if (error) throw new Error(error.message);
}

function useSlotFunction(name: "claim_session" | "release_session") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: SlotRef) => callSlotFunction(name, ref),
    // Also on failure: another coach may have just taken this slot.
    onSettled: () => queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
  });
}

export const useClaimSession = () => useSlotFunction("claim_session");
export const useReleaseSession = () => useSlotFunction("release_session");

type SetPresence = { sessionId: string; playerId: string; present: boolean };

/** Applied on screen immediately: a tap at courtside should never wait. */
export function useSetPresence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, playerId, present }: SetPresence) => {
      const { error } = await supabase
        .from("session_attendance")
        .upsert(
          { session_id: sessionId, player_id: playerId, present },
          { onConflict: "session_id,player_id" },
        );
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ sessionId, playerId, present }) => {
      await queryClient.cancelQueries({ queryKey: CALENDAR_KEY });
      const previous = queryClient.getQueryData<CalendarData>(CALENDAR_KEY);
      if (previous) {
        const others = previous.presences.filter(
          (p) => !(p.session_id === sessionId && p.player_id === playerId),
        );
        queryClient.setQueryData<CalendarData>(CALENDAR_KEY, {
          ...previous,
          presences: present
            ? [...others, { session_id: sessionId, player_id: playerId }]
            : others,
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(CALENDAR_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
  });
}
