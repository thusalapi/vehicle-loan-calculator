/** Shared numeric helpers for the calculation engine. */

/** Rounds to whole cents, correcting for binary floating point drift. */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Coerces anything into a finite, non-negative number. */
export function safeAmount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Sums a list of money values, rounding once at the end. */
export function sum(values: number[]): number {
  return round2(values.reduce((total, value) => total + value, 0));
}

/**
 * Adds whole months to an ISO date, clamping the day so that e.g.
 * 31 January + 1 month lands on 28/29 February rather than overflowing to March.
 */
export function addMonths(isoDate: string, months: number): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return isoDate;
  const [year, month, day] = parsed;
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, daysInTargetMonth));
  return toIsoDate(target);
}

/** Parses `yyyy-mm-dd` into `[year, month, day]`, or `null` when malformed. */
export function parseIsoDate(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1) return null;
  return [year, month, day];
}

export function toIsoDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's date as `yyyy-mm-dd`, in the user's local timezone. */
export function todayIso(): string {
  const now = new Date();
  return toIsoDate(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
  );
}
