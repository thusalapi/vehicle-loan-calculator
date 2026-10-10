import { describe, expect, it } from "vitest";
import { parseCalculatorState, validateInputs } from "../validation";
import { normaliseInputs } from "../loan-calculator";
import { DEFAULT_INPUTS, defaultScenarios } from "../defaults";
import type { LoanInputs } from "@/types/loan";

function inputs(overrides: Partial<LoanInputs> = {}): LoanInputs {
  return normaliseInputs({ ...DEFAULT_INPUTS(), ...overrides });
}

describe("validateInputs", () => {
  it("accepts a sensible loan", () => {
    const report = validateInputs(inputs());
    expect(report.isValid).toBe(true);
    expect(report.errors).toEqual({});
  });

  it("requires a positive vehicle price", () => {
    const report = validateInputs(inputs({ vehiclePrice: 0 }));
    expect(report.isValid).toBe(false);
    expect(report.errors.vehiclePrice).toBeTruthy();
  });

  it("rejects a down payment larger than the price plus financed fees", () => {
    const report = validateInputs(
      inputs({ vehiclePrice: 5_000_000, downPayment: 5_500_000 }),
    );
    expect(report.isValid).toBe(false);
    expect(report.errors.downPayment).toBeTruthy();
  });

  it("allows a down payment above the price when it covers financed fees", () => {
    const report = validateInputs(
      inputs({
        vehiclePrice: 5_000_000,
        downPayment: 5_200_000,
        fees: [{ id: "registration", amount: 300_000, financed: true }],
      }),
    );
    expect(report.isValid).toBe(true);
    expect(report.warnings.downPayment).toBeTruthy();
  });

  it("flags a zero rate as a note rather than an error", () => {
    const report = validateInputs(inputs({ annualRate: 0 }));
    expect(report.isValid).toBe(true);
    expect(report.warnings.annualRate).toBeTruthy();
  });

  it("requires a term of at least one month", () => {
    expect(validateInputs(inputs({ termMonths: 0 })).errors.termMonths)
      .toBeTruthy();
    expect(validateInputs(inputs({ termMonths: 1 })).isValid).toBe(true);
  });

  it("rejects a malformed first payment date", () => {
    const report = validateInputs(inputs({ firstPaymentDate: "15/01/2026" }));
    expect(report.errors.firstPaymentDate).toBeTruthy();
  });
});

describe("normaliseInputs", () => {
  it("clamps hostile values into range", () => {
    const result = normaliseInputs({
      vehiclePrice: Number.POSITIVE_INFINITY,
      downPayment: -5,
      annualRate: 5000,
      termMonths: 10_000,
      recurringFee: Number.NaN,
    });

    expect(result.vehiclePrice).toBe(0);
    expect(result.downPayment).toBe(0);
    expect(result.annualRate).toBe(100);
    expect(result.termMonths).toBe(480);
    expect(result.recurringFee).toBe(0);
  });

  it("fills in every fee line even when none are supplied", () => {
    const result = normaliseInputs({ fees: [] });
    expect(result.fees.map((fee) => fee.id)).toEqual([
      "registration",
      "documentation",
      "insurance",
      "other",
    ]);
  });

  it("falls back to monthly for an unknown frequency", () => {
    const result = normaliseInputs({
      frequency: "fortnightly" as never,
    });
    expect(result.frequency).toBe("monthly");
  });
});

describe("parseCalculatorState", () => {
  it("round-trips valid state", () => {
    const state = {
      inputs: DEFAULT_INPUTS(),
      scenarios: defaultScenarios(DEFAULT_INPUTS()),
      precision: "decimals" as const,
    };
    expect(parseCalculatorState(JSON.parse(JSON.stringify(state)))).not.toBeNull();
  });

  it("rejects corrupted or foreign data", () => {
    expect(parseCalculatorState(null)).toBeNull();
    expect(parseCalculatorState("not state")).toBeNull();
    expect(parseCalculatorState({ inputs: { vehiclePrice: 1 } })).toBeNull();
    expect(
      parseCalculatorState({
        inputs: { ...DEFAULT_INPUTS(), firstPaymentDate: "nope" },
        scenarios: [],
        precision: "decimals",
      }),
    ).toBeNull();
  });

  it("refuses more than three scenarios", () => {
    const one = defaultScenarios(DEFAULT_INPUTS())[0];
    expect(
      parseCalculatorState({
        inputs: DEFAULT_INPUTS(),
        scenarios: [one, one, one, one],
        precision: "whole",
      }),
    ).toBeNull();
  });
});
