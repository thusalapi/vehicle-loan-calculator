import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatCompact,
  formatCurrency,
  formatDate,
  formatDuration,
  formatPercent,
  parseAmount,
} from "../format-currency";
import { addMonths, round2, todayIso } from "../money";

describe("formatCurrency", () => {
  it("formats LKR with thousands separators", () => {
    expect(formatCurrency(6_850_000)).toBe("LKR 6,850,000.00");
    expect(formatCurrency(156_000)).toBe("LKR 156,000.00");
    expect(formatCurrency(1_250_000)).toBe("LKR 1,250,000.00");
  });

  it("honours the whole-rupee preference", () => {
    expect(formatCurrency(133_862.73, "whole")).toBe("LKR 133,863");
    expect(formatCurrency(133_862.73, "decimals")).toBe("LKR 133,862.73");
  });

  it("never renders NaN", () => {
    expect(formatCurrency(Number.NaN)).toBe("LKR 0.00");
    expect(formatAmount(Number.POSITIVE_INFINITY)).toBe("0.00");
  });
});

describe("formatCompact", () => {
  it("shortens large figures for chart axes", () => {
    expect(formatCompact(8_500_000)).toBe("8.5M");
    expect(formatCompact(450_000)).toBe("450K");
    expect(formatCompact(0)).toBe("0");
  });
});

describe("formatPercent and formatDuration", () => {
  it("formats percentages", () => {
    expect(formatPercent(12.5)).toBe("12.5%");
    expect(formatPercent(30)).toBe("30%");
  });

  it("formats durations in years and months", () => {
    expect(formatDuration(60)).toBe("5 years");
    expect(formatDuration(66)).toBe("5 years 6 months");
    expect(formatDuration(9)).toBe("9 months");
    expect(formatDuration(12)).toBe("1 year");
    expect(formatDuration(0)).toBe("0 months");
  });
});

describe("parseAmount", () => {
  it("accepts grouped input", () => {
    expect(parseAmount("8,500,000")).toBe(8_500_000);
    expect(parseAmount("LKR 1,250,000.50")).toBe(1_250_000.5);
  });

  it("distinguishes empty from zero", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("0")).toBe(0);
  });
});

describe("date helpers", () => {
  it("formats ISO dates for display", () => {
    expect(formatDate("2026-11-15")).toBe("15 Nov 2026");
    expect(formatDate("garbage")).toBe("garbage");
  });

  it("clamps month arithmetic to the end of short months", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-01-15", 0)).toBe("2026-01-15");
  });

  it("returns a well-formed date for today", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("round2", () => {
  it("rounds to whole cents without floating point drift", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(Number.NaN)).toBe(0);
  });
});
