"use client";

import { useMemo } from "react";
import { PlusIcon, RotateCcwIcon, ScaleIcon, Trash2Icon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyInput, NumberInput } from "@/components/fields";
import { Label } from "@/components/ui/label";
import {
  MAX_SCENARIOS,
  calculateScenarios,
  highlightScenarios,
} from "@/lib/finance/scenarios";
import {
  formatCurrency,
  formatDuration,
  formatPercent,
} from "@/lib/finance/format-currency";
import { LIMITS } from "@/lib/finance/validation";
import type {
  CurrencyPrecision,
  InterestMethod,
  LoanInputs,
  Scenario,
} from "@/types/loan";
import { cn } from "@/lib/utils";

interface Props {
  scenarios: Scenario[];
  inputs: LoanInputs;
  precision: CurrencyPrecision;
  onChange: (scenarios: Scenario[]) => void;
  onAdd: () => void;
  onReset: () => void;
}

/** One comparison row: a metric across every scenario. */
function MetricRow({
  label,
  values,
  hint,
  highlightIndex,
  highlightLabel,
  strong,
}: {
  label: string;
  values: string[];
  hint?: string;
  highlightIndex?: number;
  highlightLabel?: string;
  strong?: boolean;
}) {
  return (
    <tr className="border-b last:border-b-0">
      <th
        scope="row"
        className="py-2.5 pr-3 text-left align-top text-sm font-normal text-muted-foreground"
      >
        {label}
        {hint ? (
          <span className="block text-[0.7rem] text-muted-foreground/80">
            {hint}
          </span>
        ) : null}
      </th>
      {values.map((value, index) => (
        <td
          key={index}
          className={cn(
            "py-2.5 pl-3 text-right align-top tabular",
            strong ? "text-sm font-semibold" : "text-sm",
          )}
        >
          {value}
          {highlightIndex === index && highlightLabel ? (
            <Badge
              variant="secondary"
              className="ms-2 align-middle text-[0.65rem] font-normal"
            >
              {highlightLabel}
            </Badge>
          ) : null}
        </td>
      ))}
    </tr>
  );
}

export function ScenarioComparison({
  scenarios,
  inputs,
  precision,
  onChange,
  onAdd,
  onReset,
}: Props) {
  const results = useMemo(
    () => calculateScenarios(scenarios, inputs.firstPaymentDate),
    [scenarios, inputs.firstPaymentDate],
  );
  const highlights = useMemo(() => highlightScenarios(results), [results]);

  // Every update replaces one entry by id, so no scenario can reach another.
  const patch = (id: string, changes: Partial<Scenario>) =>
    onChange(
      scenarios.map((scenario) =>
        scenario.id === id ? { ...scenario, ...changes } : scenario,
      ),
    );

  const remove = (id: string) =>
    onChange(scenarios.filter((scenario) => scenario.id !== id));

  const money = (value: number) => formatCurrency(value, precision);

  return (
    <Card className="print-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScaleIcon aria-hidden="true" className="size-4 text-brand" />
          Compare financing options
        </CardTitle>
        <CardDescription>
          Up to {MAX_SCENARIOS} side-by-side what-ifs. Each one is independent —
          editing a scenario never touches the others or the calculator above.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scenarios.length >= MAX_SCENARIOS}
            onClick={onAdd}
          >
            <PlusIcon aria-hidden="true" />
            Add scenario
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            <RotateCcwIcon aria-hidden="true" />
            Reset to current loan
          </Button>
        </div>

        {scenarios.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No scenarios yet. Add one to compare a different down payment, rate,
            term or interest method.
          </p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {scenarios.map((scenario, index) => (
                <fieldset
                  key={scenario.id}
                  className="space-y-3 rounded-lg border p-3"
                >
                  <legend className="sr-only">
                    Scenario {index + 1} settings
                  </legend>

                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 font-medium"
                      value={scenario.name}
                      maxLength={40}
                      aria-label={`Name for scenario ${index + 1}`}
                      onChange={(event) =>
                        patch(scenario.id, { name: event.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${scenario.name || `scenario ${index + 1}`}`}
                      onClick={() => remove(scenario.id)}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`${scenario.id}-price`}
                      className="text-xs text-muted-foreground"
                    >
                      Vehicle price
                    </Label>
                    <CurrencyInput
                      id={`${scenario.id}-price`}
                      value={scenario.vehiclePrice}
                      max={LIMITS.maxVehiclePrice}
                      onValueChange={(vehiclePrice) =>
                        patch(scenario.id, { vehiclePrice })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`${scenario.id}-down`}
                      className="text-xs text-muted-foreground"
                    >
                      Down payment
                    </Label>
                    <CurrencyInput
                      id={`${scenario.id}-down`}
                      value={scenario.downPayment}
                      max={LIMITS.maxVehiclePrice}
                      onValueChange={(downPayment) =>
                        patch(scenario.id, { downPayment })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`${scenario.id}-rate`}
                        className="text-xs text-muted-foreground"
                      >
                        Rate
                      </Label>
                      <NumberInput
                        id={`${scenario.id}-rate`}
                        value={scenario.annualRate}
                        step={0.1}
                        min={0}
                        max={LIMITS.maxRate}
                        suffix="%"
                        onValueChange={(annualRate) =>
                          patch(scenario.id, { annualRate })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`${scenario.id}-term`}
                        className="text-xs text-muted-foreground"
                      >
                        Term
                      </Label>
                      <NumberInput
                        id={`${scenario.id}-term`}
                        value={scenario.termMonths}
                        step={1}
                        min={0}
                        max={LIMITS.maxTermMonths}
                        suffix="mo"
                        onValueChange={(termMonths) =>
                          patch(scenario.id, {
                            termMonths: Math.round(termMonths),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`${scenario.id}-financed-fees`}
                        className="text-xs text-muted-foreground"
                      >
                        Financed fees
                      </Label>
                      <CurrencyInput
                        id={`${scenario.id}-financed-fees`}
                        value={scenario.financedFees}
                        max={LIMITS.maxFee}
                        onValueChange={(financedFees) =>
                          patch(scenario.id, { financedFees })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`${scenario.id}-separate-fees`}
                        className="text-xs text-muted-foreground"
                      >
                        Fees paid upfront
                      </Label>
                      <CurrencyInput
                        id={`${scenario.id}-separate-fees`}
                        value={scenario.separateFees}
                        max={LIMITS.maxFee}
                        onValueChange={(separateFees) =>
                          patch(scenario.id, { separateFees })
                        }
                      />
                    </div>
                  </div>

                  <Tabs
                    value={scenario.method}
                    onValueChange={(value) =>
                      patch(scenario.id, { method: value as InterestMethod })
                    }
                  >
                    <TabsList className="w-full">
                      <TabsTrigger value="reducing">Reducing</TabsTrigger>
                      <TabsTrigger value="flat">Flat</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </fieldset>
              ))}
            </div>

            <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[32rem] border-collapse">
                <caption className="sr-only">
                  Calculated comparison of each financing scenario
                </caption>
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="py-2 pr-3 text-left text-sm">
                      <span className="sr-only">Metric</span>
                    </th>
                    {results.map((entry, index) => (
                      <th
                        key={entry.scenario.id}
                        scope="col"
                        className="py-2 pl-3 text-right text-sm font-medium"
                      >
                        {entry.scenario.name || `Option ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <MetricRow
                    label="Loan amount"
                    values={results.map((e) => money(e.result.principal))}
                  />
                  <MetricRow
                    label="Down payment"
                    hint="As a share of the vehicle price"
                    values={results.map(
                      (e) =>
                        `${money(e.scenario.downPayment)} · ${formatPercent(e.result.downPaymentPercent, 1)}`,
                    )}
                  />
                  <MetricRow
                    label="Term"
                    values={results.map(
                      (e) => formatDuration(e.scenario.termMonths),
                    )}
                  />
                  <MetricRow
                    label="Interest method"
                    values={results.map((e) =>
                      e.scenario.method === "flat" ? "Flat" : "Reducing",
                    )}
                  />
                  <MetricRow
                    label="Monthly installment"
                    values={results.map((e) =>
                      e.result.hasLoan ? money(e.result.periodicPayment) : "—",
                    )}
                    highlightIndex={highlights.lowestInstallment}
                    highlightLabel="Lowest"
                    strong
                  />
                  <MetricRow
                    label="Total interest"
                    values={results.map((e) =>
                      e.result.hasLoan ? money(e.result.totalInterest) : "—",
                    )}
                    highlightIndex={highlights.lowestTotalInterest}
                    highlightLabel="Lowest"
                    strong
                  />
                  <MetricRow
                    label="Total loan repayment"
                    values={results.map((e) =>
                      e.result.hasLoan
                        ? money(e.result.totalLoanRepayment)
                        : "—",
                    )}
                  />
                  <MetricRow
                    label="Total upfront cash"
                    values={results.map((e) => money(e.result.upfrontCash))}
                    highlightIndex={highlights.lowestUpfront}
                    highlightLabel="Lowest"
                  />
                  <MetricRow
                    label="Total cost incl. interest and fees"
                    values={results.map((e) =>
                      e.result.hasLoan ? money(e.result.totalVehicleCost) : "—",
                    )}
                  />
                </tbody>
              </table>
            </div>

            <p className="rounded-lg border bg-muted/40 p-3 text-xs text-pretty text-muted-foreground">
              There is no single best option here. A larger down payment and a
              shorter term cost the least to borrow but tie up cash now and
              demand a bigger installment every month. A smaller down payment
              over a longer term is easier to afford month to month and costs
              more overall. Which trade-off suits you depends on the cash you
              can spare today and the installment you can comfortably carry.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
