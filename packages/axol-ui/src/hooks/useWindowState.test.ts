// @almond/axol-ui — useWindowRegistry tests
// tango-1: covers the registry's API surface (open/close/toggle/clamp/cycle/hydrate)
// before the package gets broader consumption.
//
// Strategy: useWindowRegistry returns a stable `api` object whose getters read
// live from the underlying store, and whose mutators are direct method calls.
// We render the hook with @testing-library/react#renderHook and exercise the
// api via act(). useLayoutPersistence is disabled in most tests so localStorage
// side-effects don't bleed across cases.

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useWindowRegistry } from "./useWindowState"
import { useLayoutPersistence } from "./useLayoutPersistence"
import type { WindowDef, WindowState } from "../types"
import { theme } from "../theme"
import type { ComponentType } from "react"

// A throwaway Body component for the WindowDef type contract.
const EmptyBody: ComponentType<{ width: number; height: number }> = () => null

const defaultDefs: WindowDef[] = [
  { id: "alpha", title: "Alpha", Body: EmptyBody },
  { id: "bravo", title: "Bravo", Body: EmptyBody, defaultOpen: true },
  { id: "charlie", title: "Charlie", Body: EmptyBody },
]

function makeRegistry(defs: WindowDef[] = defaultDefs) {
  return renderHook(() => useWindowRegistry(defs))
}

// Helper: bypass React's stable-identity check that fires when buildInitialState
// is called twice. Each test gets a fresh hook instance, so we don't need to
// clear in-memory state — but localStorage we DO need to clear so the
// persistence test doesn't see cruft from a prior run.
beforeEach(() => {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.clear()
  }
})
afterEach(() => {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.clear()
  }
})

describe("useWindowRegistry", () => {
  describe("open / close / toggle", () => {
    it("open(id) flips state.open to true", () => {
      const { result } = makeRegistry()
      act(() => {
        result.current.open("alpha")
      })
      expect(result.current.states.get("alpha")?.open).toBe(true)
    })

    it("open(id) is idempotent on re-open", () => {
      const { result } = makeRegistry()
      act(() => {
        result.current.open("alpha")
      })
      const firstZOrder = result.current.states.get("alpha")?.zOrder
      act(() => {
        result.current.open("alpha")
      })
      // No mutation expected — same open state, same zOrder.
      expect(result.current.states.get("alpha")?.open).toBe(true)
      expect(result.current.states.get("alpha")?.zOrder).toBe(firstZOrder)
    })

    it("close(id) flips state.open to false", () => {
      const { result } = makeRegistry()
      // bravo defaultOpen=true
      expect(result.current.states.get("bravo")?.open).toBe(true)
      act(() => {
        result.current.close("bravo")
      })
      expect(result.current.states.get("bravo")?.open).toBe(false)
    })

    it("toggle(id) flips state.open both directions", () => {
      const { result } = makeRegistry()
      expect(result.current.states.get("alpha")?.open).toBe(false)
      act(() => {
        result.current.toggle("alpha")
      })
      expect(result.current.states.get("alpha")?.open).toBe(true)
      act(() => {
        result.current.toggle("alpha")
      })
      expect(result.current.states.get("alpha")?.open).toBe(false)
    })
  })

  describe("setOpacity clamping", () => {
    it("clamps below theme.minOpacity (0.2)", () => {
      const { result } = makeRegistry()
      act(() => {
        result.current.setOpacity("alpha", 0.05)
      })
      expect(result.current.states.get("alpha")?.opacity).toBe(theme.minOpacity)
    })

    it("clamps above theme.maxOpacity (1.0)", () => {
      const { result } = makeRegistry()
      act(() => {
        result.current.setOpacity("alpha", 2.5)
      })
      expect(result.current.states.get("alpha")?.opacity).toBe(theme.maxOpacity)
    })

    it("passes through values within the legal range", () => {
      const { result } = makeRegistry()
      act(() => {
        result.current.setOpacity("alpha", 0.65)
      })
      expect(result.current.states.get("alpha")?.opacity).toBeCloseTo(0.65, 5)
    })
  })

  describe("setFocused", () => {
    it("updates focused and leaves other state alone", () => {
      const { result } = makeRegistry()
      const charliePos = result.current.states.get("charlie")?.position
      act(() => {
        result.current.setFocused("charlie")
      })
      expect(result.current.focused).toBe("charlie")
      // Other windows' opens / positions are untouched.
      expect(result.current.states.get("alpha")?.open).toBe(false)
      expect(result.current.states.get("bravo")?.open).toBe(true)
      expect(result.current.states.get("charlie")?.position).toEqual(charliePos)
    })

    it("setFocused(null) clears the focus", () => {
      const { result } = makeRegistry()
      act(() => {
        result.current.setFocused("alpha")
      })
      expect(result.current.focused).toBe("alpha")
      act(() => {
        result.current.setFocused(null)
      })
      expect(result.current.focused).toBeNull()
    })
  })

  describe("cycleFocus", () => {
    it("cycleFocus(+1) advances forward through the def order", () => {
      const { result } = makeRegistry()
      act(() => {
        result.current.setFocused("alpha")
      })
      act(() => {
        result.current.cycleFocus(1)
      })
      expect(result.current.focused).toBe("bravo")
    })

    it("cycleFocus(+1) wraps past the last window back to first", () => {
      const { result } = makeRegistry()
      act(() => {
        result.current.setFocused("charlie")
      })
      act(() => {
        result.current.cycleFocus(1)
      })
      expect(result.current.focused).toBe("alpha")
    })

    it("cycleFocus(-1) wraps backward past first to last", () => {
      const { result } = makeRegistry()
      act(() => {
        result.current.setFocused("alpha")
      })
      act(() => {
        result.current.cycleFocus(-1)
      })
      expect(result.current.focused).toBe("charlie")
    })

    it("cycleFocus over an empty registry does not crash", () => {
      const { result } = makeRegistry([])
      expect(() => {
        act(() => {
          result.current.cycleFocus(1)
        })
      }).not.toThrow()
      expect(result.current.focused).toBeNull()
    })

    it("cycleFocus(+1) from null focus picks the first def", () => {
      const { result } = makeRegistry()
      expect(result.current.focused).toBeNull()
      act(() => {
        result.current.cycleFocus(1)
      })
      expect(result.current.focused).toBe("alpha")
    })

    it("cycleFocus(-1) from null focus picks the last def", () => {
      const { result } = makeRegistry()
      expect(result.current.focused).toBeNull()
      act(() => {
        result.current.cycleFocus(-1)
      })
      expect(result.current.focused).toBe("charlie")
    })
  })

  describe("bringToFront", () => {
    it("puts target window's zOrder strictly above all others", () => {
      const { result } = makeRegistry()
      // Open alpha and charlie so they have non-zero zOrders.
      act(() => {
        result.current.open("alpha")
      })
      act(() => {
        result.current.open("charlie")
      })
      // bravo started defaultOpen — its zOrder is whatever buildInitialState gave it.
      act(() => {
        result.current.bringToFront("bravo")
      })
      const bravoZ = result.current.states.get("bravo")?.zOrder ?? -1
      const alphaZ = result.current.states.get("alpha")?.zOrder ?? -1
      const charlieZ = result.current.states.get("charlie")?.zOrder ?? -1
      expect(bravoZ).toBeGreaterThan(alphaZ)
      expect(bravoZ).toBeGreaterThan(charlieZ)
    })

    it("bringToFront on an unknown id is a no-op", () => {
      const { result } = makeRegistry()
      expect(() => {
        act(() => {
          result.current.bringToFront("nonexistent")
        })
      }).not.toThrow()
    })
  })

  describe("resetLayout", () => {
    it("restores defaults (position, opacity, open) for all windows", () => {
      const { result } = makeRegistry()
      // Mutate everything.
      act(() => {
        result.current.open("alpha")
        result.current.close("bravo")
        result.current.setOpacity("alpha", 0.3)
        result.current.setPosition("charlie", [9, 9, 9])
        result.current.setFocused("alpha")
      })
      // Reset.
      act(() => {
        result.current.resetLayout()
      })
      // bravo was defaultOpen=true — should be open again.
      expect(result.current.states.get("bravo")?.open).toBe(true)
      // alpha was defaultOpen=false — should be closed.
      expect(result.current.states.get("alpha")?.open).toBe(false)
      // alpha opacity is back to theme default.
      expect(result.current.states.get("alpha")?.opacity).toBeCloseTo(theme.defaultOpacity, 5)
      // charlie's position is back to a position from makeInitialPosition.
      const charliePos = result.current.states.get("charlie")?.position
      expect(charliePos).toBeDefined()
      expect(charliePos).not.toEqual([9, 9, 9])
      // Focus is cleared.
      expect(result.current.focused).toBeNull()
    })
  })

  describe("setPosition", () => {
    it("updates position to the supplied 3-tuple", () => {
      const { result } = makeRegistry()
      act(() => {
        result.current.setPosition("alpha", [1.5, -0.3, -1.2])
      })
      expect(result.current.states.get("alpha")?.position).toEqual([1.5, -0.3, -1.2])
    })
  })

  describe("hydrate (direct) — registry method", () => {
    it("restores supplied WindowState[] over the live store", () => {
      const { result } = makeRegistry()
      const incoming: WindowState[] = [
        {
          id: "alpha",
          open: true,
          position: [2, 2, 2],
          size: theme.defaultPanelSize,
          opacity: 0.7,
          zOrder: 5,
        },
      ]
      act(() => {
        result.current.hydrate(incoming)
      })
      const alpha = result.current.states.get("alpha")
      expect(alpha?.open).toBe(true)
      expect(alpha?.position).toEqual([2, 2, 2])
      expect(alpha?.opacity).toBeCloseTo(0.7, 5)
      expect(alpha?.zOrder).toBe(5)
    })

    it("ignores incoming entries for unknown ids (no crash, no insertion)", () => {
      const { result } = makeRegistry()
      const incoming: WindowState[] = [
        {
          id: "zulu-unknown",
          open: true,
          position: [0, 0, 0],
          size: theme.defaultPanelSize,
          opacity: 0.5,
          zOrder: 9,
        },
      ]
      expect(() => {
        act(() => {
          result.current.hydrate(incoming)
        })
      }).not.toThrow()
      expect(result.current.states.has("zulu-unknown")).toBe(false)
    })

    it("clamps incoming opacity into the legal range", () => {
      const { result } = makeRegistry()
      const incoming: WindowState[] = [
        {
          id: "alpha",
          open: true,
          position: [0, 0, 0],
          size: theme.defaultPanelSize,
          opacity: 5.0, // out of range
          zOrder: 1,
        },
      ]
      act(() => {
        result.current.hydrate(incoming)
      })
      expect(result.current.states.get("alpha")?.opacity).toBe(theme.maxOpacity)
    })
  })

  describe("hydration via localStorage (paired with useLayoutPersistence)", () => {
    it("loads pre-seeded layout-v1 JSON on mount", async () => {
      const seeded = {
        version: 1,
        windows: [
          {
            id: "alpha",
            open: true,
            position: [0.5, 0.6, -0.7],
            size: theme.defaultPanelSize,
            opacity: 0.45,
            zOrder: 3,
          },
        ],
      }
      window.localStorage.setItem("axol-ui-layout-v1", JSON.stringify(seeded))

      const { result } = renderHook(() => {
        const registry = useWindowRegistry(defaultDefs)
        // Persistence enabled — useEffect on mount runs hydrate(parsed.windows).
        useLayoutPersistence(registry)
        return registry
      })

      // useEffect hydrate fires synchronously enough for the first read here;
      // wait a microtask for safety.
      await act(async () => {
        await Promise.resolve()
      })

      const alpha = result.current.states.get("alpha")
      expect(alpha?.position).toEqual([0.5, 0.6, -0.7])
      expect(alpha?.opacity).toBeCloseTo(0.45, 5)
      expect(alpha?.open).toBe(true)
    })

    it("falls back to defaults on malformed JSON (no throw, removes corrupt key)", async () => {
      window.localStorage.setItem("axol-ui-layout-v1", "{not valid json")

      let renderResult: ReturnType<typeof renderHook> | null = null
      expect(() => {
        renderResult = renderHook(() => {
          const registry = useWindowRegistry(defaultDefs)
          useLayoutPersistence(registry)
          return registry
        })
      }).not.toThrow()

      await act(async () => {
        await Promise.resolve()
      })

      const r = renderResult!
      // bravo defaultOpen=true; if hydration crashed and somehow set bravo.open=false we'd be in trouble.
      expect(r.result.current.states.get("bravo")?.open).toBe(true)
      // Corrupt entry should be removed by the catch block in useLayoutPersistence.
      expect(window.localStorage.getItem("axol-ui-layout-v1")).toBeNull()
    })

    it("ignores wrong-version payloads (no hydration)", async () => {
      const wrongVersion = {
        version: 99,
        windows: [
          {
            id: "alpha",
            open: true,
            position: [9, 9, 9],
            size: theme.defaultPanelSize,
            opacity: 0.5,
            zOrder: 1,
          },
        ],
      }
      window.localStorage.setItem("axol-ui-layout-v1", JSON.stringify(wrongVersion))

      const { result } = renderHook(() => {
        const registry = useWindowRegistry(defaultDefs)
        useLayoutPersistence(registry)
        return registry
      })

      await act(async () => {
        await Promise.resolve()
      })

      // alpha was NOT hydrated to position [9,9,9] — defaults stand.
      expect(result.current.states.get("alpha")?.position).not.toEqual([9, 9, 9])
    })
  })

  // NB: def reconciliation (renaming/inserting ids on rerender) currently
  // emits during render, which causes a "setState during render" warning
  // when tested through React's renderHook rerender path. The behavior is
  // correct end-to-end (state mutates as expected) but the warning suggests
  // the hook should defer emit to useEffect. Flagged as a follow-up.
})
