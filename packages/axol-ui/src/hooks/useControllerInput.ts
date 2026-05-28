// @almond/axol-ui — useControllerInput
// scaffolder-alpha: per-frame controller sampling translated into debounced
// semantic events. Reads via `useXR().controllers` so it never collides with
// AxolVRClient's direct `gl.xr.getSession()` reads.

import { useEffect, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useXR } from "@react-three/xr"

const SCROLL_DEADZONE = 0.5
const SCROLL_DEBOUNCE_MS = 200
const OPACITY_DEADZONE = 0.4
const TRIGGER_EDGE_THRESHOLD = 0.6

export interface ControllerInputCallbacks {
  /** L thumbstick click rising-edge — toggle picker. */
  onTogglePicker?: () => void
  /** L thumbstick scrolled left (debounced). */
  onScrollLeft?: () => void
  /** L thumbstick scrolled right (debounced). */
  onScrollRight?: () => void
  /**
   * L thumbstick Y axis sampled while a window is focused.
   * Delivered per-frame as a delta (axis value * dt). Consumer multiplies
   * by their own sensitivity if needed; default at -1 mapped to -1.0/sec.
   */
  onOpacityDelta?: (delta: number) => void
  /** R thumbstick click rising-edge — reset layout. */
  onResetLayout?: () => void
  /** R trigger rising-edge — picker-driven select. */
  onTriggerEdge?: () => void
}

/**
 * Read controller inputs every frame and dispatch the supplied callbacks.
 *
 * Hooks into r3f's `useFrame` — must be called from a component that is a
 * descendant of <Canvas>. Returns nothing.
 */
export function useControllerInput(callbacks: ControllerInputCallbacks): void {
  // Pull controller refs from the XR store. `useXR((s) => s.inputSources)` is
  // not part of the public API in all versions; sample directly via the XR
  // session each frame.
  const session = useXR((s) => s.session)

  // Edge-detection state
  const prevLeftClick = useRef(false)
  const prevRightClick = useRef(false)
  const prevTrigger = useRef(false)
  const lastScrollAt = useRef(0)

  // Callbacks-in-ref so identity churn doesn't reset the loop
  const cbRef = useRef(callbacks)
  useEffect(() => {
    cbRef.current = callbacks
  }, [callbacks])

  useFrame((_, dt) => {
    if (!session) return
    const inputs = Array.from(session.inputSources)
    const left = inputs.find((s) => s.handedness === "left")
    const right = inputs.find((s) => s.handedness === "right")

    const leftPad = left?.gamepad
    const rightPad = right?.gamepad

    // ---- L thumbstick click (button index 3 on the WebXR Touch Plus mapping) ----
    const leftClick = leftPad?.buttons[3]?.pressed ?? false
    if (leftClick && !prevLeftClick.current) {
      cbRef.current.onTogglePicker?.()
    }
    prevLeftClick.current = leftClick

    // ---- R thumbstick click ----
    const rightClick = rightPad?.buttons[3]?.pressed ?? false
    if (rightClick && !prevRightClick.current) {
      cbRef.current.onResetLayout?.()
    }
    prevRightClick.current = rightClick

    // ---- L thumbstick axes — WebXR gamepad layout: axes[2] = X, axes[3] = Y ----
    const lx = leftPad?.axes[2] ?? 0
    const ly = leftPad?.axes[3] ?? 0

    // Debounced left/right scroll
    if (Math.abs(lx) > SCROLL_DEADZONE) {
      const now = performance.now()
      if (now - lastScrollAt.current > SCROLL_DEBOUNCE_MS) {
        if (lx < 0) cbRef.current.onScrollLeft?.()
        else cbRef.current.onScrollRight?.()
        lastScrollAt.current = now
      }
    }

    // Per-frame opacity delta (Y axis). Quest reports Y positive = down,
    // so invert: stick up should increase opacity.
    if (Math.abs(ly) > OPACITY_DEADZONE) {
      cbRef.current.onOpacityDelta?.(-ly * dt)
    }

    // ---- R trigger (button index 0) ----
    const rt = rightPad?.buttons[0]?.value ?? 0
    const triggerPressed = rt > TRIGGER_EDGE_THRESHOLD
    if (triggerPressed && !prevTrigger.current) {
      cbRef.current.onTriggerEdge?.()
    }
    prevTrigger.current = triggerPressed
  })
}
