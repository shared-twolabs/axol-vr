import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import basicSsl from "@vitejs/plugin-basic-ssl"

// Dashboard server (FastAPI) target for /api/* and /info/* proxying in dev.
// Override via VITE_DASHBOARD_URL (e.g. VITE_DASHBOARD_URL=http://10.0.0.5:8080 npm run dev).
const dashboardUrl = process.env.VITE_DASHBOARD_URL ?? "http://localhost:8080"

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    allowedHosts: ["sp-mbp.local"],
    host: true,
    proxy: {
      "/api": { target: dashboardUrl, changeOrigin: true, secure: false },
      "/info": { target: dashboardUrl, changeOrigin: true, secure: false },
    },
  },
})
