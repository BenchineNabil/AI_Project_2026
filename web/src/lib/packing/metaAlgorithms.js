import { packBoxes, packBoxesWithSequence } from "./algorithm.js";
import { getPackSearchConfig } from "./packEnv.js";

function volume(box) {
  return box.length * box.width * box.height;
}

/** Volume-decreasing indices (Greedy / BFD-style ordering). */
export function greedyVolumeOrderIndices(boxes) {
  return [...boxes.keys()].sort((i, j) => volume(boxes[j]) - volume(boxes[i]));
}

function packForOrder(boxes, container, order) {
  const seq = order.map((i) => boxes[i]);
  return packBoxesWithSequence(seq, container);
}

function combinedScore(result, wUtil, wStab) {
  const stab = result.totalBoxes > 0 ? result.placedCount / result.totalBoxes : 0;
  return wUtil * result.utilization + wStab * stab;
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  if (seed === undefined) {
    return Math.random;
  }
  return mulberry32(seed >>> 0);
}

function runSimulatedAnnealing(boxes, container, cfg, rng) {
  const n = boxes.length;
  if (n === 0) {
    return packBoxesWithSequence([], container);
  }
  const { iterations, initialT, alpha } = cfg;
  const { wUtil, wStab } = getPackSearchConfig();

  let order = greedyVolumeOrderIndices(boxes);
  let currentResult = packForOrder(boxes, container, order);
  let currentScore = combinedScore(currentResult, wUtil, wStab);
  let bestOrder = order.slice();
  let bestResult = currentResult;
  let bestScore = currentScore;
  let T = initialT;

  for (let iter = 0; iter < iterations; iter++) {
    const neighbor = order.slice();
    let i = Math.floor(rng() * n);
    let j = Math.floor(rng() * n);
    if (n > 1) {
      while (i === j) j = Math.floor(rng() * n);
    }
    const tmp = neighbor[i];
    neighbor[i] = neighbor[j];
    neighbor[j] = tmp;

    const neighborResult = packForOrder(boxes, container, neighbor);
    const neighborScore = combinedScore(neighborResult, wUtil, wStab);

    const accept =
      neighborScore > currentScore ||
      (T > 1e-12 && rng() < Math.exp(-(currentScore - neighborScore) / T));

    if (accept) {
      order = neighbor;
      currentResult = neighborResult;
      currentScore = neighborScore;
      if (neighborScore > bestScore) {
        bestScore = neighborScore;
        bestOrder = neighbor.slice();
        bestResult = neighborResult;
      }
    }
    T *= alpha;
  }

  return packForOrder(boxes, container, bestOrder);
}

function oxCrossover(p1, p2, rng) {
  const n = p1.length;
  if (n < 2) return [p1.slice(), p2.slice()];
  let a = Math.floor(rng() * n);
  let b = Math.floor(rng() * n);
  if (a > b) [a, b] = [b, a];

  function build(main, other) {
    const seg = new Set(main.slice(a, b + 1));
    const child = new Array(n);
    for (let k = a; k <= b; k++) child[k] = main[k];
    const holes = [];
    for (let k = 0; k < n; k++) {
      if (k < a || k > b) holes.push(k);
    }
    const remainder = other.filter((gene) => !seg.has(gene));
    for (let t = 0; t < holes.length; t++) child[holes[t]] = remainder[t];
    return child;
  }

  return [build(p1, p2), build(p2, p1)];
}

function swapMutate(chrom, rng) {
  const n = chrom.length;
  const m = chrom.slice();
  if (n < 2) return m;
  for (let s = 0; s < 2; s++) {
    let i = Math.floor(rng() * n);
    let j = Math.floor(rng() * n);
    while (i === j) j = Math.floor(rng() * n);
    const t = m[i];
    m[i] = m[j];
    m[j] = t;
  }
  return m;
}

function runGeneticAlgorithm(boxes, container, cfg, rng) {
  const n = boxes.length;
  if (n === 0) {
    return packBoxesWithSequence([], container);
  }

  const { maxEvals, crossoverRate } = cfg;
  const { wUtil, wStab } = getPackSearchConfig();

  const popSize = Math.min(200, Math.max(20, Math.max(50, n)));
  const generations = Math.max(5, Math.floor(maxEvals / popSize));
  const mutationRate = Math.min(0.3, Math.max(0.02, 2 / Math.sqrt(n)));
  const tournamentK = Math.max(3, Math.round(0.05 * popSize));
  const elitismCount = Math.max(2, Math.round(0.03 * popSize));
  const stagnationLimit = Math.max(20, Math.round(5 / mutationRate));

  const shufflePerm = () => {
    const perm = [...boxes.keys()];
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = perm[i];
      perm[i] = perm[j];
      perm[j] = t;
    }
    return perm;
  };

  let population = [];
  for (let i = 0; i < popSize; i++) {
    population.push(shufflePerm());
  }

  let fitnesses = population.map((c) => combinedScore(packForOrder(boxes, container, c), wUtil, wStab));
  let evalCount = popSize;

  let bestIdx = fitnesses.reduce((bi, f, idx) => (f > fitnesses[bi] ? idx : bi), 0);
  let bestSolution = population[bestIdx].slice();
  let bestScore = fitnesses[bestIdx];
  let stagnationCounter = 0;

  function tournamentSelect() {
    const pickBest = () => {
      let best = Math.floor(rng() * popSize);
      for (let k = 1; k < tournamentK; k++) {
        const j = Math.floor(rng() * popSize);
        if (fitnesses[j] > fitnesses[best]) best = j;
      }
      return population[best].slice();
    };
    return [pickBest(), pickBest()];
  }

  function restart(pop, fit) {
    const sortedIdx = [...pop.keys()].sort((a, b) => fit[b] - fit[a]);
    const survivors = sortedIdx.slice(0, Math.floor(popSize / 2)).map((idx) => pop[idx].slice());
    while (survivors.length < popSize) {
      survivors.push(shufflePerm());
    }
    return survivors;
  }

  for (let gen = 1; gen <= generations && evalCount < maxEvals * 1.25; gen++) {
    const sortedIdx = [...population.keys()].sort((a, b) => fitnesses[b] - fitnesses[a]);
    const newPop = sortedIdx.slice(0, elitismCount).map((idx) => population[idx].slice());

    while (newPop.length < popSize) {
      const [p1, p2] = tournamentSelect();
      let c1;
      let c2;
      if (rng() < crossoverRate) {
        [c1, c2] = oxCrossover(p1, p2, rng);
      } else {
        c1 = p1.slice();
        c2 = p2.slice();
      }
      if (rng() < mutationRate) c1 = swapMutate(c1, rng);
      if (rng() < mutationRate) c2 = swapMutate(c2, rng);
      newPop.push(c1);
      if (newPop.length < popSize) newPop.push(c2);
    }

    population = newPop;
    fitnesses = population.map((c) => combinedScore(packForOrder(boxes, container, c), wUtil, wStab));
    evalCount += population.length;

    const genBest = fitnesses.reduce((bi, f, idx) => (f > fitnesses[bi] ? idx : bi), 0);
    if (fitnesses[genBest] > bestScore) {
      bestScore = fitnesses[genBest];
      bestSolution = population[genBest].slice();
      stagnationCounter = 0;
    } else {
      stagnationCounter += 1;
    }

    if (stagnationCounter >= stagnationLimit) {
      population = restart(population, fitnesses);
      fitnesses = population.map((c) => combinedScore(packForOrder(boxes, container, c), wUtil, wStab));
      evalCount += population.length;
      stagnationCounter = 0;
    }
  }

  return packForOrder(boxes, container, bestSolution);
}

/**
 * @param {import("./types").Box[]} boxes
 * @param {import("./types").Container} container
 * @param {string | null | undefined} algorithmId
 */
export function packWithSelectedAlgorithm(boxes, container, algorithmId) {
  const base = getPackSearchConfig();
  const rng = makeRng(base.randomSeed);

  if (!algorithmId || algorithmId === "greedy-hc") {
    return packBoxes(boxes, container);
  }
  if (algorithmId === "sa") {
    return runSimulatedAnnealing(boxes, container, base.sa, rng);
  }
  if (algorithmId === "genetic") {
    return runGeneticAlgorithm(boxes, container, base.ga, rng);
  }
  return packBoxes(boxes, container);
}
