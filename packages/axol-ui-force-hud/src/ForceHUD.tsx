// @almond/axol-ui-force-hud — head-locked Force HUD
// yankee-1: renders per-arm torque bars + GRIP sparkline + Block
// Resistance Index pill, intended to be mounted inside <XRHud>.
//
// Performance contract
// --------------------
// Bars + sparklines update at frame rate via `useFrame` reading
// `useForceStream`'s refs directly — NO React re-renders in the hot
// path. The only React updates are (a) the once-per-second `connected`
// indicator and (b) the numeric value labels which we DO swap each
// frame via direct `Text` content updates against a ref (drei's <Text>
// is a r3f-managed troika object — its `text` prop is reassigned
// imperatively when we patch the ref's text).
//
// Layout (XRHud-local, metres)
// ----------------------------
//   Container at y = forceTheme.upY (= 0.10),  z = forceTheme.forwardZ (= -0.55)
//   Two arm groups, LEFT at x = -(rowWidth/2 + armGap/2),
//                   RIGHT at x = +(rowWidth/2 + armGap/2)
//   Each arm group:
//     - 8 vertical bars (one per joint)
//     - per-bar value text above
//     - per-bar joint label below
//     - sparkline strip below the labels (GRIP trace)
//     - "BRI" pill below the sparkline
//   Background plane behind both groups.

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import * as THREE from "three"
import {
  JOINT_NAMES,
  type JointName,
  barHeightForTorque,
  blockResistanceIndex,
  colorForTorque,
  forceTheme,
} from "./theme"
import { useForceStream, zeroJoints } from "./useForceStream"

/** Props for the ForceHUD. */
export interface ForceHUDProps {
  /** SSE endpoint. Defaults to `/api/torques/stream` (proxied to dashboard). */
  url?: string
  /** Override per-joint threshold (Nm/A) — both arms share. Defaults to 1.5. */
  threshold?: number
  /** Hide entirely when false (parent controls visibility / toggling). */
  visible?: boolean
  /** Ring-buffer depth for sparkline / history. Defaults to 150 (5s @ 30Hz). */
  historyDepth?: number
}

const SPARKLINE_POINTS = 60
const SPARKLINE_WINDOW_AMP_DEFAULT = 0.6 // Nm, sparkline +/- envelope

export function ForceHUD({
  url,
  threshold = forceTheme.defaultThreshold,
  visible = true,
  historyDepth = 150,
}: ForceHUDProps) {
  const { latestRef, historyLeftRef, historyRightRef, connected } = useForceStream(
    url,
    historyDepth
  )

  return (
    <group position={[0, forceTheme.upY, forceTheme.forwardZ]} visible={visible} renderOrder={998}>
      <BackgroundPlane />
      <ConnectionIndicator connected={connected} />

      <ArmHUD
        side="left"
        latestRef={latestRef}
        historyRef={historyLeftRef}
        threshold={threshold}
        xOffset={-(forceTheme.rowWidth / 2 + forceTheme.armGap / 2)}
      />
      <ArmHUD
        side="right"
        latestRef={latestRef}
        historyRef={historyRightRef}
        threshold={threshold}
        xOffset={+(forceTheme.rowWidth / 2 + forceTheme.armGap / 2)}
      />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

function BackgroundPlane() {
  const w = forceTheme.rowWidth * 2 + forceTheme.armGap + 0.02
  const h =
    forceTheme.valueHeight +
    forceTheme.barHeight +
    forceTheme.labelHeight +
    forceTheme.sparkHeight +
    forceTheme.fontBRI * 2 +
    0.02
  return (
    <mesh position={[0, 0, -0.002]} renderOrder={997}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        color={forceTheme.bgColor}
        transparent
        opacity={forceTheme.bgOpacity}
        depthTest={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Connection indicator (single dot in the top-right of the HUD)
// ---------------------------------------------------------------------------

function ConnectionIndicator({ connected }: { connected: boolean }) {
  const w = forceTheme.rowWidth * 2 + forceTheme.armGap + 0.02
  const h =
    forceTheme.valueHeight +
    forceTheme.barHeight +
    forceTheme.labelHeight +
    forceTheme.sparkHeight +
    forceTheme.fontBRI * 2 +
    0.02
  return (
    <mesh position={[w / 2 - 0.008, h / 2 - 0.008, 0.001]} renderOrder={1000}>
      <circleGeometry args={[0.003, 12]} />
      <meshBasicMaterial
        color={connected ? forceTheme.colorGreen : forceTheme.colorDim}
        depthTest={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Per-arm hud
// ---------------------------------------------------------------------------

interface ArmHUDProps {
  side: "left" | "right"
  latestRef: ReturnType<typeof useForceStream>["latestRef"]
  historyRef: ReturnType<typeof useForceStream>["historyLeftRef"]
  threshold: number
  xOffset: number
}

function ArmHUD({ side, latestRef, historyRef, threshold, xOffset }: ArmHUDProps) {
  // Bar mesh refs — one per joint. We mutate position/scale/color directly
  // in useFrame to avoid 30Hz React updates.
  const barRefs = useRef<(THREE.Mesh | null)[]>(JOINT_NAMES.map(() => null))
  // Value text refs — we update the `.text` field on troika directly.
  const valueTextRefs = useRef<(THREE.Object3D | null)[]>(JOINT_NAMES.map(() => null))
  // BRI text ref.
  const briTextRef = useRef<THREE.Object3D | null>(null)

  // Pre-compute per-bar x positions and color materials.
  const layout = useMemo(() => {
    const totalBarsWidth =
      JOINT_NAMES.length * forceTheme.barWidth + (JOINT_NAMES.length - 1) * forceTheme.barGap
    const leftEdge = -totalBarsWidth / 2
    const positions = JOINT_NAMES.map((_, i) => {
      const cx = leftEdge + i * (forceTheme.barWidth + forceTheme.barGap) + forceTheme.barWidth / 2
      return cx
    })
    return { positions, totalBarsWidth }
  }, [])

  // Pre-built sparkline geometry — vertices get mutated each frame.
  // We construct a THREE.Line directly and expose via <primitive> to avoid
  // the intrinsic `<line>` JSX collision with SVG's <line>.
  const { sparkLine, sparkGeometry } = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(SPARKLINE_POINTS * 3)
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.LineBasicMaterial({
      color: forceTheme.colorDim,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
      linewidth: 2,
    })
    const lineObj = new THREE.Line(geom, mat)
    lineObj.renderOrder = 1000
    return { sparkLine: lineObj, sparkGeometry: geom }
  }, [])

  // Per-frame: read torques, scale bars, update value text, redraw sparkline.
  useFrame(() => {
    const sample = latestRef.current
    const joints = sample != null ? (side === "left" ? sample.left : sample.right) : zeroJoints()

    // ---- Bars ----
    for (let i = 0; i < JOINT_NAMES.length; i++) {
      const mesh = barRefs.current[i]
      if (!mesh) continue
      const joint = JOINT_NAMES[i] as JointName
      const value = joints[i] ?? 0
      const fillH = barHeightForTorque(value, joint, forceTheme.barHeight, threshold)
      // Anchor bar at its bottom edge: position y = bottom + fillH/2,
      // scale y to fillH / barHeight (unit cube was barHeight tall).
      const barBottom = -forceTheme.barHeight / 2
      mesh.position.y = barBottom + fillH / 2
      mesh.scale.y = forceTheme.barHeight > 0 ? Math.max(0.0001, fillH / forceTheme.barHeight) : 1
      const mat = mesh.material as THREE.MeshBasicMaterial
      const color = sample == null ? forceTheme.colorDim : colorForTorque(value, joint, threshold)
      mat.color.set(color)
      mat.opacity = sample == null ? 0.35 : 0.95
    }

    // ---- Per-bar value text ----
    for (let i = 0; i < JOINT_NAMES.length; i++) {
      const txt = valueTextRefs.current[i] as (THREE.Object3D & { text?: string }) | null
      if (!txt) continue
      const v = joints[i] ?? 0
      const formatted = formatTorque(v)
      if (txt.text !== formatted) {
        txt.text = formatted
      }
    }

    // ---- BRI pill ----
    const bri = blockResistanceIndex(joints)
    const briTxt = briTextRef.current as (THREE.Object3D & { text?: string }) | null
    if (briTxt) {
      const next = sample == null ? "BRI —" : `BRI ${bri.toFixed(2)}`
      if (briTxt.text !== next) briTxt.text = next
    }

    // ---- Sparkline (GRIP trace) ----
    {
      const hist = historyRef.current
      // Downsample to SPARKLINE_POINTS.
      const stride = Math.max(1, Math.floor(hist.length / SPARKLINE_POINTS))
      const points: number[] = []
      for (let i = 0; i < hist.length; i += stride) {
        const j = hist[i]
        points.push(j?.[7] ?? 0) // GRIP index
      }
      // Pad/truncate to SPARKLINE_POINTS.
      while (points.length < SPARKLINE_POINTS) points.unshift(0)
      if (points.length > SPARKLINE_POINTS) points.splice(0, points.length - SPARKLINE_POINTS)

      const xStart = -forceTheme.rowWidth / 2
      const xEnd = forceTheme.rowWidth / 2
      const xStep = (xEnd - xStart) / (SPARKLINE_POINTS - 1)
      const amp = SPARKLINE_WINDOW_AMP_DEFAULT
      const positions = (sparkGeometry.attributes.position as THREE.BufferAttribute)
        .array as Float32Array
      for (let i = 0; i < SPARKLINE_POINTS; i++) {
        const x = xStart + i * xStep
        const raw = points[i] ?? 0
        const scaled = (raw * forceTheme.gripVisualMultiplier) / amp
        const y = Math.max(-1, Math.min(1, scaled)) * (forceTheme.sparkHeight / 2)
        positions[i * 3 + 0] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = 0
      }
      ;(sparkGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
      // Color the sparkline based on the most recent grip value.
      const tail = points[points.length - 1] ?? 0
      const tailColor =
        sample == null ? forceTheme.colorDim : colorForTorque(tail, "GRIP", threshold)
      const lineMat = sparkLine.material as THREE.LineBasicMaterial
      lineMat.color.set(tailColor)
      lineMat.opacity = sample == null ? 0.35 : 0.95
    }
  })

  // Vertical layout offsets (HUD-local, y growing up):
  //   value text:   y = barHeight/2 + valueHeight/2
  //   bars:         centered at y = 0
  //   joint label:  y = -barHeight/2 - labelHeight/2
  //   sparkline:    y = -barHeight/2 - labelHeight - sparkHeight/2
  //   BRI pill:     y = -barHeight/2 - labelHeight - sparkHeight - fontBRI/2
  //   heading:      y = +valueHeight + barHeight/2 + fontHeading
  const valueY = forceTheme.barHeight / 2 + forceTheme.valueHeight / 2
  const labelY = -forceTheme.barHeight / 2 - forceTheme.labelHeight / 2
  const sparkY = -forceTheme.barHeight / 2 - forceTheme.labelHeight - forceTheme.sparkHeight / 2
  const briY =
    -forceTheme.barHeight / 2 - forceTheme.labelHeight - forceTheme.sparkHeight - forceTheme.fontBRI
  const headingY = forceTheme.barHeight / 2 + forceTheme.valueHeight + forceTheme.fontHeading * 0.6

  return (
    <group position={[xOffset, 0, 0]}>
      {/* Heading */}
      <Text
        position={[0, headingY, 0.001]}
        fontSize={forceTheme.fontHeading}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        renderOrder={1000}
        material-depthTest={false}
        fontWeight="bold"
      >
        {side === "left" ? "LEFT ARM" : "RIGHT ARM"}
      </Text>

      {/* Bars */}
      {JOINT_NAMES.map((joint, i) => {
        const x = layout.positions[i] ?? 0
        return (
          <mesh
            key={`bar-${joint}`}
            ref={(m) => {
              barRefs.current[i] = m
            }}
            position={[x, 0, 0.001]}
            renderOrder={999}
          >
            <planeGeometry args={[forceTheme.barWidth, forceTheme.barHeight]} />
            <meshBasicMaterial
              color={forceTheme.colorDim}
              transparent
              opacity={0.35}
              depthTest={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* Per-bar value text */}
      {JOINT_NAMES.map((joint, i) => {
        const x = layout.positions[i] ?? 0
        return (
          <Text
            key={`val-${joint}`}
            ref={(t) => {
              valueTextRefs.current[i] = t
            }}
            position={[x, valueY, 0.001]}
            fontSize={forceTheme.fontValue}
            color="#e5e7eb"
            anchorX="center"
            anchorY="middle"
            renderOrder={1000}
            material-depthTest={false}
          >
            0.000
          </Text>
        )
      })}

      {/* Per-bar joint label */}
      {JOINT_NAMES.map((joint, i) => {
        const x = layout.positions[i] ?? 0
        return (
          <Text
            key={`lbl-${joint}`}
            position={[x, labelY, 0.001]}
            fontSize={forceTheme.fontLabel}
            color="#9ca3af"
            anchorX="center"
            anchorY="middle"
            renderOrder={1000}
            material-depthTest={false}
          >
            {joint}
          </Text>
        )
      })}

      {/* Sparkline (GRIP trace) — primitive sidesteps SVG-line JSX collision. */}
      <primitive object={sparkLine} position={[0, sparkY, 0.001]} />

      {/* BRI pill */}
      <Text
        ref={(t) => {
          briTextRef.current = t
        }}
        position={[0, briY, 0.001]}
        fontSize={forceTheme.fontBRI}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        renderOrder={1000}
        material-depthTest={false}
        fontWeight="bold"
      >
        BRI —
      </Text>
    </group>
  )
}

function formatTorque(v: number): string {
  // Show 3 decimals, signed. Clip extreme values for layout stability.
  const sign = v < 0 ? "-" : ""
  const abs = Math.abs(v)
  if (abs >= 100) return `${sign}99+`
  return `${sign}${abs.toFixed(3)}`
}
