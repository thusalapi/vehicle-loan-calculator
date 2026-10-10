/**
 * CSV generation for the repayment schedule.
 *
 * Values are quoted and internal quotes doubled per RFC 4180, so figures with
 * thousands separators survive the round trip into a spreadsheet intact.
 */
import {
  INSTALLMENT_LABELS,
  type CurrencyPrecision,
  type LoanResult,
} from "@/types/loan";
import {
  formatAmount,
  formatDuration,
  formatPercent,
} from "./finance/format-currency";

/** Escapes one CSV field. */
export function csvField(value: string | number): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function row(values: (string | number)[]): string {
  return values.map(csvField).join(",");
}

/**
 * Renders the full schedule plus a summary block as CSV text.
 *
 * Amounts are written unformatted (plain numbers) so spreadsheets treat them as
 * numeric, while the summary block carries the human-readable context.
 */
export function scheduleToCsv(
  result: LoanResult,
  precision: CurrencyPrecision = "decimals",
): string {
  const { inputs } = result;
  const decimals = precision === "whole" ? 0 : 2;
  const money = (value: number) => value.toFixed(decimals);
  const label = INSTALLMENT_LABELS[inputs.frequency];

  const lines: string[] = [
    row(["Vehicle Loan Calculator — repayment schedule"]),
    row(["Currency", "LKR"]),
    row([]),
    row(["Vehicle price", money(inputs.vehiclePrice)]),
    row(["Down payment", money(inputs.downPayment)]),
    row(["Down payment %", formatPercent(result.downPaymentPercent)]),
    row(["Financed fees", money(result.fees.financed)]),
    row(["Fees paid separately", money(result.fees.separate)]),
    row(["Loan principal", money(result.principal)]),
    row(["Annual interest rate", formatPercent(inputs.annualRate)]),
    row([
      "Interest method",
      inputs.method === "flat" ? "Flat interest" : "Reducing balance",
    ]),
    row(["Loan duration", formatDuration(inputs.termMonths)]),
    row(["Installments", result.periods]),
    row([`${label} installment`, money(result.periodicPayment)]),
    row(["Total interest", money(result.totalInterest)]),
    row(["Total loan repayment", money(result.totalLoanRepayment)]),
    row(["Total financing repayment", money(result.totalFinancingRepayment)]),
    row(["Total upfront cash", money(result.upfrontCash)]),
    row(["Total vehicle cost incl. financing", money(result.totalVehicleCost)]),
    row([]),
    row([
      "Installment No.",
      "Payment date",
      "Opening balance (LKR)",
      "Installment (LKR)",
      "Principal (LKR)",
      "Interest (LKR)",
      "Fees (LKR)",
      "Closing balance (LKR)",
      "Cumulative interest (LKR)",
    ]),
  ];

  for (const entry of result.schedule) {
    lines.push(
      row([
        entry.period,
        entry.date,
        money(entry.openingBalance),
        money(entry.payment),
        money(entry.principal),
        money(entry.interest),
        money(entry.fee),
        money(entry.closingBalance),
        money(entry.cumulativeInterest),
      ]),
    );
  }

  lines.push(
    row([]),
    row([
      "Totals",
      "",
      "",
      money(result.totalFinancingRepayment),
      money(result.principal),
      money(result.totalInterest),
      money(result.fees.recurringTotal),
      money(0),
      money(result.totalInterest),
    ]),
  );

  return lines.join("\r\n");
}

/** Builds the download filename for a result. */
export function csvFilename(result: LoanResult): string {
  const amount = Math.round(result.principal);
  return `vehicle-loan-schedule-${amount}-${result.periods}m.csv`;
}

/**
 * Triggers a browser download of `contents`.
 *
 * Safe to call only from an event handler in a client component.
 */
export function downloadCsv(filename: string, contents: string): void {
  if (typeof window === "undefined") return;
  // The BOM makes Excel read the file as UTF-8 rather than the system codepage.
  const blob = new Blob([`﻿${contents}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { formatAmount };
