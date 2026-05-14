"""
pso_packing.py
==============
Particle Swarm Optimization for 3D Bin Packing.

HOW IT WORKS
------------
Each *particle* encodes a solution as two real-valued vectors:
  • position  – one float per box, used to derive the packing ORDER
  • velocity  – controls how position evolves each iteration

Decoding a particle → a packing:
  1. Sort boxes by their position values  → packing order
  2. Feed that order into Container.pack_boxes()  → real 3D layout
  3. Evaluate the result with a fitness function

The swarm updates every iteration:
  v_new = w*v  +  c1*r1*(personal_best - pos)  +  c2*r2*(global_best - pos)
  pos_new = pos + v_new

Then clamp positions to [0, 1] so rank-ordering stays stable.

FITNESS (higher = better)
  fitness = utilization%  +  λ_stab * stability_score  -  λ_unplaced * unplaced_count

USAGE
-----
    from container import Container          # your existing file
    from pso_packing import PSOPacker

    boxes = load_random_boxes("boxes.csv", n=50, seed=42)
    container = Container()

    pso = PSOPacker(
        container   = container,
        boxes       = boxes,
        n_particles = 30,
        n_iter      = 100,
        w           = 0.7,    # inertia
        c1          = 1.5,    # cognitive (personal best)
        c2          = 1.5,    # social    (global  best)
        lambda_stability = 0.3,
        lambda_unplaced  = 5.0,
        seed        = 0,
        verbose     = True,
    )

    result = pso.run()
    print(result["stats"])          # utilization, stability, placed / unplaced
    print(result["best_order"])     # box order that produced the best layout
"""

import random
import math
import copy
import time
from itertools import permutations


# ─────────────────────────────────────────────────────────────────────────────
# Helper: thin wrapper so we don't mutate the caller's Container instance
# ─────────────────────────────────────────────────────────────────────────────

def _evaluate_order(container, boxes_in_order,
                    lambda_stability, lambda_unplaced):
    """
    Pack *boxes_in_order* into a fresh container state and return
    (fitness, stats_dict).
    """
    result = container.pack_boxes(boxes_in_order)

    utilization    = result["utilization"]                        # 0-100
    stability      = result["stability"]["stability_score"]       # 0-100
    unplaced_count = result["unplaced_count"]

    fitness = (
        utilization
        + lambda_stability * stability
        - lambda_unplaced  * unplaced_count
    )

    stats = {
        "fitness"       : round(fitness,       4),
        "utilization"   : round(utilization,   4),
        "stability"     : round(stability,     4),
        "placed_count"  : result["placed_count"],
        "unplaced_count": unplaced_count,
        "placed_boxes"  : result["placed_boxes"],
        "unplaced_boxes": result["unplaced_boxes"],
    }

    return fitness, stats


# ─────────────────────────────────────────────────────────────────────────────
# Particle
# ─────────────────────────────────────────────────────────────────────────────

class Particle:
    """One particle in the swarm."""

    def __init__(self, n_boxes, rng):
        # position: random floats in [0, 1], one per box
        self.position = [rng.random() for _ in range(n_boxes)]
        # velocity: small random floats
        self.velocity = [rng.uniform(-0.1, 0.1) for _ in range(n_boxes)]

        self.best_position = list(self.position)
        self.best_fitness  = float("-inf")
        self.current_stats = None

    # ── decode ──────────────────────────────────────────────────────────────
    def decode_order(self, boxes):
        """
        Sort boxes by their position values to get a packing order.
        Returns a new list of boxes (does NOT mutate the original).
        """
        indexed = sorted(enumerate(self.position), key=lambda x: x[1])
        return [boxes[i] for i, _ in indexed]

    # ── update ──────────────────────────────────────────────────────────────
    def update_velocity(self, global_best_pos, w, c1, c2, rng):
        n = len(self.position)
        for i in range(n):
            r1 = rng.random()
            r2 = rng.random()

            cognitive = c1 * r1 * (self.best_position[i] - self.position[i])
            social    = c2 * r2 * (global_best_pos[i]    - self.position[i])

            self.velocity[i] = (
                w * self.velocity[i]
                + cognitive
                + social
            )

    def update_position(self):
        n = len(self.position)
        for i in range(n):
            self.position[i] += self.velocity[i]
            # clamp to [0, 1] to keep rank-ordering numerically stable
            self.position[i] = max(0.0, min(1.0, self.position[i]))


# ─────────────────────────────────────────────────────────────────────────────
# PSOPacker
# ─────────────────────────────────────────────────────────────────────────────

class PSOPacker:
    """
    Parameters
    ----------
    container        : Container  – your existing Container instance
    boxes            : list[dict] – full box list (from load_random_boxes)
    n_particles      : int        – swarm size (20-50 is typical)
    n_iter           : int        – number of iterations
    w                : float      – inertia weight (0.4-0.9)
    c1               : float      – cognitive coefficient (≈1.5)
    c2               : float      – social coefficient   (≈1.5)
    lambda_stability : float      – weight of stability in fitness
    lambda_unplaced  : float      – penalty per unplaced box
    seed             : int|None   – random seed for reproducibility
    verbose          : bool       – print progress every iteration
    """

    def __init__(
        self,
        container,
        boxes,
        n_particles      = 30,
        n_iter           = 100,
        w                = 0.7,
        c1               = 1.5,
        c2               = 1.5,
        lambda_stability = 0.3,
        lambda_unplaced  = 5.0,
        seed             = None,
        verbose          = True,
    ):
        self.container        = container
        self.boxes            = boxes
        self.n_particles      = n_particles
        self.n_iter           = n_iter
        self.w                = w
        self.c1               = c1
        self.c2               = c2
        self.lambda_stability = lambda_stability
        self.lambda_unplaced  = lambda_unplaced
        self.verbose          = verbose

        self.rng = random.Random(seed)

        self.n_boxes = len(boxes)

        # swarm
        self.particles = [
            Particle(self.n_boxes, self.rng)
            for _ in range(n_particles)
        ]

        # global best
        self.global_best_position = list(self.particles[0].position)
        self.global_best_fitness  = float("-inf")
        self.global_best_stats    = None

        # convergence history (one entry per iteration)
        self.history = []

    # ── main loop ────────────────────────────────────────────────────────────

    def run(self):
        t0 = time.time()

        for iteration in range(1, self.n_iter + 1):

            # ── evaluate every particle ──────────────────────────────────────
            for particle in self.particles:

                order   = particle.decode_order(self.boxes)
                fitness, stats = _evaluate_order(
                    self.container, order,
                    self.lambda_stability, self.lambda_unplaced
                )
                particle.current_stats = stats

                # update personal best
                if fitness > particle.best_fitness:
                    particle.best_fitness  = fitness
                    particle.best_position = list(particle.position)

                # update global best
                if fitness > self.global_best_fitness:
                    self.global_best_fitness  = fitness
                    self.global_best_position = list(particle.position)
                    self.global_best_stats    = copy.deepcopy(stats)

            # ── log ──────────────────────────────────────────────────────────
            self.history.append({
                "iteration"     : iteration,
                "best_fitness"  : round(self.global_best_fitness, 4),
                "utilization"   : self.global_best_stats["utilization"],
                "stability"     : self.global_best_stats["stability"],
                "placed_count"  : self.global_best_stats["placed_count"],
                "unplaced_count": self.global_best_stats["unplaced_count"],
            })

            if self.verbose:
                h = self.history[-1]
                print(
                    f"[PSO] iter {iteration:>4}/{self.n_iter}  "
                    f"fitness={h['best_fitness']:>8.3f}  "
                    f"util={h['utilization']:>6.2f}%  "
                    f"stab={h['stability']:>6.2f}  "
                    f"placed={h['placed_count']}/{self.n_boxes}"
                )

            # ── update velocities & positions ─────────────────────────────────
            for particle in self.particles:
                particle.update_velocity(
                    self.global_best_position,
                    self.w, self.c1, self.c2, self.rng
                )
                particle.update_position()

        # ── rebuild best layout one final time ───────────────────────────────
        best_particle = max(self.particles, key=lambda p: p.best_fitness)
        best_order    = best_particle.decode_order(self.boxes)

        # re-pack so container.placed_boxes reflects the best solution
        self.container.pack_boxes(best_order)

        elapsed = time.time() - t0

        return {
            "best_order"    : best_order,
            "stats"         : self.global_best_stats,
            "history"       : self.history,
            "elapsed_sec"   : round(elapsed, 2),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Quick self-test  (runs only when executed directly)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":

    # ── minimal inline box list so the file is self-contained ────────────────
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

    # import your real Container here
    # from container import Container
    # For the self-test we define a minimal stub:
    import csv, random as _random
    from itertools import permutations

    # ------------------------------------------------------------------
    # Paste or import your real Container class; here we just import it
    # assuming the shared code lives in container.py in the same folder.
    # ------------------------------------------------------------------
    try:
        from container import Container
    except ImportError:
        print("Could not import Container – place container.py next to this file.")
        raise

    container = Container()

    pso = PSOPacker(
        container        = container,
        boxes            = sample_boxes,
        n_particles      = 10,
        n_iter           = 20,
        w                = 0.7,
        c1               = 1.5,
        c2               = 1.5,
        lambda_stability = 0.3,
        lambda_unplaced  = 5.0,
        seed             = 42,
        verbose          = True,
    )

    result = pso.run()

    print("\n=== PSO RESULT ===")
    print(f"  Elapsed      : {result['elapsed_sec']}s")
    print(f"  Utilization  : {result['stats']['utilization']}%")
    print(f"  Stability    : {result['stats']['stability']}")
    print(f"  Placed       : {result['stats']['placed_count']} / {len(sample_boxes)}")
    print(f"  Unplaced     : {result['stats']['unplaced_count']}")
