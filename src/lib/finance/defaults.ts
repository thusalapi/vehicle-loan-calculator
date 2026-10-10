/** Default calculator state, shared by the UI, the reset action and tests. */
import { FEE_IDS, type LoanInputs, type Scenario } from "@/types/loan";
import { addMonths, todayIso } from "./money";

/**
 * A fresh set of inputs.
 *
 * Returned from a function (rather than exported as a frozen object) because
 * the default first payment date depends on the current date, and because
 * callers mutate their own copy.
 */
export function DEFAULT_INPUTS(): LoanInputs {
  return {
    vehiclePrice: 8_500_000,
    downPayment: 2_550_000,
    annualRate: 12.5,
    termMonths: 60,
    method: "reducing",
    frequency: "monthly",
    firstPaymentDate: addMonths(todayIso(), 1),
    fees: FEE_IDS.map((id) => ({ id, amount: 0, financed: false })),
    processingFee: 0,
    processingFeeFinanced: false,
    recurringFee: 0,
  };
}

export const DEFAULT_SCENARIO_NAMES = ["Option A", "Option B", "Option C"];

/** Builds the starting scenario set from the user's current inputs. */
export function defaultScenarios(inputs: LoanInputs): Scenario[] {
  return [
    {
      id: "scenario-a",
      name: DEFAULT_SCENARIO_NAMES[0],
      vehiclePrice: inputs.vehiclePrice,
      downPayment: inputs.downPayment,
      annualRate: inputs.annualRate,
      termMonths: inputs.termMonths,
      method: inputs.method,
      financedFees: 0,
      separateFees: 0,
    },
    {
      id: "scenario-b",
      name: DEFAULT_SCENARIO_NAMES[1],
      vehiclePrice: inputs.vehiclePrice,
      downPayment: Math.round(inputs.vehiclePrice * 0.2),
      annualRate: inputs.annualRate,
      termMonths: Math.min(480, inputs.termMonths + 24),
      method: inputs.method,
      financedFees: 0,
      separateFees: 0,
    },
  ];
}
