"""
stdin JSON → run env2.ipynb algorithms → stdout JSON.
Invoked by the Node API bridge; all packing logic lives in the notebook namespace.
"""
from __future__ import annotations

import contextlib
import io
import json
import os
import sys
import traceback
from typing import Any

from notebook_loader import load_env2_namespace


def _m_to_cm(value: float) -> float:
    return float(value) * 100.0


def _parse_fragile(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    return text in ("true", "1", "yes")


def _dims_as_meters(length: float, width: float, height: float, container_m: dict[str, float]) -> tuple[float, float, float]:
    """
    Web UI stores meters. If values look like raw cm (e.g. 45 instead of 0.45),
    normalize before calling env2 (which uses cm internally).
    """
    l, w, h = float(length), float(width), float(height)
    cl = float(container_m.get("length", 5.9))
    cw = float(container_m.get("width", 2.35))
    ch = float(container_m.get("height", 2.39))
    max_edge = max(l, w, h)
    max_container = max(cl, cw, ch)
    if max_edge > max_container + 0.01:
        l, w, h = l / 100.0, w / 100.0, h / 100.0
    return l, w, h


def _copy_notebook_box(box: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(box["id"]),
        "web_id": str(box.get("web_id") or box["id"]),
        "name": box.get("name") or f"Box {box['id']}",
        "l": int(box["l"]),
        "w": int(box["w"]),
        "h": int(box["h"]),
        "weight": float(box.get("weight") or 0),
        "fragile": bool(box.get("fragile", False)),
    }


def _ensure_unique_notebook_ids(boxes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """GA order crossover requires unique box ids; empty/duplicate ids break chromosomes."""
    used: set[str] = set()
    out: list[dict[str, Any]] = []
    for i, raw in enumerate(boxes):
        box = _copy_notebook_box(raw)
        web_id = str(raw.get("web_id") or raw.get("id") or f"box-{i}")
        box["web_id"] = web_id
        notebook_id = str(raw.get("id") or web_id).strip() or f"box-{i}"
        base = notebook_id
        suffix = 0
        while notebook_id in used:
            suffix += 1
            notebook_id = f"{base}#{suffix}"
        used.add(notebook_id)
        box["id"] = notebook_id
        out.append(box)
    return out


def web_boxes_to_notebook(
    boxes: list[dict[str, Any]], container_m: dict[str, float]
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for i, b in enumerate(boxes):
        web_id = str(b.get("id") or b.get("sourceId") or f"box-{i}")
        l_m, w_m, h_m = _dims_as_meters(
            float(b["length"]), float(b["width"]), float(b["height"]), container_m
        )
        out.append(
            {
                "id": web_id,
                "web_id": web_id,
                "name": b.get("name") or f"Box {web_id}",
                "l": max(1, round(_m_to_cm(l_m))),
                "w": max(1, round(_m_to_cm(w_m))),
                "h": max(1, round(_m_to_cm(h_m))),
                "weight": float(b.get("weight") or 0),
                "fragile": _parse_fragile(b.get("fragile")),
            }
        )
    return _ensure_unique_notebook_ids(out)


def _sanitize_chromosome(
    chromosome: list[Any] | None,
    catalog: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Repair OX crossover output: drop None/invalid entries, dedupe by id, append missing boxes.
  """
    by_id = {str(b["id"]): _copy_notebook_box(b) for b in catalog}
    order: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in chromosome or []:
        if not isinstance(item, dict):
            continue
        bid = str(item.get("id", ""))
        if not bid or bid in seen or bid not in by_id:
            continue
        seen.add(bid)
        order.append(_copy_notebook_box(by_id[bid]))

    for box in catalog:
        bid = str(box["id"])
        if bid not in seen:
            order.append(_copy_notebook_box(box))

    return order


def _ga_search_budget(n: int, max_evals: int) -> tuple[int, int, int]:
    """Keep web GA responsive; env2 defaults can explode for large n."""
    n = max(1, n)
    capped_evals = min(max_evals, max(800, n * 150))
    pop_size = min(80, max(24, n))
    generations = max(25, capped_evals // pop_size)
    return capped_evals, pop_size, generations


def _run_genetic(
    ns: dict[str, Any],
    container_obj: Any,
    catalog: list[dict[str, Any]],
    max_evals: int,
) -> tuple[dict[str, Any], float]:
    GeneticAlgorithm = ns["GeneticAlgorithm"]
    Container = ns["Container"]
    GreedyBFD = ns["GreedyBFD"]

    _, pop_size, generations = _ga_search_budget(len(catalog), max_evals)

    ga = GeneticAlgorithm(
        container_obj,
        [_copy_notebook_box(b) for b in catalog],
        max_evals=max_evals,
        pop_size=pop_size,
        generations=generations,
    )

    original_evaluate = ga.evaluate

    def safe_evaluate(chromosome: list[Any]) -> float:
        return original_evaluate(_sanitize_chromosome(chromosome, catalog))

    ga.evaluate = safe_evaluate  # type: ignore[method-assign]

    out = ga.run()
    best_solution = _sanitize_chromosome(out.get("best_solution"), catalog)

    fresh = Container(container_obj.length, container_obj.width, container_obj.height)
    best_result = fresh.pack_boxes(best_solution)
    best_score = float(out.get("best_score") or 0)

    placed_n = int(best_result.get("placed") or len(best_result.get("placed_boxes", [])))
    if placed_n == 0 and catalog:
        greedy = GreedyBFD(fresh, [_copy_notebook_box(b) for b in catalog]).run()
        greedy_result = greedy["best_result"]
        greedy_placed = len(greedy_result.get("placed_boxes", []))
        if greedy_placed > 0:
            return greedy_result, float(greedy["best_score"])

    return best_result, best_score


def notebook_placed_to_web(pb: dict[str, Any], lookup: dict[str, dict[str, Any]]) -> dict[str, Any]:
    pid = str(pb.get("id", ""))
    web_id = str(pb.get("web_id") or pid)
    src = lookup.get(web_id) or lookup.get(pid, {})
    return {
        "id": web_id or src.get("id", pid) or f"placed-{pb.get('x')}-{pb.get('y')}-{pb.get('z')}",
        "name": pb.get("name") or src.get("name", "Box"),
        "length": float(pb["l"]) / 100.0,
        "width": float(pb["w"]) / 100.0,
        "height": float(pb["h"]) / 100.0,
        "weight": float(pb.get("weight", src.get("weight", 0))),
        "fragile": bool(src.get("fragile", False)),
        "color": src.get("color", "#3b82f6"),
        "posX": float(pb["x"]) / 100.0,
        "posY": float(pb["z"]) / 100.0,
        "posZ": float(pb["y"]) / 100.0,
        "placed": True,
    }


def notebook_unplaced_to_web(ub: dict[str, Any], lookup: dict[str, dict[str, Any]]) -> dict[str, Any]:
    uid = str(ub.get("id", ""))
    web_id = str(ub.get("web_id") or uid)
    src = lookup.get(web_id) or lookup.get(uid, {})
    return {
        "id": web_id or src.get("id", uid) or "unplaced",
        "name": src.get("name", f"Box {uid}"),
        "length": float(src.get("length", 0)),
        "width": float(src.get("width", 0)),
        "height": float(src.get("height", 0)),
        "weight": float(src.get("weight", 0)),
        "fragile": bool(src.get("fragile", False)),
        "color": src.get("color", "#ef4444"),
        "placed": False,
        "reason": ub.get("reason", "No available space in container"),
    }


def build_web_response(
    best_result: dict[str, Any],
    best_score: float,
    web_boxes: list[dict[str, Any]],
) -> dict[str, Any]:
    lookup = {str(b.get("id", "")): b for b in web_boxes}
    placed = [notebook_placed_to_web(pb, lookup) for pb in best_result.get("placed_boxes", [])]
    unplaced = [notebook_unplaced_to_web(ub, lookup) for ub in best_result.get("unplaced_boxes", [])]

    placed_ids = {str(p.get("id", "")) for p in placed}
    unplaced_ids = {str(u.get("id", "")) for u in unplaced}
    for wb in web_boxes:
        wid = str(wb.get("id", ""))
        if wid and wid not in placed_ids and wid not in unplaced_ids:
            unplaced.append(notebook_unplaced_to_web({"id": wid, "web_id": wid}, lookup))
    util_pct = float(best_result.get("utilization") or 0)
    stability = best_result.get("stability") or {
        "weight_score": 0.0,
        "support_score": 0.0,
        "stability_score": 0.0,
    }
    total = len(web_boxes)
    return {
        "placed": placed,
        "unplaced": unplaced,
        "utilization": util_pct / 100.0 if util_pct > 1 else util_pct,
        "totalBoxes": total,
        "placedCount": len(placed),
        "score": float(best_score),
        "stability": stability,
        "engine": "env2.ipynb",
    }


@contextlib.contextmanager
def _quiet_stdout():
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    try:
        yield buf
    finally:
        sys.stdout = old


def run_pack(payload: dict[str, Any]) -> dict[str, Any]:
    algorithm = payload.get("algorithm")
    if algorithm not in ("sa", "genetic", "greedy-hc"):
        raise ValueError("algorithm must be one of: sa, genetic, greedy-hc")

    web_boxes = payload.get("boxes") or []
    container = payload.get("container") or {}
    config = payload.get("config") or {}

    if not web_boxes:
        return {
            "placed": [],
            "unplaced": [],
            "utilization": 0,
            "totalBoxes": 0,
            "placedCount": 0,
            "score": 0,
            "stability": {"weight_score": 0, "support_score": 0, "stability_score": 0},
            "engine": "env2.ipynb",
        }

    ns = load_env2_namespace()
    Container = ns["Container"]
    container_m = {
        "length": float(container.get("length", 5.9)),
        "width": float(container.get("width", 2.35)),
        "height": float(container.get("height", 2.39)),
    }
    py_boxes = web_boxes_to_notebook(web_boxes, container_m)
    catalog = [_copy_notebook_box(b) for b in py_boxes]

    length_cm = _m_to_cm(container_m["length"])
    width_cm = _m_to_cm(container_m["width"])
    height_cm = _m_to_cm(container_m["height"])

    container_obj = Container(length_cm, width_cm, height_cm)

    with _quiet_stdout():
        if algorithm == "greedy-hc":
            GreedyBFD = ns["GreedyBFD"]
            out = GreedyBFD(container_obj, catalog).run()
            best_result = out["best_result"]
            best_score = out["best_score"]
        elif algorithm == "sa":
            SimulatedAnnealing = ns["SimulatedAnnealing"]
            iterations = int(config.get("saIterations") or 1000)
            initial_t = float(config.get("saInitialT") or 5000)
            alpha = float(config.get("saAlpha") or 0.98)
            sa = SimulatedAnnealing(
                container_obj,
                [_copy_notebook_box(b) for b in catalog],
                T=initial_t,
                alpha=alpha,
            )
            out = sa.run(iterations=iterations)
            best_solution = _sanitize_chromosome(out.get("best_solution"), catalog)
            fresh = Container(length_cm, width_cm, height_cm)
            best_result = fresh.pack_boxes(best_solution)
            best_score = float(out.get("best_score") or 0)
        else:
            max_evals = int(config.get("gaMaxEvals") or 8000)
            best_result, best_score = _run_genetic(ns, container_obj, catalog, max_evals)

    return build_web_response(best_result, best_score, web_boxes)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        result = run_pack(payload)
        json.dump(result, sys.stdout)
        return 0
    except Exception as exc:
        json.dump(
            {"error": str(exc), "detail": traceback.format_exc()},
            sys.stdout,
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
