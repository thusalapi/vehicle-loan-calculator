"use client";

import { useSyncExternalStore } from "react";

/** Nothing to subscribe to: the value flips once, at hydration, and never again. */
const subscribe = () => () => {};

/**
 * `false` during the server render and the hydrating render, `true` afterwards.
 *
 * Browser-only facts — local storage, the current URL, today's date, the
 * resolved theme — must not influence the first client render, or React will
 * report a hydration mismatch. Reading them behind this flag keeps the first
 * render identical to the server's without a `setState` inside an effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
