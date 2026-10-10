"use client";

import { useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  SearchIcon,
  TableIcon,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CurrencyPrecision, LoanResult } from "@/types/loan";
import {
  formatAmount,
  formatCurrency,
  formatDate,
} from "@/lib/finance/format-currency";

const PAGE_SIZE = 12;

interface Props {
  result: LoanResult;
  precision: CurrencyPrecision;
}

export function AmortizationTable({ result, precision }: Props) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [rawPage, setPage] = useState(0);

  const hasFees = result.fees.recurringTotal > 0;
  const isFlat = result.inputs.method === "flat";

  const rows = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed === "") return result.schedule;
    // Filtering by installment number is the one lookup that matters here;
    // dates are matched too so "2027" narrows to a year.
    const needle = trimmed.toLowerCase();
    return result.schedule.filter(
      (row) =>
        String(row.period) === trimmed ||
        String(row.period).startsWith(trimmed) ||
        row.date.includes(needle) ||
        formatDate(row.date).toLowerCase().includes(needle),
    );
  }, [result.schedule, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  // Derive the page in range rather than correcting it in an effect: when the
  // schedule shrinks under a stale page number, the clamp applies immediately
  // instead of after an extra render.
  const page = Math.min(rawPage, pageCount - 1);
  const visible = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const money = (value: number) => formatAmount(value, precision);

  if (!result.hasLoan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon aria-hidden="true" className="size-4 text-brand" />
            Loan repayment schedule
          </CardTitle>
          <CardDescription>
            The installment-by-installment schedule appears once there is a loan
            to repay.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="print-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TableIcon aria-hidden="true" className="size-4 text-brand" />
          Loan repayment schedule
        </CardTitle>
        <CardDescription>
          {result.periods} installments · opening balance{" "}
          {formatCurrency(result.principal, precision)} · closing balance{" "}
          {formatCurrency(0, precision)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={open}
            aria-controls="schedule-panel"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <ChevronUpIcon aria-hidden="true" />
            ) : (
              <ChevronDownIcon aria-hidden="true" />
            )}
            {open ? "Hide schedule" : "Show schedule"}
          </Button>

          {isFlat ? (
            <Badge variant="outline" className="font-normal">
              Flat interest — allocation shown
            </Badge>
          ) : null}

          <div className="relative ms-auto w-full sm:w-56">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-9 pl-8"
              placeholder="Find installment or date"
              aria-label="Filter the schedule by installment number or date"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </div>
        </div>

        {isFlat ? (
          <p className="rounded-lg border bg-muted/40 p-3 text-xs text-pretty text-muted-foreground">
            Under flat interest the total is fixed at the outset, so the split
            below is an accounting breakdown of a known repayment — not interest
            accrued on the balance still outstanding. The closing balance column
            tracks principal reduction only.
          </p>
        ) : null}

        {open ? (
          <div id="schedule-panel" className="space-y-3">
            <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
              <Table className="min-w-[46rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">No.</TableHead>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Installment</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    {hasFees ? (
                      <TableHead className="text-right">Fees</TableHead>
                    ) : null}
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead className="text-right">Interest to date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={hasFees ? 9 : 8}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        No installments match “{query}”.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visible.map((row) => (
                      <TableRow key={row.period}>
                        <TableCell className="tabular font-medium">
                          {row.period}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {money(row.openingBalance)}
                        </TableCell>
                        <TableCell className="text-right tabular font-medium">
                          {money(row.payment)}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {money(row.principal)}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {money(row.interest)}
                        </TableCell>
                        {hasFees ? (
                          <TableCell className="text-right tabular">
                            {money(row.fee)}
                          </TableCell>
                        ) : null}
                        <TableCell className="text-right tabular">
                          {money(row.closingBalance)}
                        </TableCell>
                        <TableCell className="text-right tabular text-muted-foreground">
                          {money(row.cumulativeInterest)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium">
                      Totals over {result.periods} installments
                    </TableCell>
                    <TableCell className="text-right tabular font-medium">
                      {money(result.totalFinancingRepayment)}
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {money(result.principal)}
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {money(result.totalInterest)}
                    </TableCell>
                    {hasFees ? (
                      <TableCell className="text-right tabular">
                        {money(result.fees.recurringTotal)}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right tabular">
                      {money(0)}
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {money(result.totalInterest)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground tabular">
                Showing{" "}
                {rows.length === 0 ? 0 : page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}
                {query.trim() !== "" ? " matching" : ""} installment
                {rows.length === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous page"
                  disabled={page === 0}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                >
                  <ChevronLeftIcon aria-hidden="true" />
                </Button>
                <span className="px-1 text-xs text-muted-foreground tabular">
                  Page {page + 1} of {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next page"
                  disabled={page >= pageCount - 1}
                  onClick={() =>
                    setPage((value) => Math.min(pageCount - 1, value + 1))
                  }
                >
                  <ChevronRightIcon aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
