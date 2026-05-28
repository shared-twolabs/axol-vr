// @almond/axol-ui — vitest config
// tango-1: minimal happy-dom test environment for the registry hook.

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
})
