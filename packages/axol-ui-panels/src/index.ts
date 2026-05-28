// @almond/axol-ui-panels — public barrel
// papa-1
//
// Exports:
//   - dashboardWindows: WindowDef[]  — the panel catalog consumed by
//     @almond/axol-ui's WindowManager
//   - api helpers (getApiBase / postForm / getJson) for other packages that
//     want to talk to the FastAPI dashboard
//   - useEndpointPolling / useLocalStorageState hooks
//   - panelTheme tokens
//   - widgets (Btn, Pill, Row, Col, etc.) for downstream panel authors
//
// Panel implementations are filled in by subsequent commits.

import type { WindowDef } from "@almond/axol-ui"

export {
  getApiBase,
  useApiBase,
  getJson,
  postForm,
  ApiError,
  isNotFound,
  bustedFrameUrl,
} from "./api"
export type { CallOptions } from "./api"
export { useEndpointPolling } from "./useEndpointPolling"
export type { PollingResult, PollingOptions } from "./useEndpointPolling"
export { useLocalStorageState } from "./useLocalStorageState"
export { panelTheme } from "./theme"
export type { PanelTheme } from "./theme"
export * from "./widgets"

// Placeholder until each panel module is added — populated by the final
// commit in this series.
export const dashboardWindows: WindowDef[] = []
