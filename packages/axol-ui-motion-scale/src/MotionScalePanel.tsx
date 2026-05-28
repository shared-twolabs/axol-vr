// @almond/axol-ui-motion-scale — MotionScalePanel
// quebec-1: panel body rendered by WindowManager.
//
// Layout (top → bottom):
//  1. Big readout: "0.75×"
//  2. Slider track (drag thumb on a log-spaced 0.25..4.0 axis)
//  3. Stop-tick row below the slider
//  4. Row of action buttons: [Reset] [Calibrate]   (steady state)
//                            [Cancel] [Confirm]    (during calibration)
//
// Confirmation of calibration is done from the panel (panel-button path)
// rather than via controller-click override — see README for rationale.

import { useCallback, useRef, useState } from "react"
import * as THREE from "three"
import { Container, Text } from "@react-three/uikit"
import type { ThreeEvent } from "@react-three/fiber"
import { SCALE_STOPS, positionToScale, scaleToPosition, snapScale, theme } from "./theme"
import { useMotionScale } from "./useMotionScale"

interface BodyProps {
  width: number
  height: number
}

// Last-known live diameter from the calibrator. We stash it on a module
// singleton so the panel's "Confirm" button knows what to commit. The
// SphereCalibrator writes it every frame; nothing else reads it.
//
// tango-1: stale-frame guard. If both controllers drop tracking right
// before Confirm, the SphereCalibrator's useFrame early-returns and this
// ref retains the last good value. We track `lastUpdatedFrame` against a
// shared `currentFrame` (bumped EVERY frame regardless of pose validity)
// and treat a diameter as stale once the gap exceeds the threshold.
// `__getLiveDiameter` returns null in that case; the Confirm button is a
// no-op on null.
//
// STALE_FRAMES_THRESHOLD = 12 frames ≈ 167ms at 72Hz / 133ms at 90Hz —
// fast enough to feel responsive, slow enough to tolerate one or two
// missed-frame blips during normal tracking.
const STALE_FRAMES_THRESHOLD = 12
const liveDiameterRef = {
  diameter: 0,
  lastUpdatedFrame: 0,
  currentFrame: 0,
}
export function __setLiveDiameter(d: number, frame: number) {
  liveDiameterRef.diameter = d
  liveDiameterRef.lastUpdatedFrame = frame
}
export function __bumpFrame(): number {
  liveDiameterRef.currentFrame += 1
  return liveDiameterRef.currentFrame
}
export function __resetLiveDiameter() {
  liveDiameterRef.diameter = 0
  liveDiameterRef.lastUpdatedFrame = 0
}
/**
 * Returns the last published diameter, or null if no fresh reading has
 * arrived in the last STALE_FRAMES_THRESHOLD frames (e.g. both controllers
 * lost tracking). Callers should treat null as "no valid reading".
 */
export function __getLiveDiameter(): number | null {
  const gap = liveDiameterRef.currentFrame - liveDiameterRef.lastUpdatedFrame
  if (liveDiameterRef.lastUpdatedFrame === 0) return null
  if (gap > STALE_FRAMES_THRESHOLD) return null
  return liveDiameterRef.diameter
}

export function MotionScalePanel({ width, height }: BodyProps) {
  const {
    motionScale,
    isCalibrating,
    setMotionScale,
    resetMotionScale,
    startCalibration,
    finishCalibration,
    cancelCalibration,
  } = useMotionScale()

  const pad = 0.012
  const innerW = Math.max(0.05, width - pad * 2)

  return (
    <Container
      width={width}
      height={height}
      flexDirection="column"
      alignItems="center"
      justifyContent="space-between"
      paddingX={pad}
      paddingY={pad}
      gap={pad * 0.5}
    >
      {/* Readout */}
      <Container flexDirection="column" alignItems="center" gap={pad * 0.2}>
        <Text fontSize={theme.fontTitle * 1.6} color={theme.text}>
          {formatScale(motionScale)}
        </Text>
        <Text fontSize={theme.fontHint} color={theme.subtleText}>
          {isCalibrating ? "calibrating — spread your controllers" : "motion scale"}
        </Text>
      </Container>

      {/* Slider — visible always; during calibration the thumb floats
          at the *live* scale so the operator sees what they'd commit. */}
      <Slider
        width={innerW * 0.95}
        scale={motionScale}
        onScrub={(v) => setMotionScale(snapScale(v))}
        disabled={isCalibrating}
      />

      {/* Buttons row */}
      <Container
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        gap={pad * 0.6}
        width={innerW}
      >
        {isCalibrating ? (
          <>
            <ActionButton label="Cancel" tone="neutral" onClick={cancelCalibration} />
            <ActionButton
              label="Confirm"
              tone="accent"
              onClick={() => {
                // tango-1: __getLiveDiameter() returns null if tracking
                // dropped >12 frames ago; in that case Confirm is a no-op
                // (the operator should retry by reaching again).
                const d = __getLiveDiameter()
                if (d == null) return
                finishCalibration(d)
              }}
            />
          </>
        ) : (
          <>
            <ActionButton label="Reset 1.0×" tone="neutral" onClick={resetMotionScale} />
            <ActionButton label="Calibrate" tone="accent" onClick={startCalibration} />
          </>
        )}
      </Container>
    </Container>
  )
}

function formatScale(s: number): string {
  if (s >= 1) return `${s.toFixed(2)}×`
  return `${s.toFixed(2)}×`
}

// ---- Slider ----

interface SliderProps {
  width: number
  scale: number
  onScrub: (newScale: number) => void
  disabled?: boolean
}

const TRACK_HEIGHT = 0.014
const THUMB_SIZE = 0.02
const TICK_HEIGHT = 0.004
const ROW_HEIGHT = THUMB_SIZE + TICK_HEIGHT + 0.006

function Slider({ width, scale, onScrub, disabled }: SliderProps) {
  // The slider position 0..1
  const position = scaleToPosition(scale)
  // Local drag state — we need a stable ref so pointermove dispatches keep working.
  const draggingRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)

  // Track left edge (relative to the track group origin which is centered).
  const halfW = width / 2

  // Convert a world-space pointer event hitting the track into a scale value.
  // The track plane is centered at the group origin, so e.point.x is the
  // hit x in the track's local frame (uikit positions Container with its
  // own transform — to be robust we instead compute from the thumb itself).
  // We attach onPointerDown / Move / Up to a thin Three.js mesh that
  // underlays the uikit row, so the math stays local.

  const trackMeshRef = useRef<THREE.Mesh>(null)

  const localXToScale = useCallback(
    (worldPoint: THREE.Vector3) => {
      const mesh = trackMeshRef.current
      if (!mesh) return scale
      const local = mesh.worldToLocal(worldPoint.clone())
      const p = (local.x + halfW) / width
      return snapScale(positionToScale(Math.min(1, Math.max(0, p))))
    },
    [halfW, scale, width]
  )

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (disabled) return
      e.stopPropagation()
      draggingRef.current = true
      pointerIdRef.current = e.pointerId
      ;(e.target as Element | undefined)?.setPointerCapture?.(e.pointerId)
      onScrub(localXToScale(e.point))
    },
    [disabled, localXToScale, onScrub]
  )

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!draggingRef.current) return
      if (pointerIdRef.current !== e.pointerId) return
      onScrub(localXToScale(e.point))
    },
    [localXToScale, onScrub]
  )

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (pointerIdRef.current === e.pointerId) {
      draggingRef.current = false
      pointerIdRef.current = null
      ;(e.target as Element | undefined)?.releasePointerCapture?.(e.pointerId)
    }
  }, [])

  const trackColor = disabled ? theme.subtleText : theme.subtleText
  const fillColor = disabled ? theme.dimText : theme.focusBorder
  const thumbColor = disabled ? theme.dimText : theme.text
  const fillWidth = width * Math.min(1, Math.max(0, position))

  return (
    <group>
      {/* Hit target — slightly taller than the visible track so VR raycasts land. */}
      <mesh
        ref={trackMeshRef}
        position={[0, 0, 0.001]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <planeGeometry args={[width, ROW_HEIGHT]} />
        <meshBasicMaterial
          color={theme.panelBg}
          transparent
          opacity={0.001}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Empty track */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[width, TRACK_HEIGHT]} />
        <meshBasicMaterial
          color={trackColor}
          transparent
          opacity={0.4}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Filled track */}
      <mesh position={[-halfW + fillWidth / 2, 0, 0.003]}>
        <planeGeometry args={[fillWidth, TRACK_HEIGHT]} />
        <meshBasicMaterial
          color={fillColor}
          transparent
          opacity={0.85}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Tick marks for each canonical stop */}
      {SCALE_STOPS.map((stop) => {
        const tx = -halfW + scaleToPosition(stop) * width
        return (
          <mesh key={stop} position={[tx, -TRACK_HEIGHT / 2 - TICK_HEIGHT, 0.003]}>
            <planeGeometry args={[0.0008, TICK_HEIGHT]} />
            <meshBasicMaterial
              color={theme.subtleText}
              transparent
              opacity={0.5}
              depthTest={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* Thumb */}
      <mesh position={[-halfW + position * width, 0, 0.004]}>
        <planeGeometry args={[THUMB_SIZE, THUMB_SIZE]} />
        <meshBasicMaterial
          color={thumbColor}
          transparent
          opacity={0.95}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ---- Action button ----

interface ActionButtonProps {
  label: string
  tone: "neutral" | "accent"
  onClick: () => void
}

function ActionButton({ label, tone, onClick }: ActionButtonProps) {
  const [hovered, setHovered] = useState(false)
  const bg = tone === "accent" ? theme.focusBorder : theme.tileFocusBg
  const fg = tone === "accent" ? theme.panelBg : theme.text
  const borderColor = hovered ? theme.focusBorder : theme.border
  return (
    <Container
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      paddingX={0.012}
      paddingY={0.006}
      backgroundColor={bg}
      borderColor={borderColor}
      borderWidth={hovered ? 0.0018 : 0.0008}
      borderRadius={0.004}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e: { stopPropagation?: () => void }) => {
        e.stopPropagation?.()
        onClick()
      }}
    >
      <Text fontSize={theme.fontBody} color={fg}>
        {label}
      </Text>
    </Container>
  )
}
