// @almond/axol-ui-motion-scale — public API barrel
// quebec-1

import type { WindowDef } from "@almond/axol-ui"
import { MotionScalePanel } from "./MotionScalePanel"

export { useMotionScale } from "./useMotionScale"
export type { MotionScaleStore } from "./useMotionScale"

export { SphereCalibrator } from "./SphereCalibrator"
export { MotionScalePanel } from "./MotionScalePanel"

export {
  ROBOT_ARM_REACH,
  SCALE_DEFAULT,
  SCALE_MAX,
  SCALE_MIN,
  SCALE_STOPS,
  clampScale,
  positionToScale,
  scaleToPosition,
  snapScale,
} from "./theme"

/**
 * Drop-in WindowDef for `WindowManager`. Pass alongside scaffolder-alpha's
 * window list and it will appear in the picker as the "Motion Scale" tile.
 */
export const motionScaleWindow: WindowDef = {
  id: "motion-scale",
  title: "Motion Scale",
  icon: "🎚",
  defaultOpen: false,
  defaultPosition: [0, 1.2, -0.8],
  defaultSize: [0.35, 0.3],
  Body: MotionScalePanel,
}
