import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5176,
    host: true,
    proxy: {
      "/api": {
        target: process.env.CLINICA_API_TARGET || "http://127.0.0.1:4100",
        changeOrigin: true
      },
      "/uploads": {
        target: process.env.CLINICA_API_TARGET || "http://127.0.0.1:4100",
        changeOrigin: true
      }
    }
  }
});
