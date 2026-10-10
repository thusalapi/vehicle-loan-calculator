"use client";

import { CarFrontIcon, ReceiptTextIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput, Field, InfoHint } from "@/components/fields";
import {
  FEE_LABELS,
  type CurrencyPrecision,
  type LoanInputs,
  type LoanResult,
} from "@/types/loan";
import {
  formatCurrency,
  formatPercent,
} from "@/lib/finance/format-currency";
import type { ValidationReport } from "@/lib/finance/validation";

interface Props {
  inputs: LoanInputs;
  result: LoanResult;
  report: ValidationReport;
  precision: CurrencyPrecision;
  onChange: (patch: Partial<LoanInputs>) => void;
}

/** A read-only derived figure shown under the inputs. */
function Derived({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="space-y-0.5 rounded-lg border bg-muted/40 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular">{value}</dd>
      {hint ? <p className="text-[0.7rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function VehicleInputs({
  inputs,
  result,
  report,
  precision,
  onChange,
}: Props) {
  const priceError = report.errors.vehiclePrice;
  const hasPrice = inputs.vehiclePrice > 0;

  // The slider spans the vehicle price, so it can never drive the down payment
  // past a value the calculator would reject.
  const sliderMax = Math.max(inputs.vehiclePrice, 1);
  const sliderValue = Math.min(inputs.downPayment, sliderMax);

  const updateFee = (id: string, patch: { amount?: number; financed?: boolean }) =>
    onChange({
      fees: inputs.fees.map((fee) =>
        fee.id === id ? { ...fee, ...patch } : fee,
      ),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CarFrontIcon aria-hidden="true" className="size-4 text-brand" />
          Vehicle financing details
        </CardTitle>
        <CardDescription>
          Enter what the vehicle costs and how much you can pay upfront.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Estimated vehicle price"
            htmlFor="vehicle-price"
            error={priceError}
            hint="The on-the-road price you expect to negotiate."
          >
            <CurrencyInput
              id="vehicle-price"
              value={inputs.vehiclePrice}
              invalid={Boolean(priceError)}
              describedBy={priceError ? "vehicle-price-error" : "vehicle-price-hint"}
              max={1_000_000_000}
              onValueChange={(vehiclePrice) => onChange({ vehiclePrice })}
            />
          </Field>

          <Field
            label="Down payment"
            htmlFor="down-payment"
            trailing={
              hasPrice ? `${formatPercent(result.downPaymentPercent, 1)} of price` : undefined
            }
            error={report.errors.downPayment}
            warning={report.warnings.downPayment}
            hint="Cash you pay the seller at purchase."
          >
            <CurrencyInput
              id="down-payment"
              value={inputs.downPayment}
              invalid={Boolean(report.errors.downPayment)}
              describedBy={
                report.errors.downPayment || report.warnings.downPayment
                  ? "down-payment-error"
                  : "down-payment-hint"
              }
              max={1_000_000_000}
              onValueChange={(downPayment) => onChange({ downPayment })}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium" id="down-payment-slider-label">
              Adjust down payment
            </span>
            <span className="text-xs text-muted-foreground tabular">
              0% – 100% of price
            </span>
          </div>
          <Slider
            aria-labelledby="down-payment-slider-label"
            className="[&_[data-slot=slider-range]]:bg-brand"
            value={sliderValue}
            min={0}
            max={sliderMax}
            step={Math.max(1, Math.round(sliderMax / 200))}
            disabled={!hasPrice}
            onValueChange={(value) =>
              onChange({
                downPayment: Math.round(
                  Array.isArray(value) ? value[0] : value,
                ),
              })
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular">
            <span>{formatCurrency(0, "whole")}</span>
            <span>{formatCurrency(sliderMax, "whole")}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ReceiptTextIcon
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
            <h3 className="text-sm font-medium">Additional upfront costs</h3>
            <InfoHint label="About additional costs">
              Whether a lender will roll these into the loan differs by bank and
              by vehicle. Treat the split below as an estimate and confirm it
              with your lender.
            </InfoHint>
          </div>

          <ul className="space-y-2">
            {inputs.fees.map((fee) => {
              const fieldId = `fee-${fee.id}`;
              return (
                <li
                  key={fee.id}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-end"
                >
                  <Field
                    label={FEE_LABELS[fee.id]}
                    htmlFor={fieldId}
                    error={report.errors[`fee.${fee.id}`]}
                  >
                    <CurrencyInput
                      id={fieldId}
                      value={fee.amount}
                      max={100_000_000}
                      onValueChange={(amount) => updateFee(fee.id, { amount })}
                    />
                  </Field>
                  <label
                    className="flex items-center gap-2 pb-2.5 text-xs text-muted-foreground sm:pl-4"
                    htmlFor={`${fieldId}-financed`}
                  >
                    <Switch
                      id={`${fieldId}-financed`}
                      checked={fee.financed}
                      disabled={fee.amount <= 0}
                      onCheckedChange={(financed) =>
                        updateFee(fee.id, { financed })
                      }
                    />
                    <span>{fee.financed ? "Financed" : "Paid upfront"}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <Separator />

        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Derived
            label="Required loan amount"
            value={formatCurrency(result.principal, precision)}
            hint="Price − down payment + financed fees"
          />
          <Derived
            label="Down payment"
            value={formatPercent(result.downPaymentPercent, 2)}
            hint="Share of the vehicle price"
          />
          <Derived
            label="Loan-to-value ratio"
            value={hasPrice ? formatPercent(result.ltv, 2) : "—"}
            hint="Loan amount ÷ vehicle price"
          />
          <Derived
            label="Remaining after down payment"
            value={formatCurrency(result.remainingVehiclePrice, precision)}
          />
          <Derived
            label="Fees added to the loan"
            value={formatCurrency(result.fees.financed, precision)}
          />
          <Derived
            label="Total upfront cash required"
            value={formatCurrency(result.upfrontCash, precision)}
            hint="Down payment + fees paid separately"
          />
        </dl>
      </CardContent>
    </Card>
  );
}
