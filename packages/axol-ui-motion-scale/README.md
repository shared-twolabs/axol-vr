# @almond/axol-ui-motion-scale

Motion-scale panel + sphere-calibration gesture for the axol-vr WebXR scene.

Lets the operator set the teleop motion multiplier two ways:

1. A log-spaced slider in a floating panel (0.25× → 4.0×, 10 stops at
   0.25, 0.35, 0.5, 0.7, 1.0, 1.4, 2.0, 2.8, 4.0).
2. A "Calibrate" gesture where they spread both controllers; a
   translucent yellow sphere appears between them whose diameter is
   the controller separation. Diameter is interpreted as their
   comfortable arm reach, and the resulting scale is
   `ROBOT_ARM_REACH / diameter` (clamped to the slider range).

Built on `@almond/axol-ui` (peer dep) and feeds `@almond/axol-vr-client`'s
`motionScale` prop (also a peer dep — ref-pattern, so live updates without
remount).

## Install

```sh
npm install @almond/axol-ui-motion-scale
```

This package declares these as peer dependencies:

- `@almond/axol-ui`
- `@almond/axol-vr-client`
- `@react-three/fiber`
- `@react-three/xr`
- `react`
- `three`

## Exports

- `motionScaleWindow` — a `WindowDef` ready to pass into
  `WindowManager`'s `windows` array.
- `MotionScalePanel` — the panel body component (used internally by
  `motionScaleWindow`, exported for tests/custom layouts).
- `SphereCalibrator` — R3F component you render as a sibling of
  `WindowManager` inside `<XR>`. Renders nothing when not calibrating.
- `useMotionScale()` — hook returning the shared store
  (`{ motionScale, isCalibrating, setMotionScale, resetMotionScale,
  startCalibration, finishCalibration, cancelCalibration }`).
- Helpers: `ROBOT_ARM_REACH`, `SCALE_STOPS`, `SCALE_MIN`, `SCALE_MAX`,
  `SCALE_DEFAULT`, `clampScale`, `snapScale`, `positionToScale`,
  `scaleToPosition`.

## Usage

```tsx
import { Canvas } from "@react-three/fiber"
import { XR, createXRStore } from "@react-three/xr"
import { AxolVRClient } from "@almond/axol-vr-client"
import { WindowManager } from "@almond/axol-ui"
import {
  motionScaleWindow,
  SphereCalibrator,
  useMotionScale,
} from "@almond/axol-ui-motion-scale"

const store = createXRStore({ controller: { model: false } })

function VRClient({ wsRef }: { wsRef: React.RefObject<WebSocket | null> }) {
  const { motionScale } = useMotionScale()
  return <AxolVRClient wsRef={wsRef} motionScale={motionScale} />
}

export default function App({ wsRef }: { wsRef: React.RefObject<WebSocket | null> }) {
  return (
    <Canvas>
      <XR store={store}>
        <VRClient wsRef={wsRef} />
        <WindowManager windows={[motionScaleWindow]} />
        <SphereCalibrator />
      </XR>
    </Canvas>
  )
}
```

## Why motion-scale matters

The operator's controllers occasionally drop out of headset tracking. On
re-entry the reported positions are offset from where the operator
expects them, so they end up making large arm motions to drive the robot
— which compounds the drift. Setting `motion_scale < 1.0` means a small
VR motion maps to a LARGER robot motion, keeping the operator inside
their natural arm range.

The sphere gesture lets the operator define what "natural arm range"
means with their body — spread the controllers to where comfortable
extension feels, hit Confirm, and the scale is
`ROBOT_ARM_REACH / diameter` (with `ROBOT_ARM_REACH = 0.6m` per the
robot spec).

## Controller bindings (and why we don't use thumbstick clicks)

This package adds **zero** new controller bindings. Confirmation and
cancellation of a calibration are done from the panel buttons.

We considered binding R/L thumbstick clicks to confirm/cancel while
calibrating. Two reasons we didn't:

1. R thumbstick click is already bound to "reset layout" and L
   thumbstick click is bound to "toggle picker" in `@almond/axol-ui`'s
   `useControllerInput`. Suppressing those bindings only while
   calibrating would require either changes inside that package
   (cross-package coupling) or a parallel `useFrame` reading the
   gamepad before `useControllerInput` does — both fragile.
2. The panel-button path is simpler, works with the controller raycast
   that's already pointing at the panel, and stays out of the recording
   bindings owned by `@almond/axol-vr-client`. The README spec
   recommends panel-buttons unless override is trivial; it wasn't.

If a controller-click override becomes desirable later (e.g. operator
feedback that reaching to a panel breaks calibration flow), the cleanest
path is to extend `useControllerInput` in `@almond/axol-ui` with a
"mode" parameter that callers can register handlers under, then check
the current mode before dispatching the default handler.

## Persistence

The current `motionScale` value is persisted to `localStorage` under
the key `axol-ui.motion-scale` on a 500ms debounce. The
`isCalibrating` flag is transient and not persisted.

## API surface

See `src/index.ts` for the typed barrel. Downstream wiring depends on:

- The shape of `motionScaleWindow` (a `WindowDef` from
  `@almond/axol-ui`)
- The signature of `useMotionScale()` (see `MotionScaleStore`)
- `SphereCalibrator` rendering nothing when `isCalibrating === false`
