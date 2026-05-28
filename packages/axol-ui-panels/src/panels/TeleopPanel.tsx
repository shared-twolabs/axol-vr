// @almond/axol-ui-panels — TeleopPanel
// papa-1
//
// Start/stop the `axol teleop` process. Status comes from /api/status
// (teleop.running, pids, port_8000_open). Polls 1 Hz. Buttons POST to
// /api/teleop/start and /api/teleop/stop respectively.
//
// Defaults match the server's form defaults; this panel doesn't expose
// the stiffness / log-level knobs (those live in the full dashboard).

import { useState } from "react"
import { Container } from "@react-three/uikit"
import { postForm } from "../api"
import { useEndpointPolling } from "../useEndpointPolling"
import { panelTheme } from "../theme"
import { Btn, Pill, KV, Col, Row, ErrorText, MutedText, Heading } from "../widgets"

interface StatusData {
  teleop: { running: boolean; pids: number[]; port_8000_open: boolean }
}

export function TeleopPanel({ width, height }: { width: number; height: number }) {
  const { data, error, refetch, unavailable } = useEndpointPolling<StatusData>("/api/status", {
    intervalMs: 1000,
  })
  const [busy, setBusy] = useState<"start" | "stop" | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)

  const teleop = data?.teleop
  const running = !!teleop?.running

  const onStart = async () => {
    setBusy("start")
    setActionErr(null)
    try {
      await postForm("/api/teleop/start", { robot: "axol" })
      refetch()
    } catch (e) {
      setActionErr((e as Error).message.slice(0, 80))
    } finally {
      setBusy(null)
    }
  }
  const onStop = async () => {
    setBusy("stop")
    setActionErr(null)
    try {
      await postForm("/api/teleop/stop")
      refetch()
    } catch (e) {
      setActionErr((e as Error).message.slice(0, 80))
    } finally {
      setBusy(null)
    }
  }

  const pad = panelTheme.padBody
  return (
    <Container
      width={width}
      height={height}
      paddingX={pad}
      paddingY={pad}
      flexDirection="column"
      gap={panelTheme.rowGap * 1.2}
    >
      <Heading>Teleop</Heading>

      {unavailable && <MutedText>endpoint unavailable</MutedText>}
      {error && !data && <ErrorText>{error.message.slice(0, 80)}</ErrorText>}
      {actionErr && <ErrorText>{actionErr}</ErrorText>}

      {data && teleop && (
        <Col gap={panelTheme.rowGap}>
          <Row gap={panelTheme.colGap}>
            <Pill
              label="State"
              color={running ? panelTheme.okGreen : panelTheme.inactiveGray}
              value={running ? "running" : "idle"}
            />
            <Pill
              label="Port 8000"
              color={teleop.port_8000_open ? panelTheme.okGreen : panelTheme.inactiveGray}
              value={teleop.port_8000_open ? "open" : "closed"}
            />
          </Row>

          {teleop.pids.length > 0 && <KV label="pids" value={teleop.pids.join(", ")} />}

          <Row gap={panelTheme.colGap}>
            <Btn
              label={busy === "start" ? "Starting…" : "Start"}
              variant="primary"
              pending={busy === "start"}
              disabled={busy !== null || running}
              onClick={onStart}
            />
            <Btn
              label={busy === "stop" ? "Stopping…" : "Stop"}
              variant="danger"
              pending={busy === "stop"}
              disabled={busy !== null || !running}
              onClick={onStop}
            />
          </Row>
        </Col>
      )}
    </Container>
  )
}
