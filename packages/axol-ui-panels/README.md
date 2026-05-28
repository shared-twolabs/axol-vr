# @almond/axol-ui-panels

Floating dashboard panels for the axol-vr WebXR scene. Each panel is a
`WindowDef` consumed by `@almond/axol-ui`'s `WindowManager`. Bodies poll
the FastAPI dashboard server (default same-origin) for live data —
camera frames, sync-clock status, teleop control, episode curation, etc.

## Install

```sh
npm install @almond/axol-ui-panels @almond/axol-ui @react-three/uikit
```

Peer deps: `@react-three/fiber`, `@react-three/xr`, `react`, `three`.

## Usage

```tsx
import { Canvas } from "@react-three/fiber"
import { XR, createXRStore } from "@react-three/xr"
import { WindowManager } from "@almond/axol-ui"
import { dashboardWindows } from "@almond/axol-ui-panels"

const store = createXRStore({ controller: { model: false } })

export default function App() {
  return (
    <Canvas>
      <XR store={store}>
        <WindowManager windows={dashboardWindows} />
      </XR>
    </Canvas>
  )
}
```

## Panels

| id | Polls | Endpoints |
|---|---|---|
| `cameras` | 10 Hz JPEG, 1 Hz status | `/api/rerun/frame/{cam}`, `/api/rerun/status` |
| `preflight` | 1 Hz | `/api/status` |
| `sync-clocks` | 1 Hz | `/api/zed-sync-clocks/status` + start/stop |
| `zed-stream` | 1 Hz (read-only) | `/api/status` (zed_stream sub-field) |
| `teleop` | 1 Hz | `/api/status` + start/stop |
| `collect-data` | 1 Hz | `/api/status` + start/stop |
| `takes` | 2 Hz | `/api/takes/{owner}/{name}` + status |
| `system` | 1 Hz | `/api/system` |

## Base URL

Panels resolve the FastAPI base URL via:

1. `import.meta.env.VITE_DASHBOARD_BASE_URL` — explicit override
2. Empty string — same-origin (production bundle served by FastAPI;
   dev mode via vite proxy)

The consuming app's `vite.config.ts` must proxy `/api/*` and `/info/*`
to the dashboard server in dev. See repo root for the working example.

## Persistence

Per-panel inputs (e.g. CollectDataPanel's `repo_id` and `task`) persist
to localStorage under namespaced keys: `axol-ui-panels.<panel-id>.<field>`.

## Defensive contract

- Fetches are bound to an `AbortController` per panel lifetime.
- Polling stops when the panel is unmounted (closed window unmounts).
- A 404 once → "endpoint unavailable" and stop retrying that URL.
- Empty/null JSON → "no data yet" placeholder, never crash.

## Stability

Treat the `dashboardWindows` array shape and individual panel ids as
stable. Adding new panels is a minor bump; renaming an existing id is
a breaking change (it invalidates the localStorage layout entry).
