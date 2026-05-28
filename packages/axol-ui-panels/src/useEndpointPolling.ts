// @almond/axol-ui-panels — useEndpointPolling
// papa-1
//
// Generic hook: poll a GET endpoint every N ms and surface
// { data, error, loading, refetch }. Bound to AbortController for the
// component's lifetime; clears on unmount; pauses on 404 (treats as
// "endpoint unavailable" — render placeholder rather than spin).

import { useCallback, useEffect, useRef, useState } from "react"
import { getJson, isNotFound, ApiError } from "./api"

export interface PollingResult<T> {
  data: T | null
  error: Error | null
  loading: boolean
  /** Imperative refresh — bypasses the polling interval. */
  refetch: () => void
  /** True once a 404 has been observed; polling stops. */
  unavailable: boolean
}

export interface PollingOptions {
  /** Polling cadence in ms. Default 1000. */
  intervalMs?: number
  /** Per-request timeout. Default 10 s. */
  timeoutMs?: number
  /** Disable polling — manual refetch only. */
  paused?: boolean
}

/**
 * Poll a GET endpoint at the given cadence. Returns the latest payload and
 * any error from the most recent attempt. A 404 stops the polling loop and
 * marks `unavailable: true`.
 */
export function useEndpointPolling<T = unknown>(
  path: string | null,
  options: PollingOptions = {}
): PollingResult<T> {
  const { intervalMs = 1000, timeoutMs = 10_000, paused = false } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [unavailable, setUnavailable] = useState<boolean>(false)

  const ctrlRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const unavailableRef = useRef(false)

  const doFetch = useCallback(async () => {
    if (!path) return
    if (unavailableRef.current) return
    // Cancel any in-flight request before starting a new one.
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    try {
      const result = await getJson<T>(path, { signal: ctrl.signal, timeoutMs })
      if (!mountedRef.current) return
      setData(result)
      setError(null)
    } catch (err) {
      if (!mountedRef.current) return
      if ((err as Error)?.name === "AbortError") return
      if (isNotFound(err)) {
        unavailableRef.current = true
        setUnavailable(true)
      }
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [path, timeoutMs])

  // Polling loop. Re-arm only if not paused, not unavailable, path is set.
  useEffect(() => {
    mountedRef.current = true
    unavailableRef.current = false
    setUnavailable(false)
    if (!path || paused) return

    let cancelled = false
    const run = async () => {
      while (!cancelled) {
        await doFetch()
        if (cancelled || unavailableRef.current) return
        // Sleep between polls
        await new Promise<void>((resolve) => {
          timerRef.current = setTimeout(resolve, intervalMs)
        })
      }
    }
    void run()
    return () => {
      cancelled = true
      mountedRef.current = false
      ctrlRef.current?.abort()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [path, intervalMs, paused, doFetch])

  const refetch = useCallback(() => {
    unavailableRef.current = false
    setUnavailable(false)
    void doFetch()
  }, [doFetch])

  return { data, error, loading, refetch, unavailable }
}

/** Re-export ApiError so consumers can `instanceof` without an extra import. */
export { ApiError }
