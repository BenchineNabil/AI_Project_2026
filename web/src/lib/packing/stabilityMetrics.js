import { getStabilityEnvConfig } from "./packEnv.js";

/**
 * @typedef {{ posX: number, posY: number, posZ: number, length: number, width: number, height: number, weight: number, id: string }} PlacedBox
 */

/**
 * Stability metrics aligned with `environment/env ahmed … .ipynb` `evaluate_stability`.
 * Coefficients `MIN_OVERLAP_RATIO`, `WEIGHT_IMPORTANCE`, `SUPPORT_IMPORTANCE` must be
 * supplied via environment (see `getStabilityEnvConfig`); returns null if unset.
 *
 * Coordinate mapping: notebook uses z-up floor at z=0; this app uses y-up with floor at posY=0.
 *
 * @param {PlacedBox[]} placed
 * @returns {{ weight_score: number, support_score: number, stability_score: number } | null}
 */
export function evaluateStabilityForPlaced(placed) {
  if (!placed.length) {
    return { weight_score: 0, support_score: 0, stability_score: 0 };
  }
  const cfg = getStabilityEnvConfig();
  if (!cfg) return null;

  const { minOverlapRatio, weightImportance, supportImportance } = cfg;
  const eps = 1e-6;

  let pairsCorrect = 0;
  let pairsTotal = 0;
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    for (let j = i + 1; j < placed.length; j++) {
      const b = placed[j];
      const wa = a.weight;
      const wb = b.weight;
      const ya = a.posY;
      const yb = b.posY;
      if (wa === wb) {
        pairsCorrect += 1;
      } else if (wa > wb) {
        if (ya <= yb + eps) pairsCorrect += 1;
      } else {
        if (yb <= ya + eps) pairsCorrect += 1;
      }
      pairsTotal += 1;
    }
  }
  const weightScore = pairsTotal > 0 ? (pairsCorrect / pairsTotal) * 100 : 100;

  let supportedCount = 0;
  for (const box of placed) {
    if (Math.abs(box.posY) < eps) {
      supportedCount += 1;
      continue;
    }
    const boxX1 = box.posX;
    const boxX2 = box.posX + box.length;
    const boxZ1 = box.posZ;
    const boxZ2 = box.posZ + box.width;
    const baseArea = box.length * box.width;
    let supportedArea = 0;

    for (const other of placed) {
      if (other.id === box.id) continue;
      const otherTop = other.posY + other.height;
      if (Math.abs(otherTop - box.posY) > eps) continue;
      const ox1 = other.posX;
      const ox2 = other.posX + other.length;
      const oz1 = other.posZ;
      const oz2 = other.posZ + other.width;
      const overlapX = Math.max(0, Math.min(boxX2, ox2) - Math.max(boxX1, ox1));
      const overlapZ = Math.max(0, Math.min(boxZ2, oz2) - Math.max(boxZ1, oz1));
      supportedArea += overlapX * overlapZ;
    }
    const ratio = baseArea > 0 ? supportedArea / baseArea : 0;
    if (ratio >= minOverlapRatio) supportedCount += 1;
  }
  const supportScore = (supportedCount / placed.length) * 100;

  const stabilityScore = weightScore * weightImportance + supportScore * supportImportance;

  return {
    weight_score: Math.round(weightScore * 100) / 100,
    support_score: Math.round(supportScore * 100) / 100,
    stability_score: Math.round(stabilityScore * 100) / 100,
  };
}

/**
 * @param {{ weight_score: number, support_score: number, stability_score: number } | null} stability
 * @param {number} utilization01
 * @param {{ wUtil: number, wStab: number }} packWeights
 */
export function computeResultScore(stability, utilization01, packWeights) {
  if (!stability) return null;
  return (
    Math.round((packWeights.wUtil * utilization01 * 100 + packWeights.wStab * stability.stability_score) * 1000) /
    1000
  );
}
