// @almond/axol-ui-panels — SystemPanel
// papa-1
//
// /api/system returns:
//   gpu: { name, mem_used_mb, mem_total_mb, utilization_pct, temp_c, processes }
//   disk_home: { used_gb, total_gb, percent }
//   disk_cache: { ... }
//   hf: { logged_in, user }
//   spark: { reachable, host, output }
//   coord_peers: [ ... ]
//   direct_link: { ms?: number, reachable: bool }
//   ts: number
//
// Shape varies by host availability; treat every sub-key as optional.

import { Container } from "@react-three/uikit"
import { useEndpointPolling } from "../useEndpointPolling"
import { panelTheme } from "../theme"
import { Pill, KV, Col, Row, ErrorText, MutedText, Heading } from "../widgets"

interface SystemData {
  gpu?: {
    name?: string
    mem_used_mb?: number
    mem_total_mb?: number
    utilization_pct?: number
    temp_c?: number
  }
  disk_home?: { used_gb?: number; total_gb?: number; percent?: number }
  disk_cache?: { used_gb?: number; total_gb?: number; percent?: number }
  hf?: { logged_in?: boolean; user?: string }
  spark?: { reachable?: boolean; host?: string }
  coord_peers?: Array<{ session_id?: string }>
  direct_link?: { ms?: number; reachable?: boolean }
  ts?: number
}

export function SystemPanel({ width, height }: { width: number; height: number }) {
  const { data, error, unavailable } = useEndpointPolling<SystemData>("/api/system", {
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
      <Heading>System</Heading>

      {unavailable && <MutedText>endpoint unavailable</MutedText>}
      {error && !data && <ErrorText>{error.message.slice(0, 80)}</ErrorText>}

      {data && (
        <Col gap={panelTheme.rowGap}>
          {data.gpu && (
            <Row gap={panelTheme.colGap} flexWrap="wrap">
              <Pill
                label="GPU"
                color={panelTheme.okGreen}
                value={data.gpu.utilization_pct != null ? `${data.gpu.utilization_pct}%` : "—"}
              />
              <Pill
                label="VRAM"
                color={panelTheme.subtleText}
                value={fmtMem(data.gpu.mem_used_mb, data.gpu.mem_total_mb)}
              />
              {data.gpu.temp_c != null && (
                <Pill
                  label="temp"
                  color={
                    data.gpu.temp_c > 80
                      ? panelTheme.errorRed
                      : data.gpu.temp_c > 70
                        ? panelTheme.warnAmber
                        : panelTheme.okGreen
                  }
                  value={`${data.gpu.temp_c}°C`}
                />
              )}
            </Row>
          )}

          {data.disk_home && (
            <Row gap={panelTheme.colGap} flexWrap="wrap">
              <Pill
                label="Disk /home"
                color={
                  (data.disk_home.percent ?? 0) > 90
                    ? panelTheme.errorRed
                    : (data.disk_home.percent ?? 0) > 75
                      ? panelTheme.warnAmber
                      : panelTheme.okGreen
                }
                value={data.disk_home.percent != null ? `${data.disk_home.percent}%` : "—"}
              />
              {data.disk_home.total_gb != null && (
                <KV
                  label="used"
                  value={`${(data.disk_home.used_gb ?? 0).toFixed(0)} / ${(
                    data.disk_home.total_gb ?? 0
                  ).toFixed(0)} GB`}
                />
              )}
            </Row>
          )}

          {data.spark && (
            <Row gap={panelTheme.colGap}>
              <Pill
                label="Spark"
                color={data.spark.reachable ? panelTheme.okGreen : panelTheme.inactiveGray}
                value={data.spark.reachable ? "reachable" : "unreachable"}
              />
              {data.spark.host && <KV label="host" value={data.spark.host} />}
            </Row>
          )}

          {data.direct_link && (
            <Row gap={panelTheme.colGap}>
              <Pill
                label="Direct link"
                color={data.direct_link.reachable ? panelTheme.okGreen : panelTheme.errorRed}
                value={data.direct_link.ms != null ? `${data.direct_link.ms.toFixed(1)} ms` : "—"}
              />
            </Row>
          )}

          {data.hf?.logged_in !== undefined && (
            <Row gap={panelTheme.colGap}>
              <Pill
                label="HF"
                color={data.hf.logged_in ? panelTheme.okGreen : panelTheme.inactiveGray}
                value={data.hf.logged_in ? (data.hf.user ?? "logged in") : "anon"}
              />
            </Row>
          )}
        </Col>
      )}
    </Container>
  )
}

function fmtMem(used?: number, total?: number): string {
  if (used == null || total == null) return "—"
  return `${(used / 1024).toFixed(1)} / ${(total / 1024).toFixed(1)} GB`
}
