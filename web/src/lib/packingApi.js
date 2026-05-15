import { getPackSearchConfig } from "./packing/packEnv";

/**
 * Run packing via POST /api/pack (Python env2.ipynb backend).
 * @param {{ boxes: object[], container: object, algorithm: string | null }} params
 */
export async function packViaApi({ boxes, container, algorithm }) {
  const cfg = getPackSearchConfig();
  const res = await fetch("/api/pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boxes,
      container,
      algorithm,
      config: {
        saIterations: cfg.sa.iterations,
        saInitialT: cfg.sa.initialT,
        saAlpha: cfg.sa.alpha,
        gaMaxEvals: cfg.ga.maxEvals,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.detail || `Pack API failed (${res.status})`);
  }
  return data;
}
