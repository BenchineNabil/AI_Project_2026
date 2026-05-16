/**
 * Run packing via POST /api/pack (Python env2.ipynb backend).
 * Search parameters come entirely from env2 class defaults — not from Vite env.
 * @param {{ boxes: object[], container: object, algorithm: string | null }} params
 */
export async function packViaApi({ boxes, container, algorithm }) {
  const res = await fetch("/api/pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boxes, container, algorithm }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.detail || `Pack API failed (${res.status})`);
  }
  return data;
}

/** Algorithms exposed by env2 (WEB_PACK_ALGORITHMS or built-in defaults). */
export async function fetchPackAlgorithms() {
  const res = await fetch("/api/algorithms");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to load algorithms (${res.status})`);
  }
  return data.algorithms ?? [];
}
