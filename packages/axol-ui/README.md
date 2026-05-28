# @almond/axol-ui

Floating-window UI for the axol-vr WebXR scene. Provides a `WindowManager`
component, a controller-driven picker overlay, drag-and-drop floating
panels, and a layout-persistence layer.

Built on `@react-three/uikit` for flexbox-in-R3F panels. Designed to live
alongside `@almond/axol-vr-client` without colliding on any of axol-vr's
recording controller bindings (A/B/X/Y, grips, triggers).

## Install

```sh
npm install @almond/axol-ui @react-three/uikit
```

This package declares `@react-three/fiber`, `@react-three/xr`, `react`, and
`three` as peer dependencies.

## Exports

- `WindowManager` — top-level component, drop inside `<XR>`
- `FloatingPanel` — single window (consumers rarely use directly)
- `WindowPicker` — picker overlay (rendered by `WindowManager`)
- `useWindowRegistry` — registry of registered window defs + live states
- `useControllerInput` — sample VR controllers per frame
- `useLayoutPersistence` — debounced localStorage save/restore
- `theme` — shared palette/typography constants
- Types: `WindowId`, `WindowDef`, `WindowState`, `WindowRegistry`,
  `StoredLayoutV1`, `ControllerInputCallbacks`

## Usage

```tsx
import { Canvas } from "@react-three/fiber"
import { XR, createXRStore } from "@react-three/xr"
import { Container, Text } from "@react-three/uikit"
import { AxolVRClient } from "@almond/axol-vr-client"
import { WindowManager } from "@almond/axol-ui"

const store = createXRStore({ controller: { model: false } })

function CameraPanel({ width, height }: { width: number; height: number }) {
  return (
    <Container width={width} height={height} flexDirection="column" padding={0.01}>
      <Text fontSize={0.012}>Cameras</Text>
      {/* …MJPEG plane / status pills go here… */}
    </Container>
  )
}
function StatusPanel({ width, height }: { width: number; height: number }) {
  return (
    <Container width={width} height={height} padding={0.01}>
      <Text fontSize={0.012}>Status</Text>
    </Container>
  )
}
function MotionScalePanel({ width, height }: { width: number; height: number }) {
  return (
    <Container width={width} height={height} padding={0.01}>
      <Text fontSize={0.012}>Motion Scale</Text>
    </Container>
  )
}

const windows = [
  { id: "cameras", title: "Cameras", icon: "📷", Body: CameraPanel, defaultOpen: true },
  { id: "status", title: "Status", icon: "●", Body: StatusPanel },
  { id: "motion", title: "Motion Scale", icon: "↕", Body: MotionScalePanel },
]

export default function App() {
  return (
    <Canvas>
      <XR store={store}>
        <AxolVRClient {/* …connection props… */} />
        <WindowManager windows={windows} />
      </XR>
    </Canvas>
  )
}
```

## Controller bindings

Picker bindings (do NOT collide with axol-vr-client's recording bindings):

- **L thumbstick click** — toggle picker overlay open/closed
- **L thumbstick X axis** — scroll picker focus (deadzone 0.5, 200ms debounce)
- **L thumbstick Y axis** — live-adjust focused window's opacity (0.2–1.0)
- **R thumbstick click** — reset all windows to default layout
- **R trigger** + tile click — toggle that window open/closed
- **Pointer-down on a panel header** — drag the panel to a new world position

## Persistence

Layout state (per-window open/closed, position, opacity) is debounce-saved
to `localStorage` under the key `axol-ui-layout-v1`. Override the key per
scene via `<WindowManager layoutStorageKey="…" />`.

The storage schema is versioned. When the API changes in a way that breaks
older payloads, bump the version number (and key) in `src/types.ts`.

## API surface

See `src/types.ts` and the barrel `src/index.ts` for the full TypeScript
surface. Downstream implementers depend on the shape of `WindowDef`,
`WindowState`, and `WindowManagerProps` — treat those as stable.
