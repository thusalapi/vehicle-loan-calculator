/**
 * Display formatting.
 *
 * The engine always works at full precision; these helpers exist purely for
 * presentation, and every surface (cards, tables, charts, CSV, print) goes
 * through them so figures are formatted identically everywhere.
 */
import type { CurrencyPrecision } from "@/types/loan";

export const CURRENCY_CODE = "LKR";

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(min: number, max: number): Intl.NumberFormat {
  const key = `${min}:${max}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

function decimalsFor(precision: CurrencyPrecision): number {
  return precision === "whole" ? 0 : 2;
}

/** `LKR 6,850,000.00` — the canonical money format for this app. */
export function formatCurrency(
  value: number,
  precision: CurrencyPrecision = "decimals",
): string {
  const digits = decimalsFor(precision);
  const safe = Number.isFinite(value) ? value : 0;
  return `${CURRENCY_CODE} ${formatterFor(digits, digits).format(safe)}`;
}

/** The same figure without the currency code, for dense tables. */
export function formatAmount(
  value: number,
  precision: CurrencyPrecision = "decimals",
): string {
  const digits = decimalsFor(precision);
  const safe = Number.isFinite(value) ? value : 0;
  return formatterFor(digits, digits).format(safe);
}

/** Compact axis labels: `8.5M`, `450K`, `0`. */
export function formatCompact(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(safe);
  if (abs >= 1_000_000) return `${formatterFor(0, 1).format(safe / 1_000_000)}M`;
  if (abs >= 1_000) return `${formatterFor(0, 0).format(safe / 1_000)}K`;
  return formatterFor(0, 0).format(safe);
}

/** `12.5%`. Trailing zeros are trimmed up to `digits` places. */
export function formatPercent(value: number, digits = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${formatterFor(0, digits).format(safe)}%`;
}

/** Thousands-separated plain number, used by the currency inputs. */
export function formatGrouped(value: number, digits = 0): string {
  const safe = Number.isFinite(value) ? value : 0;
  return formatterFor(0, Math.max(digits, 0)).format(safe);
}

/**
 * Parses what a user types into a currency field.
 *
 * Tolerates grouping separators and stray characters; returns `null` for input
 * that is not a number at all, so callers can distinguish "empty" from "zero".
 */
export function parseAmount(raw: string): number | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (cleaned === "" || cleaned === ".") return null;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** `5 years` / `5 years 6 months` / `9 months`. */
export function formatDuration(months: number): string {
  const total = Math.max(0, Math.round(months));
  const years = Math.floor(total / 12);
  const rest = total % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (rest > 0) parts.push(`${rest} month${rest === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(" ") : "0 months";
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** `15 Nov 2026`. Falls back to the raw string for unparseable dates. */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return iso ?? "";
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  if (Number.isNaN(date.getTime())) return iso;
  return DATE_FORMATTER.format(date);
}
