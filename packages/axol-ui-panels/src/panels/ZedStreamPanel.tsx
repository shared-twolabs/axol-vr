// @almond/axol-ui-panels — ZedStreamPanel
// papa-1
//
// Read-only display of the ZED stream state. Start/stop happens on the ZED
// Box terminal (operator runs it manually); this panel observes only via
// /api/status's zed_stream sub-field. Polls 1 Hz.

import { Container } from "@react-three/uikit"
import { useEndpointPolling } from "../useEndpointPolling"
import { panelTheme } from "../theme"
import { Pill, KV, Col, Row, ErrorText, MutedText, Heading } from "../widgets"

interface StatusData {
  zed_stream: {
    running: boolean
    box_reachable: boolean
    direct_ip: string
  }
}

export function ZedStreamPanel({ width, height }: { width: number; height: number }) {
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
      gap={panelTheme.rowGap}
    >
      <Heading>ZED Stream (read-only)</Heading>

      {unavailable && <MutedText>endpoint unavailable</MutedText>}
      {error && !data && <ErrorText>{error.message.slice(0, 80)}</ErrorText>}

      {data && (
        <Col gap={panelTheme.rowGap}>
          <Row gap={panelTheme.colGap}>
            <Pill
              label="Stream"
              color={data.zed_stream.running ? panelTheme.okGreen : panelTheme.inactiveGray}
              value={data.zed_stream.running ? "running" : "stopped"}
            />
            <Pill
              label="Box"
              color={data.zed_stream.box_reachable ? panelTheme.okGreen : panelTheme.errorRed}
              value={data.zed_stream.box_reachable ? "reachable" : "unreachable"}
            />
          </Row>
          <KV label="direct_ip" value={data.zed_stream.direct_ip} />
          <MutedText size={panelTheme.fontHint}>
            Start/stop on the ZED Box terminal — this panel is observe-only.
          </MutedText>
        </Col>
      )}
    </Container>
  )
}
