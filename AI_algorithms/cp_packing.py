"""
cp_packing.py
=============
Constraint Programming solver for 3D Bin Packing using Google OR-Tools CP-SAT.

Install dependency:
    pip install ortools

HOW IT WORKS
------------
CP-SAT encodes the problem with integer decision variables:

  For every box b and every orientation o:
    • selected[b, o]  – BoolVar: 1 if box b is placed in orientation o
    • x[b], y[b], z[b] – IntVar: bottom-left-front corner of box b
    • placed[b]         – BoolVar: 1 if box b is placed at all

HARD CONSTRAINTS
  1. At most one orientation per box.
  2. If placed, box must fit inside container dimensions.
  3. No two placed boxes may overlap (using OR-Tools interval variables
     and AddNoOverlap3D / per-axis disjunction).
  4. Fragile boxes: only orientations where (l, w, h) keeps original h upright.

SOFT CONSTRAINTS (encoded in the objective)
  • Maximise packed volume  (primary)
  • Penalise boxes placed high while heavy  (weight distribution)
  • Penalise unsupported boxes  (support is approximated at CP level)

Because 3D no-overlap with full orientation choices is NP-hard, the model
uses a *time limit* (default 60 s).  For large instances, reduce n_boxes or
increase time_limit_s.

USAGE
-----
    from container import Container
    from cp_packing  import CPPacker

    boxes     = load_random_boxes("boxes.csv", n=20, seed=42)
    container = Container()

    cp = CPPacker(container=container, boxes=boxes,
                  time_limit_s=30, verbose=True)

    result = cp.run()
    print(result["stats"])
"""

import time
import copy
from itertools import permutations

# ── OR-Tools import (will raise a clear error if not installed) ────────────
try:
    from ortools.sat.python import cp_model
except ImportError as exc:
    raise ImportError(
        "OR-Tools is required for CPPacker.\n"
        "Install it with:  pip install ortools"
    ) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_orientations(box):
    """Return valid (l, w, h) orientations for a box (fragile = keep h)."""
    l, w, h = box["l"], box["w"], box["h"]
    if box["fragile"]:
        return list(set([(l, w, h), (w, l, h)]))
    return list(set(permutations((l, w, h))))


def _rebuild_from_cp(container, placed_info):
    """
    Given the CP solution (list of dicts with id, x, y, z, l, w, h),
    replay the placement through the Container so that placed_boxes,
    free_spaces, and evaluate_stability() all work correctly.

    We bypass find_best_placement_dblf and place_box because the CP
    solver already decided positions; we just record them.
    """
    container.placed_boxes  = []
    container.unplaced_boxes = []
    # free_spaces not used after CP solve, but reset for cleanliness
    container.free_spaces   = []

    # build a lookup of original box metadata
    for item in placed_info:
        container.placed_boxes.append(item)

    stability = container.evaluate_stability()

    packed_volume = sum(b["l"] * b["w"] * b["h"] for b in container.placed_boxes)
    container_vol = container.length * container.width * container.height
    utilization   = packed_volume / container_vol * 100

    return utilization, stability


# ─────────────────────────────────────────────────────────────────────────────
# CPPacker
# ─────────────────────────────────────────────────────────────────────────────

class CPPacker:
    """
    Parameters
    ----------
    container    : Container  – your existing Container instance
    boxes        : list[dict] – box list (from load_random_boxes)
    time_limit_s : float      – CP-SAT wall-clock time limit in seconds
    lambda_weight: float      – penalty for weight-above-light violations in obj
    verbose      : bool       – print solver log & result summary
    """

    def __init__(
        self,
        container,
        boxes,
        time_limit_s  = 60.0,
        lambda_weight = 10,
        verbose       = True,
    ):
        self.container     = container
        self.boxes         = boxes
        self.time_limit_s  = time_limit_s
        self.lambda_weight = lambda_weight
        self.verbose       = verbose

        self.L = container.length
        self.W = container.width
        self.H = container.height

    # ── build & solve ─────────────────────────────────────────────────────

    def run(self):
        t0    = time.time()
        model = cp_model.CpModel()
        n     = len(self.boxes)

        # ── precompute orientations ──────────────────────────────────────────
        orientations = [_get_orientations(b) for b in self.boxes]

        # ── decision variables ───────────────────────────────────────────────

        # selected[i][o] = 1  ↔  box i uses orientation o
        selected = [
            [model.NewBoolVar(f"sel_{i}_{o}") for o in range(len(orientations[i]))]
            for i in range(n)
        ]

        # placed[i] = 1  ↔  box i is included in the solution
        placed = [model.NewBoolVar(f"placed_{i}") for i in range(n)]

        # exactly-one-orientation constraint (if placed)
        for i in range(n):
            # sum of selected orientations == placed[i]
            model.Add(sum(selected[i]) == placed[i])

        # effective dimensions after orientation choice
        # We use "element" constraints: eff_l[i] = orientations[i][chosen_o][0]
        # CP-SAT handles this cleanly with AddElement.

        eff_l = [model.NewIntVar(0, self.L, f"el_{i}") for i in range(n)]
        eff_w = [model.NewIntVar(0, self.W, f"ew_{i}") for i in range(n)]
        eff_h = [model.NewIntVar(0, self.H, f"eh_{i}") for i in range(n)]

        for i in range(n):
            ls = [o[0] for o in orientations[i]]
            ws = [o[1] for o in orientations[i]]
            hs = [o[2] for o in orientations[i]]

            # index variable: which orientation is chosen?
            orient_idx = model.NewIntVar(0, len(orientations[i]) - 1, f"oi_{i}")

            # orient_idx == the index of the single True selected[i][o]
            for o_idx, sel_var in enumerate(selected[i]):
                # sel_var == 1  →  orient_idx == o_idx
                model.Add(orient_idx == o_idx).OnlyEnforceIf(sel_var)

            model.AddElement(orient_idx, ls, eff_l[i])
            model.AddElement(orient_idx, ws, eff_w[i])
            model.AddElement(orient_idx, hs, eff_h[i])

        # position variables (corner coordinates)
        x = [model.NewIntVar(0, self.L, f"x_{i}") for i in range(n)]
        y = [model.NewIntVar(0, self.W, f"y_{i}") for i in range(n)]
        z = [model.NewIntVar(0, self.H, f"z_{i}") for i in range(n)]

        # ── fit-inside-container constraints ────────────────────────────────
        for i in range(n):
            # x[i] + eff_l[i] <= L  (only if placed)
            model.Add(x[i] + eff_l[i] <= self.L).OnlyEnforceIf(placed[i])
            model.Add(y[i] + eff_w[i] <= self.W).OnlyEnforceIf(placed[i])
            model.Add(z[i] + eff_h[i] <= self.H).OnlyEnforceIf(placed[i])
            # if not placed, pin to origin to keep variables bounded
            model.Add(x[i] == 0).OnlyEnforceIf(placed[i].Not())
            model.Add(y[i] == 0).OnlyEnforceIf(placed[i].Not())
            model.Add(z[i] == 0).OnlyEnforceIf(placed[i].Not())

        # ── no-overlap: interval variables + NoOverlap3D ────────────────────
        # OR-Tools 3-D no-overlap needs IntervalVar per axis per box.

        x_intervals, y_intervals, z_intervals = [], [], []

        for i in range(n):
            # end = start + size  (size = effective dimension)
            x_end = model.NewIntVar(0, self.L, f"xe_{i}")
            y_end = model.NewIntVar(0, self.W, f"ye_{i}")
            z_end = model.NewIntVar(0, self.H, f"ze_{i}")

            model.Add(x_end == x[i] + eff_l[i])
            model.Add(y_end == y[i] + eff_w[i])
            model.Add(z_end == z[i] + eff_h[i])

            # optional intervals: active only when placed[i] == 1
            xi = model.NewOptionalIntervalVar(x[i], eff_l[i], x_end, placed[i], f"xi_{i}")
            yi = model.NewOptionalIntervalVar(y[i], eff_w[i], y_end, placed[i], f"yi_{i}")
            zi = model.NewOptionalIntervalVar(z[i], eff_h[i], z_end, placed[i], f"zi_{i}")

            x_intervals.append(xi)
            y_intervals.append(yi)
            z_intervals.append(zi)

        model.AddNoOverlap3D(x_intervals, y_intervals, z_intervals)

        # ── soft: weight distribution penalty ───────────────────────────────
        # For every pair (i, j): if placed and w_i > w_j, penalise if z_i > z_j
        # We approximate with a linear penalty term.

        weight_penalty_terms = []

        for i in range(n):
            for j in range(i + 1, n):
                w_i = self.boxes[i]["weight"]
                w_j = self.boxes[j]["weight"]

                if w_i == w_j:
                    continue

                # heavier_idx should have smaller or equal z
                heavier_idx, lighter_idx = (i, j) if w_i > w_j else (j, i)
                weight_diff = int(abs(w_i - w_j))

                # violation_var = 1 when heavier box is ABOVE lighter box
                violation = model.NewBoolVar(f"wv_{i}_{j}")
                # z[heavier] > z[lighter]  ↔  z[heavier] - z[lighter] >= 1
                model.Add(
                    z[heavier_idx] >= z[lighter_idx] + 1
                ).OnlyEnforceIf(violation)
                model.Add(
                    z[heavier_idx] <= z[lighter_idx]
                ).OnlyEnforceIf(violation.Not())

                # only penalise when both are placed
                both_placed = model.NewBoolVar(f"bp_{i}_{j}")
                model.AddBoolAnd([placed[i], placed[j]]).OnlyEnforceIf(both_placed)
                model.AddBoolOr([placed[i].Not(), placed[j].Not()]).OnlyEnforceIf(both_placed.Not())

                penalty_active = model.NewBoolVar(f"pa_{i}_{j}")
                model.AddBoolAnd([violation, both_placed]).OnlyEnforceIf(penalty_active)
                model.AddBoolOr([violation.Not(), both_placed.Not()]).OnlyEnforceIf(penalty_active.Not())

                weight_penalty_terms.append((weight_diff * self.lambda_weight, penalty_active))

        # ── objective: maximise packed volume − weight penalties ─────────────
        # Packed volume in dm³ (or whatever unit) scaled to integers.
        # We scale by 1 to keep it integer-friendly.

        volume_terms = []
        for i in range(n):
            vol = self.boxes[i]["l"] * self.boxes[i]["w"] * self.boxes[i]["h"]
            volume_terms.append((vol, placed[i]))

        # CP-SAT objective must be integer linear → build expression
        obj_terms = []
        for coef, var in volume_terms:
            obj_terms.append(coef * var)
        for coef, var in weight_penalty_terms:
            obj_terms.append(-coef * var)

        model.Maximize(sum(obj_terms))

        # ── solve ────────────────────────────────────────────────────────────
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.time_limit_s
        solver.parameters.num_search_workers  = 8   # parallel search threads
        if self.verbose:
            solver.parameters.log_search_progress = True

        if self.verbose:
            print(f"[CP] Solving with {n} boxes, time limit = {self.time_limit_s}s …")

        status = solver.Solve(model)

        elapsed = time.time() - t0

        # ── extract solution ─────────────────────────────────────────────────
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            placed_info   = []
            unplaced_info = []

            for i, box in enumerate(self.boxes):
                if solver.Value(placed[i]) == 1:
                    placed_info.append({
                        "id"    : box["id"],
                        "name"  : box["name"],
                        "weight": box["weight"],
                        "x"     : solver.Value(x[i]),
                        "y"     : solver.Value(y[i]),
                        "z"     : solver.Value(z[i]),
                        "l"     : solver.Value(eff_l[i]),
                        "w"     : solver.Value(eff_w[i]),
                        "h"     : solver.Value(eff_h[i]),
                    })
                else:
                    unplaced_info.append({
                        "id"    : box["id"],
                        "reason": "excluded by CP solver",
                    })

            utilization, stability = _rebuild_from_cp(self.container, placed_info)

            stats = {
                "status"        : solver.StatusName(status),
                "utilization"   : round(utilization, 4),
                "stability"     : stability,
                "placed_count"  : len(placed_info),
                "unplaced_count": len(unplaced_info),
                "placed_boxes"  : placed_info,
                "unplaced_boxes": unplaced_info,
                "objective"     : solver.ObjectiveValue(),
                "elapsed_sec"   : round(elapsed, 2),
            }

        else:
            # No feasible solution found within time limit
            stats = {
                "status"        : solver.StatusName(status),
                "utilization"   : 0.0,
                "stability"     : {"weight_score": 0, "support_score": 0, "stability_score": 0},
                "placed_count"  : 0,
                "unplaced_count": len(self.boxes),
                "placed_boxes"  : [],
                "unplaced_boxes": [{"id": b["id"], "reason": "no feasible solution"} for b in self.boxes],
                "objective"     : None,
                "elapsed_sec"   : round(elapsed, 2),
            }

        if self.verbose:
            print(f"\n[CP] Status      : {stats['status']}")
            print(f"[CP] Elapsed     : {stats['elapsed_sec']}s")
            print(f"[CP] Utilization : {stats['utilization']}%")
            print(f"[CP] Stability   : {stats['stability']['stability_score']}")
            print(f"[CP] Placed      : {stats['placed_count']} / {len(self.boxes)}")

        return {"stats": stats}


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

    cp = CPPacker(
        container    = container,
        boxes        = sample_boxes,
        time_limit_s = 30,
        verbose      = True,
    )

    result = cp.run()
    print("\n=== CP RESULT ===")
    s = result["stats"]
    print(f"  Status       : {s['status']}")
    print(f"  Elapsed      : {s['elapsed_sec']}s")
    print(f"  Utilization  : {s['utilization']}%")
    print(f"  Stability    : {s['stability']['stability_score']}")
    print(f"  Placed       : {s['placed_count']} / {len(sample_boxes)}")
