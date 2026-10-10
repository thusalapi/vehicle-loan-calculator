/**
 * The calculation engine.
 *
 * `calculateLoan` is pure: same inputs, same result, no browser or React
 * dependencies. Every total it reports is summed from the generated schedule,
 * which keeps the dashboard, the charts, the table and the exports in
 * agreement by construction.
 */
import {
  PERIODS_PER_YEAR,
  monthsPerPeriod as monthsPerPeriodFor,
  type FeeItem,
  type LoanInputs,
  type LoanResult,
  type ScheduleRow,
} from "@/types/loan";
import {
  buildFlatSchedule,
  buildReducingSchedule,
  flatTotalInterest,
  periodicPayment,
} from "./amortization";
import { round2, safeAmount, sum, todayIso } from "./money";
import { DEFAULT_INPUTS } from "./defaults";

/** Splits one-time fees into the part financed and the part paid in cash. */
export function summariseFees(inputs: LoanInputs) {
  const financedItems = inputs.fees.filter((fee) => fee.financed);
  const separateItems = inputs.fees.filter((fee) => !fee.financed);

  const processingFee = safeAmount(inputs.processingFee);
  const financed = round2(
    sum(financedItems.map((fee) => safeAmount(fee.amount))) +
      (inputs.processingFeeFinanced ? processingFee : 0),
  );
  const separate = round2(
    sum(separateItems.map((fee) => safeAmount(fee.amount))) +
      (inputs.processingFeeFinanced ? 0 : processingFee),
  );

  return { financed, separate, total: round2(financed + separate) };
}

/** Number of installments implied by the term and payment frequency. */
export function installmentCount(inputs: LoanInputs): number {
  const months = Math.max(0, Math.floor(safeAmount(inputs.termMonths)));
  const step = monthsPerPeriodFor(inputs.frequency);
  if (months <= 0) return 0;
  return Math.max(1, Math.ceil(months / step));
}

/** Normalises arbitrary (possibly partial or hostile) data into valid inputs. */
export function normaliseInputs(raw: Partial<LoanInputs>): LoanInputs {
  const base = DEFAULT_INPUTS();
  const fees: FeeItem[] = base.fees.map((fee) => {
    const incoming = raw.fees?.find((candidate) => candidate?.id === fee.id);
    return {
      id: fee.id,
      amount: round2(safeAmount(incoming?.amount ?? fee.amount)),
      financed: Boolean(incoming?.financed ?? fee.financed),
    };
  });

  const frequency =
    raw.frequency && raw.frequency in PERIODS_PER_YEAR
      ? raw.frequency
      : base.frequency;

  return {
    vehiclePrice: round2(safeAmount(raw.vehiclePrice ?? base.vehiclePrice)),
    downPayment: round2(safeAmount(raw.downPayment ?? base.downPayment)),
    annualRate: Math.min(
      100,
      round2(safeAmount(raw.annualRate ?? base.annualRate)),
    ),
    termMonths: Math.min(
      480,
      Math.max(0, Math.floor(safeAmount(raw.termMonths ?? base.termMonths))),
    ),
    method: raw.method === "flat" ? "flat" : "reducing",
    frequency,
    firstPaymentDate:
      typeof raw.firstPaymentDate === "string" && raw.firstPaymentDate
        ? raw.firstPaymentDate
        : base.firstPaymentDate,
    fees,
    processingFee: round2(safeAmount(raw.processingFee ?? base.processingFee)),
    processingFeeFinanced: Boolean(
      raw.processingFeeFinanced ?? base.processingFeeFinanced,
    ),
    recurringFee: round2(safeAmount(raw.recurringFee ?? base.recurringFee)),
  };
}

/** An empty result, used when the inputs do not describe a financeable loan. */
function emptyResult(inputs: LoanInputs, feeSplit: ReturnType<typeof summariseFees>): LoanResult {
  const vehiclePrice = safeAmount(inputs.vehiclePrice);
  const downPayment = safeAmount(inputs.downPayment);
  return {
    inputs,
    principal: 0,
    periods: 0,
    periodsPerYear: PERIODS_PER_YEAR[inputs.frequency],
    periodRate: 0,
    installment: 0,
    periodicPayment: 0,
    finalPayment: 0,
    downPaymentPercent:
      vehiclePrice > 0 ? round2((downPayment / vehiclePrice) * 100) : 0,
    ltv: 0,
    remainingVehiclePrice: round2(Math.max(0, vehiclePrice - downPayment)),
    upfrontCash: round2(downPayment + feeSplit.separate),
    totalInterest: 0,
    totalLoanRepayment: 0,
    totalFinancingRepayment: 0,
    totalVehicleCost: round2(vehiclePrice + feeSplit.total),
    interestToPrincipalPercent: 0,
    fees: { ...feeSplit, recurringTotal: 0 },
    schedule: [],
    hasLoan: false,
  };
}

/**
 * Calculates a complete loan result, including the full repayment schedule.
 *
 * Returns a zeroed result (with `hasLoan: false`) rather than throwing when the
 * inputs describe no loan — a zero price, a zero term, or a down payment that
 * already covers the financed amount.
 */
export function calculateLoan(rawInputs: LoanInputs): LoanResult {
  const inputs = normaliseInputs(rawInputs);
  const feeSplit = summariseFees(inputs);

  const vehiclePrice = inputs.vehiclePrice;
  const downPayment = inputs.downPayment;
  const periods = installmentCount(inputs);
  const periodsPerYear = PERIODS_PER_YEAR[inputs.frequency];
  const step = monthsPerPeriodFor(inputs.frequency);
  const recurringFee = inputs.recurringFee;

  const principal = round2(
    Math.max(0, vehiclePrice - downPayment + feeSplit.financed),
  );

  if (vehiclePrice <= 0 || periods <= 0 || principal <= 0) {
    return emptyResult(inputs, feeSplit);
  }

  const periodRate = inputs.annualRate / 100 / periodsPerYear;
  const scheduleOptions = {
    principal,
    periods,
    periodRate,
    recurringFee,
    firstPaymentDate: inputs.firstPaymentDate,
    monthsPerPeriod: step,
  };

  let schedule: ScheduleRow[];
  if (inputs.method === "flat") {
    const years = periods / periodsPerYear;
    schedule = buildFlatSchedule({
      ...scheduleOptions,
      totalInterest: flatTotalInterest(principal, inputs.annualRate, years),
    });
  } else {
    schedule = buildReducingSchedule(scheduleOptions);
  }

  if (schedule.length === 0) return emptyResult(inputs, feeSplit);

  const last = schedule[schedule.length - 1];
  const totalInterest = last.cumulativeInterest;
  const totalPrincipal = last.cumulativePrincipal;
  const recurringTotal = round2(recurringFee * schedule.length);
  const totalLoanRepayment = round2(totalPrincipal + totalInterest);
  const totalFinancingRepayment = round2(totalLoanRepayment + recurringTotal);

  const installment =
    inputs.method === "flat"
      ? round2(schedule[0].principal + schedule[0].interest)
      : round2(periodicPayment(principal, periodRate, periods));

  return {
    inputs,
    principal,
    periods: schedule.length,
    periodsPerYear,
    periodRate,
    installment,
    periodicPayment: round2(installment + recurringFee),
    finalPayment: last.payment,
    downPaymentPercent:
      vehiclePrice > 0 ? round2((downPayment / vehiclePrice) * 100) : 0,
    ltv: vehiclePrice > 0 ? round2((principal / vehiclePrice) * 100) : 0,
    remainingVehiclePrice: round2(Math.max(0, vehiclePrice - downPayment)),
    upfrontCash: round2(downPayment + feeSplit.separate),
    totalInterest,
    totalLoanRepayment,
    totalFinancingRepayment,
    // Vehicle price + cost of borrowing + every fee, counted exactly once.
    totalVehicleCost: round2(
      vehiclePrice + totalInterest + feeSplit.total + recurringTotal,
    ),
    interestToPrincipalPercent:
      principal > 0 ? round2((totalInterest / principal) * 100) : 0,
    fees: { ...feeSplit, recurringTotal },
    schedule,
    hasLoan: true,
  };
}

/** Convenience wrapper used by tests and scenario comparison. */
export function calculateFrom(partial: Partial<LoanInputs>): LoanResult {
  return calculateLoan(normaliseInputs(partial));
}

export { todayIso };
