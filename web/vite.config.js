import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { createApiApp } from "./server/createApiApp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dev: mount API on the same port as Vite so nothing conflicts with an old process on 3001.
export default defineConfig({
  plugins: [
    react(),
    {
      name: "api-dev-middleware",
      configureServer(server) {
        server.middlewares.use(createApiApp());
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
