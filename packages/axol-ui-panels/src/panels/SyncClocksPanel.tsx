// @almond/axol-ui-panels — SyncClocksPanel
// papa-1
//
// Read /api/zed-sync-clocks/status (1 Hz). Show:
//   - method (chrony / ptp / none) as a top pill
//   - both_up dot
//   - chrony offset_us value
//   - PTP local/remote running indicators
// Buttons: Start / Stop (the server uses upstream defaults).

import { useState } from "react"
import { Container } from "@react-three/uikit"
import { postForm } from "../api"
import { useEndpointPolling } from "../useEndpointPolling"
import { panelTheme } from "../theme"
import { Btn, Pill, KV, Col, Row, ErrorText, MutedText, Heading } from "../widgets"

interface SyncStatus {
  method: "chrony" | "ptp" | "none"
  chrony: {
    locked_to_zedbox: boolean
    offset_us: number | null
    stratum: number | null
    reference_id: string | null
    last_offset_s: number | null
    active: boolean
  }
  ptp: {
    local_running: boolean
    local_pids: number[]
    remote_running: boolean
  }
  both_up: boolean
  note?: string
}

export function SyncClocksPanel({ width, height }: { width: number; height: number }) {
  const { data, error, refetch, unavailable } = useEndpointPolling<SyncStatus>(
    "/api/zed-sync-clocks/status",
    { intervalMs: 1000 }
  )
  const [busy, setBusy] = useState<"start" | "stop" | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)

  const onStart = async () => {
    setBusy("start")
    setActionErr(null)
    try {
      await postForm("/api/zed-sync-clocks/start")
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
      await postForm("/api/zed-sync-clocks/stop")
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
      <Heading>Sync Clocks</Heading>

      {unavailable && <MutedText>endpoint unavailable</MutedText>}
      {error && !data && <ErrorText>{error.message.slice(0, 80)}</ErrorText>}
      {actionErr && <ErrorText>{actionErr}</ErrorText>}

      {data && (
        <Col gap={panelTheme.rowGap}>
          <Row gap={panelTheme.colGap}>
            <Pill
              label="Method"
              color={data.both_up ? panelTheme.okGreen : panelTheme.inactiveGray}
              value={data.method}
            />
            <Pill
              label="Synced"
              color={data.both_up ? panelTheme.okGreen : panelTheme.errorRed}
              value={data.both_up ? "yes" : "no"}
            />
          </Row>

          <Row gap={panelTheme.colGap}>
            <KV
              label="offset"
              value={data.chrony.offset_us != null ? `${data.chrony.offset_us.toFixed(1)} us` : "—"}
            />
            <KV
              label="stratum"
              value={data.chrony.stratum != null ? String(data.chrony.stratum) : "—"}
            />
          </Row>

          <Row gap={panelTheme.colGap}>
            <KV
              label="PTP local"
              value={data.ptp.local_running ? "running" : "idle"}
              valueColor={data.ptp.local_running ? panelTheme.okGreen : panelTheme.subtleText}
            />
            <KV
              label="PTP remote"
              value={data.ptp.remote_running ? "running" : "idle"}
              valueColor={data.ptp.remote_running ? panelTheme.okGreen : panelTheme.subtleText}
            />
          </Row>

          <Row gap={panelTheme.colGap}>
            <Btn
              label={busy === "start" ? "Starting…" : "Start"}
              variant="primary"
              pending={busy === "start"}
              disabled={busy !== null || data.both_up}
              onClick={onStart}
            />
            <Btn
              label={busy === "stop" ? "Stopping…" : "Stop"}
              variant="danger"
              pending={busy === "stop"}
              disabled={busy !== null || !data.both_up}
              onClick={onStop}
            />
          </Row>
        </Col>
      )}
    </Container>
  )
}
