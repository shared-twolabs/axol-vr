# @almond/axol-ui-force-hud

Head-locked Force HUD for the axol-vr WebXR scene. Shows live per-arm
joint torques as bars riding at the top of the operator's vision — so
they can feel resistance through their eyes while the gripper pokes
blocks (Jenga prep, contact-rich manipulation).

## What it shows

For each arm:

- **8 vertical bars** — one per joint in axol's `Joint` enum order
  (`S1, S2, S3, ELB, W1, W2, W3, GRIP`). Bar height ∝ `|torque| /
  threshold`, color-graded green (< 30 %) → yellow (30–70 %) → red
  (> 70 %).
- **Per-bar value text** — signed torque to 3 decimals (clamped to
  `99+` for display stability).
- **Joint label** below each bar (`S1`, `ELB`, …).
- **GRIP sparkline** — 5 s ring buffer at 30 Hz (`historyDepth=150`),
  downsampled to 60 visual points. The GRIP trace is the most
  contact-sensitive channel; we plot it because it's the closest thing
  to a "you're touching something" signal.
- **Block Resistance Index pill** — `|GRIP| × sqrt(ELB² + W2² + W3²)`,
  matches the dashboard formula. Useful as an "am I about to topple a
  block" cue.

A small connection dot in the top-right turns dim when the publisher
isn't running. When disconnected, bars dim and the BRI shows `BRI —`.

## Data source

This component opens an `EventSource` against
`/api/torques/stream` (proxied by `app/vite.config.ts` to the
dashboard FastAPI on `:8080`). The stream emits one JSON sample per
line at ~30 Hz:

```json
{ "ts": 1716938512.123, "left": [8 floats], "right": [8 floats] }
```

Heartbeats with `{ "reason": "no-file" }` mean the upstream JSONL feed
at `/dev/shm/axol_torque.jsonl` isn't being written. The HUD treats
those as "0 across all joints, dimmed" — no zero-pad into the
sparkline history so it stays continuous on publisher restart.

## Install

```sh
npm install @almond/axol-ui-force-hud
```

Peer deps: `@almond/axol-ui`, `@react-three/drei`, `@react-three/fiber`,
`@react-three/xr`, `react`, `three`.

## Usage

```tsx
import { Canvas } from "@react-three/fiber"
import { XR, createXRStore } from "@react-three/xr"
import { ForceHUD } from "@almond/axol-ui-force-hud"

const store = createXRStore({ controller: { model: false } })

function MyXRHud({ children }) {
  // Head-locking pattern — copy from app/src/App.tsx's XRHud.
  return <group>{children}</group>
}

export default function App() {
  return (
    <Canvas>
      <XR store={store}>
        <MyXRHud>
          <ForceHUD />
        </MyXRHud>
      </XR>
    </Canvas>
  )
}
```

## Props

```ts
interface ForceHUDProps {
  /** SSE endpoint. Defaults to `/api/torques/stream` (Vite-proxied). */
  url?: string
  /** Per-joint torque threshold (single value, both arms share). */
  threshold?: number // default 1.5
  /** Visibility (parent controls toggling). */
  visible?: boolean // default true
  /** Ring-buffer depth for sparkline history. */
  historyDepth?: number // default 150 (5s @ 30Hz)
}
```

## Exports

- `ForceHUD` — the R3F component, intended for mount inside an XRHud.
- `useForceStream(url, historyDepth)` — the SSE hook returning live
  refs + `connected` + `lastError`. Use this directly if you want to
  consume the feed without rendering the bars.
- `forceTheme`, `theme` — color + sizing constants.
- `JOINT_NAMES` — readonly tuple of joint labels.
- `barHeightForTorque(value, joint, maxHeight, threshold)` — clamps a
  torque to a bar fill height.
- `colorForTorque(value, joint, threshold)` — returns the threshold-tier
  color hex.
- `blockResistanceIndex(jointsArray)` — the `|GRIP| × sqrt(…)` formula.

## Performance contract

Bars, sparklines, and per-bar numeric text update every animation
frame via a single `useFrame`. The hot path reads ring-buffer refs
directly and mutates `THREE.Mesh.scale.y`, `LineBasicMaterial.color`,
and troika's `.text` field imperatively — no React re-renders at 30
Hz. The only React updates are:

1. The 1 s `connected` indicator (mounted once, cheap).
2. Last-error message (only when something changes).

This keeps the XR frame budget intact even on a saturated stream.

## Data format & joint order

The `left` / `right` arrays MUST be 8 floats in axol's `Joint` enum
order: `[S1, S2, S3, ELB, W1, W2, W3, GRIP]`. Reorder upstream if your
publisher emits a different order.

## Calibration notes (heterogeneous motors)

The axol arm mixes motor families: Damiao actuators report Nm
directly; MyActuator reports current in A. We don't apply per-joint
unit conversion at HUD time — instead the operator picks a single
`threshold` that gives a usable visual envelope. GRIP gets a baked-in
3× visual multiplier (`forceTheme.gripVisualMultiplier`) because the
raw GRIP value is smaller than the other joints by roughly that
factor.

If you wire in per-joint conversion later, the cleanest extension is
to accept a `thresholds: number[]` prop and use it inside
`colorForTorque` / `barHeightForTorque`.

## Controller toggle (not implemented yet)

The spec floated R thumbstick UP → toggle HUD visibility, with state
persisted to `localStorage["axol-ui-force-hud.visible"]`. Not wired
in this initial drop — `useControllerInput` lives in `@almond/axol-ui`
and routing a new binding through it cleanly needs a small API
extension. The HUD is visible by default; toggle from a parent
component via the `visible` prop.

## Why a head-locked HUD?

Operators look at the world to drive the robot, not at a panel. The
HUD floats at the top of vision (`+0.10 m` y-offset) — visible with
a quick upward glance, out of the way otherwise. Color thresholds and
the GRIP sparkline put the most-actionable cue (am I touching
something?) in the most-visible spot.
