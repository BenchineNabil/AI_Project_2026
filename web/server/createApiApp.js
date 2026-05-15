/**
 * Shared Express app for /api and /api/pack.
 * Packing runs Python against environment/env2.ipynb (see server/python/).
 */
import express from "express";
import cors from "cors";
import { runPythonPack, ENV2_NOTEBOOK } from "./runPythonPack.js";
import { existsSync } from "fs";

export function createApiApp() {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "12mb" }));

  app.get("/api", (_req, res) => {
    res.json({
      message: "VoxelBerth API",
      packEngine: "env2.ipynb",
      notebookPath: ENV2_NOTEBOOK,
      notebookFound: existsSync(ENV2_NOTEBOOK),
    });
  });

  app.post("/api/pack", async (req, res) => {
    try {
      const { boxes, container, algorithm, config } = req.body;

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

      const algo =
        algorithm === "sa" || algorithm === "genetic" || algorithm === "greedy-hc"
          ? algorithm
          : null;

      if (!algo) {
        return res.status(400).json({
          error: "algorithm is required: sa, genetic, or greedy-hc",
        });
      }

      if (!existsSync(ENV2_NOTEBOOK)) {
        return res.status(503).json({
          error: `env2.ipynb not found at ${ENV2_NOTEBOOK}`,
        });
      }

      const result = await runPythonPack({
        boxes,
        container,
        algorithm: algo,
        config: config ?? {},
      });

      return res.json(result);
    } catch (error) {
      console.error("Packing API error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error during packing",
      });
    }
  });

  return app;
}
