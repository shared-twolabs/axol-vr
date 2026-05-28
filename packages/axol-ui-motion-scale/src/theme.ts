// @almond/axol-ui-motion-scale — theme + slider math
// quebec-1: log-spaced 10-stop motion-scale slider.
//
// Operator-facing values run 0.25× to 4.0× covering ~4 octaves of zoom.
// We expose the math so the slider can map a linear UI position (0..1) to
// a multiplicative scale, and a scale back to a UI position. We also
// snap to the canonical 10 stops so the operator hits round numbers.

import { theme as baseTheme } from "@almond/axol-ui"

/** Re-export the base theme palette so panel renderers stay consistent. */
export const theme = baseTheme

/** Robot arm comfortable reach in metres.
 *  Cited from the spec — this is the diameter of the operator's natural
 *  reach envelope at the desk; the axol arm's physical reach is larger,
 *  but driving it from a smaller envelope keeps shoulder drift low. */
export const ROBOT_ARM_REACH = 0.6

/** Canonical 10 log-uniform stops between 0.25× and 4.0×. */
export const SCALE_STOPS = [0.25, 0.35, 0.5, 0.7, 1.0, 1.4, 2.0, 2.8, 4.0] as const

export const SCALE_MIN = SCALE_STOPS[0]
export const SCALE_MAX = SCALE_STOPS[SCALE_STOPS.length - 1]
const LOG_MIN = Math.log10(SCALE_MIN)
const LOG_MAX = Math.log10(SCALE_MAX)
const LOG_RANGE = LOG_MAX - LOG_MIN

/** Default scale on first run / "Reset to 1.0" target. */
export const SCALE_DEFAULT = 1.0

/** Map a scale value (0.25..4.0) to a slider position 0..1. */
export function scaleToPosition(scale: number): number {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale))
  return (Math.log10(clamped) - LOG_MIN) / LOG_RANGE
}

/** Map a slider position 0..1 to a continuous scale, no snap. */
export function positionToScale(position: number): number {
  const p = Math.min(1, Math.max(0, position))
  return Math.pow(10, LOG_MIN + p * LOG_RANGE)
}

/** Snap a continuous scale to the nearest canonical stop. */
export function snapScale(scale: number): number {
  let best = SCALE_STOPS[0] as number
  let bestDist = Math.abs(Math.log10(scale) - Math.log10(best))
  for (const stop of SCALE_STOPS) {
    const d = Math.abs(Math.log10(scale) - Math.log10(stop))
    if (d < bestDist) {
      best = stop
      bestDist = d
    }
  }
  return best
}

/** Clamp a scale value to the valid range, no snap. */
export function clampScale(scale: number): number {
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale))
}
