// The principles and levels the exercises are sorted by. The exercises
// themselves are in the database (exercises.category = principle key,
// exercises.difficulty = level key).
// Add, remove or reorder principles here: the screens follow. A new key has no
// exercises until coaches add some.

export const PRINCIPLES = [
  { key: "service", label: "Service" },
  { key: "retour", label: "Retour de service" },
  { key: "dink", label: "Dink" },
  { key: "drop", label: "Drop" },
  { key: "drive", label: "Drive" },
  { key: "volee", label: "Volée" },
  { key: "reset", label: "Reset" },
  { key: "lob", label: "Lob" },
  { key: "smash", label: "Smash" },
  { key: "placement", label: "Placement et déplacements" },
] as const;

// Same keys as the check on exercises.difficulty in the database.
export const LEVELS = [
  { key: "debutant", label: "Débutant" },
  { key: "intermediaire", label: "Intermédiaire" },
  { key: "avance", label: "Avancé" },
] as const;

export type PrincipleKey = (typeof PRINCIPLES)[number]["key"];
export type LevelKey = (typeof LEVELS)[number]["key"];

/** "Dink · Débutant", for an exercise copied into a session. */
export function principleLevelLabel(category: string | null, difficulty: string | null): string {
  const principle = PRINCIPLES.find((p) => p.key === category)?.label;
  const level = LEVELS.find((l) => l.key === difficulty)?.label;
  return [principle, level].filter(Boolean).join(" · ");
}
