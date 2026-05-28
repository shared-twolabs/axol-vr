// @almond/axol-ui-panels — shared UI widgets
// papa-1
//
// Small uikit-flavoured widgets reused by every panel. Inline-styled with
// `panelTheme`; no external CSS, no DOM.

import type { ReactNode } from "react"
import { Container, Text } from "@react-three/uikit"
import { panelTheme } from "./theme"

// ---------- Button ----------

export interface BtnProps {
  label: string
  onClick: () => void
  /** Visual variant. */
  variant?: "default" | "primary" | "danger"
  /** Disabled state — onClick is suppressed, colors dim. */
  disabled?: boolean
  /** Optional dot color rendered before the label (running/idle indicator). */
  dotColor?: string
  /** When true, label uses subtleText color (in-flight). */
  pending?: boolean
}

export function Btn(props: BtnProps) {
  const { label, onClick, variant = "default", disabled = false, dotColor, pending = false } = props
  const bg = disabled
    ? panelTheme.btnBgDisabled
    : variant === "primary"
      ? panelTheme.btnBgPrimary
      : variant === "danger"
        ? panelTheme.btnBgDanger
        : panelTheme.btnBg
  const fg = disabled ? panelTheme.btnTextDisabled : panelTheme.text
  return (
    <Container
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      gap={panelTheme.colGap * 0.5}
      paddingX={panelTheme.padBtn * 1.5}
      paddingY={panelTheme.padBtn}
      backgroundColor={bg}
      borderRadius={0.004}
      onClick={() => {
        if (disabled || pending) return
        onClick()
      }}
    >
      {dotColor !== undefined && <Dot color={dotColor} />}
      <Text fontSize={panelTheme.fontBtn} color={pending ? panelTheme.subtleText : fg}>
        {label}
      </Text>
    </Container>
  )
}

// ---------- Pill (status badge) ----------

export interface PillProps {
  label: string
  color: string
  /** Optional value text rendered after the label. */
  value?: string
}

export function Pill({ label, color, value }: PillProps) {
  return (
    <Container
      flexDirection="row"
      alignItems="center"
      gap={panelTheme.colGap * 0.5}
      paddingX={panelTheme.padBtn}
      paddingY={panelTheme.padBtn * 0.5}
      backgroundColor={panelTheme.headerBg}
      borderRadius={0.004}
    >
      <Dot color={color} />
      <Text fontSize={panelTheme.fontLabel} color={panelTheme.text}>
        {label}
      </Text>
      {value !== undefined && (
        <Text fontSize={panelTheme.fontLabel} color={panelTheme.subtleText}>
          {value}
        </Text>
      )}
    </Container>
  )
}

// ---------- Dot (status indicator) ----------

export function Dot({ color, size = 0.008 }: { color: string; size?: number }) {
  return (
    <Container
      width={size}
      height={size}
      backgroundColor={color}
      borderRadius={size / 2}
      flexShrink={0}
    />
  )
}

// ---------- Row (horizontal flex with gap) ----------

export function Row({
  children,
  gap = panelTheme.colGap,
  alignItems = "center",
  justifyContent,
  flexWrap,
  paddingX,
}: {
  children: ReactNode
  gap?: number
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch"
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around"
  flexWrap?: "wrap" | "no-wrap" | "wrap-reverse"
  paddingX?: number
}) {
  return (
    <Container
      flexDirection="row"
      gap={gap}
      alignItems={alignItems}
      justifyContent={justifyContent}
      flexWrap={flexWrap}
      paddingX={paddingX}
    >
      {children}
    </Container>
  )
}

// ---------- Col (vertical flex with gap) ----------

export function Col({
  children,
  gap = panelTheme.rowGap,
  flex,
  width,
  height,
  alignItems,
  justifyContent,
  paddingX,
}: {
  children: ReactNode
  gap?: number
  flex?: number
  width?: number | string
  height?: number | string
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch"
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around"
  paddingX?: number
}) {
  return (
    <Container
      flexDirection="column"
      gap={gap}
      flexBasis={flex !== undefined ? 0 : undefined}
      flexGrow={flex}
      width={width as number | undefined}
      height={height as number | undefined}
      alignItems={alignItems}
      justifyContent={justifyContent}
      paddingX={paddingX}
    >
      {children}
    </Container>
  )
}

// ---------- Label : Value paired text ----------

export function KV({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <Container flexDirection="row" gap={panelTheme.colGap * 0.5} alignItems="center">
      <Text fontSize={panelTheme.fontLabel} color={panelTheme.subtleText}>
        {label}
      </Text>
      <Text fontSize={panelTheme.fontLabel} color={valueColor ?? panelTheme.text}>
        {value}
      </Text>
    </Container>
  )
}

// ---------- ErrorText / EmptyText / Placeholder ----------

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <Text fontSize={panelTheme.fontLabel} color={panelTheme.errorRed}>
      {children}
    </Text>
  )
}

export function MutedText({ children, size }: { children: ReactNode; size?: number }) {
  return (
    <Text fontSize={size ?? panelTheme.fontLabel} color={panelTheme.subtleText}>
      {children}
    </Text>
  )
}

// ---------- Heading (panel section header) ----------

export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text fontSize={panelTheme.fontStatus} color={panelTheme.text}>
      {children}
    </Text>
  )
}
