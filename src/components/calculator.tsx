"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { VehicleInputs } from "@/components/vehicle-inputs";
import { LoanConfiguration } from "@/components/loan-configuration";
import { LoanSummary } from "@/components/loan-summary";
import { LoanCharts } from "@/components/loan-charts";
import { ScenarioComparison } from "@/components/scenario-comparison";
import { AmortizationTable } from "@/components/amortization-table";
import { ExportControls } from "@/components/export-controls";
import { PrintReport } from "@/components/print-report";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";
import { calculateLoan } from "@/lib/finance/loan-calculator";
import { validateInputs } from "@/lib/finance/validation";
import { DEFAULT_INPUTS, defaultScenarios } from "@/lib/finance/defaults";
import { MAX_SCENARIOS, scenarioFromInputs } from "@/lib/finance/scenarios";
import { formatDate } from "@/lib/finance/format-currency";
import { todayIso } from "@/lib/finance/money";
import {
  clearState,
  isStorageAvailable,
  loadState,
  saveState,
} from "@/lib/storage";
import { decodeState } from "@/lib/share-url";
import type { CalculatorState, LoanInputs, Scenario } from "@/types/loan";

const SAVE_DEBOUNCE_MS = 400;

function freshState(): CalculatorState {
  const inputs = DEFAULT_INPUTS();
  return { inputs, scenarios: defaultScenarios(inputs), precision: "decimals" };
}

/**
 * Resolves the state the calculator opens with.
 *
 * A share link wins over saved settings: following one should show the sender's
 * figures, not whatever this browser last had open.
 */
function resolveInitialState(): {
  state: CalculatorState;
  fromLink: boolean;
  storageAvailable: boolean;
} {
  const storageAvailable = isStorageAvailable();
  const shared = decodeState(window.location.search);
  if (shared) return { state: shared, fromLink: true, storageAvailable };
  return {
    state: loadState() ?? freshState(),
    fromLink: false,
    storageAvailable,
  };
}

/** Rendered on the server and during the hydrating render. */
function CalculatorSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the calculator…</span>
      {[0, 1, 2].map((index) => (
        <Card key={index}>
          <CardHeader>
            <div className="h-4 w-44 animate-pulse rounded bg-muted" />
            <div className="h-3 w-64 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-28 animate-pulse rounded-lg bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * The interactive calculator.
 *
 * Saved settings, share-link parameters and today's date are all browser-only
 * facts, so they are read behind {@link useHydrated} and the first client render
 * matches the server's. Everything downstream is derived: the calculation,
 * the validation report and the scenario results all recompute from the inputs.
 */
export function Calculator() {
  const hydrated = useHydrated();

  // Resolved once, after hydration. Reading storage here is idempotent, so a
  // discarded memo costs nothing beyond repeating the same read.
  const initial = useMemo(
    () => (hydrated ? resolveInitialState() : null),
    [hydrated],
  );
  const [edited, setEdited] = useState<CalculatorState | null>(null);
  const state = edited ?? initial?.state ?? null;

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announced = useRef(false);

  // Announce a shared link once. `toast` is an external system, not React state.
  useEffect(() => {
    if (!initial?.fromLink || announced.current) return;
    announced.current = true;
    toast.info("Loaded a shared loan scenario", {
      description: "Your own saved settings stay untouched until you edit this.",
    });
  }, [initial]);

  // Persist with a short debounce so typing does not hammer local storage.
  useEffect(() => {
    if (!state) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveState(state), SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  const update = useCallback(
    (change: (current: CalculatorState) => CalculatorState) => {
      setEdited((current) => {
        const base = current ?? initial?.state;
        return base ? change(base) : current;
      });
    },
    [initial],
  );

  const updateInputs = useCallback(
    (patch: Partial<LoanInputs>) =>
      update((current) => ({
        ...current,
        inputs: { ...current.inputs, ...patch },
      })),
    [update],
  );

  const updateScenarios = useCallback(
    (scenarios: Scenario[]) => update((current) => ({ ...current, scenarios })),
    [update],
  );

  const addScenario = useCallback(
    () =>
      update((current) => {
        if (current.scenarios.length >= MAX_SCENARIOS) return current;
        const index = current.scenarios.length;
        return {
          ...current,
          scenarios: [
            ...current.scenarios,
            scenarioFromInputs(
              current.inputs,
              `scenario-${Date.now()}-${index}`,
              `Option ${String.fromCharCode(65 + index)}`,
            ),
          ],
        };
      }),
    [update],
  );

  const resetScenarios = useCallback(
    () =>
      update((current) => ({
        ...current,
        scenarios: defaultScenarios(current.inputs),
      })),
    [update],
  );

  const resetAll = useCallback(() => {
    setEdited(freshState());
    // Drop any share parameters so a refresh does not restore what was reset.
    window.history.replaceState(null, "", window.location.pathname);
    toast.success("Calculator reset to its default values");
  }, []);

  const clearSaved = useCallback(() => {
    clearState();
    toast.success("Saved data cleared from this browser", {
      description: "Your current figures stay on screen until you reload.",
    });
  }, []);

  const result = useMemo(
    () => (state ? calculateLoan(state.inputs) : null),
    [state],
  );
  const report = useMemo(
    () => (state ? validateInputs(state.inputs) : null),
    [state],
  );
  const isDirty = useMemo(() => {
    if (!state) return false;
    const defaults = freshState();
    // The default first payment date moves with the calendar, so compare
    // everything except that.
    const strip = (value: CalculatorState) =>
      JSON.stringify({
        ...value.inputs,
        firstPaymentDate: "",
        scenarios: value.scenarios.length,
      });
    return strip(state) !== strip(defaults);
  }, [state]);

  if (!state || !result || !report) return <CalculatorSkeleton />;

  const canExport = report.isValid && result.hasLoan;
  const storageAvailable = initial?.storageAvailable ?? false;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <VehicleInputs
          inputs={state.inputs}
          result={result}
          report={report}
          precision={state.precision}
          onChange={updateInputs}
        />
        <LoanConfiguration
          inputs={state.inputs}
          report={report}
          onChange={updateInputs}
        />
      </div>

      <LoanSummary
        result={result}
        precision={state.precision}
        isValid={report.isValid}
      />

      {canExport ? (
        <LoanCharts result={result} precision={state.precision} />
      ) : null}

      <ScenarioComparison
        scenarios={state.scenarios}
        inputs={state.inputs}
        precision={state.precision}
        onChange={updateScenarios}
        onAdd={addScenario}
        onReset={resetScenarios}
      />

      <AmortizationTable result={result} precision={state.precision} />

      <ExportControls
        state={state}
        result={result}
        canExport={canExport}
        storageAvailable={storageAvailable}
        isDirty={isDirty}
        onPrecisionChange={(precision) =>
          update((current) => ({ ...current, precision }))
        }
        onReset={resetAll}
        onClearSaved={clearSaved}
      />

      <PrintReport
        result={result}
        precision={state.precision}
        generatedOn={formatDate(todayIso())}
      />
    </div>
  );
}
