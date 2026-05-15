/**
 * Standalone API server (e.g. production or when you only want the backend).
 * Tries API_PORT, then scans upward if the port is busy (avoids EADDRINUSE).
 */
import http from "http";
import { createApiApp } from "./createApiApp.js";

const app = createApiApp();
const preferred = parseInt(process.env.API_PORT || "3001", 10);
const maxPort = preferred + 50;

function start(port) {
  if (port > maxPort) {
    console.error(`[api] No free port between ${preferred} and ${maxPort}`);
    process.exit(1);
  }

  const server = http.createServer(app);

  server.once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`[api] port ${port} in use, trying ${port + 1}...`);
      server.close(() => start(port + 1));
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`[api] listening on http://127.0.0.1:${port}`);
  });
}

start(preferred);
