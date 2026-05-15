"""
aco_packing.py
==============
Ant Colony Optimization (ACO) for 3D Bin Packing.

Each ant builds a complete box ordering by probabilistically
selecting the next box based on pheromone trails and heuristic
desirability. After all ants finish, pheromone trails are updated
to reinforce good orderings.

USAGE
-----
    from container import Container
    from aco_packing import ACOPacker

    boxes     = load_random_boxes("../data/data.csv", n=100, seed=42)
    container = Container()

    aco = ACOPacker(
        container    = container,
        boxes        = boxes,
        n_ants       = 30,
        n_iter       = 100,
        alpha        = 1.0,   # pheromone influence
        beta         = 2.0,   # heuristic influence
        rho          = 0.1,   # evaporation rate
        Q            = 100.0, # pheromone deposit constant
        verbose      = True,
    )

    result = aco.run()
    print(result["stats"])
"""

import random
import time
import copy
import math
from itertools import permutations


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _score(result, w_util=0.7, w_stab=0.3):
    """Unified fitness score identical to the one used in Greedy / GA / SA."""
    return (
        w_util * result["utilization"]
        + w_stab * result["stability"]["stability_score"]
    )


def _heuristic(box):
    """
    Desirability η for placing a box early.
    Larger, heavier boxes should go first → higher η.
    Fragile boxes get a small penalty so they tend to go later.
    """
    volume = box["l"] * box["w"] * box["h"]
    weight = box["weight"]
    fragile_penalty = 0.5 if box["fragile"] else 1.0
    return (volume * weight) ** 0.5 * fragile_penalty


# ─────────────────────────────────────────────────────────────────────────────
# ACOPacker
# ─────────────────────────────────────────────────────────────────────────────

class ACOPacker:
    """
    Ant Colony Optimization for 3D bin packing.

    The problem is modelled as: find the best *ordering* of boxes to
    feed into the container's placement heuristic (BFF).

    Graph structure
    ---------------
    • Nodes  : boxes  (indexed 0 … n-1)
    • Edges  : (i → j) means "box j is placed immediately after box i"
    • τ[i][j]: pheromone on edge i→j
    • η[j]   : heuristic desirability of box j (volume × weight)

    At each construction step an ant at node i picks the next unvisited
    node j with probability:

        P(j | i) = (τ[i][j]^α × η[j]^β) / Σ_k (τ[i][k]^α × η[k]^β)

    After all ants finish their tours the pheromone matrix is updated:

        τ[i][j] ← (1 - ρ) × τ[i][j]  +  Σ_ant  ΔQ / score_ant

    Parameters
    ----------
    container       : Container  – your existing Container instance
    boxes           : list[dict] – box list from load_random_boxes()
    n_ants          : int        – number of ants per iteration (20-50)
    n_iter          : int        – number of iterations
    alpha           : float      – pheromone exponent  (≥1 → trust pheromone more)
    beta            : float      – heuristic exponent  (≥1 → trust heuristic more)
    rho             : float      – evaporation rate in (0, 1)
    Q               : float      – pheromone deposit constant
    tau_init        : float      – initial pheromone value on all edges
    tau_min         : float      – minimum pheromone (prevents stagnation)
    tau_max         : float|None – maximum pheromone (None = unbounded)
    w_util          : float      – utilization weight in fitness
    w_stab          : float      – stability weight in fitness
    seed            : int|None   – random seed
    verbose         : bool       – print progress each iteration
    """

    def __init__(
        self,
        container,
        boxes,
        n_ants    = 30,
        n_iter    = 100,
        alpha     = 1.0,
        beta      = 2.0,
        rho       = 0.1,
        Q         = 100.0,
        tau_init  = 1.0,
        tau_min   = 0.01,
        tau_max   = None,
        w_util    = 0.7,
        w_stab    = 0.3,
        seed      = None,
        verbose   = True,
    ):
        self.container = container
        self.boxes     = boxes
        self.n         = len(boxes)
        self.n_ants    = n_ants
        self.n_iter    = n_iter
        self.alpha     = alpha
        self.beta      = beta
        self.rho       = rho
        self.Q         = Q
        self.tau_min   = tau_min
        self.tau_max   = tau_max
        self.w_util    = w_util
        self.w_stab    = w_stab
        self.verbose   = verbose

        if seed is not None:
            random.seed(seed)

        # ── pheromone matrix  τ[i][j]  (n+1 × n) ───────────────────────────
        # Row n is the virtual "start" node (before any box is placed).
        self.tau = [
            [tau_init] * self.n
            for _ in range(self.n + 1)
        ]

        # ── heuristic desirability η[j] (static, computed once) ─────────────
        self.eta = [_heuristic(b) for b in boxes]

        # ── tracking ─────────────────────────────────────────────────────────
        self.best_order  = None
        self.best_score  = float("-inf")
        self.best_result = None
        self.history     = []   # one entry per iteration

    # ── construction: one ant builds one complete ordering ────────────────────

    def _build_tour(self):
        """
        One ant constructs a full permutation of box indices using the
        ACO probabilistic selection rule.

        Returns
        -------
        list[int]  – permutation of box indices 0…n-1
        """
        unvisited = list(range(self.n))
        tour      = []
        current   = self.n   # start node (virtual)

        while unvisited:
            # ── compute selection weights ────────────────────────────────────
            weights = []
            for j in unvisited:
                tau_ij = self.tau[current][j] ** self.alpha
                eta_j  = self.eta[j]          ** self.beta
                weights.append(tau_ij * eta_j)

            total = sum(weights)

            # ── roulette-wheel selection ─────────────────────────────────────
            r        = random.random() * total
            cumul    = 0.0
            chosen_j = unvisited[-1]   # fallback (floating point safety)

            for idx, j in enumerate(unvisited):
                cumul += weights[idx]
                if cumul >= r:
                    chosen_j = j
                    break

            tour.append(chosen_j)
            unvisited.remove(chosen_j)
            current = chosen_j

        return tour

    # ── evaluation: pack boxes in the ant's order, return score ──────────────

    def _evaluate_tour(self, tour):
        """
        Pack boxes in the order given by *tour* (list of indices).
        Returns (score, result_dict).
        """
        ordered_boxes = [self.boxes[i] for i in tour]
        result        = self.container.pack_boxes(ordered_boxes)
        score         = _score(result, self.w_util, self.w_stab)
        return score, result

    # ── pheromone update ──────────────────────────────────────────────────────

    def _update_pheromone(self, ant_tours, ant_scores):
        """
        1. Evaporate all pheromone trails.
        2. Each ant deposits Δτ = Q / score along the edges it used.
        3. Clamp to [tau_min, tau_max].
        """
        n = self.n

        # ── evaporation ──────────────────────────────────────────────────────
        for i in range(n + 1):
            for j in range(n):
                self.tau[i][j] *= (1.0 - self.rho)
                self.tau[i][j]  = max(self.tau[i][j], self.tau_min)

        # ── deposit ──────────────────────────────────────────────────────────
        for tour, score in zip(ant_tours, ant_scores):
            if score <= 0:
                continue
            delta = self.Q / score

            # virtual start node → first box
            self.tau[n][tour[0]] += delta

            # box-to-box edges
            for k in range(len(tour) - 1):
                i = tour[k]
                j = tour[k + 1]
                self.tau[i][j] += delta

            # optional cap
            if self.tau_max is not None:
                for i in range(n + 1):
                    for j in range(n):
                        self.tau[i][j] = min(self.tau[i][j], self.tau_max)

    # ── main loop ─────────────────────────────────────────────────────────────

    def run(self):
        """
        Run the ACO algorithm.

        Returns
        -------
        dict with keys:
            best_order   – list of boxes in the best order found
            best_score   – fitness score of the best solution
            stats        – placed_count, unplaced_count, utilization, stability
            history      – list of per-iteration best scores
            elapsed_sec  – wall-clock time
        """
        t0 = time.time()

        for iteration in range(1, self.n_iter + 1):

            ant_tours  = []
            ant_scores = []

            # ── each ant builds and evaluates its tour ────────────────────────
            for _ in range(self.n_ants):
                tour        = self._build_tour()
                score, result = self._evaluate_tour(tour)

                ant_tours.append(tour)
                ant_scores.append(score)

                # global best update
                if score > self.best_score:
                    self.best_score  = score
                    self.best_order  = [self.boxes[i] for i in tour]
                    self.best_result = copy.deepcopy(result)

            # ── pheromone update ──────────────────────────────────────────────
            self._update_pheromone(ant_tours, ant_scores)

            # ── logging ───────────────────────────────────────────────────────
            iter_best_score = max(ant_scores)
            self.history.append({
                "iteration"     : iteration,
                "iter_best"     : round(iter_best_score, 4),
                "global_best"   : round(self.best_score,  4),
                "utilization"   : round(self.best_result["utilization"], 4),
                "stability"     : round(self.best_result["stability"]["stability_score"], 4),
                "placed_count"  : self.best_result["placed_count"],
                "unplaced_count": self.best_result["unplaced_count"],
            })

            if self.verbose:
                h = self.history[-1]
                print(
                    f"[ACO] iter {iteration:>4}/{self.n_iter}  "
                    f"iter_best={h['iter_best']:>8.4f}  "
                    f"global_best={h['global_best']:>8.4f}  "
                    f"util={h['utilization']:>6.2f}%  "
                    f"stab={h['stability']:>6.2f}  "
                    f"placed={h['placed_count']}/{self.n}"
                )

        elapsed = time.time() - t0

        # ── re-pack with best order to leave container in correct state ───────
        self.container.pack_boxes(self.best_order)

        stats = {
            "best_score"    : round(self.best_score, 4),
            "utilization"   : round(self.best_result["utilization"], 4),
            "stability"     : self.best_result["stability"]["stability_score"],
            "stability_full": self.best_result["stability"],
            "placed_count"  : self.best_result["placed_count"],
            "unplaced_count": self.best_result["unplaced_count"],
            "placed_boxes"  : self.best_result["placed_boxes"],
            "unplaced_boxes": self.best_result["unplaced_boxes"],
        }

        return {
            "best_order" : self.best_order,
            "best_score" : self.best_score,
            "stats"      : stats,
            "history"    : self.history,
            "elapsed_sec": round(elapsed, 2),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Quick self-test
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":

    sample_boxes = [
        {"id": str(i), "name": f"Box{i}", "l": l, "w": w, "h": h,
         "weight": wt, "fragile": fr}
        for i, (l, w, h, wt, fr) in enumerate([
            (100, 80,  60,  10.0, False),
            (120, 90,  70,  15.0, False),
            (60,  50,  40,  5.0,  True ),
            (200, 100, 80,  25.0, False),
            (80,  70,  50,  8.0,  False),
            (150, 120, 90,  20.0, False),
            (50,  40,  30,  3.0,  True ),
            (90,  80,  60,  12.0, False),
            (110, 100, 70,  18.0, False),
            (70,  60,  50,  7.0,  False),
        ])
    ]

    try:
        from container import Container
    except ImportError:
        print("Place container.py next to this file.")
        raise

    container = Container()

    aco = ACOPacker(
        container = container,
        boxes     = sample_boxes,
        n_ants    = 10,
        n_iter    = 20,
        alpha     = 1.0,
        beta      = 2.0,
        rho       = 0.1,
        Q         = 100.0,
        seed      = 42,
        verbose   = True,
    )

    result = aco.run()

    print("\n=== ACO RESULT ===")
    print(f"  Elapsed      : {result['elapsed_sec']}s")
    print(f"  Score        : {result['best_score']:.4f}")
    print(f"  Utilization  : {result['stats']['utilization']}%")
    print(f"  Stability    : {result['stats']['stability']}")
    print(f"  Placed       : {result['stats']['placed_count']} / {len(sample_boxes)}")
    print(f"  Unplaced     : {result['stats']['unplaced_count']}")
