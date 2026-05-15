/** @returns {number} in [0, maxExclusive) */
function randomBelow(maxExclusive) {
  if (maxExclusive <= 1) return 0;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    const lim = 0x100000000 - (0x100000000 % maxExclusive);
    let x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= lim);
    return x % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

/**
 * Random permutation of 0..n-1 (Fisher–Yates, crypto RNG when available).
 * @param {number} n
 * @returns {number[]}
 */
export function shuffleIndices(n) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = randomBelow(i + 1);
    const t = idx[i];
    idx[i] = idx[j];
    idx[j] = t;
  }
  return idx;
}
