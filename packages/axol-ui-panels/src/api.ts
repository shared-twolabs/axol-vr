// @almond/axol-ui-panels — api wrapper
// papa-1
//
// Resolves the dashboard server base URL and provides a small fetch wrapper
// with timeout + JSON parse + Form-encoded body support.
//
// Base URL resolution:
//   1. VITE_DASHBOARD_BASE_URL build-time env override
//   2. Empty string (same-origin) — works in production (FastAPI serves the
//      built bundle) AND dev (vite proxy forwards /api + /info to FastAPI)
//
// This is a plain function, not a hook — the value never changes after page
// load, so a hook would be pure ceremony.

declare global {
  interface ImportMetaEnv {
    readonly VITE_DASHBOARD_BASE_URL?: string
  }
  // augment, do not redeclare
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export function getApiBase(): string {
  // Vite injects import.meta.env at build time. Guard for non-Vite environments
  // (tests, SSR) by feature-testing.
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      const override = import.meta.env.VITE_DASHBOARD_BASE_URL
      if (override) return override.replace(/\/+$/, "")
    }
  } catch {
    /* import.meta unavailable */
  }
  return ""
}

/** React hook form for consumers that prefer the convention; same value. */
export function useApiBase(): string {
  return getApiBase()
}

export interface CallOptions {
  /** AbortSignal to bind the fetch to. Pass `panel.lifetime.signal`. */
  signal?: AbortSignal
  /** Override the default 10 s timeout. */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

/**
 * GET a JSON endpoint. Throws an Error with status info on non-2xx.
 * Aborts after `timeoutMs` even without an external signal.
 */
export async function getJson<T = unknown>(path: string, opts: CallOptions = {}): Promise<T> {
  const url = `${getApiBase()}${path}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const linkedAbort = () => ctrl.abort()
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort()
    else opts.signal.addEventListener("abort", linkedAbort, { once: true })
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new ApiError(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`, res.status)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
    if (opts.signal) opts.signal.removeEventListener("abort", linkedAbort)
  }
}

/**
 * POST a form-encoded body (matches the FastAPI server's `Form(...)` params).
 * Pass `body` as a plain object — values are URL-encoded.
 */
export async function postForm<T = unknown>(
  path: string,
  body: Record<string, string | number | boolean> = {},
  opts: CallOptions = {}
): Promise<T> {
  const url = `${getApiBase()}${path}`
  const form = new URLSearchParams()
  for (const [k, v] of Object.entries(body)) {
    form.set(k, String(v))
  }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const linkedAbort = () => ctrl.abort()
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort()
    else opts.signal.addEventListener("abort", linkedAbort, { once: true })
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new ApiError(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`, res.status)
    }
    // Some POST endpoints return JSON, some return empty 200. Try both.
    const text = await res.text()
    if (!text) return {} as T
    try {
      return JSON.parse(text) as T
    } catch {
      return text as unknown as T
    }
  } finally {
    clearTimeout(t)
    if (opts.signal) opts.signal.removeEventListener("abort", linkedAbort)
  }
}

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/** True if the error is a 404 — we treat that as "endpoint unavailable" and
 *  stop retrying. */
export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404
}

/** Build a cache-busted URL suitable for `<Image src=...>` polling. */
export function bustedFrameUrl(path: string, t: number = Date.now()): string {
  const sep = path.includes("?") ? "&" : "?"
  return `${getApiBase()}${path}${sep}t=${t}`
}
