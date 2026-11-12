// Dates are handled as local "YYYY-MM-DD" strings: a session happens on a
// calendar day, and UTC conversions would shift it near midnight.

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** A session slot. "unique" is the only session of its day. */
export type SlotKey = "unique" | "18-20" | "20-22";
export type Slot = { key: SlotKey; label: string | null };

/**
 * Slots per weekday, as in Date.getDay() (1 = Monday, 3 = Wednesday).
 * Also checked by the database (private.is_scheduled_slot, 012): change both together.
 */
const SCHEDULE: Partial<Record<number, Slot[]>> = {
  1: [{ key: "unique", label: null }],
  3: [
    { key: "18-20", label: "18h-20h" },
    { key: "20-22", label: "20h-22h" },
  ],
};

/** The slots on that day, in time order. Empty if there is no session that day. */
export function slotsOn(iso: string): Slot[] {
  return SCHEDULE[parseISODate(iso).getDay()] ?? [];
}

export function isSessionDay(iso: string): boolean {
  return slotsOn(iso).length > 0;
}

export function slotLabel(key: string): string | null {
  for (const slots of Object.values(SCHEDULE)) {
    const slot = slots?.find((s) => s.key === key);
    if (slot) return slot.label;
  }
  return null;
}

/** "mercredi 19 novembre 2026 · 18h-20h", or just the date for a day's only session. */
export function formatSessionLabel(iso: string, slot: string): string {
  const label = slotLabel(slot);
  return label ? `${formatLongDate(iso)} · ${label}` : formatLongDate(iso);
}

/** The first session day on or after the given date. */
export function nextSessionDate(fromIso: string): string {
  return upcomingSessionDates(fromIso, 1)[0];
}

/** The next `count` session days, starting with today if it is one. */
export function upcomingSessionDates(fromIso: string, count: number): string[] {
  const dates: string[] = [];
  const d = parseISODate(fromIso);
  // Every week has at least one session day, so this always ends.
  while (dates.length < count) {
    const iso = toISODate(d);
    if (isSessionDay(iso)) dates.push(iso);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/** Weeks of a month (Monday first). Days outside the month are null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let day = 1; day <= dayCount; day++) {
    cells.push(toISODate(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function monthLabel(year: number, month: number): string {
  const name = MONTHS[month];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

export function formatLongDate(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
