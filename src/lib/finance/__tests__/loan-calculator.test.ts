import { describe, expect, it } from "vitest";
import { calculateFrom } from "../loan-calculator";
import { periodicPayment } from "../amortization";
import { round2 } from "../money";
import type { LoanInputs } from "@/types/loan";

const base: Partial<LoanInputs> = {
  vehiclePrice: 8_500_000,
  downPayment: 2_550_000,
  annualRate: 12.5,
  termMonths: 60,
  method: "reducing",
  frequency: "monthly",
  firstPaymentDate: "2026-01-15",
};

describe("reducing-balance loans", () => {
  it("matches the closed-form EMI formula", () => {
    const result = calculateFrom(base);
    const principal = 8_500_000 - 2_550_000;
    const r = 12.5 / 100 / 12;
    const expected = round2(periodicPayment(principal, r, 60));

    expect(result.principal).toBe(principal);
    expect(result.periods).toBe(60);
    expect(result.installment).toBe(expected);
    expect(result.installment).toBeCloseTo(133_862.73, 1);
  });

  it("charges interest on the opening balance each period", () => {
    const result = calculateFrom(base);
    const r = result.periodRate;
    for (const row of result.schedule) {
      expect(row.interest).toBe(round2(row.openingBalance * r));
      expect(round2(row.principal + row.interest + row.fee)).toBe(row.payment);
    }
  });

  it("carries the closing balance into the next opening balance", () => {
    const { schedule, principal } = calculateFrom(base);
    expect(schedule[0].openingBalance).toBe(principal);
    for (let i = 1; i < schedule.length; i += 1) {
      expect(schedule[i].openingBalance).toBe(schedule[i - 1].closingBalance);
      expect(schedule[i].closingBalance).toBeLessThan(
        schedule[i].openingBalance,
      );
    }
  });

  it("clears the balance exactly on the final installment", () => {
    const result = calculateFrom(base);
    const last = result.schedule[result.schedule.length - 1];
    expect(last.closingBalance).toBe(0);
    expect(result.schedule.every((row) => row.closingBalance >= 0)).toBe(true);
    // The rounding adjustment stays within a rupee of the level installment.
    expect(Math.abs(last.payment - result.installment)).toBeLessThan(1);
  });

  it("reconciles schedule totals with the headline figures", () => {
    const result = calculateFrom(base);
    const paid = round2(
      result.schedule.reduce((total, row) => total + row.payment, 0),
    );
    const interest = round2(
      result.schedule.reduce((total, row) => total + row.interest, 0),
    );
    const principal = round2(
      result.schedule.reduce((total, row) => total + row.principal, 0),
    );

    expect(principal).toBe(result.principal);
    expect(interest).toBe(result.totalInterest);
    expect(paid).toBe(result.totalFinancingRepayment);
    expect(result.totalLoanRepayment).toBe(
      round2(result.principal + result.totalInterest),
    );
  });

  it("handles decimal interest rates", () => {
    for (const annualRate of [9, 11, 12, 12.5, 14.5, 7.25]) {
      const result = calculateFrom({ ...base, annualRate });
      const last = result.schedule[result.schedule.length - 1];
      expect(last.closingBalance).toBe(0);
      expect(result.totalInterest).toBeGreaterThan(0);
    }
  });

  it("produces more interest the longer the term runs", () => {
    const short = calculateFrom({ ...base, termMonths: 36 });
    const long = calculateFrom({ ...base, termMonths: 84 });
    expect(long.periods).toBe(84);
    expect(long.periodicPayment).toBeLessThan(short.periodicPayment);
    expect(long.totalInterest).toBeGreaterThan(short.totalInterest);
  });

  it("handles a one-month loan", () => {
    const result = calculateFrom({ ...base, termMonths: 1 });
    expect(result.periods).toBe(1);
    expect(result.schedule).toHaveLength(1);
    const [row] = result.schedule;
    expect(row.principal).toBe(result.principal);
    expect(row.closingBalance).toBe(0);
    expect(row.interest).toBe(round2(result.principal * result.periodRate));
  });

  it("handles very small and very large principals", () => {
    const small = calculateFrom({ ...base, vehiclePrice: 1000, downPayment: 0 });
    expect(small.schedule.at(-1)?.closingBalance).toBe(0);

    const large = calculateFrom({
      ...base,
      vehiclePrice: 500_000_000,
      downPayment: 0,
      termMonths: 480,
    });
    expect(large.schedule).toHaveLength(480);
    expect(large.schedule.at(-1)?.closingBalance).toBe(0);
    expect(Number.isFinite(large.totalInterest)).toBe(true);
  });
});

describe("zero-interest loans", () => {
  it("splits the principal evenly with no interest", () => {
    const result = calculateFrom({ ...base, annualRate: 0, termMonths: 48 });
    expect(result.totalInterest).toBe(0);
    expect(result.installment).toBe(round2(result.principal / 48));
    expect(result.totalLoanRepayment).toBe(result.principal);
    expect(result.schedule.every((row) => row.interest === 0)).toBe(true);
    expect(result.schedule.at(-1)?.closingBalance).toBe(0);
  });

  it("absorbs rounding in the final installment", () => {
    // 1,000,000 / 3 does not divide evenly into whole cents.
    const result = calculateFrom({
      ...base,
      vehiclePrice: 1_000_000,
      downPayment: 0,
      annualRate: 0,
      termMonths: 3,
    });
    const total = round2(
      result.schedule.reduce((sum, row) => sum + row.principal, 0),
    );
    expect(total).toBe(1_000_000);
    expect(result.schedule.at(-1)?.closingBalance).toBe(0);
  });
});

describe("flat-interest loans", () => {
  it("charges interest on the original principal for the whole term", () => {
    const result = calculateFrom({ ...base, method: "flat" });
    const principal = 5_950_000;
    const expectedInterest = round2(principal * 0.125 * 5);

    expect(result.totalInterest).toBe(expectedInterest);
    expect(result.installment).toBe(
      round2(round2(principal / 60) + round2(expectedInterest / 60)),
    );
    expect(result.schedule.at(-1)?.closingBalance).toBe(0);
  });

  it("costs more than reducing balance at the same stated rate", () => {
    const reducing = calculateFrom(base);
    const flat = calculateFrom({ ...base, method: "flat" });
    expect(flat.totalInterest).toBeGreaterThan(reducing.totalInterest);
  });

  it("reconciles its schedule with the headline totals", () => {
    const result = calculateFrom({ ...base, method: "flat", termMonths: 37 });
    const interest = round2(
      result.schedule.reduce((sum, row) => sum + row.interest, 0),
    );
    const principal = round2(
      result.schedule.reduce((sum, row) => sum + row.principal, 0),
    );
    expect(interest).toBe(result.totalInterest);
    expect(principal).toBe(result.principal);
  });

  it("charges no interest at a zero rate", () => {
    const result = calculateFrom({ ...base, method: "flat", annualRate: 0 });
    expect(result.totalInterest).toBe(0);
    expect(result.totalLoanRepayment).toBe(result.principal);
  });
});

describe("fees", () => {
  const withFees: Partial<LoanInputs> = {
    ...base,
    fees: [
      { id: "registration", amount: 150_000, financed: true },
      { id: "documentation", amount: 25_000, financed: false },
      { id: "insurance", amount: 120_000, financed: false },
      { id: "other", amount: 0, financed: false },
    ],
    processingFee: 30_000,
    processingFeeFinanced: true,
  };

  it("adds financed fees to the principal and leaves the rest as cash", () => {
    const result = calculateFrom(withFees);
    expect(result.fees.financed).toBe(180_000);
    expect(result.fees.separate).toBe(145_000);
    expect(result.fees.total).toBe(325_000);
    expect(result.principal).toBe(8_500_000 - 2_550_000 + 180_000);
    expect(result.upfrontCash).toBe(2_550_000 + 145_000);
  });

  it("never counts a fee twice", () => {
    const result = calculateFrom(withFees);
    // Every rupee the buyer parts with: cash upfront plus everything repaid.
    const allCash = round2(result.upfrontCash + result.totalFinancingRepayment);
    expect(allCash).toBe(result.totalVehicleCost);
  });

  it("keeps recurring fees out of the interest calculation", () => {
    const withoutFee = calculateFrom(base);
    const withFee = calculateFrom({ ...base, recurringFee: 500 });

    expect(withFee.totalInterest).toBe(withoutFee.totalInterest);
    expect(withFee.installment).toBe(withoutFee.installment);
    expect(withFee.periodicPayment).toBe(round2(withoutFee.installment + 500));
    expect(withFee.fees.recurringTotal).toBe(30_000);
    expect(withFee.totalFinancingRepayment).toBe(
      round2(withoutFee.totalLoanRepayment + 30_000),
    );
    expect(withFee.schedule.every((row) => row.fee === 500)).toBe(true);
  });

  it("moves a financed fee out of upfront cash and into the principal", () => {
    const financed = calculateFrom({
      ...base,
      fees: [{ id: "registration", amount: 200_000, financed: true }],
    });
    const separate = calculateFrom({
      ...base,
      fees: [{ id: "registration", amount: 200_000, financed: false }],
    });

    expect(financed.principal).toBe(separate.principal + 200_000);
    expect(financed.upfrontCash).toBe(separate.upfrontCash - 200_000);
    expect(financed.totalInterest).toBeGreaterThan(separate.totalInterest);
    // The fee itself is the same money either way; only the interest differs.
    expect(round2(financed.totalVehicleCost - separate.totalVehicleCost)).toBe(
      round2(financed.totalInterest - separate.totalInterest),
    );
  });
});

describe("down payment", () => {
  it("shrinks the principal and the interest as it grows", () => {
    const low = calculateFrom({ ...base, downPayment: 850_000 });
    const high = calculateFrom({ ...base, downPayment: 4_250_000 });

    expect(low.downPaymentPercent).toBe(10);
    expect(high.downPaymentPercent).toBe(50);
    expect(high.principal).toBeLessThan(low.principal);
    expect(high.totalInterest).toBeLessThan(low.totalInterest);
    expect(high.upfrontCash).toBeGreaterThan(low.upfrontCash);
  });

  it("reports loan-to-value against the vehicle price", () => {
    const result = calculateFrom({ ...base, downPayment: 1_700_000 });
    expect(result.ltv).toBe(80);
    expect(result.remainingVehiclePrice).toBe(6_800_000);
  });
});

describe("invalid and degenerate inputs", () => {
  it("returns a zeroed result rather than NaN for a zero price", () => {
    const result = calculateFrom({ ...base, vehiclePrice: 0, downPayment: 0 });
    expect(result.hasLoan).toBe(false);
    expect(result.schedule).toHaveLength(0);
    expect(result.installment).toBe(0);
    expect(result.downPaymentPercent).toBe(0);
  });

  it("returns no loan when the term is zero", () => {
    const result = calculateFrom({ ...base, termMonths: 0 });
    expect(result.hasLoan).toBe(false);
    expect(result.periods).toBe(0);
  });

  it("returns no loan when the down payment covers everything", () => {
    const result = calculateFrom({ ...base, downPayment: 8_500_000 });
    expect(result.hasLoan).toBe(false);
    expect(result.principal).toBe(0);
    expect(result.upfrontCash).toBe(8_500_000);
  });

  it("clamps negative and non-finite values instead of propagating them", () => {
    const result = calculateFrom({
      ...base,
      downPayment: -100_000,
      annualRate: Number.NaN,
      recurringFee: -50,
    });
    expect(result.inputs.downPayment).toBe(0);
    expect(result.inputs.annualRate).toBe(0);
    expect(result.inputs.recurringFee).toBe(0);
    expect(Number.isFinite(result.installment)).toBe(true);
  });

  it("never produces NaN or Infinity across a sweep of inputs", () => {
    for (const annualRate of [0, 0.01, 12.5, 100]) {
      for (const termMonths of [1, 2, 7, 60, 480]) {
        const result = calculateFrom({ ...base, annualRate, termMonths });
        const numbers = [
          result.installment,
          result.totalInterest,
          result.totalLoanRepayment,
          result.totalVehicleCost,
          result.interestToPrincipalPercent,
        ];
        expect(numbers.every(Number.isFinite)).toBe(true);
        expect(result.schedule.at(-1)?.closingBalance).toBe(0);
      }
    }
  });
});

describe("payment frequency", () => {
  it("treats monthly as n monthly installments, as the formulas assume", () => {
    const result = calculateFrom(base);
    expect(result.periodsPerYear).toBe(12);
    expect(result.periodRate).toBe(12.5 / 100 / 12);
  });

  it("converts a term in months into quarterly installments", () => {
    const result = calculateFrom({ ...base, frequency: "quarterly" });
    expect(result.periods).toBe(20);
    expect(result.periodsPerYear).toBe(4);
    expect(result.schedule[1].date).toBe("2026-04-15");
    expect(result.schedule.at(-1)?.closingBalance).toBe(0);
  });

  it("spaces annual installments twelve months apart", () => {
    const result = calculateFrom({ ...base, frequency: "annual" });
    expect(result.periods).toBe(5);
    expect(result.schedule[1].date).toBe("2027-01-15");
  });
});

describe("payment dates", () => {
  it("advances one month per installment", () => {
    const result = calculateFrom({ ...base, firstPaymentDate: "2026-01-31" });
    const dates = result.schedule.slice(0, 4).map((row) => row.date);
    // 31 January clamps to the end of February rather than spilling into March.
    expect(dates).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });
});
