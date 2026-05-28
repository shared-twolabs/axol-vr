// @almond/axol-ui-panels — panel theme tokens
// papa-1
//
// Re-export and extend axol-ui's theme with panel-specific tokens used by
// every panel's button / status pill / row layout.

import { theme as baseTheme } from "@almond/axol-ui"

export const panelTheme = {
  ...baseTheme,

  // ----- semantic status colors (matches dashboard "stoplight" pattern) -----
  okGreen: "#4ade80",
  warnAmber: "#facc15",
  errorRed: "#f87171",
  inactiveGray: "#52525b",

  // ----- button styling -----
  btnBg: "#27272a",
  btnBgHover: "#3f3f46",
  btnBgActive: "#1f1f23",
  btnBgPrimary: "#1d4ed8",
  btnBgPrimaryHover: "#2563eb",
  btnBgDanger: "#7f1d1d",
  btnBgDangerHover: "#991b1b",
  btnBgDisabled: "#1a1a1f",
  btnTextDisabled: "#52525b",

  // ----- input styling -----
  inputBg: "#18181b",
  inputBorder: "#3f3f46",
  inputBorderFocus: "#facc15",

  // ----- spacing tokens (metres in the world) -----
  rowGap: 0.008,
  colGap: 0.008,
  padBody: 0.012,
  padBtn: 0.008,

  // ----- font sizes -----
  fontMono: 0.011, // for numeric pids, paths, ids
  fontLabel: 0.011,
  fontStatus: 0.012,
  fontBtn: 0.012,
} as const

export type PanelTheme = typeof panelTheme
