"use client";

import { useState } from "react";
import {
  CheckIcon,
  DownloadIcon,
  Link2Icon,
  PrinterIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { csvFilename, downloadCsv, scheduleToCsv } from "@/lib/csv";
import { buildShareUrl } from "@/lib/share-url";
import type {
  CalculatorState,
  CurrencyPrecision,
  LoanResult,
} from "@/types/loan";

interface Props {
  state: CalculatorState;
  result: LoanResult;
  /** `true` when a valid calculation exists, which gates the exports. */
  canExport: boolean;
  storageAvailable: boolean;
  isDirty: boolean;
  onPrecisionChange: (precision: CurrencyPrecision) => void;
  onReset: () => void;
  onClearSaved: () => void;
}

export function ExportControls({
  state,
  result,
  canExport,
  storageAvailable,
  isDirty,
  onPrecisionChange,
  onReset,
  onClearSaved,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCsv = () => {
    if (!canExport) return;
    downloadCsv(csvFilename(result), scheduleToCsv(result, state.precision));
    toast.success("Repayment schedule downloaded", {
      description: `${result.periods} installments exported as CSV.`,
    });
  };

  const handleShare = async () => {
    const url = buildShareUrl(state, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success("Share link copied", {
        description: "It carries only the loan figures — nothing personal.",
      });
    } catch {
      // Clipboard access can be refused; put the link in the address bar so it
      // can still be copied by hand.
      window.history.replaceState(null, "", url);
      toast.info("Share link ready in the address bar", {
        description: "Copying to the clipboard was blocked by your browser.",
      });
    }
  };

  return (
    <Card className="print-hidden">
      <CardHeader>
        <CardTitle className="text-base">Export, print and save</CardTitle>
        <CardDescription>
          {storageAvailable
            ? "Your settings are saved in this browser automatically."
            : "Local storage is unavailable, so settings will not be remembered — everything else works normally."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleCsv} disabled={!canExport}>
            <DownloadIcon aria-hidden="true" />
            Download schedule (CSV)
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            disabled={!canExport}
          >
            <PrinterIcon aria-hidden="true" />
            Print / save as PDF
          </Button>

          <Button type="button" variant="outline" onClick={handleShare}>
            {copied ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <Link2Icon aria-hidden="true" />
            )}
            {copied ? "Link copied" : "Copy share link"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button type="button" variant="outline">
                  <RotateCcwIcon aria-hidden="true" />
                  Reset calculator
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset to the default values?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isDirty
                    ? "Your current vehicle price, down payment, fees, loan terms and comparison scenarios will be discarded."
                    : "The calculator is already at its default values, so nothing will change."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my settings</AlertDialogCancel>
                <AlertDialogAction onClick={onReset}>
                  Reset calculator
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {storageAvailable ? (
            <Button type="button" variant="ghost" onClick={onClearSaved}>
              <Trash2Icon aria-hidden="true" />
              Clear saved data
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium" id="precision-label">
            Currency display
          </span>
          <Tabs
            value={state.precision}
            onValueChange={(value) =>
              onPrecisionChange(value as CurrencyPrecision)
            }
          >
            <TabsList aria-labelledby="precision-label">
              <TabsTrigger value="decimals">Two decimals</TabsTrigger>
              <TabsTrigger value="whole">Whole rupees</TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="text-xs text-muted-foreground">
            Affects the display only — calculations always keep full precision.
          </span>
        </div>

        {!canExport ? (
          <p className="text-xs text-muted-foreground">
            Exports are disabled until there is a valid loan to export.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
