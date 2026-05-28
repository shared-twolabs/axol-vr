// @almond/axol-ui — useLayoutPersistence
// scaffolder-alpha: debounced localStorage save/load. The storage key
// embeds a schema version so we can invalidate stored layouts when the
// state shape changes.

import { useEffect, useRef } from "react"
import type { StoredLayoutV1, WindowState } from "../types"
import type { WindowRegistry } from "./useWindowState"

const STORAGE_VERSION = 1
const DEBOUNCE_MS = 500

export interface LayoutPersistenceOptions {
  /** localStorage key; consumer can override per scene. */
  storageKey?: string
  /** Disable read on mount (useful in tests). */
  disabled?: boolean
}

/**
 * Wire the registry up to localStorage. On mount: read once and hydrate.
 * On every subsequent mutation: debounce-save to localStorage.
 */
export function useLayoutPersistence(
  registry: WindowRegistry,
  options: LayoutPersistenceOptions = {}
): void {
  const storageKey = options.storageKey ?? "axol-ui-layout-v1"
  const didHydrate = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- One-time hydration on mount ----
  useEffect(() => {
    if (options.disabled) return
    if (didHydrate.current) return
    didHydrate.current = true

    if (typeof window === "undefined" || !window.localStorage) return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredLayoutV1
      if (parsed.version !== STORAGE_VERSION) return
      if (!Array.isArray(parsed.windows)) return
      registry.hydrate(parsed.windows)
    } catch {
      // Corrupt entry — drop it and start over.
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Save on every state change, debounced ----
  useEffect(() => {
    if (options.disabled) return
    if (typeof window === "undefined" || !window.localStorage) return

    const scheduleSave = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const payload: StoredLayoutV1 = {
          version: STORAGE_VERSION,
          windows: Array.from(registry.states.values()) as WindowState[],
        }
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(payload))
        } catch {
          // Quota or private mode — silent
        }
      }, DEBOUNCE_MS)
    }

    // Re-subscribe whenever the registry api object changes. The registry
    // emits via useSyncExternalStore; we mirror it here with our own listener.
    const dispose = subscribeRegistry(registry, scheduleSave)
    return () => {
      dispose()
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [registry, storageKey, options.disabled])
}

/**
 * Subscribe to the registry's underlying store. We bridge through the public
 * api by polling on a microtask — but to avoid that, we leverage that
 * `useWindowRegistry` returns a stable object whose getters read live state.
 * Here we poll on every animation frame; this is cheap (a few comparisons)
 * and only runs while the component is mounted.
 */
function subscribeRegistry(registry: WindowRegistry, cb: () => void): () => void {
  let lastFingerprint = fingerprint(registry)
  let raf = 0
  const tick = () => {
    const next = fingerprint(registry)
    if (next !== lastFingerprint) {
      lastFingerprint = next
      cb()
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

function fingerprint(registry: WindowRegistry): string {
  let s = ""
  for (const state of registry.states.values()) {
    s += `${state.id}:${state.open ? 1 : 0}:${state.opacity.toFixed(3)}:`
    s += `${state.position[0].toFixed(3)},${state.position[1].toFixed(3)},${state.position[2].toFixed(3)};`
  }
  return s
}
