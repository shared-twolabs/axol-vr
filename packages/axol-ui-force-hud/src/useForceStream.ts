// @almond/axol-ui-force-hud — SSE force-feed consumer
// yankee-1: opens an EventSource against the dashboard's torque stream
// and maintains a fixed-depth ring buffer of recent samples per arm.
//
// Design notes
// ------------
//  * Samples arrive at ~30 Hz. React state at 30 Hz would re-render the
//    HUD every frame and burn the XR budget. Instead we keep the live
//    buffers in `useRef` and expose READ accessors (refs) plus a slow
//    state pulse (~15 Hz) for non-perf-critical bits (the `connected`
//    flag, the last error message). The HUD's `useFrame` reads
//    `samplesRef.current` directly each frame — no React in the hot path.
//
//  * "no-file" heartbeats from the SSE endpoint flag the publisher as
//    absent. We surface those as `connected: false` and DO NOT push
//    zeros into the history (so when the publisher comes back, the
//    sparkline doesn't show a fake-zero gap). The HUD treats absence
//    as zeros visually via `latest === null`.
//
//  * Auto-reconnect: EventSource reconnects automatically on transport
//    failure. We surface the most recent `onerror` message so the HUD
//    can show a small "no torque feed" indicator if needed.

import { useEffect, useRef, useState } from "react"

/** One torque sample as published by the dashboard SSE. */
export interface ForceSample {
  /** Timestamp from the publisher (epoch seconds). */
  ts: number
  /** 8 floats in Joint enum order: [S1, S2, S3, ELB, W1, W2, W3, GRIP]. */
  left: number[]
  /** 8 floats in Joint enum order: [S1, S2, S3, ELB, W1, W2, W3, GRIP]. */
  right: number[]
}

/** Result of `useForceStream`. */
export interface UseForceStreamResult {
  /** Latest sample (null while disconnected or no publisher). */
  latestRef: React.MutableRefObject<ForceSample | null>
  /**
   * Ring buffer of recent LEFT-arm samples, indexed [time][joint].
   * Oldest first. Length === `historyDepth` once primed; partial before.
   * Stored in a ref to avoid re-renders.
   */
  historyLeftRef: React.MutableRefObject<number[][]>
  /** Ring buffer of recent RIGHT-arm samples, same shape as `historyLeftRef`. */
  historyRightRef: React.MutableRefObject<number[][]>
  /** True while the stream has received a real sample within ~1 s. */
  connected: boolean
  /** Last `onerror` / parse error message (cleared on next good sample). */
  lastError: string | null
}

const ZERO_JOINTS = [0, 0, 0, 0, 0, 0, 0, 0]
/** Inactive-publisher heartbeat from the dashboard. */
const REASON_NO_FILE = "no-file"
/** State-pulse frequency for non-perf-critical updates (Hz). */
const STATE_PULSE_HZ = 15

/**
 * Subscribe to the dashboard's torque SSE stream and maintain per-arm
 * ring buffers. Stable between renders unless `url` / `historyDepth`
 * change.
 *
 * @param url SSE endpoint (default: `/api/torques/stream`, proxied by Vite).
 * @param historyDepth Ring-buffer length (default 150 = 5 s @ 30 Hz).
 */
export function useForceStream(
  url: string = "/api/torques/stream",
  historyDepth: number = 150
): UseForceStreamResult {
  const latestRef = useRef<ForceSample | null>(null)
  const historyLeftRef = useRef<number[][]>([])
  const historyRightRef = useRef<number[][]>([])
  // `lastGoodAt` flips `connected` to false if no real sample arrives
  // within `STALE_MS` (e.g. publisher stopped without a no-file heartbeat).
  const lastGoodAtRef = useRef<number>(0)

  const [connected, setConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let es: EventSource | null = null

    function pushSample(s: ForceSample) {
      latestRef.current = s
      const left = s.left.slice()
      const right = s.right.slice()
      historyLeftRef.current.push(left)
      historyRightRef.current.push(right)
      if (historyLeftRef.current.length > historyDepth) {
        historyLeftRef.current.shift()
      }
      if (historyRightRef.current.length > historyDepth) {
        historyRightRef.current.shift()
      }
      lastGoodAtRef.current = performance.now()
    }

    function open() {
      if (cancelled) return
      try {
        es = new EventSource(url)
      } catch (err) {
        setLastError(`EventSource init failed: ${(err as Error).message}`)
        return
      }

      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as Partial<ForceSample> & { reason?: string }
          if (parsed && parsed.reason === REASON_NO_FILE) {
            // Heartbeat: publisher absent. Drop latest, do not push to history.
            latestRef.current = null
            return
          }
          if (
            parsed &&
            typeof parsed.ts === "number" &&
            Array.isArray(parsed.left) &&
            Array.isArray(parsed.right) &&
            parsed.left.length === 8 &&
            parsed.right.length === 8
          ) {
            pushSample({ ts: parsed.ts, left: parsed.left, right: parsed.right })
            if (lastError) setLastError(null)
          } else {
            // Malformed but not heartbeat — log once, don't push.
            setLastError("Malformed SSE sample")
          }
        } catch (err) {
          setLastError(`Parse error: ${(err as Error).message}`)
        }
      }

      es.onerror = () => {
        // EventSource will auto-reconnect; just surface the state.
        if (cancelled) return
        setLastError("SSE connection error (auto-reconnecting)")
      }
    }

    open()

    // Slow pulse: updates `connected` from `lastGoodAt`. We do this in a
    // setInterval rather than per-sample so the HUD doesn't re-render
    // every frame at 30 Hz.
    const pulse = window.setInterval(() => {
      const now = performance.now()
      const fresh = latestRef.current !== null && now - lastGoodAtRef.current < 1000
      setConnected((prev) => (prev === fresh ? prev : fresh))
    }, 1000 / STATE_PULSE_HZ)

    return () => {
      cancelled = true
      window.clearInterval(pulse)
      if (es) {
        es.close()
        es = null
      }
    }
    // `lastError` intentionally omitted — referenced inside, not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, historyDepth])

  return {
    latestRef,
    historyLeftRef,
    historyRightRef,
    connected,
    lastError,
  }
}

/** Returns a zero-filled 8-joint array. Useful for default rendering. */
export function zeroJoints(): number[] {
  return ZERO_JOINTS.slice()
}
