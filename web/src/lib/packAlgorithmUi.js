/** Fallback algorithm list; live list comes from GET /api/algorithms (env2.ipynb). */
export const PACK_ALGORITHM_OPTIONS = [
  { id: "greedy-hc", label: "Greedy", blurb: "Volume-decreasing best-fit decreasing" },
  { id: "sa", label: "Simulated Annealing (SA)", blurb: "Swap neighborhood order search" },
  { id: "genetic", label: "Genetic Algorithm", blurb: "OX crossover + swap mutation on box order" },
  { id: "pso", label: "Particle Swarm (PSO)", blurb: "Swarm optimizes continuous box-order keys" },
  { id: "aco", label: "Ant Colony (ACO)", blurb: "Pheromone-guided permutation search" },
  { id: "csp", label: "Constraint Satisfaction (CSP)", blurb: "Backtracking with fragile/support constraints" },
];
