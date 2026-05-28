// @almond/axol-ui-panels — useLocalStorageState
// papa-1
//
// Simple `[value, setValue]` hook that mirrors useState but persists the
// latest value to localStorage under a namespaced key. SSR-safe (returns
// initial value when window is missing).
//
// Key convention: "axol-ui-panels.<panel-id>.<field>" — set by the caller.

import { useCallback, useEffect, useState } from "react"

export function useLocalStorageState<T>(
  key: string,
  initial: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValueState] = useState<T>(() => {
    if (typeof window === "undefined" || !window.localStorage) return initial
    try {
      const raw = window.localStorage.getItem(key)
      if (raw == null) return initial
      return JSON.parse(raw) as T
    } catch {
      return initial
    }
  })

  // Save on every change.
  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* quota / private mode — silent */
    }
  }, [key, value])

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    setValueState((prev) => (typeof next === "function" ? (next as (p: T) => T)(prev) : next))
  }, [])

  return [value, setValue]
}
