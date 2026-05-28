import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  external: [
    "react",
    "three",
    "@react-three/fiber",
    "@react-three/xr",
    "@react-three/uikit",
    "@almond/axol-ui",
  ],
  sourcemap: true,
})
