/** Algorithm keys wired to `packWithSelectedAlgorithm` (meta-search over the maximal-space packer). */
export const PACK_ALGORITHM_OPTIONS = [
  { id: "sa", label: "Simulated Annealing (SA)", blurb: "Order search: swap-based neighborhood, utilization + fill score" },
  { id: "genetic", label: "Genetic Algorithm", blurb: "Population of orderings: OX crossover + swap mutation" },
  { id: "greedy-hc", label: "Greedy", blurb: "Volume-decreasing first fit (best-fit decreasing style)" },
];
