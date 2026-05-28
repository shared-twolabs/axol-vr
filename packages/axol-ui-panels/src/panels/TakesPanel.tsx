// @almond/axol-ui-panels — TakesPanel
// papa-1
//
// Show all episodes of a single dataset from /api/takes/<owner>/<name> with
// status badges and Save / Discard buttons. Default owner/name come from
// localStorage (axol-ui-panels.takes.owner/.name) and the user types to
// switch. Polls 2 Hz while a dataset is selected.
//
// The FastAPI server's takes/.../status endpoint accepts the four values:
//   kept | rejected | promoted | merged
// The task brief mentioned save/discard — those map to kept/rejected, which
// is what we use here.

import { useMemo, useState } from "react"
import { Container, Input, Text } from "@react-three/uikit"
import { postForm } from "../api"
import { useEndpointPolling } from "../useEndpointPolling"
import { useLocalStorageState } from "../useLocalStorageState"
import { panelTheme } from "../theme"
import { Btn, Pill, Col, Row, ErrorText, MutedText, Heading } from "../widgets"

interface TakesSummary {
  repo_id?: string
  path?: string
  takes: Array<{ episode_index: number; take_status: string; reason?: string; ts?: number }>
  latest: Record<string, { take_status: string; reason?: string; ts?: number }>
  counts: { kept: number; rejected: number; promoted: number; merged: number; untagged: number }
  validity: {
    per_episode: Record<string, unknown>
    counts: Record<string, number>
  }
  total_episodes: number
  tasks: string[]
  error?: string
}

const LS_KEY_OWNER = "axol-ui-panels.takes.owner"
const LS_KEY_NAME = "axol-ui-panels.takes.name"

export function TakesPanel({ width, height }: { width: number; height: number }) {
  const [owner, setOwner] = useLocalStorageState<string>(LS_KEY_OWNER, "")
  const [name, setName] = useLocalStorageState<string>(LS_KEY_NAME, "")
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [pendingEid, setPendingEid] = useState<number | null>(null)

  const path = owner && name ? `/api/takes/${owner}/${name}` : null
  const { data, error, refetch, unavailable } = useEndpointPolling<TakesSummary>(path, {
    intervalMs: 500,
  })

  const setStatus = async (eid: number, status: "kept" | "rejected") => {
    if (!owner || !name) return
    setPendingEid(eid)
    setActionErr(null)
    try {
      await postForm(`/api/takes/${owner}/${name}/${eid}/status`, { status })
      refetch()
    } catch (e) {
      setActionErr((e as Error).message.slice(0, 100))
    } finally {
      setPendingEid(null)
    }
  }

  // Build episode rows: 0..total-1, with latest status overlay.
  const rows = useMemo(() => {
    if (!data) return [] as Array<{ eid: number; status: string }>
    const total = data.total_episodes ?? 0
    return Array.from({ length: total }, (_, i) => ({
      eid: i,
      status: data.latest[String(i)]?.take_status ?? "untagged",
    }))
  }, [data])

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
      <Heading>Takes</Heading>

      <Row gap={panelTheme.colGap}>
        <DatasetInput value={owner} onValueChange={setOwner} placeholder="owner" />
        <Text fontSize={panelTheme.fontLabel} color={panelTheme.subtleText}>
          /
        </Text>
        <DatasetInput value={name} onValueChange={setName} placeholder="name" />
      </Row>

      {unavailable && <MutedText>dataset not found</MutedText>}
      {error && !data && <ErrorText>{error.message.slice(0, 80)}</ErrorText>}
      {actionErr && <ErrorText>{actionErr}</ErrorText>}

      {data && (
        <Col gap={panelTheme.rowGap}>
          <Row gap={panelTheme.colGap} flexWrap="wrap">
            <Pill label="kept" color={panelTheme.okGreen} value={String(data.counts.kept ?? 0)} />
            <Pill
              label="promoted"
              color={panelTheme.okGreen}
              value={String(data.counts.promoted ?? 0)}
            />
            <Pill
              label="rejected"
              color={panelTheme.errorRed}
              value={String(data.counts.rejected ?? 0)}
            />
            <Pill
              label="merged"
              color={panelTheme.subtleText}
              value={String(data.counts.merged ?? 0)}
            />
            <Pill
              label="untagged"
              color={panelTheme.inactiveGray}
              value={String(data.counts.untagged ?? 0)}
            />
            <Pill label="total" color={panelTheme.text} value={String(data.total_episodes ?? 0)} />
          </Row>

          <Col gap={panelTheme.rowGap * 0.5}>
            {rows.length === 0 && <MutedText>no episodes yet</MutedText>}
            {rows.slice(0, 32).map(({ eid, status }) => (
              <EpisodeRow
                key={eid}
                eid={eid}
                status={status}
                pending={pendingEid === eid}
                onSave={() => setStatus(eid, "kept")}
                onDiscard={() => setStatus(eid, "rejected")}
              />
            ))}
            {rows.length > 32 && (
              <MutedText size={panelTheme.fontHint}>
                showing 32 of {rows.length} — use the desktop dashboard for full curation
              </MutedText>
            )}
          </Col>
        </Col>
      )}
    </Container>
  )
}

function EpisodeRow({
  eid,
  status,
  pending,
  onSave,
  onDiscard,
}: {
  eid: number
  status: string
  pending: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  const color =
    status === "kept" || status === "promoted"
      ? panelTheme.okGreen
      : status === "rejected"
        ? panelTheme.errorRed
        : panelTheme.inactiveGray
  return (
    <Row gap={panelTheme.colGap} alignItems="center">
      <Text fontSize={panelTheme.fontMono} color={panelTheme.subtleText}>
        {String(eid).padStart(4, "0")}
      </Text>
      <Pill label="" color={color} value={status} />
      <Btn label="Save" pending={pending} disabled={pending} onClick={onSave} />
      <Btn
        label="Discard"
        pending={pending}
        disabled={pending}
        onClick={onDiscard}
        variant="danger"
      />
    </Row>
  )
}

function DatasetInput({
  value,
  onValueChange,
  placeholder,
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Container
      backgroundColor={panelTheme.inputBg}
      borderRadius={0.003}
      paddingX={panelTheme.padBtn}
      paddingY={panelTheme.padBtn * 0.5}
      borderWidth={0.0005}
      borderColor={panelTheme.inputBorder}
      flexGrow={1}
      flexBasis={0}
    >
      <Input
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        fontSize={panelTheme.fontBtn}
        color={panelTheme.text}
      />
    </Container>
  )
}
