/**
 * Shared Express app for /api and /api/pack (same handlers as the original Next.js routes).
 * Used by Vite dev middleware (one port) and optionally by server/index.js (standalone).
 */
import express from "express";
import cors from "cors";
import { packBoxes } from "../src/lib/packing/algorithm.js";

export function createApiApp() {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json());

  app.get("/api", (_req, res) => {
    res.json({ message: "Hello, world!" });
  });

  app.post("/api/pack", (req, res) => {
    try {
      const { boxes, container } = req.body;

      if (!boxes || !Array.isArray(boxes)) {
        return res.status(400).json({
          error: "boxes must be an array of BoxInput objects",
        });
      }

      if (!container || typeof container !== "object") {
        return res.status(400).json({
          error: "container must be a ContainerDimensions object",
        });
      }

      if (
        container.length <= 0 ||
        container.width <= 0 ||
        container.height <= 0
      ) {
        return res.status(400).json({
          error: "Container dimensions must be positive numbers",
        });
      }

      for (const box of boxes) {
        if (!box.name || box.length <= 0 || box.width <= 0 || box.height <= 0) {
          return res.status(400).json({
            error: `Invalid box: ${box.name || "unnamed"}`,
          });
        }
      }

      const result = packBoxes(boxes, container);
      return res.json(result);
    } catch (error) {
      console.error("Packing API error:", error);
      return res.status(500).json({
        error: "Internal server error during packing calculation",
      });
    }
  });

  return app;
}
