"use client";

import { useId, useState, type ReactNode } from "react";
import { AlertCircleIcon, InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatGrouped, parseAmount } from "@/lib/finance/format-currency";

/**
 * Label + control + message, wired together for screen readers.
 *
 * The error and hint ids are always attached via `aria-describedby`, so the
 * message is announced the moment it appears without the control changing
 * identity.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  warning,
  trailing,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  warning?: string;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {trailing ? (
          <span className="text-xs text-muted-foreground tabular">
            {trailing}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs text-destructive"
        >
          <AlertCircleIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : warning ? (
        <p
          id={`${htmlFor}-error`}
          className="flex items-start gap-1.5 text-xs text-muted-foreground"
        >
          <InfoIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>{warning}</span>
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A short explanatory tooltip, triggered by a small info icon beside a label. */
export function InfoHint({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        }
      >
        <InfoIcon aria-hidden="true" className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-pretty">{children}</TooltipContent>
    </Tooltip>
  );
}

/**
 * A currency field that shows thousands separators.
 *
 * While the field has focus the user's raw keystrokes are preserved (so a
 * trailing decimal point or an empty field behaves normally); on blur the value
 * snaps back to the grouped display form.
 */
export function CurrencyInput({
  id,
  value,
  onValueChange,
  invalid,
  describedBy,
  disabled,
  max,
  "aria-label": ariaLabel,
}: {
  id: string;
  value: number;
  onValueChange: (value: number) => void;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  max?: number;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const display =
    draft ?? formatGrouped(value, Number.isInteger(value) ? 0 : 2);

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-medium text-muted-foreground"
      >
        LKR
      </span>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        className="h-10 pl-12 text-right tabular"
        value={display}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onFocus={() => setDraft(value === 0 ? "" : String(value))}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = parseAmount(raw);
          const next = parsed === null ? 0 : parsed;
          onValueChange(max !== undefined ? Math.min(next, max) : next);
        }}
      />
    </div>
  );
}

/** A plain numeric field with a unit suffix, used for rates and counts. */
export function NumberInput({
  id,
  value,
  onValueChange,
  suffix,
  step = 1,
  min = 0,
  max,
  invalid,
  describedBy,
  disabled,
}: {
  id: string;
  value: number;
  onValueChange: (value: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const fallbackId = useId();
  const inputId = id || fallbackId;

  return (
    <div className="relative">
      <Input
        id={inputId}
        type="number"
        inputMode="decimal"
        autoComplete="off"
        step={step}
        min={min}
        max={max}
        className={cn("h-10 text-right tabular", suffix && "pr-10")}
        value={draft ?? String(value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (raw.trim() === "") {
            onValueChange(min);
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          let next = parsed;
          if (next < min) next = min;
          if (max !== undefined && next > max) next = max;
          onValueChange(next);
        }}
      />
      {suffix ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground"
        >
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
