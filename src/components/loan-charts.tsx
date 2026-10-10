"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PieChartIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CurrencyPrecision, LoanResult } from "@/types/loan";
import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/finance/format-currency";
import { round2 } from "@/lib/finance/money";

/**
 * Series colours come from CSS custom properties so both themes are driven by
 * one set of tokens. The two hues are validated for colour-vision deficiency
 * against both the light and the dark card surface.
 */
const PRINCIPAL = "var(--series-principal)";
const INTEREST = "var(--series-interest)";
const SURFACE = "var(--card)";
const GRID = "var(--border)";
const AXIS_INK = "var(--muted-foreground)";

const AXIS_TICK = { fill: AXIS_INK, fontSize: 11 } as const;

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Shared tooltip shell, themed through the same tokens as the cards. */
function TooltipShell({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            {row.color ? (
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: row.color }}
              />
            ) : null}
            <span className="text-muted-foreground">{row.label}</span>
            <span className="ml-auto font-medium tabular text-popover-foreground">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Legend row: a colour swatch beside text, never coloured text. */
function LegendRow({
  color,
  label,
  value,
  share,
}: {
  color: string;
  label: string;
  value: string;
  share?: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-[3px]"
        style={{ background: color }}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto text-right">
        <span className="block text-sm font-medium tabular">{value}</span>
        {share ? (
          <span className="block text-xs text-muted-foreground tabular">
            {share}
          </span>
        ) : null}
      </span>
    </li>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed">
      <p className="max-w-xs px-6 text-center text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

interface ChartProps {
  result: LoanResult;
  precision: CurrencyPrecision;
}

/** Chart A — how much of the total repayment is principal and how much is interest. */
function PrincipalInterestChart({ result, precision }: ChartProps) {
  const total = result.totalLoanRepayment;
  const data = [
    { key: "principal", name: "Principal", value: result.principal, color: PRINCIPAL },
    {
      key: "interest",
      name: "Interest",
      value: result.totalInterest,
      color: INTEREST,
    },
  ];

  // With nothing repaid there is no whole to take a share of.
  const hasTotal = total > 0;
  const share = (value: number) =>
    hasTotal ? formatPercent(round2((value / total) * 100), 1) : "—";

  if (!result.hasLoan || !hasTotal) {
    return (
      <EmptyChart message="Enter a vehicle price, a down payment and a term to see how the repayment splits." />
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="relative w-full min-w-0 overflow-hidden"
        role="img"
        aria-label={`Of ${formatCurrency(total, precision)} repaid, ${formatCurrency(result.principal, precision)} is principal and ${formatCurrency(result.totalInterest, precision)} is interest.`}
      >
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              startAngle={90}
              endAngle={-270}
              // A surface-coloured stroke is the 2px gap between segments.
              stroke={SURFACE}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0] as TooltipEntry;
                const value = Number(entry.value ?? 0);
                return (
                  <TooltipShell
                    title={String(entry.name ?? "")}
                    rows={[
                      { label: "Amount", value: formatCurrency(value, precision) },
                      { label: "Share of repayment", value: share(value) },
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total repayment</span>
          <span className="text-xl font-semibold tabular">
            {formatCurrency(total, "whole")}
          </span>
        </div>
      </div>

      <ul className="space-y-2">
        {data.map((entry) => (
          <LegendRow
            key={entry.key}
            color={entry.color}
            label={entry.name}
            value={formatCurrency(entry.value, precision)}
            share={share(entry.value)}
          />
        ))}
      </ul>
    </div>
  );
}

/** Chart B — the principal still outstanding after each installment. */
function BalanceChart({ result, precision }: ChartProps) {
  const data = useMemo(() => {
    if (!result.hasLoan) return [];
    return [
      {
        period: 0,
        date: result.inputs.firstPaymentDate,
        balance: result.principal,
      },
      ...result.schedule.map((row) => ({
        period: row.period,
        date: row.date,
        balance: row.closingBalance,
      })),
    ];
  }, [result]);

  if (data.length === 0) {
    return <EmptyChart message="The outstanding balance appears once a loan is calculated." />;
  }

  return (
    <div
      className="w-full min-w-0 overflow-hidden"
      role="img"
      aria-label={`Outstanding principal falls from ${formatCurrency(result.principal, precision)} to zero over ${result.periods} installments.`}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="period"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            minTickGap={24}
            label={{
              value: "Installment number",
              position: "insideBottom",
              offset: -14,
              fill: AXIS_INK,
              fontSize: 11,
            }}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(value: number) => formatCompact(value)}
          />
          <Tooltip
            cursor={{ stroke: GRID, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = (payload[0] as TooltipEntry).payload as
                | { period: number; date: string; balance: number }
                | undefined;
              if (!point) return null;
              return (
                <TooltipShell
                  title={
                    point.period === 0
                      ? "At drawdown"
                      : `Installment ${point.period} · ${formatDate(point.date)}`
                  }
                  rows={[
                    {
                      label: "Outstanding principal",
                      value: formatCurrency(point.balance, precision),
                      color: PRINCIPAL,
                    },
                  ]}
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke={PRINCIPAL}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Chart C — the principal/interest split of each installment. */
function PaymentBreakdownChart({ result, precision }: ChartProps) {
  const [grouping, setGrouping] = useState<"auto" | "installment" | "year">(
    "auto",
  );

  // Long schedules are unreadable one bar per installment, so they default to
  // yearly totals; the user can still switch back.
  const effective: "installment" | "year" =
    grouping === "auto"
      ? result.periods > 36
        ? "year"
        : "installment"
      : grouping;

  const data = useMemo(() => {
    if (!result.hasLoan) return [];
    if (effective === "installment") {
      return result.schedule.map((row) => ({
        label: String(row.period),
        full: `Installment ${row.period} · ${formatDate(row.date)}`,
        principal: row.principal,
        interest: row.interest,
      }));
    }

    const perYear = result.periodsPerYear;
    const buckets = new Map<number, { principal: number; interest: number }>();
    for (const row of result.schedule) {
      const year = Math.ceil(row.period / perYear);
      const bucket = buckets.get(year) ?? { principal: 0, interest: 0 };
      bucket.principal += row.principal;
      bucket.interest += row.interest;
      buckets.set(year, bucket);
    }
    return [...buckets.entries()].map(([year, bucket]) => ({
      label: `Y${year}`,
      full: `Year ${year}`,
      principal: round2(bucket.principal),
      interest: round2(bucket.interest),
    }));
  }, [result, effective]);

  if (data.length === 0) {
    return <EmptyChart message="The payment breakdown appears once a loan is calculated." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap items-center gap-4">
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-[3px]"
              style={{ background: PRINCIPAL }}
            />
            <span className="text-xs text-muted-foreground">Principal</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-[3px]"
              style={{ background: INTEREST }}
            />
            <span className="text-xs text-muted-foreground">Interest</span>
          </li>
        </ul>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="xs"
            variant={effective === "installment" ? "default" : "outline"}
            aria-pressed={effective === "installment"}
            onClick={() => setGrouping("installment")}
          >
            Per installment
          </Button>
          <Button
            type="button"
            size="xs"
            variant={effective === "year" ? "default" : "outline"}
            aria-pressed={effective === "year"}
            onClick={() => setGrouping("year")}
          >
            Per year
          </Button>
        </div>
      </div>

      <div
        className="w-full min-w-0 overflow-hidden"
        role="img"
        aria-label={`Each ${effective === "year" ? "year" : "installment"} split into principal and interest. Interest falls and principal rises over the term.`}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
            <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              minTickGap={16}
              label={{
                value:
                  effective === "year" ? "Loan year" : "Installment number",
                position: "insideBottom",
                offset: -14,
                fill: AXIS_INK,
                fontSize: 11,
              }}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <Tooltip
              cursor={{ fill: GRID, fillOpacity: 0.35 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = (payload[0] as TooltipEntry).payload as
                  | { full: string; principal: number; interest: number }
                  | undefined;
                if (!point) return null;
                return (
                  <TooltipShell
                    title={point.full}
                    rows={[
                      {
                        label: "Principal",
                        value: formatCurrency(point.principal, precision),
                        color: PRINCIPAL,
                      },
                      {
                        label: "Interest",
                        value: formatCurrency(point.interest, precision),
                        color: INTEREST,
                      },
                      {
                        label: "Total",
                        value: formatCurrency(
                          round2(point.principal + point.interest),
                          precision,
                        ),
                      },
                    ]}
                  />
                );
              }}
            />
            {/* A surface-coloured hairline is the gap between stacked segments. */}
            <Bar
              dataKey="principal"
              stackId="payment"
              fill={PRINCIPAL}
              stroke={SURFACE}
              strokeWidth={1}
              maxBarSize={24}
              isAnimationActive={false}
            />
            <Bar
              dataKey="interest"
              stackId="payment"
              fill={INTEREST}
              stroke={SURFACE}
              strokeWidth={1}
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function LoanCharts({ result, precision }: ChartProps) {
  return (
    <section
      aria-labelledby="charts-heading"
      className="space-y-4 print-hidden"
    >
      <h2 id="charts-heading" className="sr-only">
        Financial charts
      </h2>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon aria-hidden="true" className="size-4 text-brand" />
              Principal vs interest
            </CardTitle>
            <CardDescription>
              What your repayments actually buy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PrincipalInterestChart result={result} precision={precision} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outstanding loan balance</CardTitle>
            <CardDescription>
              Principal still owed after each installment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BalanceChart result={result} precision={precision} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment breakdown</CardTitle>
          <CardDescription>
            How each installment divides between principal and interest. Exact
            figures for every installment are in the repayment schedule below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentBreakdownChart result={result} precision={precision} />
        </CardContent>
      </Card>
    </section>
  );
}
