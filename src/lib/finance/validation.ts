/**
 * Input validation.
 *
 * Zod schemas define the hard boundaries (used for untrusted data arriving from
 * local storage or a share link); `validateInputs` adds the field-level
 * messages and soft warnings the form shows beside each control.
 */
import { z } from "zod";
import {
  FEE_IDS,
  type CalculatorState,
  type LoanInputs,
  type Scenario,
} from "@/types/loan";
import { summariseFees } from "./loan-calculator";

export const LIMITS = {
  maxVehiclePrice: 1_000_000_000,
  maxFee: 100_000_000,
  maxRate: 100,
  minTermMonths: 1,
  maxTermMonths: 480,
} as const;

const money = (max: number) =>
  z
    .number()
    .finite()
    .min(0)
    .max(max)
    .catch(0);

const feeSchema = z.object({
  id: z.enum(["registration", "documentation", "insurance", "other"]),
  amount: money(LIMITS.maxFee),
  financed: z.boolean().catch(false),
});

export const loanInputsSchema = z.object({
  vehiclePrice: money(LIMITS.maxVehiclePrice),
  downPayment: money(LIMITS.maxVehiclePrice),
  annualRate: z.number().finite().min(0).max(LIMITS.maxRate).catch(0),
  termMonths: z
    .number()
    .finite()
    .int()
    .min(0)
    .max(LIMITS.maxTermMonths)
    .catch(0),
  method: z.enum(["reducing", "flat"]).catch("reducing"),
  frequency: z
    .enum(["monthly", "quarterly", "semiannual", "annual"])
    .catch("monthly"),
  firstPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fees: z.array(feeSchema),
  processingFee: money(LIMITS.maxFee),
  processingFeeFinanced: z.boolean().catch(false),
  recurringFee: money(LIMITS.maxFee),
});

export const scenarioSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(40),
  vehiclePrice: money(LIMITS.maxVehiclePrice),
  downPayment: money(LIMITS.maxVehiclePrice),
  annualRate: z.number().finite().min(0).max(LIMITS.maxRate).catch(0),
  termMonths: z
    .number()
    .finite()
    .int()
    .min(0)
    .max(LIMITS.maxTermMonths)
    .catch(0),
  method: z.enum(["reducing", "flat"]).catch("reducing"),
  financedFees: money(LIMITS.maxFee),
  separateFees: money(LIMITS.maxFee),
});

export const calculatorStateSchema = z.object({
  inputs: loanInputsSchema,
  scenarios: z.array(scenarioSchema).max(3),
  precision: z.enum(["whole", "decimals"]).catch("decimals"),
});

/** Field keys that can carry a validation message. */
export type LoanField =
  | "vehiclePrice"
  | "downPayment"
  | "annualRate"
  | "termMonths"
  | "firstPaymentDate"
  | "processingFee"
  | "recurringFee"
  | `fee.${string}`;

export interface ValidationReport {
  /** Blocking problems, keyed by field. Results must not be shown for these. */
  errors: Partial<Record<LoanField, string>>;
  /** Non-blocking notes worth surfacing beside a field. */
  warnings: Partial<Record<LoanField, string>>;
  /** `true` when the inputs produce a meaningful calculation. */
  isValid: boolean;
}

/**
 * Validates a set of inputs for display.
 *
 * Distinguishes errors (the calculation would be wrong or misleading) from
 * warnings (unusual but deliberate, e.g. a down payment that also covers fees).
 */
export function validateInputs(inputs: LoanInputs): ValidationReport {
  const errors: Partial<Record<LoanField, string>> = {};
  const warnings: Partial<Record<LoanField, string>> = {};
  const feeSplit = summariseFees(inputs);

  if (!Number.isFinite(inputs.vehiclePrice) || inputs.vehiclePrice <= 0) {
    errors.vehiclePrice = "Enter a vehicle price above zero to see results.";
  } else if (inputs.vehiclePrice > LIMITS.maxVehiclePrice) {
    errors.vehiclePrice = "That price is outside the supported range.";
  }

  if (!Number.isFinite(inputs.downPayment) || inputs.downPayment < 0) {
    errors.downPayment = "The down payment cannot be negative.";
  } else if (inputs.vehiclePrice > 0) {
    const financeable = inputs.vehiclePrice + feeSplit.financed;
    if (inputs.downPayment > financeable) {
      errors.downPayment =
        "The down payment exceeds the vehicle price plus financed fees, so there is nothing left to borrow.";
    } else if (inputs.downPayment > inputs.vehiclePrice) {
      warnings.downPayment =
        "This is more than the vehicle price — treated as also covering financed fees.";
    } else if (inputs.downPayment === financeable) {
      warnings.downPayment = "No financing is needed at this down payment.";
    }
  }

  if (!Number.isFinite(inputs.annualRate) || inputs.annualRate < 0) {
    errors.annualRate = "The interest rate cannot be negative.";
  } else if (inputs.annualRate > LIMITS.maxRate) {
    errors.annualRate = `Enter a rate of ${LIMITS.maxRate}% or less.`;
  } else if (inputs.annualRate === 0) {
    warnings.annualRate = "A 0% rate means no interest is charged.";
  }

  if (
    !Number.isInteger(inputs.termMonths) ||
    inputs.termMonths < LIMITS.minTermMonths
  ) {
    errors.termMonths = "The loan duration must be at least one month.";
  } else if (inputs.termMonths > LIMITS.maxTermMonths) {
    errors.termMonths = `The loan duration cannot exceed ${LIMITS.maxTermMonths} months.`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(inputs.firstPaymentDate)) {
    errors.firstPaymentDate = "Enter a valid first payment date.";
  }

  if (inputs.processingFee < 0) {
    errors.processingFee = "Fees cannot be negative.";
  }
  if (inputs.recurringFee < 0) {
    errors.recurringFee = "Fees cannot be negative.";
  }
  for (const id of FEE_IDS) {
    const fee = inputs.fees.find((candidate) => candidate.id === id);
    if (fee && (!Number.isFinite(fee.amount) || fee.amount < 0)) {
      errors[`fee.${id}`] = "Fees cannot be negative.";
    }
  }

  return { errors, warnings, isValid: Object.keys(errors).length === 0 };
}

/** Parses untrusted persisted or shared state, returning `null` when unusable. */
export function parseCalculatorState(value: unknown): CalculatorState | null {
  const parsed = calculatorStateSchema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data as CalculatorState;
}

export function parseScenario(value: unknown): Scenario | null {
  const parsed = scenarioSchema.safeParse(value);
  return parsed.success ? (parsed.data as Scenario) : null;
}
