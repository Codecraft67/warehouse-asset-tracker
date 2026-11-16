import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the React dev server (port 5173) forwards API calls and
// image requests to the Flask server (port 5000), so no CORS setup is needed.
const BACKEND = process.env.VITE_BACKEND || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on the LAN so phones can open http://<pc-ip>:5173
    port: 5173,
    proxy: {
      "/api": BACKEND,
      "/uploads": BACKEND,
    },
  },
});
