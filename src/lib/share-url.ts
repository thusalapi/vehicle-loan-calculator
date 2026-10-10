/**
 * Shareable links.
 *
 * A share link carries only the numbers needed to reproduce a calculation — no
 * names, no identifiers, nothing personal. Decoding treats every parameter as
 * untrusted: values are parsed, clamped and re-validated through the same
 * schemas used for stored state before they reach the calculator.
 */
import { FEE_IDS, type CalculatorState, type Scenario } from "@/types/loan";
import { DEFAULT_INPUTS, defaultScenarios } from "./finance/defaults";
import { normaliseInputs } from "./finance/loan-calculator";
import { parseScenario } from "./finance/validation";

const METHOD_CODES = { reducing: "r", flat: "f" } as const;
const FREQUENCY_CODES = {
  monthly: "m",
  quarterly: "q",
  semiannual: "s",
  annual: "a",
} as const;

function decodeMethod(code: string | null): "reducing" | "flat" {
  return code === "f" ? "flat" : "reducing";
}

function decodeFrequency(code: string | null) {
  const entry = Object.entries(FREQUENCY_CODES).find(
    ([, value]) => value === code,
  );
  return (entry?.[0] ?? "monthly") as keyof typeof FREQUENCY_CODES;
}

function num(value: string | null, fallback: number): number {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Encodes calculator state into query parameters. */
export function encodeState(state: CalculatorState): string {
  const { inputs, scenarios, precision } = state;
  const params = new URLSearchParams();

  params.set("p", String(inputs.vehiclePrice));
  params.set("d", String(inputs.downPayment));
  params.set("r", String(inputs.annualRate));
  params.set("t", String(inputs.termMonths));
  params.set("m", METHOD_CODES[inputs.method]);
  params.set("f", FREQUENCY_CODES[inputs.frequency]);
  params.set("dt", inputs.firstPaymentDate);

  // Fees travel positionally, in FEE_IDS order: "amount.financedFlag".
  const fees = FEE_IDS.map((id) => {
    const fee = inputs.fees.find((candidate) => candidate.id === id);
    return `${fee?.amount ?? 0}:${fee?.financed ? 1 : 0}`;
  }).join("_");
  params.set("fe", fees);

  if (inputs.processingFee > 0) {
    params.set("pf", String(inputs.processingFee));
    params.set("pff", inputs.processingFeeFinanced ? "1" : "0");
  }
  if (inputs.recurringFee > 0) params.set("rf", String(inputs.recurringFee));
  params.set("cu", precision === "whole" ? "w" : "d");

  if (scenarios.length > 0) {
    params.set(
      "sc",
      scenarios
        .map((scenario) =>
          [
            scenario.name.replace(/[|~]/g, " "),
            scenario.vehiclePrice,
            scenario.downPayment,
            scenario.annualRate,
            scenario.termMonths,
            METHOD_CODES[scenario.method],
            scenario.financedFees,
            scenario.separateFees,
          ].join("~"),
        )
        .join("|"),
    );
  }

  return params.toString();
}

/** Builds an absolute share URL from the current page origin. */
export function buildShareUrl(state: CalculatorState, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/?${encodeState(state)}`;
}

function decodeScenarios(raw: string | null): Scenario[] {
  if (!raw) return [];
  return raw
    .split("|")
    .slice(0, 3)
    .map((chunk, index) => {
      const [name, price, down, rate, term, method, financed, separate] =
        chunk.split("~");
      return parseScenario({
        id: `shared-${index}`,
        name: (name || `Option ${index + 1}`).slice(0, 40),
        vehiclePrice: num(price ?? null, 0),
        downPayment: num(down ?? null, 0),
        annualRate: num(rate ?? null, 0),
        termMonths: Math.floor(num(term ?? null, 0)),
        method: decodeMethod(method ?? null),
        financedFees: num(financed ?? null, 0),
        separateFees: num(separate ?? null, 0),
      });
    })
    .filter((scenario): scenario is Scenario => scenario !== null);
}

/**
 * Decodes calculator state from a query string.
 *
 * Returns `null` when the query carries no calculator parameters at all, so
 * callers can tell "no share link" from "a share link with odd values".
 */
export function decodeState(search: string): CalculatorState | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  if (!params.has("p") && !params.has("sc")) return null;

  const defaults = DEFAULT_INPUTS();
  const feeParts = (params.get("fe") ?? "").split("_");

  const inputs = normaliseInputs({
    vehiclePrice: num(params.get("p"), defaults.vehiclePrice),
    downPayment: num(params.get("d"), defaults.downPayment),
    annualRate: num(params.get("r"), defaults.annualRate),
    termMonths: Math.floor(num(params.get("t"), defaults.termMonths)),
    method: decodeMethod(params.get("m")),
    frequency: decodeFrequency(params.get("f")),
    firstPaymentDate: /^\d{4}-\d{2}-\d{2}$/.test(params.get("dt") ?? "")
      ? (params.get("dt") as string)
      : defaults.firstPaymentDate,
    fees: FEE_IDS.map((id, index) => {
      const [amount, financed] = (feeParts[index] ?? "0:0").split(":");
      return {
        id,
        amount: num(amount ?? null, 0),
        financed: financed === "1",
      };
    }),
    processingFee: num(params.get("pf"), 0),
    processingFeeFinanced: params.get("pff") === "1",
    recurringFee: num(params.get("rf"), 0),
  });

  // A link that never carried scenarios gets the usual starting pair rather
  // than an empty comparison table.
  const scenarios = params.has("sc")
    ? decodeScenarios(params.get("sc"))
    : defaultScenarios(inputs);

  return {
    inputs,
    scenarios,
    precision: params.get("cu") === "w" ? "whole" : "decimals",
  };
}
