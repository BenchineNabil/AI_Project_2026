import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { createApiApp } from "./server/createApiApp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Same directory as `environment/env ahmed … .ipynb` — place `.env` / `.env.local` here for VITE_* keys. */
const envDir = path.resolve(__dirname, "../environment");

// Dev: mount API on the same port as Vite so nothing conflicts with an old process on 3001.
export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, envDir, "");
  for (const [k, v] of Object.entries(loaded)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  return {
    envDir,
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
  };
});
