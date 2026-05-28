// @almond/axol-ui-motion-scale — SphereCalibrator
// quebec-1: R3F component rendered as a sibling of WindowManager inside <XR>.
//
// While `isCalibrating` is true, this component:
//   * samples both controllers' target-ray-space poses each frame
//   * places a translucent yellow sphere at the midpoint
//   * radius = distance from midpoint to either controller
//     (i.e. diameter = controller separation)
//   * publishes the live diameter to the panel via __setLiveDiameter
//     so the panel's "Confirm" button can commit the latest value
//   * renders a head-locked label "Reach: 0.62m → scale: 0.97×"
//
// Confirmation/cancel is done from the panel (panel-button path) — this
// component never reads thumbstick clicks, avoiding any collision with
// axol-vr-client / axol-ui input bindings.

import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { useFrame, useThree } from "@react-three/fiber"
import { Root, Container, Text } from "@react-three/uikit"
import { ROBOT_ARM_REACH, clampScale, theme } from "./theme"
import { useMotionScale } from "./useMotionScale"
import { __setLiveDiameter } from "./MotionScalePanel"

const SAMPLE_MIN_DIAMETER = 0.05 // 5 cm — noise floor / no-touch sanity check
const SPHERE_COLOR = "#FFD700" // gold/yellow
const LABEL_OFFSET_Y = 0.12 // metres above the sphere midpoint

export function SphereCalibrator() {
  const { isCalibrating } = useMotionScale()
  const { gl } = useThree()

  // R3F-managed mutable refs so we don't trigger renders every frame.
  const groupRef = useRef<THREE.Group>(null)
  const sphereRef = useRef<THREE.Mesh>(null)
  const wireRef = useRef<THREE.Mesh>(null)
  const labelGroupRef = useRef<THREE.Group>(null)
  const lpVec = useRef(new THREE.Vector3())
  const rpVec = useRef(new THREE.Vector3())
  const centerVec = useRef(new THREE.Vector3())

  // React state for the label (low-frequency relative to useFrame, but we
  // want the readout to update visibly). We throttle setState to ~10Hz
  // so we don't blow render performance.
  const [readout, setReadout] = useState<{ diameter: number; scale: number }>({
    diameter: 0,
    scale: 1.0,
  })
  const lastReadoutAt = useRef(0)

  // Reset published diameter when leaving calibration so a stale value
  // can't be "confirmed" later.
  useEffect(() => {
    if (!isCalibrating) {
      __setLiveDiameter(0)
      setReadout({ diameter: 0, scale: 1.0 })
    }
  }, [isCalibrating])

  // Pre-create geometries once; cheap meshBasicMaterials per-instance.
  const fillGeometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), [])
  const wireGeometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), [])
  useEffect(() => {
    return () => {
      fillGeometry.dispose()
      wireGeometry.dispose()
    }
  }, [fillGeometry, wireGeometry])

  useFrame(() => {
    if (!isCalibrating) return

    const session = gl.xr.getSession()
    const frame = gl.xr.getFrame()
    const refSpace = gl.xr.getReferenceSpace()
    if (!session || !frame || !refSpace) return

    const inputs = Array.from(session.inputSources)
    const leftSource = inputs.find((s) => s.handedness === "left")
    const rightSource = inputs.find((s) => s.handedness === "right")

    const leftSpace = leftSource?.targetRaySpace
    const rightSpace = rightSource?.targetRaySpace
    if (!leftSpace || !rightSpace) return

    const leftPose = frame.getPose(leftSpace, refSpace)
    const rightPose = frame.getPose(rightSpace, refSpace)
    if (!leftPose || !rightPose) return

    const lp = leftPose.transform.position
    const rp = rightPose.transform.position
    lpVec.current.set(lp.x, lp.y, lp.z)
    rpVec.current.set(rp.x, rp.y, rp.z)

    centerVec.current.copy(lpVec.current).add(rpVec.current).multiplyScalar(0.5)

    const dx = lp.x - rp.x
    const dy = lp.y - rp.y
    const dz = lp.z - rp.z
    const diameter = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const radius = diameter / 2

    // Publish so the Confirm button can read it.
    __setLiveDiameter(diameter)

    // Place the group at the midpoint.
    if (groupRef.current) {
      groupRef.current.position.copy(centerVec.current)
    }
    // Scale unit-sphere meshes to the live radius.
    if (sphereRef.current) sphereRef.current.scale.setScalar(Math.max(radius, 0.001))
    if (wireRef.current) wireRef.current.scale.setScalar(Math.max(radius, 0.001))
    // Float the label LABEL_OFFSET_Y above the sphere top.
    if (labelGroupRef.current) {
      labelGroupRef.current.position.set(0, radius + LABEL_OFFSET_Y, 0)
    }

    // Update the React readout at ~10Hz.
    const now = performance.now()
    if (now - lastReadoutAt.current > 100) {
      lastReadoutAt.current = now
      const safeDiameter = Math.max(diameter, SAMPLE_MIN_DIAMETER)
      setReadout({
        diameter,
        scale: clampScale(ROBOT_ARM_REACH / safeDiameter),
      })
    }
  })

  if (!isCalibrating) return null

  return (
    <group ref={groupRef}>
      {/* Translucent fill */}
      <mesh ref={sphereRef} geometry={fillGeometry}>
        <meshBasicMaterial
          color={SPHERE_COLOR}
          transparent
          opacity={0.25}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Wireframe shell so the operator perceives the volume in HMD */}
      <mesh ref={wireRef} geometry={wireGeometry}>
        <meshBasicMaterial
          color={SPHERE_COLOR}
          wireframe
          transparent
          opacity={0.7}
          depthTest={false}
        />
      </mesh>

      {/* Floating readout label — uikit Root at sphere top */}
      <group ref={labelGroupRef}>
        <Root
          sizeX={0.32}
          sizeY={0.08}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          backgroundColor={theme.panelBg}
          borderColor={theme.focusBorder}
          borderWidth={0.0015}
          borderRadius={0.006}
          paddingX={0.012}
          paddingY={0.008}
        >
          <Container flexDirection="column" alignItems="center" gap={0.003}>
            <Text fontSize={theme.fontBody} color={theme.text}>
              Reach: {readout.diameter.toFixed(2)}m
            </Text>
            <Text fontSize={theme.fontHint} color={theme.focusBorder}>
              scale: {readout.scale.toFixed(2)}×
            </Text>
            <Text fontSize={theme.fontHint} color={theme.subtleText}>
              press Confirm in the panel
            </Text>
          </Container>
        </Root>
      </group>
    </group>
  )
}
