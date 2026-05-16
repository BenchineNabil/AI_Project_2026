/**
 * Web-only settings (CSV import units). Packing search parameters live in env2.ipynb.
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
