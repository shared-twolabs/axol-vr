// @almond/axol-ui — FloatingPanel
// scaffolder-alpha: a single floating window.
//
// Uses @react-three/uikit's <Root> + <Container> for flex layout. We
// hand-render a header strip, drag handle area, opacity hint, close X,
// and an outline. The Body component supplied by the consumer is
// embedded under the header and receives inner width/height in metres.

import { useCallback, useRef } from "react"
import * as THREE from "three"
import { Container, Text } from "@react-three/uikit"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import type { WindowDef, WindowState } from "./types"
import { theme } from "./theme"

export interface FloatingPanelProps {
  state: WindowState
  def: WindowDef
  focused: boolean
  onClose: () => void
  onMove: (pos: [number, number, number]) => void
  onFocus?: () => void
}

export function FloatingPanel({
  state,
  def,
  focused,
  onClose,
  onMove,
  onFocus,
}: FloatingPanelProps) {
  const groupRef = useRef<THREE.Group>(null)
  // Drag state — pointer offset from panel origin in pointer-local frame.
  const dragRef = useRef<{
    active: boolean
    pointerId: number | null
    grabOffset: THREE.Vector3
  }>({ active: false, pointerId: null, grabOffset: new THREE.Vector3() })

  const [width, height] = state.size

  // Convert opacity (0..1) into a 5-segment ASCII slider hint for the header.
  const filled = Math.round(
    ((state.opacity - theme.minOpacity) / (theme.maxOpacity - theme.minOpacity)) * 5
  )
  const slider =
    "■".repeat(Math.max(0, Math.min(5, filled))) +
    "□".repeat(Math.max(0, 5 - Math.max(0, Math.min(5, filled))))

  // ---- Drag handler — invoked from the header pointer events ----
  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!groupRef.current) return
      e.stopPropagation()
      onFocus?.()
      const intersection = e.point
      const panelWorld = groupRef.current.getWorldPosition(new THREE.Vector3())
      dragRef.current = {
        active: true,
        pointerId: e.pointerId,
        grabOffset: panelWorld.sub(intersection),
      }
      ;(e.target as Element | undefined)?.setPointerCapture?.(e.pointerId)
    },
    [onFocus]
  )

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragRef.current.active) return
      if (dragRef.current.pointerId !== e.pointerId) return
      const next = e.point.clone().add(dragRef.current.grabOffset)
      onMove([next.x, next.y, next.z])
    },
    [onMove]
  )

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (dragRef.current.pointerId === e.pointerId) {
      dragRef.current.active = false
      dragRef.current.pointerId = null
      ;(e.target as Element | undefined)?.releasePointerCapture?.(e.pointerId)
    }
  }, [])

  // Sync state.position → group position
  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(state.position[0], state.position[1], state.position[2])
  })

  const headerH = theme.headerHeight
  const bodyH = Math.max(0.05, height - headerH)
  const Body = def.Body

  // Outline brightens when focused
  const outlineColor = focused ? theme.focusBorder : theme.border
  const outlineOpacity = focused ? 1.0 : 0.5

  return (
    <group ref={groupRef} renderOrder={state.zOrder}>
      {/* Outline — four thin planes around the perimeter */}
      <OutlineRect width={width} height={height} color={outlineColor} opacity={outlineOpacity} />

      {/* Header bar — uikit Root for flex layout */}
      <group position={[0, height / 2 - headerH / 2, 0.0005]}>
        <mesh
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          renderOrder={state.zOrder + 1}
        >
          <planeGeometry args={[width, headerH]} />
          <meshBasicMaterial
            color={theme.headerBg}
            transparent
            opacity={state.opacity}
            depthTest={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <Container
          sizeX={width}
          sizeY={headerH}
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingX={headerH * 0.25}
        >
          <Container flexShrink={0} flexDirection="row" alignItems="center">
            <Text fontSize={theme.fontTitle} color={theme.text}>
              {def.title}
            </Text>
          </Container>
          <Container flexShrink={0} flexDirection="row" alignItems="center" gap={headerH * 0.3}>
            <Text fontSize={theme.fontHint} color={theme.subtleText}>
              {slider}
            </Text>
            <Container
              flexShrink={0}
              onClick={(e) => {
                e.stopPropagation?.()
                onClose()
              }}
            >
              <Text fontSize={theme.fontTitle} color={focused ? theme.focusBorder : theme.text}>
                ×
              </Text>
            </Container>
          </Container>
        </Container>
      </group>

      {/* Body — background plane + consumer content */}
      <group position={[0, -headerH / 2, 0]}>
        <mesh renderOrder={state.zOrder}>
          <planeGeometry args={[width, bodyH]} />
          <meshBasicMaterial
            color={theme.panelBg}
            transparent
            opacity={state.opacity}
            depthTest={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <group position={[0, 0, 0.001]}>
          <Body width={width} height={bodyH} />
        </group>
      </group>
    </group>
  )
}

/**
 * Four thin planes forming a rectangle outline. Cheaper than uikit borders
 * for this 4-edge case and lets us guarantee depthTest=false.
 */
function OutlineRect({
  width,
  height,
  color,
  opacity,
}: {
  width: number
  height: number
  color: string
  opacity: number
}) {
  const t = theme.outlineWidth
  const z = -0.0005
  return (
    <group>
      {/* top */}
      <mesh position={[0, height / 2, z]}>
        <planeGeometry args={[width + t, t]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* bottom */}
      <mesh position={[0, -height / 2, z]}>
        <planeGeometry args={[width + t, t]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* left */}
      <mesh position={[-width / 2, 0, z]}>
        <planeGeometry args={[t, height + t]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* right */}
      <mesh position={[width / 2, 0, z]}>
        <planeGeometry args={[t, height + t]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
