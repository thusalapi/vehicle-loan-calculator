/**
 * Local persistence.
 *
 * Everything here is defensive: local storage can be absent (server render),
 * disabled (private browsing, blocked cookies), full, or hold data written by
 * an older version of the app. None of those may break the calculator, so every
 * access is guarded and every read is re-validated before use.
 */
import type { CalculatorState } from "@/types/loan";
import { parseCalculatorState } from "./finance/validation";

export const STORAGE_KEY = "vehicle-loan-calculator:state:v1";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = window.localStorage;
    // Touch the API: some browsers expose it but throw on access.
    const key = "__vlc_probe__";
    probe.setItem(key, "1");
    probe.removeItem(key);
    return probe;
  } catch {
    return null;
  }
}

/** `true` when state can actually be persisted in this browser. */
export function isStorageAvailable(): boolean {
  return storage() !== null;
}

/** Reads saved state, returning `null` when missing, corrupted or outdated. */
export function loadState(): CalculatorState | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseCalculatorState(JSON.parse(raw));
  } catch {
    // Corrupted JSON from an older build: drop it rather than fail on load.
    try {
      store.removeItem(STORAGE_KEY);
    } catch {
      /* nothing more we can do */
    }
    return null;
  }
}

/** Persists state. Returns `false` when storage is unavailable or full. */
export function saveState(state: CalculatorState): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Removes everything this app has saved. */
export function clearState(): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
