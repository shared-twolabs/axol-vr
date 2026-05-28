// @almond/axol-ui-motion-scale — shared store
// quebec-1: dependency-free single-instance store mirroring axol-ui's
// useWindowRegistry pattern (useSyncExternalStore + a module-level
// singleton). Persists motionScale to localStorage on change.

import { useCallback, useSyncExternalStore } from "react"
import { ROBOT_ARM_REACH, SCALE_DEFAULT, clampScale } from "./theme"

const STORAGE_KEY = "axol-ui.motion-scale"
const PERSIST_DEBOUNCE_MS = 500

interface MotionScaleSnapshot {
  motionScale: number
  isCalibrating: boolean
}

interface InternalStore {
  motionScale: number
  isCalibrating: boolean
  listeners: Set<() => void>
  /** Cached frozen snapshot returned by getSnapshot; only re-created on change. */
  snapshot: MotionScaleSnapshot
  persistTimer: ReturnType<typeof setTimeout> | null
  hydrated: boolean
}

function makeSnapshot(s: InternalStore): MotionScaleSnapshot {
  return { motionScale: s.motionScale, isCalibrating: s.isCalibrating }
}

const store: InternalStore = {
  motionScale: SCALE_DEFAULT,
  isCalibrating: false,
  listeners: new Set(),
  snapshot: { motionScale: SCALE_DEFAULT, isCalibrating: false },
  persistTimer: null,
  hydrated: false,
}

function hydrateFromLocalStorage() {
  if (store.hydrated) return
  store.hydrated = true
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw == null) return
    const parsed = Number.parseFloat(raw)
    if (Number.isFinite(parsed)) {
      store.motionScale = clampScale(parsed)
      store.snapshot = makeSnapshot(store)
    }
  } catch {
    // Storage unavailable / quota — ignore, keep default.
  }
}

function emit() {
  store.snapshot = makeSnapshot(store)
  store.listeners.forEach((l) => l())
}

function schedulePersist() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return
  if (store.persistTimer !== null) clearTimeout(store.persistTimer)
  store.persistTimer = setTimeout(() => {
    store.persistTimer = null
    try {
      window.localStorage.setItem(STORAGE_KEY, String(store.motionScale))
    } catch {
      // Quota exceeded / disabled — drop the write silently.
    }
  }, PERSIST_DEBOUNCE_MS)
}

function subscribe(listener: () => void): () => void {
  store.listeners.add(listener)
  return () => {
    store.listeners.delete(listener)
  }
}

function getSnapshot(): MotionScaleSnapshot {
  hydrateFromLocalStorage()
  return store.snapshot
}

function getServerSnapshot(): MotionScaleSnapshot {
  // SSR fallback — return the default snapshot without touching storage.
  return { motionScale: SCALE_DEFAULT, isCalibrating: false }
}

export interface MotionScaleStore {
  /** Current teleop motion multiplier (1.0 default). */
  motionScale: number
  /** True while the sphere calibrator is active. */
  isCalibrating: boolean
  /** Enter calibration mode (sphere appears, panel buttons swap to confirm/cancel). */
  startCalibration: () => void
  /** Confirm calibration: compute scale from diameter and persist. */
  finishCalibration: (diameter: number) => void
  /** Cancel calibration: leave motionScale unchanged. */
  cancelCalibration: () => void
  /** Direct setter for the slider, clamped to the valid range. */
  setMotionScale: (value: number) => void
  /** Reset back to 1.0. */
  resetMotionScale: () => void
}

/**
 * Single shared motion-scale store. Subscribes via useSyncExternalStore so
 * panel + sphere + AxolVRClient consumer all stay in sync without prop
 * drilling. All mutators are stable (module-level), safe to pass into
 * dependency arrays.
 */
export function useMotionScale(): MotionScaleStore {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setMotionScale = useCallback((value: number) => {
    const clamped = clampScale(value)
    if (store.motionScale === clamped) return
    store.motionScale = clamped
    emit()
    schedulePersist()
  }, [])

  const resetMotionScale = useCallback(() => {
    if (store.motionScale === SCALE_DEFAULT && !store.isCalibrating) return
    store.motionScale = SCALE_DEFAULT
    emit()
    schedulePersist()
  }, [])

  const startCalibration = useCallback(() => {
    if (store.isCalibrating) return
    store.isCalibrating = true
    emit()
  }, [])

  const cancelCalibration = useCallback(() => {
    if (!store.isCalibrating) return
    store.isCalibrating = false
    emit()
  }, [])

  const finishCalibration = useCallback((diameter: number) => {
    // diameter < 5cm is a noise floor — clamp so the scale doesn't go to infinity.
    const safeDiameter = Math.max(diameter, 0.05)
    const computed = clampScale(ROBOT_ARM_REACH / safeDiameter)
    store.motionScale = computed
    store.isCalibrating = false
    emit()
    schedulePersist()
  }, [])

  return {
    motionScale: snapshot.motionScale,
    isCalibrating: snapshot.isCalibrating,
    setMotionScale,
    resetMotionScale,
    startCalibration,
    finishCalibration,
    cancelCalibration,
  }
}
