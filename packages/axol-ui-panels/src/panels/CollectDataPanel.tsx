// @almond/axol-ui-panels — CollectDataPanel
// papa-1
//
// Two text inputs (repo_id, task) + Start/Stop buttons against
// /api/collect-data/start and /api/collect-data/stop. Running state from
// /api/status's collect_data.running (1 Hz). Inputs persist to localStorage
// under `axol-ui-panels.collect-data.repo_id` and `.task`.

import { useState } from "react"
import { Container, Input, Text } from "@react-three/uikit"
import { postForm } from "../api"
import { useEndpointPolling } from "../useEndpointPolling"
import { useLocalStorageState } from "../useLocalStorageState"
import { panelTheme } from "../theme"
import { Btn, Pill, KV, Col, Row, ErrorText, MutedText, Heading } from "../widgets"

interface StatusData {
  collect_data: { running: boolean; pids: number[] }
  zed_stream: { running: boolean; box_reachable: boolean; direct_ip: string }
}

const LS_KEY_REPO = "axol-ui-panels.collect-data.repo_id"
const LS_KEY_TASK = "axol-ui-panels.collect-data.task"

export function CollectDataPanel({ width, height }: { width: number; height: number }) {
  const { data, error, refetch, unavailable } = useEndpointPolling<StatusData>("/api/status", {
    intervalMs: 1000,
  })
  const [repoId, setRepoId] = useLocalStorageState<string>(LS_KEY_REPO, "")
  const [task, setTask] = useLocalStorageState<string>(LS_KEY_TASK, "")
  const [busy, setBusy] = useState<"start" | "stop" | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)

  const running = !!data?.collect_data.running
  const zedHost = data?.zed_stream.direct_ip ?? ""

  const onStart = async () => {
    setActionErr(null)
    if (!repoId.includes("/")) {
      setActionErr("repo_id must be <owner>/<name>")
      return
    }
    if (!task.trim()) {
      setActionErr("task is required")
      return
    }
    setBusy("start")
    try {
      await postForm("/api/collect-data/start", {
        repo_id: repoId,
        task: task,
        ...(zedHost ? { zed_host: zedHost } : {}),
      })
      refetch()
    } catch (e) {
      setActionErr((e as Error).message.slice(0, 100))
    } finally {
      setBusy(null)
    }
  }
  const onStop = async () => {
    setBusy("stop")
    setActionErr(null)
    try {
      await postForm("/api/collect-data/stop")
      refetch()
    } catch (e) {
      setActionErr((e as Error).message.slice(0, 100))
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
      <Heading>Collect Data</Heading>

      {unavailable && <MutedText>endpoint unavailable</MutedText>}
      {error && !data && <ErrorText>{error.message.slice(0, 80)}</ErrorText>}
      {actionErr && <ErrorText>{actionErr}</ErrorText>}

      <Col gap={panelTheme.rowGap}>
        <Row gap={panelTheme.colGap}>
          <Pill
            label="State"
            color={running ? panelTheme.okGreen : panelTheme.inactiveGray}
            value={running ? "recording" : "idle"}
          />
        </Row>

        <Col gap={panelTheme.rowGap * 0.5}>
          <Text fontSize={panelTheme.fontLabel} color={panelTheme.subtleText}>
            repo_id (owner/name)
          </Text>
          <LabeledInput value={repoId} onValueChange={setRepoId} placeholder="user/dataset" />
        </Col>

        <Col gap={panelTheme.rowGap * 0.5}>
          <Text fontSize={panelTheme.fontLabel} color={panelTheme.subtleText}>
            task
          </Text>
          <LabeledInput value={task} onValueChange={setTask} placeholder="pick up the block" />
        </Col>

        {zedHost && <KV label="zed_host" value={zedHost} />}

        <Row gap={panelTheme.colGap}>
          <Btn
            label={busy === "start" ? "Starting…" : "Start"}
            variant="primary"
            pending={busy === "start"}
            disabled={busy !== null || running || !repoId || !task}
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
    </Container>
  )
}

function LabeledInput({
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
      paddingY={panelTheme.padBtn * 0.6}
      borderWidth={0.0005}
      borderColor={panelTheme.inputBorder}
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
