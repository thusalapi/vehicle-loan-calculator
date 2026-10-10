/**
 * Domain model for the vehicle loan calculator.
 *
 * Everything in this file is plain data: no React, no browser APIs. The
 * calculation engine in `src/lib/finance` consumes and produces these shapes so
 * the financial logic can be tested in isolation from the UI.
 */

/** How interest is charged over the life of the loan. */
export type InterestMethod = "reducing" | "flat";

/** How often an installment falls due. */
export type PaymentFrequency = "monthly" | "quarterly" | "semiannual" | "annual";

/** Number of installments per year for each supported frequency. */
export const PERIODS_PER_YEAR: Record<PaymentFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

/** Calendar months between two consecutive installments. */
export function monthsPerPeriod(frequency: PaymentFrequency): number {
  return 12 / PERIODS_PER_YEAR[frequency];
}

export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Every 6 months",
  annual: "Annually",
};

/** Singular adjective used for the headline installment, e.g. "Monthly installment". */
export const INSTALLMENT_LABELS: Record<PaymentFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Half-yearly",
  annual: "Annual",
};

export type FeeId = "registration" | "documentation" | "insurance" | "other";

/** A one-time, upfront cost that may or may not be rolled into the loan. */
export interface FeeItem {
  id: FeeId;
  /** Amount in LKR. Never negative. */
  amount: number;
  /** `true` when the fee is added to the loan principal instead of paid in cash. */
  financed: boolean;
}

export const FEE_LABELS: Record<FeeId, string> = {
  registration: "Registration fees",
  documentation: "Documentation fees",
  insurance: "Insurance",
  other: "Other upfront expenses",
};

export const FEE_IDS: FeeId[] = [
  "registration",
  "documentation",
  "insurance",
  "other",
];

/** Everything the user can configure for a single loan calculation. */
export interface LoanInputs {
  /** Estimated vehicle price in LKR. */
  vehiclePrice: number;
  /** Cash paid upfront toward the vehicle, in LKR. */
  downPayment: number;
  /** Nominal annual interest rate as a percentage, e.g. `12.5`. */
  annualRate: number;
  /** Loan duration in calendar months. */
  termMonths: number;
  method: InterestMethod;
  frequency: PaymentFrequency;
  /** ISO `yyyy-mm-dd` date of the first installment. */
  firstPaymentDate: string;
  fees: FeeItem[];
  /** One-time processing fee charged by the lender, in LKR. */
  processingFee: number;
  processingFeeFinanced: boolean;
  /** Recurring fee charged with every installment, in LKR. Never part of interest. */
  recurringFee: number;
}

/** One row of the repayment schedule. */
export interface ScheduleRow {
  /** 1-based installment number. */
  period: number;
  /** ISO `yyyy-mm-dd` due date. */
  date: string;
  openingBalance: number;
  /** Total cash due: principal + interest + fee. */
  payment: number;
  principal: number;
  interest: number;
  /** Recurring fee charged with this installment. */
  fee: number;
  closingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

/** Fee totals, split so that no rupee is counted twice. */
export interface FeeBreakdown {
  /** One-time fees added to the loan principal. */
  financed: number;
  /** One-time fees settled in cash at purchase. */
  separate: number;
  /** `financed + separate`. */
  total: number;
  /** Recurring fees charged across every installment. */
  recurringTotal: number;
}

/** The complete, derived result of a loan calculation. */
export interface LoanResult {
  inputs: LoanInputs;
  /** Loan principal: price − down payment + financed fees. Never negative. */
  principal: number;
  /** Number of installments actually scheduled. */
  periods: number;
  /** Installments per year implied by the frequency. */
  periodsPerYear: number;
  /** Interest rate applied to each period, as a decimal fraction. */
  periodRate: number;
  /** Scheduled loan installment (principal + interest), before recurring fees. */
  installment: number;
  /** Total cash due each period, including any recurring fee. */
  periodicPayment: number;
  /** Final installment, which absorbs rounding differences. */
  finalPayment: number;
  downPaymentPercent: number;
  /** Loan-to-value ratio as a percentage of the vehicle price. */
  ltv: number;
  remainingVehiclePrice: number;
  upfrontCash: number;
  totalInterest: number;
  /** Principal + interest, summed from the schedule. */
  totalLoanRepayment: number;
  /** Principal + interest + recurring fees. */
  totalFinancingRepayment: number;
  /** Vehicle price + interest + all fees. What the vehicle really costs. */
  totalVehicleCost: number;
  /** Total interest as a percentage of the original principal. */
  interestToPrincipalPercent: number;
  fees: FeeBreakdown;
  schedule: ScheduleRow[];
  /** `true` when the inputs describe a real loan with at least one installment. */
  hasLoan: boolean;
}

/**
 * One row of the "Compare financing options" table.
 *
 * Scenarios are deliberately flatter than {@link LoanInputs}: they expose only
 * the levers worth comparing, and each one holds its own copy of every value so
 * editing one can never reach into another.
 */
export interface Scenario {
  id: string;
  name: string;
  vehiclePrice: number;
  downPayment: number;
  annualRate: number;
  termMonths: number;
  method: InterestMethod;
  /** One-time fees rolled into this scenario's principal. */
  financedFees: number;
  /** One-time fees paid in cash in this scenario. */
  separateFees: number;
}

/** A scenario together with its calculated result. */
export interface ScenarioResult {
  scenario: Scenario;
  result: LoanResult;
}

/** Display preference for currency figures. */
export type CurrencyPrecision = "whole" | "decimals";

/** Everything persisted to local storage and encoded into a share link. */
export interface CalculatorState {
  inputs: LoanInputs;
  scenarios: Scenario[];
  precision: CurrencyPrecision;
}
