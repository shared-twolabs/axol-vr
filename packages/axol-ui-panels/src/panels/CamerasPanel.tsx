// @almond/axol-ui-panels — CamerasPanel
// papa-1
//
// Three live JPEG textures stacked vertically: overhead, left_arm, right_arm.
// Each <LiveCam> polls /api/rerun/frame/<cam> at ~10 Hz by re-setting the
// uikit <Image src=...> with a cache-busted URL. The browser fetches the
// new JPEG each tick (FastAPI emits Cache-Control: no-store on these).
//
// Below the cams: a small per-cam status row (fps + age_ms + connected dot)
// driven by /api/rerun/status (1 Hz).

import { useEffect, useState } from "react"
import { Container, Image, Text } from "@react-three/uikit"
import { bustedFrameUrl } from "../api"
import { useEndpointPolling } from "../useEndpointPolling"
import { panelTheme } from "../theme"
import { Col, Row, Dot, MutedText, ErrorText } from "../widgets"

type Cam = "overhead" | "left_arm" | "right_arm"

interface RerunStatus {
  grpc_up: boolean
  web_up: boolean
  probe_up: boolean
  running: boolean
  viewer_pids: number[]
  stream_pids: number[]
  iframe_url: string
  healthz: {
    cameras?: Record<string, { fps?: number; age_ms?: number; connected?: boolean }>
  } | null
}

const CAMS: Cam[] = ["overhead", "left_arm", "right_arm"]
const FRAME_INTERVAL_MS = 100 // 10 Hz

export function CamerasPanel({ width, height }: { width: number; height: number }) {
  const status = useEndpointPolling<RerunStatus>("/api/rerun/status", { intervalMs: 1000 })
  const cams = status.data?.healthz?.cameras ?? {}

  // Each cam gets ~1/3 of the body's height after subtracting padding + label rows.
  const pad = panelTheme.padBody
  const inner = height - pad * 2
  const rowH = Math.max(0.04, (inner - panelTheme.rowGap * 2) / 3)

  return (
    <Container
      width={width}
      height={height}
      paddingX={pad}
      paddingY={pad}
      flexDirection="column"
      gap={panelTheme.rowGap}
    >
      {CAMS.map((cam) => {
        const camStatus = cams[cam]
        return (
          <LiveCamRow
            key={cam}
            cam={cam}
            height={rowH}
            connected={!!camStatus?.connected}
            fps={camStatus?.fps}
            ageMs={camStatus?.age_ms}
          />
        )
      })}
      {status.error && !status.data && (
        <ErrorText>rerun status: {status.error.message.slice(0, 60)}</ErrorText>
      )}
      {status.unavailable && <MutedText>endpoint unavailable</MutedText>}
    </Container>
  )
}

function LiveCamRow({
  cam,
  height,
  connected,
  fps,
  ageMs,
}: {
  cam: Cam
  height: number
  connected: boolean
  fps?: number
  ageMs?: number
}) {
  const [src, setSrc] = useState<string>(() => bustedFrameUrl(`/api/rerun/frame/${cam}`))

  // We can't observe individual <Image> load errors from uikit's wrapper, so
  // we trust the /api/rerun/status endpoint as the authoritative "this cam is
  // alive" signal. The Image simply shows stale content if the upstream stops
  // emitting, and the status row below flags it as offline.
  useEffect(() => {
    let active = true
    const tick = () => {
      if (!active) return
      setSrc(bustedFrameUrl(`/api/rerun/frame/${cam}`))
    }
    const id = setInterval(tick, FRAME_INTERVAL_MS)
    tick()
    return () => {
      active = false
      clearInterval(id)
    }
  }, [cam])

  const dotColor = connected ? panelTheme.okGreen : panelTheme.inactiveGray
  const statusText = connected
    ? `${(fps ?? 0).toFixed(0)} fps · ${ageMs != null ? Math.round(ageMs) + "ms" : "—"}`
    : "offline"

  // 4:3 image takes most of the row, status pill on the right
  const imgH = Math.max(0.03, height - 0.012)
  const imgW = imgH * (4 / 3)

  return (
    <Container
      flexDirection="row"
      alignItems="center"
      gap={panelTheme.colGap}
      height={height}
      flexShrink={0}
    >
      <Container width={imgW} height={imgH} flexShrink={0}>
        <Image src={src} width={imgW} height={imgH} />
      </Container>
      <Col gap={panelTheme.rowGap * 0.5}>
        <Text fontSize={panelTheme.fontLabel} color={panelTheme.text}>
          {camLabel(cam)}
        </Text>
        <Row gap={panelTheme.colGap * 0.5}>
          <Dot color={dotColor} />
          <Text fontSize={panelTheme.fontLabel} color={panelTheme.subtleText}>
            {statusText}
          </Text>
        </Row>
      </Col>
    </Container>
  )
}

function camLabel(cam: Cam): string {
  switch (cam) {
    case "overhead":
      return "Overhead"
    case "left_arm":
      return "L Arm"
    case "right_arm":
      return "R Arm"
  }
}
