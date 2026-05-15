/**
 * Packing meta-search tuning. Values are read from Vite env (files in repo `environment/`
 * when `vite.config.js` sets `envDir` there). Falls back to defaults aligned with
 * `environment/env ahmed … .ipynb` (SA / GA parameters).
 */

function envSource() {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env;
  }
  if (typeof globalThis.process !== "undefined" && globalThis.process?.env) {
    return globalThis.process.env;
  }
  return {};
}

function num(key, fallback) {
  const raw = envSource()[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function int(key, fallback) {
  return Math.floor(num(key, fallback));
}

/** @returns {number | undefined} */
function optionalSeed() {
  const s = int("VITE_PACK_RANDOM_SEED", NaN);
  return Number.isFinite(s) ? s : undefined;
}

/**
 * Scale applied to CSV length/width/height so they match container units (meters).
 * Repo `data/data.csv` uses centimeters (e.g. 45 = 0.45 m). Set `VITE_CSV_DIMENSION_UNIT=m`
 * in `environment/.env` if your file already uses meters.
 */
export function getCsvLengthScale() {
  const raw = String(envSource().VITE_CSV_DIMENSION_UNIT ?? "cm").trim().toLowerCase();
  if (raw === "m" || raw === "meter" || raw === "meters") return 1;
  if (raw === "cm" || raw === "centimeter" || raw === "centimeters") return 0.01;
  if (raw === "mm" || raw === "millimeter" || raw === "millimeters") return 0.001;
  return 0.01;
}

/**
 * Stability tuning from `environment/.env` (same semantics as env ahmed notebook).
 * All three must be set or this returns null (callers show "—").
 */
export function getStabilityEnvConfig() {
  const e = envSource();
  const minOverlap = e.VITE_STABILITY_MIN_OVERLAP_RATIO;
  const wImp = e.VITE_STABILITY_WEIGHT_IMPORTANCE;
  const sImp = e.VITE_STABILITY_SUPPORT_IMPORTANCE;
  if (
    minOverlap === undefined ||
    minOverlap === "" ||
    wImp === undefined ||
    wImp === "" ||
    sImp === undefined ||
    sImp === ""
  ) {
    return null;
  }
  const minOverlapRatio = Number(minOverlap);
  const weightImportance = Number(wImp);
  const supportImportance = Number(sImp);
  if (
    !Number.isFinite(minOverlapRatio) ||
    !Number.isFinite(weightImportance) ||
    !Number.isFinite(supportImportance)
  ) {
    return null;
  }
  return { minOverlapRatio, weightImportance, supportImportance };
}

export function getPackSearchConfig() {
  const wUtil = num("VITE_PACK_W_UTIL", 0.7);
  const wStab = num("VITE_PACK_W_STAB", 0.3);
  return {
    wUtil,
    wStab,
    randomSeed: optionalSeed(),
    sa: {
      iterations: Math.max(50, int("VITE_SA_ITERATIONS", 1000)),
      initialT: Math.max(1e-6, num("VITE_SA_INITIAL_T", 1000)),
      alpha: Math.min(0.99999, Math.max(0.5, num("VITE_SA_ALPHA", 0.95))),
    },
    ga: {
      maxEvals: Math.max(500, int("VITE_GA_MAX_EVALS", 8000)),
      crossoverRate: Math.min(1, Math.max(0, num("VITE_GA_CROSSOVER_RATE", 0.85))),
    },
  };
}
