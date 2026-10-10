import { CarFrontIcon } from "lucide-react";
import { Calculator } from "@/components/calculator";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur print-hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground"
            >
              <CarFrontIcon className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Vehicle Loan Calculator</p>
              <p className="text-xs text-muted-foreground">
                Sri Lanka · figures in LKR
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 max-w-2xl space-y-2 print-hidden">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Work out what a vehicle really costs to finance
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Enter the price, what you can put down and the terms a lender has
            quoted. You get the monthly installment, the total interest, the
            full repayment schedule and a side-by-side comparison of the options
            you are weighing — calculated in your browser, with nothing sent
            anywhere.
          </p>
        </div>

        <Calculator />

        <section
          aria-labelledby="disclaimer-heading"
          className="mt-8 rounded-lg border bg-muted/40 p-4"
        >
          <h2
            id="disclaimer-heading"
            className="mb-1.5 text-sm font-semibold"
          >
            Financial disclaimer
          </h2>
          <p className="text-xs text-pretty text-muted-foreground">
            This calculator produces estimates for planning purposes only. It is
            not a financing offer, a quotation, or financial advice. Lenders
            differ in how they apply interest, which fees they charge, whether
            those fees can be financed, how they round installments and what
            insurance they require, so the amount a bank or leasing company
            quotes you may differ from the figures shown here. Confirm the exact
            terms with your lender before committing to a purchase.
          </p>
        </section>
      </main>

      <footer className="border-t print-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          Everything is calculated locally in your browser. Your figures are
          saved only on this device and are never sent to a server.
        </div>
      </footer>
    </>
  );
}
