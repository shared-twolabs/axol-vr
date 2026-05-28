// @almond/axol-ui — public API barrel
// scaffolder-alpha
export { WindowManager } from "./WindowManager"
export type { WindowManagerProps } from "./WindowManager"
export { FloatingPanel } from "./FloatingPanel"
export type { FloatingPanelProps } from "./FloatingPanel"
export { WindowPicker } from "./WindowPicker"
export type { WindowPickerProps } from "./WindowPicker"

export { useWindowRegistry } from "./hooks/useWindowState"
export type { WindowRegistry } from "./hooks/useWindowState"
export { useControllerInput } from "./hooks/useControllerInput"
export type { ControllerInputCallbacks } from "./hooks/useControllerInput"
export { useLayoutPersistence } from "./hooks/useLayoutPersistence"
export type { LayoutPersistenceOptions } from "./hooks/useLayoutPersistence"

export { theme } from "./theme"
export type { Theme } from "./theme"

export type {
  WindowId,
  WindowDef,
  WindowState,
  ControllerInputSnapshot,
  StoredLayoutV1,
} from "./types"
