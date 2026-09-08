import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on LAN, not just localhost, so it can be reached from a phone
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
