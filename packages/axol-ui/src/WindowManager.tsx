// @almond/axol-ui — WindowManager
// scaffolder-alpha: top-level R3F component that wires together:
//   - the registry (useWindowRegistry)
//   - controller input (useControllerInput) — picker toggle, scroll, opacity
//   - persistence (useLayoutPersistence)
//   - one <FloatingPanel> per open window
//   - the <WindowPicker> overlay when active

import { useState } from "react"
import type { WindowDef, WindowState } from "./types"
import { useWindowRegistry } from "./hooks/useWindowState"
import { useControllerInput } from "./hooks/useControllerInput"
import { useLayoutPersistence } from "./hooks/useLayoutPersistence"
import { FloatingPanel } from "./FloatingPanel"
import { WindowPicker } from "./WindowPicker"
import { theme } from "./theme"

export interface WindowManagerProps {
  /** Registered window catalog. Add/remove ids freely — state survives reorders. */
  windows: WindowDef[]
  /** Whether the picker is wired up to the L thumbstick click. Default true. */
  pickerEnabled?: boolean
  /** localStorage key for layout persistence. Default `axol-ui-layout-v1`. */
  layoutStorageKey?: string
}

const OPACITY_SENSITIVITY = 0.8 // 1 unit of stick = +/- 0.8 opacity / sec

export function WindowManager({
  windows,
  pickerEnabled = true,
  layoutStorageKey,
}: WindowManagerProps) {
  const registry = useWindowRegistry(windows)
  const [pickerOpen, setPickerOpen] = useState(false)

  useLayoutPersistence(registry, { storageKey: layoutStorageKey })

  useControllerInput({
    onTogglePicker: () => {
      if (!pickerEnabled) return
      setPickerOpen((v) => !v)
    },
    onScrollLeft: () => {
      if (!pickerOpen) return
      registry.cycleFocus(-1)
    },
    onScrollRight: () => {
      if (!pickerOpen) return
      registry.cycleFocus(1)
    },
    onOpacityDelta: (delta) => {
      // Only adjust opacity while a window is focused. This works both inside
      // and outside the picker overlay (so the user can fine-tune transparency
      // by focusing a panel via picker and then closing the picker).
      const id = registry.focused
      if (!id) return
      const state = registry.states.get(id)
      if (!state) return
      registry.setOpacity(id, state.opacity + delta * OPACITY_SENSITIVITY)
    },
    onResetLayout: () => {
      registry.resetLayout()
    },
    onTriggerEdge: () => {
      // While picker open + focused tile present: select it (open/close window).
      // The actual pointing-at-item path is handled by the tile's onClick.
      // This is the fallback for "trigger pulled while focus is set".
      if (!pickerOpen) return
      const id = registry.focused
      if (id) registry.toggle(id)
    },
  })

  // Snapshot states as a stable array for rendering, sorted by zOrder so that
  // more recently focused windows render last (on top).
  const states: WindowState[] = Array.from(registry.states.values())
    .filter((s) => s.open)
    .sort((a, b) => a.zOrder - b.zOrder)

  return (
    <group>
      {states.map((state) => {
        const def = windows.find((d) => d.id === state.id)
        if (!def) return null
        return (
          <FloatingPanel
            key={state.id}
            state={state}
            def={def}
            focused={registry.focused === state.id}
            onClose={() => registry.close(state.id)}
            onMove={(pos) => registry.setPosition(state.id, pos)}
            onFocus={() => {
              registry.setFocused(state.id)
              registry.bringToFront(state.id)
            }}
          />
        )
      })}
      {pickerEnabled && <WindowPicker visible={pickerOpen} registry={registry} />}
      {/* theme is intentionally re-exported via index — referenced here so tsup */}
      {/* doesn't drop it during dead-code-elimination on the JS output. */}
      {THEME_NONCE}
    </group>
  )
}

// Tiny side-effect-free reference so the bundler keeps theme in the graph.
// (Bundler keeps re-exports anyway; this is defence-in-depth.)
const THEME_NONCE = null as unknown as null
void theme
