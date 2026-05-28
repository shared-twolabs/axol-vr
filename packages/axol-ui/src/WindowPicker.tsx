// @almond/axol-ui — WindowPicker
// scaffolder-alpha: head-locked overlay showing one tile per registered
// window plus a Reset tile. Tiles light up when their window is open.
// Highlighted (focused) tile gets a yellow outline.

import { useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import { Root, Container, Text } from "@react-three/uikit"
import type { WindowRegistry } from "./hooks/useWindowState"
import { theme } from "./theme"

export interface WindowPickerProps {
  /** Whether the picker overlay is currently shown. */
  visible: boolean
  registry: WindowRegistry
}

export function WindowPicker({ visible, registry }: WindowPickerProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Head-lock the picker to the active XR camera.
  useFrame(({ gl }) => {
    if (!groupRef.current) return
    groupRef.current.visible = visible && gl.xr.isPresenting
    if (!groupRef.current.visible) return
    const cam = gl.xr.getCamera()
    groupRef.current.position.copy(cam.position)
    groupRef.current.quaternion.copy(cam.quaternion)
  })

  const defs = registry.defs
  const [tileW, tileH] = theme.pickerTileSize
  const gap = theme.pickerTileGap

  // Total panel = N tiles + reset tile, plus gaps
  const totalCount = defs.length + 1
  const panelW = totalCount * tileW + (totalCount - 1) * gap + 0.04
  const panelH = tileH + 0.04

  return (
    <group ref={groupRef} visible={false}>
      {/* Translate the picker to the head-relative offset specified in theme. */}
      <group position={[theme.pickerOffset[0], theme.pickerOffset[1], theme.pickerOffset[2]]}>
        {/* Background plane */}
        <mesh renderOrder={1000}>
          <planeGeometry args={[panelW, panelH]} />
          <meshBasicMaterial
            color={theme.panelBg}
            transparent
            opacity={0.85}
            depthTest={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Tile row via uikit flex */}
        <group position={[0, 0, 0.001]}>
          <Root
            sizeX={panelW}
            sizeY={panelH}
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            gap={gap}
          >
            {defs.map((def) => {
              const state = registry.states.get(def.id)
              const isOpen = state?.open ?? false
              const isFocused = registry.focused === def.id
              return (
                <PickerTile
                  key={def.id}
                  width={tileW}
                  height={tileH}
                  title={def.title}
                  icon={def.icon}
                  open={isOpen}
                  focused={isFocused}
                  onClick={() => registry.toggle(def.id)}
                />
              )
            })}
            <PickerTile
              key="__reset__"
              width={tileW}
              height={tileH}
              title="Reset"
              icon="↺"
              open={false}
              focused={false}
              onClick={() => registry.resetLayout()}
            />
          </Root>
        </group>
      </group>
    </group>
  )
}

interface PickerTileProps {
  width: number
  height: number
  title: string
  icon?: string
  open: boolean
  focused: boolean
  onClick: () => void
}

function PickerTile({ width, height, title, icon, open, focused, onClick }: PickerTileProps) {
  const bg = focused ? theme.tileFocusBg : theme.tileBg
  const textColor = open ? theme.text : theme.dimText

  return (
    <Container
      width={width}
      height={height}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor={bg}
      opacity={0.9}
      borderColor={focused ? theme.focusBorder : open ? theme.openIndicator : theme.border}
      borderWidth={focused ? 0.003 : open ? 0.0015 : 0.0008}
      borderRadius={0.005}
      gap={0.004}
      onClick={(e: { stopPropagation?: () => void }) => {
        e.stopPropagation?.()
        onClick()
      }}
    >
      {icon ? (
        <Text fontSize={theme.fontTitle} color={textColor}>
          {icon}
        </Text>
      ) : null}
      <Text fontSize={theme.fontBody} color={textColor}>
        {title}
      </Text>
    </Container>
  )
}
