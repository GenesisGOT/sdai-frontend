import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All traffic (REST + CopilotKit streaming) goes to FastAPI
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/copilotkit": {
        target: "http://localhost:8000",
        changeOrigin: true,
        ws: true, // WebSocket / SSE streaming for CopilotKit
      },
    },
  },
});
