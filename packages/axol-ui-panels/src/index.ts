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
//   - each panel exported by name so consumers can compose custom catalogs

import type { WindowDef } from "@almond/axol-ui"

import { CamerasPanel } from "./panels/CamerasPanel"
import { PreflightPanel } from "./panels/PreflightPanel"
import { SyncClocksPanel } from "./panels/SyncClocksPanel"
import { ZedStreamPanel } from "./panels/ZedStreamPanel"
import { TeleopPanel } from "./panels/TeleopPanel"
import { CollectDataPanel } from "./panels/CollectDataPanel"
import { TakesPanel } from "./panels/TakesPanel"
import { SystemPanel } from "./panels/SystemPanel"

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

export { CamerasPanel } from "./panels/CamerasPanel"
export { PreflightPanel } from "./panels/PreflightPanel"
export { SyncClocksPanel } from "./panels/SyncClocksPanel"
export { ZedStreamPanel } from "./panels/ZedStreamPanel"
export { TeleopPanel } from "./panels/TeleopPanel"
export { CollectDataPanel } from "./panels/CollectDataPanel"
export { TakesPanel } from "./panels/TakesPanel"
export { SystemPanel } from "./panels/SystemPanel"

/**
 * Default 3×3-ish grid of panels in front of the operator. Drop this array
 * directly into `<WindowManager windows={dashboardWindows} />` or merge with
 * other catalogs (e.g. quebec-1's motion-scale panel) to compose a custom
 * scene.
 *
 * Positions are world-space metres relative to the headset origin.
 * Sizes are world-space metres (width, height).
 */
export const dashboardWindows: WindowDef[] = [
  {
    id: "cameras",
    title: "Cameras",
    icon: "📷",
    defaultOpen: true,
    defaultPosition: [-0.5, 1.6, -0.8],
    defaultSize: [0.6, 0.45],
    Body: CamerasPanel,
  },
  {
    id: "preflight",
    title: "Preflight",
    icon: "🚦",
    defaultOpen: true,
    defaultPosition: [0.5, 1.6, -0.8],
    defaultSize: [0.4, 0.35],
    Body: PreflightPanel,
  },
  {
    id: "sync-clocks",
    title: "Sync Clocks",
    icon: "🕐",
    defaultPosition: [0.0, 1.2, -0.8],
    defaultSize: [0.4, 0.3],
    Body: SyncClocksPanel,
  },
  {
    id: "zed-stream",
    title: "ZED Stream",
    icon: "📡",
    defaultPosition: [-0.5, 1.2, -0.8],
    defaultSize: [0.4, 0.25],
    Body: ZedStreamPanel,
  },
  {
    id: "teleop",
    title: "Teleop",
    icon: "🦾",
    defaultPosition: [0.5, 1.2, -0.8],
    defaultSize: [0.4, 0.3],
    Body: TeleopPanel,
  },
  {
    id: "collect-data",
    title: "Collect Data",
    icon: "💾",
    defaultPosition: [0.0, 0.9, -0.8],
    defaultSize: [0.45, 0.4],
    Body: CollectDataPanel,
  },
  {
    id: "takes",
    title: "Takes",
    icon: "🎬",
    defaultPosition: [-0.5, 0.9, -0.8],
    defaultSize: [0.5, 0.5],
    Body: TakesPanel,
  },
  {
    id: "system",
    title: "System",
    icon: "📊",
    defaultPosition: [0.5, 0.9, -0.8],
    defaultSize: [0.4, 0.25],
    Body: SystemPanel,
  },
]
