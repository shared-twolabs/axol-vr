// @almond/axol-ui — useWindowRegistry
// scaffolder-alpha: dependency-free window-state registry.
//
// Uses a single mutable store object + React's external-store API
// (`useSyncExternalStore`) so the manager and any consumer can subscribe
// without pulling zustand into the peer dep set.

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react"
import type { WindowDef, WindowId, WindowState } from "../types"
import { theme } from "../theme"

interface RegistryStore {
  defs: WindowDef[]
  states: Map<WindowId, WindowState>
  focused: WindowId | null
  /** Monotonic zOrder counter; whichever window was most recently opened/focused gets the highest value. */
  zCursor: number
  listeners: Set<() => void>
}

function makeInitialPosition(index: number): [number, number, number] {
  // Scatter windows in a gentle arc in front of the user at eye height.
  const cols = 3
  const col = index % cols
  const row = Math.floor(index / cols)
  const x = (col - (cols - 1) / 2) * 0.45
  const y = 0.1 - row * 0.35
  const z = -0.9
  return [x, y, z]
}

function buildInitialState(defs: WindowDef[]): {
  states: Map<WindowId, WindowState>
  zCursor: number
} {
  const states = new Map<WindowId, WindowState>()
  let zCursor = 0
  defs.forEach((def, index) => {
    const open = def.defaultOpen ?? false
    if (open) zCursor++
    states.set(def.id, {
      id: def.id,
      open,
      position: def.defaultPosition ?? makeInitialPosition(index),
      size: def.defaultSize ?? theme.defaultPanelSize,
      opacity: clampOpacity(def.defaultOpacity ?? theme.defaultOpacity),
      zOrder: open ? zCursor : 0,
    })
  })
  return { states, zCursor }
}

function clampOpacity(value: number): number {
  return Math.min(theme.maxOpacity, Math.max(theme.minOpacity, value))
}

function emit(store: RegistryStore) {
  store.listeners.forEach((cb) => cb())
}

export interface WindowRegistry {
  defs: WindowDef[]
  states: Map<WindowId, WindowState>
  focused: WindowId | null
  open: (id: WindowId) => void
  close: (id: WindowId) => void
  toggle: (id: WindowId) => void
  setOpacity: (id: WindowId, opacity: number) => void
  setPosition: (id: WindowId, pos: [number, number, number]) => void
  setFocused: (id: WindowId | null) => void
  cycleFocus: (direction: 1 | -1) => void
  resetLayout: () => void
  bringToFront: (id: WindowId) => void
  /** Restore states from persistence — only callable from the persistence hook. */
  hydrate: (incoming: WindowState[]) => void
}

/**
 * Build a registry tied to a stable list of window definitions.
 *
 * The registry survives prop reorders of `defs` as long as `id`s are stable.
 * Adding a new id appends with defaults. Removing an id drops the state.
 */
export function useWindowRegistry(defs: WindowDef[]): WindowRegistry {
  const storeRef = useRef<RegistryStore | null>(null)
  if (storeRef.current === null) {
    const { states, zCursor } = buildInitialState(defs)
    storeRef.current = {
      defs,
      states,
      focused: null,
      zCursor,
      listeners: new Set(),
    }
  }
  const store = storeRef.current

  // Reconcile changes to `defs` (ids added/removed) without losing user state.
  const lastDefsRef = useRef<WindowDef[]>(defs)
  if (lastDefsRef.current !== defs) {
    lastDefsRef.current = defs
    const known = new Set(defs.map((d) => d.id))
    // Drop removed
    for (const id of Array.from(store.states.keys())) {
      if (!known.has(id)) store.states.delete(id)
    }
    // Add new
    defs.forEach((def, index) => {
      if (!store.states.has(def.id)) {
        const open = def.defaultOpen ?? false
        if (open) store.zCursor++
        store.states.set(def.id, {
          id: def.id,
          open,
          position: def.defaultPosition ?? makeInitialPosition(index),
          size: def.defaultSize ?? theme.defaultPanelSize,
          opacity: clampOpacity(def.defaultOpacity ?? theme.defaultOpacity),
          zOrder: open ? store.zCursor : 0,
        })
      }
    })
    store.defs = defs
    emit(store)
  }

  const subscribe = useCallback(
    (cb: () => void) => {
      store.listeners.add(cb)
      return () => {
        store.listeners.delete(cb)
      }
    },
    [store]
  )
  const getSnapshot = useCallback(() => {
    // Return a stable token that changes whenever we emit; consumers
    // re-read fields from the registry methods directly. This avoids
    // allocating a new Map on every render.
    return store.zCursor + (store.focused ?? "") + store.states.size
  }, [store])
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const api = useMemo<WindowRegistry>(() => {
    const update = (id: WindowId, patch: Partial<WindowState>) => {
      const prev = store.states.get(id)
      if (!prev) return
      store.states.set(id, { ...prev, ...patch })
      emit(store)
    }
    return {
      get defs() {
        return store.defs
      },
      get states() {
        return store.states
      },
      get focused() {
        return store.focused
      },
      open: (id) => {
        const prev = store.states.get(id)
        if (!prev || prev.open) return
        store.zCursor += 1
        store.states.set(id, { ...prev, open: true, zOrder: store.zCursor })
        store.focused = id
        emit(store)
      },
      close: (id) => {
        const prev = store.states.get(id)
        if (!prev || !prev.open) return
        store.states.set(id, { ...prev, open: false })
        if (store.focused === id) store.focused = null
        emit(store)
      },
      toggle: (id) => {
        const prev = store.states.get(id)
        if (!prev) return
        if (prev.open) {
          api.close(id)
        } else {
          api.open(id)
        }
      },
      setOpacity: (id, opacity) => update(id, { opacity: clampOpacity(opacity) }),
      setPosition: (id, pos) => update(id, { position: pos }),
      setFocused: (id) => {
        store.focused = id
        emit(store)
      },
      cycleFocus: (direction) => {
        const order = store.defs.map((d) => d.id)
        if (order.length === 0) return
        const current = store.focused
        let idx = current ? order.indexOf(current) : -1
        if (idx === -1) {
          idx = direction === 1 ? 0 : order.length - 1
        } else {
          idx = (idx + direction + order.length) % order.length
        }
        store.focused = order[idx] ?? null
        emit(store)
      },
      bringToFront: (id) => {
        const prev = store.states.get(id)
        if (!prev) return
        store.zCursor += 1
        store.states.set(id, { ...prev, zOrder: store.zCursor })
        emit(store)
      },
      resetLayout: () => {
        const { states, zCursor } = buildInitialState(store.defs)
        store.states = states
        store.zCursor = zCursor
        store.focused = null
        emit(store)
      },
      hydrate: (incoming) => {
        let maxZ = 0
        incoming.forEach((restored) => {
          const def = store.defs.find((d) => d.id === restored.id)
          if (!def) return
          const next: WindowState = {
            ...restored,
            opacity: clampOpacity(restored.opacity),
          }
          store.states.set(restored.id, next)
          if (restored.zOrder > maxZ) maxZ = restored.zOrder
        })
        store.zCursor = maxZ
        emit(store)
      },
    }
  }, [store])

  return api
}
