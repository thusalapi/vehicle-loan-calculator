"use client";

import { AlertTriangleIcon, WalletIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  INSTALLMENT_LABELS,
  type CurrencyPrecision,
  type LoanResult,
} from "@/types/loan";
import {
  formatCurrency,
  formatDuration,
  formatPercent,
} from "@/lib/finance/format-currency";

interface Props {
  result: LoanResult;
  precision: CurrencyPrecision;
  /** `false` when the inputs are invalid, in which case no figures are shown. */
  isValid: boolean;
}

function Stat({
  label,
  value,
  hint,
  swatch,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Ties the figure to a chart series. Identity rides a swatch, never coloured text. */
  swatch?: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border bg-card p-3.5 print-keep">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {swatch ? (
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-[2px]", swatch)}
          />
        ) : null}
        {label}
      </p>
      <p className="text-lg font-semibold tabular">{value}</p>
      {hint ? (
        <p className="text-[0.7rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Shown instead of figures when the inputs cannot produce a meaningful result. */
function NoResult({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-8">
        <AlertTriangleIcon
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        />
        <div className="space-y-1">
          <p className="font-medium">No results to show yet</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function LoanSummary({ result, precision, isValid }: Props) {
  if (!isValid) {
    return (
      <NoResult message="Fix the highlighted fields above and the figures will appear here straight away." />
    );
  }

  if (!result.hasLoan) {
    return (
      <NoResult message="These details do not describe a loan — the down payment and fees already cover the full amount, or the term is empty." />
    );
  }

  const { inputs } = result;
  const installmentLabel = INSTALLMENT_LABELS[inputs.frequency];
  const hasRecurringFee = inputs.recurringFee > 0;

  return (
    <section aria-labelledby="summary-heading" className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle id="summary-heading" className="flex items-center gap-2">
            <WalletIcon aria-hidden="true" className="size-4 text-brand" />
            Financing summary
          </CardTitle>
          <CardDescription>
            Calculated from the details above. Figures update as you type.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Hero figure: the one number the whole page leads with. */}
          <div className="rounded-xl border bg-brand-muted/60 p-5 print-keep dark:bg-brand-muted/25">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Estimated {installmentLabel.toLowerCase()} installment
              </p>
              <Badge variant="secondary" className="font-normal">
                {inputs.method === "flat" ? "Flat interest" : "Reducing balance"}
              </Badge>
            </div>
            <p className="mt-1.5 text-4xl leading-tight font-semibold text-brand sm:text-5xl">
              {formatCurrency(result.periodicPayment, precision)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.periods} installment{result.periods === 1 ? "" : "s"} over{" "}
              {formatDuration(inputs.termMonths)} at{" "}
              {formatPercent(inputs.annualRate)} a year
              {hasRecurringFee ? (
                <>
                  {" "}
                  · includes a {formatCurrency(inputs.recurringFee, precision)}{" "}
                  fee per installment
                </>
              ) : null}
              .
            </p>
            {result.finalPayment !== result.periodicPayment ? (
              <p className="mt-1 text-xs text-muted-foreground">
                The final installment is{" "}
                <span className="tabular">
                  {formatCurrency(result.finalPayment, precision)}
                </span>
                , adjusted to clear the balance exactly.
              </p>
            ) : null}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Required loan amount"
              value={formatCurrency(result.principal, precision)}
              hint="The principal you borrow"
              swatch="bg-series-principal"
            />
            <Stat
              label="Total interest payable"
              value={formatCurrency(result.totalInterest, precision)}
              hint={`${formatPercent(result.interestToPrincipalPercent, 1)} of the principal`}
              swatch="bg-series-interest"
            />
            <Stat
              label="Total loan repayment"
              value={formatCurrency(result.totalLoanRepayment, precision)}
              hint="Principal + interest"
            />
            <Stat
              label="Down payment"
              value={formatCurrency(inputs.downPayment, precision)}
              hint={`${formatPercent(result.downPaymentPercent, 2)} of the vehicle price`}
            />
            <Stat
              label="Total upfront cash required"
              value={formatCurrency(result.upfrontCash, precision)}
              hint="Down payment + fees paid separately"
            />
            <Stat
              label="Annual interest rate"
              value={formatPercent(inputs.annualRate)}
              hint={
                inputs.method === "flat"
                  ? "Charged on the original principal"
                  : "Charged on the reducing balance"
              }
            />
            <Stat
              label="Loan duration"
              value={formatDuration(inputs.termMonths)}
              hint={`${result.periods} ${installmentLabel.toLowerCase()} installments`}
            />
            {hasRecurringFee || result.fees.total > 0 ? (
              <Stat
                label="Fees over the loan"
                value={formatCurrency(
                  result.fees.total + result.fees.recurringTotal,
                  precision,
                )}
                hint={`${formatCurrency(result.fees.financed, precision)} financed`}
              />
            ) : null}
            <Stat
              label="Total vehicle cost incl. financing"
              value={formatCurrency(result.totalVehicleCost, precision)}
              hint="Price + interest + every fee"
            />
          </dl>

          <p className="text-xs text-pretty text-muted-foreground">
            Total financing repayment —{" "}
            <span className="tabular">
              {formatCurrency(result.totalFinancingRepayment, precision)}
            </span>{" "}
            — is the principal, the interest and any recurring fees. Added to
            the{" "}
            <span className="tabular">
              {formatCurrency(result.upfrontCash, precision)}
            </span>{" "}
            you pay upfront, it comes to the total vehicle cost. Nothing is
            counted twice.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
