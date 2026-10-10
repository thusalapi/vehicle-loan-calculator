/** Scenario comparison: independent what-if calculations over the same engine. */
import type { LoanInputs, Scenario, ScenarioResult } from "@/types/loan";
import { calculateLoan } from "./loan-calculator";
import { DEFAULT_INPUTS } from "./defaults";
import { round2, safeAmount } from "./money";

export const MAX_SCENARIOS = 3;

/** Expands a scenario into a full set of loan inputs. */
export function scenarioToInputs(
  scenario: Scenario,
  firstPaymentDate?: string,
): LoanInputs {
  const base = DEFAULT_INPUTS();
  return {
    ...base,
    vehiclePrice: safeAmount(scenario.vehiclePrice),
    downPayment: safeAmount(scenario.downPayment),
    annualRate: safeAmount(scenario.annualRate),
    termMonths: Math.floor(safeAmount(scenario.termMonths)),
    method: scenario.method === "flat" ? "flat" : "reducing",
    frequency: "monthly",
    firstPaymentDate: firstPaymentDate ?? base.firstPaymentDate,
    // A scenario collapses the four fee lines into one financed and one
    // separate total, so it maps onto a single fee item plus the processing fee.
    fees: base.fees.map((fee) =>
      fee.id === "other"
        ? { ...fee, amount: round2(safeAmount(scenario.financedFees)), financed: true }
        : fee,
    ),
    processingFee: round2(safeAmount(scenario.separateFees)),
    processingFeeFinanced: false,
    recurringFee: 0,
  };
}

export function calculateScenarios(
  scenarios: Scenario[],
  firstPaymentDate?: string,
): ScenarioResult[] {
  return scenarios.map((scenario) => ({
    scenario,
    result: calculateLoan(scenarioToInputs(scenario, firstPaymentDate)),
  }));
}

/** Index of the scenario with the smallest value of `pick`, or -1 if none qualify. */
function indexOfMin(
  results: ScenarioResult[],
  pick: (entry: ScenarioResult) => number,
): number {
  let bestIndex = -1;
  let bestValue = Number.POSITIVE_INFINITY;
  results.forEach((entry, index) => {
    if (!entry.result.hasLoan) return;
    const value = pick(entry);
    if (!Number.isFinite(value)) return;
    if (value < bestValue - 0.005) {
      bestValue = value;
      bestIndex = index;
    }
  });
  return bestIndex;
}

/**
 * Identifies the cheapest scenario on two separate axes.
 *
 * These are deliberately reported as two different answers: the option with the
 * lowest total interest is often not the one with the lowest installment, and
 * which matters more is the user's call, not the calculator's.
 */
export function highlightScenarios(results: ScenarioResult[]) {
  return {
    lowestTotalInterest: indexOfMin(results, (e) => e.result.totalInterest),
    lowestInstallment: indexOfMin(results, (e) => e.result.periodicPayment),
    lowestUpfront: indexOfMin(results, (e) => e.result.upfrontCash),
    lowestTotalCost: indexOfMin(results, (e) => e.result.totalVehicleCost),
  };
}

/** Creates a new scenario seeded from the current inputs. */
export function scenarioFromInputs(
  inputs: LoanInputs,
  id: string,
  name: string,
  financedFees = 0,
  separateFees = 0,
): Scenario {
  return {
    id,
    name,
    vehiclePrice: inputs.vehiclePrice,
    downPayment: inputs.downPayment,
    annualRate: inputs.annualRate,
    termMonths: inputs.termMonths,
    method: inputs.method,
    financedFees,
    separateFees,
  };
}
