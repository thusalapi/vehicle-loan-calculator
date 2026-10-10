import { describe, expect, it } from "vitest";
import {
  calculateScenarios,
  highlightScenarios,
  scenarioToInputs,
} from "../scenarios";
import { round2 } from "../money";
import type { Scenario } from "@/types/loan";

function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "s",
    name: "Option",
    vehiclePrice: 8_500_000,
    downPayment: 2_550_000,
    annualRate: 12.5,
    termMonths: 60,
    method: "reducing",
    financedFees: 0,
    separateFees: 0,
    ...overrides,
  };
}

describe("scenario comparison", () => {
  it("calculates each scenario independently", () => {
    const scenarios = [
      scenario({ id: "a", name: "A", downPayment: 4_250_000, termMonths: 36 }),
      scenario({ id: "b", name: "B", downPayment: 850_000, termMonths: 84 }),
      scenario({ id: "c", name: "C", annualRate: 9, method: "flat" }),
    ];

    const results = calculateScenarios(scenarios, "2026-01-15");
    expect(results).toHaveLength(3);
    expect(results[0].result.principal).toBe(4_250_000);
    expect(results[1].result.principal).toBe(7_650_000);
    expect(results[0].result.periods).toBe(36);
    expect(results[1].result.periods).toBe(84);
    expect(results[2].result.inputs.method).toBe("flat");
  });

  it("does not let one scenario affect another", () => {
    const shared = [scenario({ id: "a" }), scenario({ id: "b" })];
    const before = calculateScenarios(shared, "2026-01-15");

    // Replace one entry the way the UI does, leaving the other untouched.
    const after = calculateScenarios(
      [shared[0], { ...shared[1], downPayment: 5_000_000 }],
      "2026-01-15",
    );

    expect(after[0].result.principal).toBe(before[0].result.principal);
    expect(after[0].result.periodicPayment).toBe(
      before[0].result.periodicPayment,
    );
    expect(after[1].result.principal).not.toBe(before[1].result.principal);
  });

  it("reports the per-scenario figures the comparison table shows", () => {
    const [entry] = calculateScenarios(
      [scenario({ downPayment: 1_700_000 })],
      "2026-01-15",
    );
    const { result } = entry;

    expect(result.downPaymentPercent).toBe(20);
    expect(result.principal).toBe(6_800_000);
    expect(result.upfrontCash).toBe(1_700_000);
    expect(result.totalLoanRepayment).toBe(
      round2(result.principal + result.totalInterest),
    );
    expect(result.totalVehicleCost).toBe(
      round2(result.inputs.vehiclePrice + result.totalInterest),
    );
  });

  it("splits a scenario's fees between the principal and upfront cash", () => {
    const [entry] = calculateScenarios(
      [scenario({ financedFees: 200_000, separateFees: 75_000 })],
      "2026-01-15",
    );

    expect(entry.result.principal).toBe(5_950_000 + 200_000);
    expect(entry.result.upfrontCash).toBe(2_550_000 + 75_000);
    expect(entry.result.fees.total).toBe(275_000);
  });

  it("identifies the cheapest option on each axis separately", () => {
    const results = calculateScenarios(
      [
        // Big down payment, short term: least interest, biggest installment.
        scenario({ id: "a", downPayment: 4_250_000, termMonths: 36 }),
        // Small down payment, long term: smallest installment, most interest.
        scenario({ id: "b", downPayment: 850_000, termMonths: 84 }),
      ],
      "2026-01-15",
    );

    const highlights = highlightScenarios(results);
    expect(highlights.lowestTotalInterest).toBe(0);
    expect(highlights.lowestInstallment).toBe(1);
    expect(highlights.lowestUpfront).toBe(1);
  });

  it("ignores scenarios that do not describe a loan", () => {
    const results = calculateScenarios(
      [
        scenario({ id: "a", vehiclePrice: 0, downPayment: 0 }),
        scenario({ id: "b" }),
      ],
      "2026-01-15",
    );

    const highlights = highlightScenarios(results);
    expect(results[0].result.hasLoan).toBe(false);
    expect(highlights.lowestTotalInterest).toBe(1);
    expect(highlights.lowestInstallment).toBe(1);
  });

  it("returns -1 when nothing can be compared", () => {
    const highlights = highlightScenarios([]);
    expect(highlights.lowestTotalInterest).toBe(-1);
    expect(highlights.lowestInstallment).toBe(-1);
  });

  it("always compares scenarios on monthly installments", () => {
    const inputs = scenarioToInputs(scenario(), "2026-01-15");
    expect(inputs.frequency).toBe("monthly");
    expect(inputs.recurringFee).toBe(0);
  });
});
