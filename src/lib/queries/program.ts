import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ExerciseText, LibraryExercise } from "@/lib/queries/exercises";
import { CALENDAR_KEY } from "@/lib/queries/sessions";
import { supabase } from "@/lib/supabase";

/** An exercise of a session: a copy, adaptable without touching the library. */
export type ProgramItem = {
  id: string;
  exercise_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  position: number;
  done: boolean;
};

const programKey = (sessionId: string) => ["program", sessionId];

export function useProgram(sessionId: string) {
  return useQuery({
    queryKey: programKey(sessionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_exercises")
        .select("id, exercise_id, title, description, category, difficulty, position, done")
        .eq("session_id", sessionId)
        .order("position");
      if (error) throw error;
      return data as ProgramItem[];
    },
  });
}

function useProgramMutation<T>(sessionId: string, mutationFn: (input: T, current: ProgramItem[]) => Promise<void>) {
  const queryClient = useQueryClient();
  const key = programKey(sessionId);
  return useMutation({
    mutationFn: (input: T) => mutationFn(input, queryClient.getQueryData<ProgramItem[]>(key) ?? []),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

function check({ error }: { error: { message: string } | null }) {
  if (error) throw new Error(error.message);
}

/** Copies library exercises into a session, after the given position, in the order given. */
async function insertCopies(sessionId: string, exercises: LibraryExercise[], after: number) {
  let position = after;
  const rows = exercises.map((e) => ({
    session_id: sessionId,
    exercise_id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    difficulty: e.difficulty,
    position: ++position,
  }));
  check(await supabase.from("session_exercises").insert(rows));
}

export const useAddToProgram = (sessionId: string) =>
  useProgramMutation(sessionId, async (exercises: LibraryExercise[], current) => {
    await insertCopies(sessionId, exercises, Math.max(0, ...current.map((item) => item.position)));
  });

async function findSession(date: string, slot: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, coach_id")
    .eq("date", date)
    .eq("slot", slot)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: string; coach_id: string | null } | null;
}

type CreateSession = { date: string; slot: string; exercises: LibraryExercise[]; myId: string | undefined };

/**
 * Takes the slot if no coach has it yet, then adds the exercises after those
 * already in the program. Refused if another coach leads that session.
 */
export function useCreateSessionWithExercises() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, slot, exercises, myId }: CreateSession) => {
      let session = await findSession(date, slot);
      if (!session?.coach_id) {
        check(await supabase.rpc("claim_session", { p_date: date, p_slot: slot }));
        session = await findSession(date, slot);
      }
      if (!session || !myId || session.coach_id !== myId) {
        throw new Error("Un autre coach est déjà positionné sur cette séance");
      }

      const { data: last, error } = await supabase
        .from("session_exercises")
        .select("position")
        .eq("session_id", session.id)
        .order("position", { ascending: false })
        .limit(1);
      if (error) throw new Error(error.message);

      await insertCopies(session.id, exercises, last[0]?.position ?? 0);
      return session.id;
    },
    // Also on failure: the slot may have been taken before the exercises failed.
    onSettled: (sessionId) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
        sessionId && queryClient.invalidateQueries({ queryKey: programKey(sessionId) }),
      ]),
  });
}

export const useUpdateProgramItem = (sessionId: string) =>
  useProgramMutation(sessionId, async ({ id, title, description }: ExerciseText & { id: string }) => {
    check(await supabase.from("session_exercises").update({ title, description }).eq("id", id));
  });

export const useRemoveProgramItem = (sessionId: string) =>
  useProgramMutation(sessionId, async (id: string) => {
    check(await supabase.from("session_exercises").delete().eq("id", id));
  });

/** Moves an item one step up or down. Renumbers 1..n, which also fixes ties. */
export function useMoveProgramItem(sessionId: string) {
  const queryClient = useQueryClient();
  const key = programKey(sessionId);
  return useMutation({
    mutationFn: async ({ index, delta }: { index: number; delta: -1 | 1 }) => {
      const items = [...(queryClient.getQueryData<ProgramItem[]>(key) ?? [])];
      const target = index + delta;
      if (target < 0 || target >= items.length) return;
      [items[index], items[target]] = [items[target], items[index]];

      const reordered = items.map((item, i) => ({ ...item, position: i + 1 }));
      queryClient.setQueryData(key, reordered); // Shown at once, saved behind.

      const changed = reordered.filter((item, i) => item.position !== items[i].position);
      const results = await Promise.all(
        changed.map((item) =>
          supabase.from("session_exercises").update({ position: item.position }).eq("id", item.id),
        ),
      );
      results.forEach(check);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
