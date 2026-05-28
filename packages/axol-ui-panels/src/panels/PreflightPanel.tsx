// @almond/axol-ui-panels — PreflightPanel
// papa-1
//
// "Stoplight" grid of the top-level state from /api/status. Each tile is
// a single label + status dot. Polls 1 Hz.
//
// Status shape (see server.py status() — line 501):
//   teleop:           { running, pids, port_8000_open }
//   collect_data:     { running, pids }
//   zed_stream:       { running, box_reachable, direct_ip }
//   gravity_comp:     { running, pids }
//   sync_clocks_local:{ running, pids }
//   can:              { left_up, right_up, ... }   ← stoplight from _can_ifaces_up
//   axol_hub_present: bool
//   twopc_wired_ip:   string | null
//   datasets:         array
//   ts:               unix

import { Container } from "@react-three/uikit"
import { useEndpointPolling } from "../useEndpointPolling"
import { panelTheme } from "../theme"
import { Pill, ErrorText, MutedText, Heading, Col, Row } from "../widgets"

interface StatusData {
  teleop: { running: boolean; pids: number[]; port_8000_open: boolean }
  collect_data: { running: boolean; pids: number[] }
  zed_stream: { running: boolean; box_reachable: boolean; direct_ip: string }
  gravity_comp: { running: boolean; pids: number[] }
  sync_clocks_local: { running: boolean; pids: number[] }
  can: Record<string, boolean | string | number>
  axol_hub_present: boolean
  twopc_wired_ip: string | null
  ts: number
}

export function PreflightPanel({ width, height }: { width: number; height: number }) {
  const { data, error, unavailable } = useEndpointPolling<StatusData>("/api/status", {
    intervalMs: 1000,
  })

  const pad = panelTheme.padBody
  return (
    <Container
      width={width}
      height={height}
      paddingX={pad}
      paddingY={pad}
      flexDirection="column"
      gap={panelTheme.rowGap * 1.5}
    >
      <Heading>Preflight</Heading>

      {unavailable && <MutedText>endpoint unavailable</MutedText>}
      {error && !data && <ErrorText>{error.message.slice(0, 80)}</ErrorText>}

      {data && (
        <Col gap={panelTheme.rowGap}>
          <Row gap={panelTheme.colGap} flexWrap="wrap">
            <Pill
              label="Teleop"
              color={data.teleop.running ? panelTheme.okGreen : panelTheme.inactiveGray}
              value={data.teleop.running ? "running" : "idle"}
            />
            <Pill
              label="Collect"
              color={data.collect_data.running ? panelTheme.okGreen : panelTheme.inactiveGray}
              value={data.collect_data.running ? "running" : "idle"}
            />
            <Pill
              label="ZED stream"
              color={
                data.zed_stream.running
                  ? panelTheme.okGreen
                  : data.zed_stream.box_reachable
                    ? panelTheme.warnAmber
                    : panelTheme.errorRed
              }
              value={
                data.zed_stream.running
                  ? "running"
                  : data.zed_stream.box_reachable
                    ? "box reachable, not running"
                    : "box unreachable"
              }
            />
          </Row>

          <Row gap={panelTheme.colGap} flexWrap="wrap">
            <Pill
              label="Sync clocks"
              color={data.sync_clocks_local.running ? panelTheme.okGreen : panelTheme.inactiveGray}
              value={data.sync_clocks_local.running ? "running" : "idle"}
            />
            <Pill
              label="Gravity comp"
              color={data.gravity_comp.running ? panelTheme.okGreen : panelTheme.inactiveGray}
              value={data.gravity_comp.running ? "running" : "idle"}
            />
            <Pill
              label="axol hub"
              color={data.axol_hub_present ? panelTheme.okGreen : panelTheme.errorRed}
              value={data.axol_hub_present ? "ok" : "missing"}
            />
          </Row>

          <Row gap={panelTheme.colGap} flexWrap="wrap">
            <Pill
              label="Port 8000"
              color={data.teleop.port_8000_open ? panelTheme.okGreen : panelTheme.inactiveGray}
              value={data.teleop.port_8000_open ? "open" : "closed"}
            />
            <Pill
              label="TwoPC link"
              color={data.twopc_wired_ip ? panelTheme.okGreen : panelTheme.inactiveGray}
              value={data.twopc_wired_ip ?? "—"}
            />
          </Row>

          {/* CAN summary — flatten to row of pills */}
          <CanRow can={data.can} />
        </Col>
      )}
    </Container>
  )
}

function CanRow({ can }: { can: Record<string, boolean | string | number> }) {
  const keys = Object.keys(can)
  if (!keys.length) return null
  return (
    <Row gap={panelTheme.colGap} flexWrap="wrap">
      {keys.map((k) => {
        const v = can[k]
        const isBool = typeof v === "boolean"
        const color = isBool
          ? v
            ? panelTheme.okGreen
            : panelTheme.errorRed
          : panelTheme.subtleText
        return <Pill key={k} label={`CAN ${k}`} color={color} value={String(v)} />
      })}
    </Row>
  )
}
