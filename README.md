# Vehicle Loan Calculator

A vehicle financing calculator for Sri Lanka. Enter a price, a down payment, a
rate and a term; get the loan amount, the monthly installment, the total
interest, the total cost including financing, and a full repayment schedule.

Everything runs in the browser — no backend, no database, no account, no
external API. Your figures never leave your device.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui ·
Recharts · Zod · Vitest

---

## Features

- Vehicle price and down payment in LKR, linked to a slider, with live
  loan amount, down-payment percentage and loan-to-value ratio.
- Registration, documentation, insurance and other fees — each financed into
  the loan or paid upfront in cash.
- **Reducing balance** or **flat interest**, any rate from 0–100%, any term up
  to 480 months, plus first payment date, payment frequency and optional
  one-time and recurring fees.
- Full repayment schedule: opening balance, installment, principal, interest,
  fees, closing balance and cumulative interest — searchable, paged, totalled.
- Three charts: principal vs interest, outstanding balance, and the
  principal/interest split per installment.
- Up to three independent side-by-side financing scenarios.
- CSV export, a print/PDF report, share links, local persistence, dark mode.

---

## The maths

All financial logic is in [`src/lib/finance/`](src/lib/finance), separate from
any React component and covered by the tests.

```
Reducing balance:  r   = annual rate / 100 / periods per year
                   EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)    (P / n when r = 0)

Flat interest:     Total interest = P × (rate / 100) × years
                   Installment    = (P + total interest) / n
```

Three invariants hold the whole app together:

- **The schedule is the source of truth.** Every total shown — dashboard,
  charts, CSV, printed report — is summed from the generated schedule rather
  than computed separately, so they can never disagree with the table.
- **The balance clears exactly.** Amounts round to whole cents once per row and
  the final installment absorbs the difference, so the closing balance reaches
  exactly zero and never goes negative.
- **Fees are counted once.** A fee is either added to the principal (and so
  attracts interest) or paid in cash — never both. `upfront cash + total
  financing repayment = total vehicle cost` for every combination.

---

## Running it

Needs **Node.js 22.12+** (24 LTS recommended) from [nodejs.org](https://nodejs.org/);
npm ships with it.

```bash
npm install && npm run dev
```

Then open <http://localhost:3000>.

| Script | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build, then serve it |
| `npm run lint` · `npm run typecheck` · `npm test` | Checks (75 tests) |

Run all four checks before deploying — they catch nearly everything that would
otherwise fail in Vercel's build.

---

## Deploying to Vercel

**1. Push to GitHub.** Create an empty repo (no README, `.gitignore` or
licence — the project has them), then:

```bash
git init -b main && git add -A && git commit -m "Vehicle loan calculator"
```

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git && git push -u origin main
```

`node_modules`, `.next` and env files are already ignored. `package-lock.json`
**is** committed and should stay that way — Vercel needs it.

**2. Import it.** At [vercel.com](https://vercel.com) → **Add New… → Project** →
pick the repo → **Import**. Next.js is detected automatically: leave every build
setting at its default and add no environment variables. No `vercel.json` needed.

**3. Deploy**, then open the URL and check that figures update as you type, the
charts render, and a refresh restores your settings.

**4. Updating.** Push to `main` and production redeploys. Any other branch or
pull request gets its own preview URL — the safer way to check a change first.

### Troubleshooting builds

| Symptom | Fix |
| --- | --- |
| `Type error: …` | Reproduce with `npm run typecheck`; Vercel fails on any TS error. |
| `Module not found` | Dependency not in `package.json`. `npm install <pkg>`, commit the lockfile too. |
| Works locally, fails on Vercel | Usually filename casing — Windows/macOS ignore it, Vercel's Linux builders don't. |
| `ERESOLVE` on install | Peer-dependency conflict. Resolve locally and commit the updated lockfile. |
| `window is not defined` | Browser-only code in a server render. Keep it in a `"use client"` component behind `useHydrated`. |
| Hydration mismatch warning | A date, random value or local-storage read differing between server and client — put it behind `useHydrated`. |
| Charts missing | The component is missing `"use client"`; Recharts cannot render server-side. |
| Node version error | Vercel honours `engines.node` (`>=22.12.0`). Match it in **Settings → General**. |

---

## Structure

```
src/
├─ app/           Layout, page shell, theme tokens + print stylesheet, icon, OG image
├─ components/    calculator.tsx orchestrates; one component per section; ui/ is shadcn
├─ lib/
│  ├─ finance/    The engine: loan-calculator, amortization, validation, formatting,
│  │              scenarios, defaults, money — plus __tests__/
│  ├─ csv.ts      CSV generation and download
│  ├─ share-url.ts  Encode/decode share links
│  └─ storage.ts  Safe local-storage access
├─ hooks/         useHydrated — guards browser-only reads against SSR mismatches
└─ types/loan.ts  The domain model
```

Tests cover both interest methods, zero-interest and one-month loans, decimal
rates, financed vs separately-paid fees, final-installment rounding,
schedule↔dashboard reconciliation, scenario independence, invalid input,
share-link round trips and CSV output.

---

## Limitations

- **Estimates, not an offer.** Lenders differ in how they apply interest, which
  fees they charge, whether those can be financed, and how they round. Confirm
  terms with your lender.
- **Whether a fee can be financed varies** — the toggle is a modelling choice,
  not any lender's policy.
- **LKR only**; no exchange rates or currency conversion.
- **Local storage only** — settings stay on the device they were entered on. The
  app works fine without it; it just won't remember anything.
