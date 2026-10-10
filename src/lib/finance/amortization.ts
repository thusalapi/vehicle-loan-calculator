/**
 * Schedule generation.
 *
 * The schedule is the single source of truth for every total the dashboard
 * shows: totals are summed from these rows rather than computed independently,
 * so the headline figures and the table can never disagree.
 */
import type { ScheduleRow } from "@/types/loan";
import { addMonths, round2 } from "./money";

export interface ScheduleOptions {
  principal: number;
  /** Number of installments. Must be a positive integer. */
  periods: number;
  /** Interest rate applied to each period, as a decimal fraction. */
  periodRate: number;
  /** Recurring fee charged with every installment. */
  recurringFee: number;
  /** ISO `yyyy-mm-dd` date of the first installment. */
  firstPaymentDate: string;
  /** Calendar months between installments. */
  monthsPerPeriod: number;
}

/**
 * The level installment for a reducing-balance loan.
 *
 * `EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)`, degrading to `P / n` when the
 * rate is zero. Returned unrounded so callers control the rounding policy.
 */
export function periodicPayment(
  principal: number,
  periodRate: number,
  periods: number,
): number {
  if (periods <= 0 || principal <= 0) return 0;
  if (periodRate <= 0) return principal / periods;
  const growth = Math.pow(1 + periodRate, periods);
  const denominator = growth - 1;
  // Guard against catastrophic cancellation at absurdly small rates.
  if (denominator <= 0) return principal / periods;
  return (principal * periodRate * growth) / denominator;
}

/**
 * Total interest for a flat-rate loan: charged on the original principal for
 * the whole term, regardless of how much has been repaid.
 */
export function flatTotalInterest(
  principal: number,
  annualRate: number,
  years: number,
): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
  return round2(principal * (annualRate / 100) * years);
}

/**
 * Builds a reducing-balance schedule.
 *
 * Interest each period is charged on the opening balance. The installment is
 * held level except for the last one, which is adjusted to clear the balance
 * exactly so that rounding differences never leave a stub or a negative
 * balance behind.
 */
export function buildReducingSchedule(options: ScheduleOptions): ScheduleRow[] {
  const { principal, periods, periodRate, recurringFee } = options;
  if (principal <= 0 || periods <= 0) return [];

  const level = round2(periodicPayment(principal, periodRate, periods));
  const rows: ScheduleRow[] = [];

  let balance = principal;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  for (let period = 1; period <= periods; period += 1) {
    const openingBalance = round2(balance);
    const interest = round2(openingBalance * periodRate);

    let principalPaid: number;
    if (period === periods) {
      // Final installment clears whatever is left.
      principalPaid = openingBalance;
    } else {
      principalPaid = round2(level - interest);
      if (principalPaid <= 0) {
        // Defensive: a level payment that cannot cover interest would never
        // amortise. Fall back to straight-line principal so the loan still ends.
        principalPaid = round2(openingBalance / (periods - period + 1));
      }
      if (principalPaid > openingBalance) principalPaid = openingBalance;
    }

    const closingBalance = round2(openingBalance - principalPaid);
    cumulativeInterest = round2(cumulativeInterest + interest);
    cumulativePrincipal = round2(cumulativePrincipal + principalPaid);

    rows.push({
      period,
      date: addMonths(
        options.firstPaymentDate,
        (period - 1) * options.monthsPerPeriod,
      ),
      openingBalance,
      payment: round2(principalPaid + interest + recurringFee),
      principal: principalPaid,
      interest,
      fee: round2(recurringFee),
      closingBalance,
      cumulativeInterest,
      cumulativePrincipal,
    });

    balance = closingBalance;
    if (balance <= 0) break;
  }

  return rows;
}

/**
 * Builds a flat-interest schedule.
 *
 * Interest is fixed for the whole term, so the per-period split is an
 * accounting presentation of a known total rather than interest accrued on the
 * outstanding balance. The closing balance column still tracks principal
 * reduction so the table reads consistently with the reducing-balance view.
 */
export function buildFlatSchedule(
  options: ScheduleOptions & { totalInterest: number },
): ScheduleRow[] {
  const { principal, periods, recurringFee, totalInterest } = options;
  if (principal <= 0 || periods <= 0) return [];

  const levelPrincipal = round2(principal / periods);
  const levelInterest = round2(totalInterest / periods);
  const rows: ScheduleRow[] = [];

  let balance = principal;
  let interestRemaining = round2(totalInterest);
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  for (let period = 1; period <= periods; period += 1) {
    const openingBalance = round2(balance);
    const isLast = period === periods;

    const principalPaid = isLast
      ? openingBalance
      : Math.min(levelPrincipal, openingBalance);
    const interest = isLast
      ? round2(interestRemaining)
      : Math.min(levelInterest, interestRemaining);

    const closingBalance = round2(openingBalance - principalPaid);
    cumulativeInterest = round2(cumulativeInterest + interest);
    cumulativePrincipal = round2(cumulativePrincipal + principalPaid);
    interestRemaining = round2(interestRemaining - interest);

    rows.push({
      period,
      date: addMonths(
        options.firstPaymentDate,
        (period - 1) * options.monthsPerPeriod,
      ),
      openingBalance,
      payment: round2(principalPaid + interest + recurringFee),
      principal: principalPaid,
      interest,
      fee: round2(recurringFee),
      closingBalance,
      cumulativeInterest,
      cumulativePrincipal,
    });

    balance = closingBalance;
  }

  return rows;
}
