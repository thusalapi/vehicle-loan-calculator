"use client";

import { SettingsIcon, SlidersHorizontalIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput, Field, InfoHint, NumberInput } from "@/components/fields";
import {
  FREQUENCY_LABELS,
  type InterestMethod,
  type LoanInputs,
  type PaymentFrequency,
} from "@/types/loan";
import { formatDuration } from "@/lib/finance/format-currency";
import { LIMITS, type ValidationReport } from "@/lib/finance/validation";
import { cn } from "@/lib/utils";

const TERM_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8];
const RATE_PRESETS = [9, 11, 12, 12.5, 14.5];

const FREQUENCY_ITEMS = (
  Object.keys(FREQUENCY_LABELS) as PaymentFrequency[]
).map((value) => ({ value, label: FREQUENCY_LABELS[value] }));

const METHOD_COPY: Record<InterestMethod, string> = {
  reducing:
    "Interest is charged each period on the balance still outstanding, so it falls as you repay. The installment stays level apart from a small rounding adjustment on the last one.",
  flat: "Interest is charged on the original amount borrowed for the whole term, no matter how much you have already repaid. The same stated rate costs considerably more this way.",
};

interface Props {
  inputs: LoanInputs;
  report: ValidationReport;
  onChange: (patch: Partial<LoanInputs>) => void;
}

export function LoanConfiguration({ inputs, report, onChange }: Props) {
  const years = inputs.termMonths / 12;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontalIcon aria-hidden="true" className="size-4 text-brand" />
          Loan configuration
        </CardTitle>
        <CardDescription>
          Set the rate, the term and how the lender calculates interest.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Field
              label="Annual interest rate"
              htmlFor="annual-rate"
              error={report.errors.annualRate}
              warning={report.warnings.annualRate}
              hint={`Any rate from 0% to ${LIMITS.maxRate}%, decimals included.`}
            >
              <NumberInput
                id="annual-rate"
                value={inputs.annualRate}
                step={0.1}
                min={0}
                max={LIMITS.maxRate}
                suffix="%"
                invalid={Boolean(report.errors.annualRate)}
                describedBy={
                  report.errors.annualRate || report.warnings.annualRate
                    ? "annual-rate-error"
                    : "annual-rate-hint"
                }
                onValueChange={(annualRate) => onChange({ annualRate })}
              />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {RATE_PRESETS.map((rate) => (
                <Button
                  key={rate}
                  type="button"
                  size="xs"
                  variant={inputs.annualRate === rate ? "default" : "outline"}
                  aria-pressed={inputs.annualRate === rate}
                  onClick={() => onChange({ annualRate: rate })}
                >
                  {rate}%
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Field
              label="Loan duration"
              htmlFor="term-months"
              trailing={formatDuration(inputs.termMonths)}
              error={report.errors.termMonths}
              hint="Enter any number of months, or pick a preset below."
            >
              <NumberInput
                id="term-months"
                value={inputs.termMonths}
                step={1}
                min={0}
                max={LIMITS.maxTermMonths}
                suffix="mo"
                invalid={Boolean(report.errors.termMonths)}
                describedBy={
                  report.errors.termMonths ? "term-months-error" : "term-months-hint"
                }
                onValueChange={(termMonths) =>
                  onChange({ termMonths: Math.round(termMonths) })
                }
              />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {TERM_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="xs"
                  variant={years === preset ? "default" : "outline"}
                  aria-pressed={years === preset}
                  onClick={() => onChange({ termMonths: preset * 12 })}
                >
                  {preset}y
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" id="interest-method-label">
              Interest calculation method
            </span>
            <InfoHint label="About interest calculation methods">
              The same stated annual rate produces very different total interest
              under these two methods. Ask your lender which one applies before
              comparing offers.
            </InfoHint>
          </div>
          <Tabs
            value={inputs.method}
            onValueChange={(value) =>
              onChange({ method: value as InterestMethod })
            }
          >
            <TabsList
              aria-labelledby="interest-method-label"
              className="w-full sm:w-auto"
            >
              <TabsTrigger value="reducing">Reducing balance</TabsTrigger>
              <TabsTrigger value="flat">Flat interest</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-pretty text-muted-foreground">
            {METHOD_COPY[inputs.method]}
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SettingsIcon aria-hidden="true" className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Advanced settings</h3>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="First payment date"
              htmlFor="first-payment-date"
              error={report.errors.firstPaymentDate}
              hint="Used for the dates in the repayment schedule."
            >
              <Input
                id="first-payment-date"
                type="date"
                className="h-10"
                value={inputs.firstPaymentDate}
                aria-invalid={Boolean(report.errors.firstPaymentDate) || undefined}
                onChange={(event) =>
                  onChange({ firstPaymentDate: event.target.value })
                }
              />
            </Field>

            <Field
              label="Payment frequency"
              htmlFor="payment-frequency"
              hint={
                inputs.frequency === "monthly"
                  ? "Monthly is how vehicle loans are usually quoted."
                  : "The term is converted into this many installments."
              }
            >
              <Select
                items={FREQUENCY_ITEMS}
                value={inputs.frequency}
                onValueChange={(value) =>
                  onChange({ frequency: value as PaymentFrequency })
                }
              >
                <SelectTrigger id="payment-frequency" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="One-time processing fee"
              htmlFor="processing-fee"
              error={report.errors.processingFee}
              hint="Charged by the lender when the loan is granted."
            >
              <CurrencyInput
                id="processing-fee"
                value={inputs.processingFee}
                max={LIMITS.maxFee}
                onValueChange={(processingFee) => onChange({ processingFee })}
              />
            </Field>

            <Field
              label="Recurring fee per installment"
              htmlFor="recurring-fee"
              error={report.errors.recurringFee}
              hint="Added to every installment. Never treated as interest."
            >
              <CurrencyInput
                id="recurring-fee"
                value={inputs.recurringFee}
                max={LIMITS.maxFee}
                onValueChange={(recurringFee) => onChange({ recurringFee })}
              />
            </Field>
          </div>

          <label
            htmlFor="processing-fee-financed"
            className={cn(
              "flex items-center gap-2.5 rounded-lg border p-3 text-sm",
              inputs.processingFee <= 0 && "opacity-60",
            )}
          >
            <Switch
              id="processing-fee-financed"
              checked={inputs.processingFeeFinanced}
              disabled={inputs.processingFee <= 0}
              onCheckedChange={(processingFeeFinanced) =>
                onChange({ processingFeeFinanced })
              }
            />
            <span>
              Add the processing fee to the loan
              <span className="block text-xs text-muted-foreground">
                {inputs.processingFeeFinanced
                  ? "Financed — it is borrowed, so interest is charged on it."
                  : "Paid upfront in cash, alongside the down payment."}
              </span>
            </span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
