import { describe, expect, it } from "vitest";
import { buildShareUrl, decodeState, encodeState } from "../share-url";
import { csvField, scheduleToCsv } from "../csv";
import { calculateFrom } from "@/lib/finance/loan-calculator";
import { DEFAULT_INPUTS, defaultScenarios } from "@/lib/finance/defaults";
import type { CalculatorState } from "@/types/loan";

function state(): CalculatorState {
  const inputs = {
    ...DEFAULT_INPUTS(),
    vehiclePrice: 7_250_000,
    downPayment: 1_812_500,
    annualRate: 14.5,
    termMonths: 72,
    method: "flat" as const,
    firstPaymentDate: "2026-03-01",
    fees: [
      { id: "registration" as const, amount: 185_000.5, financed: true },
      { id: "documentation" as const, amount: 25_000, financed: false },
      { id: "insurance" as const, amount: 0, financed: false },
      { id: "other" as const, amount: 0, financed: false },
    ],
    processingFee: 40_000,
    processingFeeFinanced: true,
    recurringFee: 750,
  };
  return {
    inputs,
    scenarios: defaultScenarios(inputs),
    precision: "whole",
  };
}

describe("share links", () => {
  it("round-trips every input", () => {
    const original = state();
    const decoded = decodeState(encodeState(original));

    expect(decoded).not.toBeNull();
    expect(decoded!.inputs).toEqual(original.inputs);
    expect(decoded!.precision).toBe("whole");
  });

  it("round-trips scenarios without cross-contamination", () => {
    const original = state();
    const decoded = decodeState(encodeState(original))!;

    expect(decoded.scenarios).toHaveLength(original.scenarios.length);
    decoded.scenarios.forEach((scenario, index) => {
      const source = original.scenarios[index];
      expect(scenario.name).toBe(source.name);
      expect(scenario.downPayment).toBe(source.downPayment);
      expect(scenario.termMonths).toBe(source.termMonths);
      expect(scenario.method).toBe(source.method);
    });
  });

  it("produces the same calculation on both sides of the link", () => {
    const original = state();
    const decoded = decodeState(encodeState(original))!;
    expect(calculateFrom(decoded.inputs).periodicPayment).toBe(
      calculateFrom(original.inputs).periodicPayment,
    );
  });

  it("returns null when the query carries no calculator parameters", () => {
    expect(decodeState("")).toBeNull();
    expect(decodeState("?utm_source=mail")).toBeNull();
  });

  it("clamps hostile query parameters instead of trusting them", () => {
    const decoded = decodeState("?p=-500&d=abc&r=9999&t=99999&m=zzz&f=zzz")!;

    expect(decoded.inputs.vehiclePrice).toBe(0);
    expect(decoded.inputs.annualRate).toBe(100);
    expect(decoded.inputs.termMonths).toBe(480);
    expect(decoded.inputs.method).toBe("reducing");
    expect(decoded.inputs.frequency).toBe("monthly");
  });

  it("drops malformed scenarios rather than rendering them", () => {
    const decoded = decodeState("?p=5000000&sc=|~~~~~~")!;
    expect(decoded.scenarios.every((s) => Number.isFinite(s.downPayment))).toBe(
      true,
    );
  });

  it("builds an absolute URL from the page origin", () => {
    const url = buildShareUrl(state(), "https://example.com/");
    expect(url.startsWith("https://example.com/?")).toBe(true);
    expect(url).not.toContain("undefined");
  });

  it("carries no personal information", () => {
    const query = encodeState(state());
    const keys = [...new URLSearchParams(query).keys()];
    expect(keys.sort()).toEqual(
      ["cu", "d", "dt", "f", "fe", "m", "p", "pf", "pff", "r", "rf", "sc", "t"]
        .sort(),
    );
  });
});

describe("CSV export", () => {
  it("escapes quotes and separators", () => {
    expect(csvField('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvField("a,b")).toBe('"a,b"');
  });

  it("writes one row per installment plus headers and totals", () => {
    const result = calculateFrom({ ...DEFAULT_INPUTS(), termMonths: 12 });
    const lines = scheduleToCsv(result).split("\r\n");
    const headerIndex = lines.findIndex((line) =>
      line.startsWith('"Installment No."'),
    );

    expect(headerIndex).toBeGreaterThan(0);
    const rows = lines.slice(headerIndex + 1, headerIndex + 13);
    expect(rows).toHaveLength(12);
    expect(rows[0].split('","')[0]).toBe('"1');
    expect(lines.at(-1)).toContain("Totals");
  });

  it("writes amounts the schedule can be reconciled from", () => {
    const result = calculateFrom(DEFAULT_INPUTS());
    const csv = scheduleToCsv(result);
    expect(csv).toContain(result.totalInterest.toFixed(2));
    expect(csv).toContain(result.principal.toFixed(2));
    expect(csv).toContain("Reducing balance");
  });

  it("honours the whole-rupee preference", () => {
    const result = calculateFrom(DEFAULT_INPUTS());
    const csv = scheduleToCsv(result, "whole");
    expect(csv).not.toContain(".00");
  });
});
