// @almond/axol-ui — types
// scaffolder-alpha: window-manager public types
import type { ComponentType } from "react"

export type WindowId = string

export interface WindowDef {
  id: WindowId
  title: string
  /** Unicode glyph or one-character label used in the picker tile. */
  icon?: string
  /** World-space position in metres, applied on first registration. */
  defaultPosition?: [number, number, number]
  /** Width / height in metres. */
  defaultSize?: [number, number]
  /** 0.2 .. 1.0. Defaults to 0.85. */
  defaultOpacity?: number
  /** Whether the window is open the first time the catalog is registered. */
  defaultOpen?: boolean
  /** Reserved for future use — picker tile may show a resize hint. */
  resizable?: boolean
  /**
   * Body component rendered inside the panel.
   * Receives the inner width / height in metres so the consumer can lay out
   * children with uikit `<Container>` flex.
   */
  Body: ComponentType<{ width: number; height: number }>
}

export interface WindowState {
  id: WindowId
  open: boolean
  position: [number, number, number]
  size: [number, number]
  opacity: number
  zOrder: number
}

/**
 * Per-frame snapshot of controller input drawn from `useXR().controllers`.
 * Consumers don't usually touch this directly — `useControllerInput` produces
 * derived debounced events the manager consumes.
 */
export interface ControllerInputSnapshot {
  /** L thumbstick X axis, raw -1..1 */
  leftThumbX: number
  /** L thumbstick Y axis, raw -1..1 */
  leftThumbY: number
  /** L thumbstick click — true on the rising edge of the press */
  leftThumbClickEdge: boolean
  /** R thumbstick click — true on the rising edge of the press */
  rightThumbClickEdge: boolean
  /** R trigger value 0..1 */
  rightTrigger: number
  /** R trigger pressed-edge */
  rightTriggerEdge: boolean
  /** Pose of the right controller in world space, if available */
  rightTargetRayPose: {
    position: [number, number, number]
    quaternion: [number, number, number, number]
  } | null
}

/** Layout payload stored to localStorage. */
export interface StoredLayoutV1 {
  version: 1
  windows: WindowState[]
}
