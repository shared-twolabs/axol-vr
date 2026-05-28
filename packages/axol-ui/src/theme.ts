// @almond/axol-ui — theme
// scaffolder-alpha: shared palette/typography, matches axol-vr's hudBg pattern.

export const theme = {
  /** Panel background, very dark for HMD legibility. */
  panelBg: "#0b0b0e",
  /** Header strip background, slightly lighter than panel. */
  headerBg: "#1a1a1f",
  /** Border / outline colour, calm white. */
  border: "#ffffff",
  /** Focus border, yellow to match axol-vr's hover state. */
  focusBorder: "#facc15",
  /** Subtle text (slider hint, secondary labels). */
  subtleText: "#9ca3af",
  /** Primary text on panels. */
  text: "#ffffff",
  /** Dim text for closed windows in the picker. */
  dimText: "#6b7280",
  /** Picker tile background when not focused. */
  tileBg: "#161619",
  /** Picker tile background when focused (highlighted by L thumbstick). */
  tileFocusBg: "#26262b",
  /** Indicator dot for open windows. */
  openIndicator: "#4ade80",

  /** Default panel size in metres. */
  defaultPanelSize: [0.4, 0.3] as [number, number],
  /** Default panel opacity (matches axol-vr hudBg=0.5 but a touch more solid for body content). */
  defaultOpacity: 0.85,
  /** Min/max opacity for the live opacity slider. */
  minOpacity: 0.2,
  maxOpacity: 1.0,
  /** Header strip height (metres). */
  headerHeight: 0.04,
  /** Outline thickness (metres). */
  outlineWidth: 0.002,

  /** Font sizes (metres at default panel size). */
  fontTitle: 0.014,
  fontBody: 0.012,
  fontHint: 0.01,

  /** Picker positioning relative to the active XR camera. */
  pickerOffset: [0, 0.15, -0.6] as [number, number, number],
  /** Picker tile size (metres). */
  pickerTileSize: [0.1, 0.06] as [number, number],
  /** Picker tile gap (metres). */
  pickerTileGap: 0.01,
} as const

export type Theme = typeof theme
