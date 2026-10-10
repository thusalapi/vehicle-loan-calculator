"use client";

import {
  FEE_LABELS,
  INSTALLMENT_LABELS,
  type CurrencyPrecision,
  type LoanResult,
} from "@/types/loan";
import {
  formatAmount,
  formatCurrency,
  formatDate,
  formatDuration,
  formatPercent,
} from "@/lib/finance/format-currency";

/**
 * The printed loan report.
 *
 * Hidden on screen and revealed only by the print stylesheet, so printing
 * produces a self-contained document — every figure plus the complete schedule
 * — rather than a screenshot of the interactive page.
 */
export function PrintReport({
  result,
  precision,
  generatedOn,
}: {
  result: LoanResult;
  precision: CurrencyPrecision;
  generatedOn: string;
}) {
  if (!result.hasLoan) return null;

  const { inputs } = result;
  const money = (value: number) => formatCurrency(value, precision);
  const plain = (value: number) => formatAmount(value, precision);
  const hasFees = result.fees.recurringTotal > 0;

  const rows: [string, string][] = [
    ["Vehicle price", money(inputs.vehiclePrice)],
    [
      "Down payment",
      `${money(inputs.downPayment)} (${formatPercent(result.downPaymentPercent, 2)})`,
    ],
    ["Fees added to the loan", money(result.fees.financed)],
    ["Fees paid separately", money(result.fees.separate)],
    ["Loan principal", money(result.principal)],
    ["Loan-to-value ratio", formatPercent(result.ltv, 2)],
    ["Annual interest rate", formatPercent(inputs.annualRate)],
    [
      "Interest calculation method",
      inputs.method === "flat" ? "Flat interest" : "Reducing balance",
    ],
    ["Loan duration", formatDuration(inputs.termMonths)],
    [
      "Installments",
      `${result.periods} × ${INSTALLMENT_LABELS[inputs.frequency].toLowerCase()}`,
    ],
    ["First payment date", formatDate(inputs.firstPaymentDate)],
    [
      `${INSTALLMENT_LABELS[inputs.frequency]} installment`,
      money(result.periodicPayment),
    ],
    ["Final installment", money(result.finalPayment)],
    ["Total interest payable", money(result.totalInterest)],
    ["Total loan repayment", money(result.totalLoanRepayment)],
    ["Recurring fees over the term", money(result.fees.recurringTotal)],
    ["Total financing repayment", money(result.totalFinancingRepayment)],
    ["Total upfront cash required", money(result.upfrontCash)],
    ["Total vehicle cost incl. financing", money(result.totalVehicleCost)],
  ];

  const itemisedFees = inputs.fees.filter((fee) => fee.amount > 0);

  return (
    <div className="print-report text-black" aria-hidden="true">
      <header className="mb-4 border-b pb-3">
        <h1 className="text-xl font-semibold">Vehicle loan report</h1>
        <p className="text-xs">
          Prepared with the Vehicle Loan Calculator · {generatedOn} · all
          figures in Sri Lankan Rupees (LKR)
        </p>
      </header>

      <section className="mb-4 print-keep">
        <h2 className="mb-2 text-sm font-semibold">Loan summary</h2>
        <table className="w-full border-collapse">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b">
                <th
                  scope="row"
                  className="py-1 pr-3 text-left font-normal"
                >
                  {label}
                </th>
                <td className="py-1 text-right tabular">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {itemisedFees.length > 0 || inputs.processingFee > 0 ? (
        <section className="mb-4 print-keep">
          <h2 className="mb-2 text-sm font-semibold">Fees and upfront costs</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-1 pr-3 text-left">
                  Item
                </th>
                <th scope="col" className="py-1 pr-3 text-left">
                  Treatment
                </th>
                <th scope="col" className="py-1 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {itemisedFees.map((fee) => (
                <tr key={fee.id} className="border-b">
                  <td className="py-1 pr-3">{FEE_LABELS[fee.id]}</td>
                  <td className="py-1 pr-3">
                    {fee.financed ? "Financed" : "Paid upfront"}
                  </td>
                  <td className="py-1 text-right tabular">
                    {plain(fee.amount)}
                  </td>
                </tr>
              ))}
              {inputs.processingFee > 0 ? (
                <tr className="border-b">
                  <td className="py-1 pr-3">One-time processing fee</td>
                  <td className="py-1 pr-3">
                    {inputs.processingFeeFinanced ? "Financed" : "Paid upfront"}
                  </td>
                  <td className="py-1 text-right tabular">
                    {plain(inputs.processingFee)}
                  </td>
                </tr>
              ) : null}
              {inputs.recurringFee > 0 ? (
                <tr className="border-b">
                  <td className="py-1 pr-3">Fee per installment</td>
                  <td className="py-1 pr-3">
                    Charged with every installment
                  </td>
                  <td className="py-1 text-right tabular">
                    {plain(inputs.recurringFee)}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="print-break-before">
        <h2 className="mb-2 text-sm font-semibold">Repayment schedule</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-1 pr-2 text-left">No.</th>
              <th scope="col" className="py-1 pr-2 text-left">Date</th>
              <th scope="col" className="py-1 pr-2 text-right">Opening</th>
              <th scope="col" className="py-1 pr-2 text-right">Installment</th>
              <th scope="col" className="py-1 pr-2 text-right">Principal</th>
              <th scope="col" className="py-1 pr-2 text-right">Interest</th>
              {hasFees ? (
                <th scope="col" className="py-1 pr-2 text-right">Fees</th>
              ) : null}
              <th scope="col" className="py-1 pr-2 text-right">Closing</th>
              <th scope="col" className="py-1 text-right">Interest to date</th>
            </tr>
          </thead>
          <tbody>
            {result.schedule.map((row) => (
              <tr key={row.period} className="border-b">
                <td className="py-0.5 pr-2 tabular">{row.period}</td>
                <td className="py-0.5 pr-2 whitespace-nowrap">
                  {formatDate(row.date)}
                </td>
                <td className="py-0.5 pr-2 text-right tabular">
                  {plain(row.openingBalance)}
                </td>
                <td className="py-0.5 pr-2 text-right tabular">
                  {plain(row.payment)}
                </td>
                <td className="py-0.5 pr-2 text-right tabular">
                  {plain(row.principal)}
                </td>
                <td className="py-0.5 pr-2 text-right tabular">
                  {plain(row.interest)}
                </td>
                {hasFees ? (
                  <td className="py-0.5 pr-2 text-right tabular">
                    {plain(row.fee)}
                  </td>
                ) : null}
                <td className="py-0.5 pr-2 text-right tabular">
                  {plain(row.closingBalance)}
                </td>
                <td className="py-0.5 text-right tabular">
                  {plain(row.cumulativeInterest)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td className="py-1 pr-2" colSpan={3}>
                Totals
              </td>
              <td className="py-1 pr-2 text-right tabular">
                {plain(result.totalFinancingRepayment)}
              </td>
              <td className="py-1 pr-2 text-right tabular">
                {plain(result.principal)}
              </td>
              <td className="py-1 pr-2 text-right tabular">
                {plain(result.totalInterest)}
              </td>
              {hasFees ? (
                <td className="py-1 pr-2 text-right tabular">
                  {plain(result.fees.recurringTotal)}
                </td>
              ) : null}
              <td className="py-1 pr-2 text-right tabular">{plain(0)}</td>
              <td className="py-1 text-right tabular">
                {plain(result.totalInterest)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <footer className="mt-4 border-t pt-2 text-[0.65rem]">
        This report is an estimate produced by a calculator, not a financing
        offer or financial advice. Lender terms, fees, insurance requirements
        and rounding conventions differ, so the amounts a lender quotes may
        differ from the figures above.
      </footer>
    </div>
  );
}
