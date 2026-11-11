// Dates are handled as local "YYYY-MM-DD" strings: a session happens on a
// calendar day, and UTC conversions would shift it near midnight.

/** Day sessions take place on, as in Date.getDay() (1 = Monday). */
export const SESSION_WEEKDAY = 1;

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

export function isSessionDay(iso: string): boolean {
  return parseISODate(iso).getDay() === SESSION_WEEKDAY;
}

/** The first session day on or after the given date. */
export function nextSessionDate(fromIso: string): string {
  const d = parseISODate(fromIso);
  d.setDate(d.getDate() + ((SESSION_WEEKDAY - d.getDay() + 7) % 7));
  return toISODate(d);
}

/** The next `count` session days, starting with today if it is one. */
export function upcomingSessionDates(fromIso: string, count: number): string[] {
  const first = parseISODate(nextSessionDate(fromIso));
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(first);
    d.setDate(first.getDate() + 7 * i);
    return toISODate(d);
  });
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
