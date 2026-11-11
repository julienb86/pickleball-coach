import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { LevelKey, PrincipleKey } from "@/lib/exercise-library";
import { supabase } from "@/lib/supabase";

/** An exercise of the library shared by all coaches. */
export type LibraryExercise = {
  id: string;
  title: string;
  description: string | null;
  category: PrincipleKey;
  difficulty: LevelKey;
  position: number;
};

export type ExerciseText = { title: string; description: string };

const LIBRARY_KEY = ["exercise-library"];

/** The whole library at once (a few hundred rows): browsing is then instant. */
export function useLibrary() {
  return useQuery({
    queryKey: LIBRARY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, title, description, category, difficulty, position")
        .order("position")
        .order("created_at");
      if (error) throw error;
      return data as LibraryExercise[];
    },
  });
}

function useLibraryMutation<T>(mutationFn: (input: T) => Promise<{ error: { message: string } | null }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: T) => {
      const { error } = await mutationFn(input);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIBRARY_KEY }),
  });
}

type NewExercise = ExerciseText & { category: PrincipleKey; difficulty: LevelKey; position: number };

export const useCreateExercise = () =>
  useLibraryMutation(async (exercise: NewExercise) => supabase.from("exercises").insert(exercise));

export const useUpdateExercise = () =>
  useLibraryMutation(async ({ id, title, description }: ExerciseText & { id: string }) =>
    supabase.from("exercises").update({ title, description }).eq("id", id),
  );

export const useDeleteExercise = () =>
  useLibraryMutation(async (id: string) => supabase.from("exercises").delete().eq("id", id));
