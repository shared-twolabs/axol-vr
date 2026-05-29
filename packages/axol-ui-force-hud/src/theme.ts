// @almond/axol-ui-force-hud — theme + force-bar color thresholds
// yankee-1: color/sizing constants for the head-locked ForceHUD.
//
// The HUD lives inside <XRHud> which head-locks at the camera. Sizes are
// metres in XRHud-local space — small numbers, big visual impact.
//
// Threshold values are heterogeneous between joints because the axol arm
// mixes motor families: Damiao actuators report Nm directly; MyActuator
// reports current (A) that scales to torque differently. We don't know the
// per-joint conversion at HUD time, so we pick a single `defaultThreshold`
// that gives a usable visual envelope for both and let the operator
// adjust later via a calibration sweep. GRIP is a special case — its raw
// magnitude is much smaller than the other joints, so we visually scale
// it by `gripVisualMultiplier` to keep the bar readable.

import { theme as baseTheme } from "@almond/axol-ui"

/** Re-export the base axol-ui theme so HUD label colors stay consistent. */
export const theme = baseTheme

/** Force-HUD specific color + sizing config. */
export const forceTheme = {
  /** Background plane behind the HUD content (matches XRHud's hudBg pattern). */
  bgColor: "#000000",
  bgOpacity: 0.55,

  // ---- Bar coloring ----
  /** Below this fraction of `defaultThreshold` the bar is green. */
  thresholdGreen: 0.3,
  /** Below this fraction of `defaultThreshold` the bar is yellow; above is red. */
  thresholdYellow: 0.7,
  /** Joint torque considered "comfortable / low". */
  colorGreen: "#22c55e",
  /** Joint torque considered "engaged / moderate". */
  colorYellow: "#eab308",
  /** Joint torque considered "high — block about to topple". */
  colorRed: "#ef4444",
  /** Bar fill when no torque feed is connected (dimmed). */
  colorDim: "#374151",

  // ---- Calibration ----
  /**
   * Single per-joint threshold used to scale bars 0..1.
   * Heterogeneous motor families (Damiao Nm vs MyActuator A) mean this is
   * a rough visual baseline — operator can swap with an override prop.
   */
  defaultThreshold: 1.5,
  /**
   * Visual multiplier applied to GRIP's raw value before threshold
   * comparison — axol's gripper joint reports much smaller magnitudes
   * than the arm joints, so we boost it for visual parity.
   */
  gripVisualMultiplier: 3,

  // ---- Layout (metres, XRHud-local) ----
  /** Distance forward from the camera. */
  forwardZ: -0.55,
  /** Vertical offset above eye level. */
  upY: 0.10,
  /** Per-arm row width. */
  rowWidth: 0.20,
  /** Gap between LEFT and RIGHT arm columns. */
  armGap: 0.05,
  /** Per-bar width. */
  barWidth: 0.012,
  /** Per-bar max height. */
  barHeight: 0.05,
  /** Gap between bars (horizontal). */
  barGap: 0.004,
  /** Vertical space below each bar reserved for the joint label. */
  labelHeight: 0.012,
  /** Vertical space above each bar reserved for the numeric readout. */
  valueHeight: 0.014,
  /** Sparkline strip height. */
  sparkHeight: 0.012,

  // ---- Typography (metres) ----
  /** Joint label (S1, ELB, ...) font size. */
  fontLabel: 0.006,
  /** Per-bar numeric readout font size. */
  fontValue: 0.0055,
  /** Per-arm heading ("LEFT ARM" / "RIGHT ARM"). */
  fontHeading: 0.0085,
  /** Block Resistance Index pill font size. */
  fontBRI: 0.011,
} as const

/** Joint enum order (matches torque_publisher / axol Joint enum). */
export const JOINT_NAMES = ["S1", "S2", "S3", "ELB", "W1", "W2", "W3", "GRIP"] as const

export type JointName = (typeof JOINT_NAMES)[number]

/**
 * Returns the color tier for a torque value, given the threshold.
 * GRIP is auto-scaled by `gripVisualMultiplier` so its threshold tier
 * matches the other joints' visual response.
 */
export function colorForTorque(
  value: number,
  joint: JointName,
  threshold: number = forceTheme.defaultThreshold
): string {
  const scaled = joint === "GRIP" ? Math.abs(value) * forceTheme.gripVisualMultiplier : Math.abs(value)
  const frac = scaled / threshold
  if (frac < forceTheme.thresholdGreen) return forceTheme.colorGreen
  if (frac < forceTheme.thresholdYellow) return forceTheme.colorYellow
  return forceTheme.colorRed
}

/**
 * Returns the bar fill height (0..maxHeight) for a torque value.
 * Clamped to [0, maxHeight]; GRIP gets the visual multiplier applied.
 */
export function barHeightForTorque(
  value: number,
  joint: JointName,
  maxHeight: number,
  threshold: number = forceTheme.defaultThreshold
): number {
  const scaled = joint === "GRIP" ? Math.abs(value) * forceTheme.gripVisualMultiplier : Math.abs(value)
  const frac = Math.min(1, scaled / threshold)
  return frac * maxHeight
}

/**
 * Block Resistance Index — `|GRIP| × sqrt(ELB² + W2² + W3²)`.
 * Matches the dashboard's formula. Higher = more contact resistance.
 * Joints array is in JOINT_NAMES order (8 floats).
 */
export function blockResistanceIndex(joints: number[]): number {
  if (joints.length < 8) return 0
  const elb = joints[3] ?? 0
  const w2 = joints[5] ?? 0
  const w3 = joints[6] ?? 0
  const grip = joints[7] ?? 0
  return Math.abs(grip) * Math.sqrt(elb * elb + w2 * w2 + w3 * w3)
}
