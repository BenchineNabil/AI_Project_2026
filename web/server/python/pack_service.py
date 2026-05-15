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


def web_boxes_to_notebook(
    boxes: list[dict[str, Any]], container_m: dict[str, float]
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for b in boxes:
        box_id = str(b.get("id") or b.get("sourceId") or "")
        l_m, w_m, h_m = _dims_as_meters(
            float(b["length"]), float(b["width"]), float(b["height"]), container_m
        )
        out.append(
            {
                "id": box_id,
                "name": b.get("name") or f"Box {box_id}",
                "l": max(1, round(_m_to_cm(l_m))),
                "w": max(1, round(_m_to_cm(w_m))),
                "h": max(1, round(_m_to_cm(h_m))),
                "weight": float(b.get("weight") or 0),
                "fragile": _parse_fragile(b.get("fragile")),
            }
        )
    return out


def notebook_placed_to_web(pb: dict[str, Any], lookup: dict[str, dict[str, Any]]) -> dict[str, Any]:
    pid = str(pb.get("id", ""))
    src = lookup.get(pid, {})
    return {
        "id": pid or src.get("id", f"placed-{pb.get('x')}-{pb.get('y')}-{pb.get('z')}"),
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
    src = lookup.get(uid, {})
    return {
        "id": uid or src.get("id", "unplaced"),
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
    lookup = {str(b.get("id", "")): b for b in web_boxes}

    length_cm = _m_to_cm(container_m["length"])
    width_cm = _m_to_cm(container_m["width"])
    height_cm = _m_to_cm(container_m["height"])

    container_obj = Container(length_cm, width_cm, height_cm)

    with _quiet_stdout():
        if algorithm == "greedy-hc":
            GreedyBFD = ns["GreedyBFD"]
            out = GreedyBFD(container_obj, py_boxes).run()
            best_result = out["best_result"]
            best_score = out["best_score"]
        elif algorithm == "sa":
            SimulatedAnnealing = ns["SimulatedAnnealing"]
            iterations = int(config.get("saIterations") or 1000)
            initial_t = float(config.get("saInitialT") or 5000)
            alpha = float(config.get("saAlpha") or 0.98)
            sa = SimulatedAnnealing(container_obj, py_boxes, T=initial_t, alpha=alpha)
            out = sa.run(iterations=iterations)
            best_result = out["best_result"]
            best_score = out["best_score"]
        else:
            GeneticAlgorithm = ns["GeneticAlgorithm"]
            max_evals = int(config.get("gaMaxEvals") or 8000)
            ga = GeneticAlgorithm(container_obj, py_boxes, max_evals=max_evals)
            out = ga.run()
            best_result = out["best_result"]
            best_score = out["best_score"]

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
