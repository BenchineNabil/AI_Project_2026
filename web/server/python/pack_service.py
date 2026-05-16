"""
stdin JSON → run env2.ipynb search classes → stdout JSON.
All packing parameters and search logic come from env2 (no web-side overrides).
"""
from __future__ import annotations

import contextlib
import inspect
import io
import json
import sys
import traceback
from typing import Any

from notebook_loader import load_env2_namespace

# All search classes defined in env2.ipynb (id, class name, UI label).
_ENV2_PACKER_SPECS: tuple[tuple[str, str, str], ...] = (
    ("greedy-hc", "GreedyBFD", "Greedy"),
    ("sa", "SimulatedAnnealing", "Simulated Annealing (SA)"),
    ("genetic", "GeneticAlgorithm", "Genetic Algorithm"),
    ("pso", "PSOPacker", "Particle Swarm (PSO)"),
    ("aco", "ACOPacker", "Ant Colony (ACO)"),
    ("csp", "CSPPacker", "Constraint Satisfaction (CSP)"),
)
_DEFAULT_LABELS = {spec[0]: spec[2] for spec in _ENV2_PACKER_SPECS}


def _m_to_cm(value: float) -> float:
    return float(value) * 100.0


def _parse_fragile(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    return text in ("true", "1", "yes")


def _dims_as_meters(
    length: float, width: float, height: float, container_m: dict[str, float]
) -> tuple[float, float, float]:
    """Web UI stores meters; env2 uses cm internally."""
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
    """GA order crossover requires unique box ids."""
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


def _resolve_packer_class(ns: dict[str, Any], entry: Any) -> type:
    if isinstance(entry, str):
        if entry not in ns:
            raise RuntimeError(f"env2 WEB_PACK_ALGORITHMS references unknown class {entry!r}")
        entry = ns[entry]
    if not callable(entry):
        raise RuntimeError("WEB_PACK_ALGORITHMS entries must be classes or class names")
    return entry


def _discover_packers_from_env2(ns: dict[str, Any]) -> dict[str, type]:
    """Register every env2 search class that exists in the notebook namespace."""
    registry: dict[str, type] = {}
    for algo_id, class_name, _ in _ENV2_PACKER_SPECS:
        cls = ns.get(class_name)
        if inspect.isclass(cls) and callable(getattr(cls, "run", None)):
            registry[algo_id] = cls
    return registry


def resolve_web_algorithms(ns: dict[str, Any]) -> dict[str, type]:
    """
    Algorithm registry from env2 (optional WEB_PACK_ALGORITHMS dict) or auto-discovery.
    Override / extend in env2 without changing web code:
        WEB_PACK_ALGORITHMS = {"greedy-hc": GreedyBFD, "pso": PSOPacker, ...}
    """
    custom = ns.get("WEB_PACK_ALGORITHMS")
    if isinstance(custom, dict) and custom:
        return {str(key): _resolve_packer_class(ns, value) for key, value in custom.items()}

    return _discover_packers_from_env2(ns)


def list_web_algorithms(ns: dict[str, Any]) -> list[dict[str, str]]:
    registry = resolve_web_algorithms(ns)
    labels = ns.get("WEB_PACK_ALGORITHM_LABELS")
    label_map = labels if isinstance(labels, dict) else {}

    out: list[dict[str, str]] = []
    for algo_id in registry:
        label = label_map.get(algo_id) or _DEFAULT_LABELS.get(algo_id, algo_id)
        out.append({"id": algo_id, "label": str(label)})
    return out


def _instantiate_packer(packer_cls: type, container_obj: Any, catalog: list[dict[str, Any]]) -> Any:
    """Construct packer using env2 __init__ defaults only (container + boxes)."""
    boxes = [_copy_notebook_box(b) for b in catalog]
    params = [
        p for p in inspect.signature(packer_cls.__init__).parameters.values() if p.name != "self"
    ]
    if not params:
        return packer_cls()
    if len(params) == 1:
        return packer_cls(container_obj)
    return packer_cls(container_obj, boxes)


def _normalize_stability(raw: Any) -> dict[str, float]:
    if isinstance(raw, dict):
        return {
            "weight_score": float(raw.get("weight_score", 0)),
            "support_score": float(raw.get("support_score", 0)),
            "stability_score": float(raw.get("stability_score", 0)),
        }
    if isinstance(raw, (int, float)):
        return {"weight_score": 0.0, "support_score": 0.0, "stability_score": float(raw)}
    return {"weight_score": 0.0, "support_score": 0.0, "stability_score": 0.0}


def _stats_to_best_result(stats: dict[str, Any]) -> dict[str, Any]:
    """Map PSO / ACO / CSP stats dicts to the GreedyBFD-style best_result shape."""
    placed_boxes = stats.get("placed_boxes") or []
    unplaced_boxes = stats.get("unplaced_boxes") or []
    placed = int(stats.get("placed_count", stats.get("placed", len(placed_boxes))))
    unplaced = int(stats.get("unplaced_count", stats.get("unplaced", len(unplaced_boxes))))
    stability_raw = stats.get("stability_full", stats.get("stability"))
    return {
        "placed": placed,
        "unplaced": unplaced,
        "placed_count": placed,
        "unplaced_count": unplaced,
        "utilization": float(stats.get("utilization", 0)),
        "stability": _normalize_stability(stability_raw),
        "placed_boxes": placed_boxes,
        "unplaced_boxes": unplaced_boxes,
    }


def _normalize_packer_output(
    out: dict[str, Any],
    instance: Any,
    packer_cls: type,
) -> tuple[dict[str, Any], float]:
    """Accept env2 return shapes: best_result (GA/SA/Greedy) or stats (PSO/ACO/CSP)."""
    if "best_result" in out:
        return out["best_result"], float(out.get("best_score") or 0)

    score = float(out.get("best_score") or 0)
    stats = out.get("stats")
    if isinstance(stats, dict) and stats.get("placed_boxes") is not None:
        if not score:
            if stats.get("best_score") is not None:
                score = float(stats["best_score"])
            elif stats.get("fitness") is not None:
                score = float(stats["fitness"])
        return _stats_to_best_result(stats), score

    container = getattr(instance, "container", None)
    if container is not None and getattr(container, "placed_boxes", None) is not None:
        placed_boxes = list(container.placed_boxes)
        unplaced_boxes = list(getattr(container, "unplaced_boxes", []) or [])
        cv = float(container.length) * float(container.width) * float(container.height)
        packed_vol = sum(b["l"] * b["w"] * b["h"] for b in placed_boxes)
        utilization = (packed_vol / cv) * 100 if cv else 0.0
        stability = _normalize_stability(getattr(container, "evaluate_stability", lambda: {})())
        if not score and hasattr(instance, "global_best_fitness"):
            score = float(getattr(instance, "global_best_fitness", 0) or 0)
        return (
            {
                "placed": len(placed_boxes),
                "unplaced": len(unplaced_boxes),
                "placed_count": len(placed_boxes),
                "unplaced_count": len(unplaced_boxes),
                "utilization": utilization,
                "stability": stability,
                "placed_boxes": placed_boxes,
                "unplaced_boxes": unplaced_boxes,
            },
            score,
        )

    raise RuntimeError(
        f"{packer_cls.__name__}.run() returned an unsupported shape; "
        "expected best_result or stats with placed_boxes"
    )


_SKIP_PARAM_ATTRS = frozenset(
    {
        "container",
        "boxes",
        "intitial_boxes",
        "initial_boxes",
        "original_boxes",
        "particles",
        "tau",
        "eta",
        "history",
        "best_order",
        "best_result",
        "best_score",
        "best_solution",
        "global_best_position",
        "global_best_stats",
        "global_best_fitness",
        "rng",
        "_backtracks",
    }
)

_PARAM_LABELS: dict[str, str] = {
    "T": "Initial temperature (T)",
    "alpha": "Cooling rate (alpha)",
    "max_evals": "Max evaluations (GA)",
    "pop_size": "Population size",
    "generations": "Generations",
    "crossover_rate": "Crossover rate",
    "mutation_rate": "Mutation rate",
    "tournament_k": "Tournament size (k)",
    "elitism_count": "Elitism count",
    "stagnation_limit": "Stagnation limit",
    "w_util": "Weight — utilization",
    "w_stab": "Weight — stability",
    "w_space": "Weight — placement fill",
    "n_particles": "Swarm size (particles)",
    "n_iter": "Iterations",
    "w": "Inertia weight (PSO)",
    "c1": "Cognitive coefficient (c1)",
    "c2": "Social coefficient (c2)",
    "lambda_stability": "Lambda — stability",
    "lambda_unplaced": "Lambda — unplaced penalty",
    "n_ants": "Ant count",
    "rho": "Evaporation rate (rho)",
    "beta": "Heuristic exponent (beta)",
    "Q": "Pheromone deposit (Q)",
    "tau_init": "Initial pheromone",
    "tau_min": "Min pheromone",
    "tau_max": "Max pheromone",
    "backtrack_limit": "Backtrack limit (CSP)",
    "min_support": "Min support ratio (CSP)",
    "seed": "Random seed",
    "verbose": "Verbose logging",
    "iterations": "SA iterations (run)",
}


def _serialize_param(value: Any) -> str | int | float | bool:
    if value is None:
        return "null"
    if isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (list, tuple)):
        return f"{type(value).__name__}(len={len(value)})"
    if isinstance(value, dict):
        return f"dict(keys={len(value)})"
    return str(value)


def _param_label(name: str, ns: dict[str, Any] | None = None) -> str:
    custom = (ns or {}).get("WEB_PARAM_LABELS")
    if isinstance(custom, dict) and name in custom:
        return str(custom[name])
    if name.startswith("run."):
        base = name[4:]
        return f"run() — {_PARAM_LABELS.get(base, base.replace('_', ' '))}"
    return _PARAM_LABELS.get(name, name.replace("_", " ").strip())


def extract_search_config(
    instance: Any,
    packer_cls: type,
    *,
    algorithm: str,
    container_obj: Any,
    ns: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Snapshot env2 search parameters from the constructed packer instance."""
    parameters: list[dict[str, Any]] = []

    for pname, param in inspect.signature(packer_cls.__init__).parameters.items():
        if pname in _SKIP_PARAM_ATTRS:
            continue
        if pname == "self":
            continue
        val = getattr(instance, pname, None)
        if val is None and param.default is not inspect.Parameter.empty:
            val = param.default
        if pname in ("container", "boxes", "intitial_boxes", "initial_boxes", "original_boxes"):
            continue
        parameters.append(
            {
                "name": pname,
                "label": _param_label(pname, ns),
                "value": _serialize_param(val),
            }
        )

    for pname, param in inspect.signature(packer_cls.run).parameters.items():
        if pname == "self":
            continue
        default = param.default
        if default is inspect.Parameter.empty:
            continue
        parameters.append(
            {
                "name": f"run.{pname}",
                "label": _param_label(f"run.{pname}", ns),
                "value": _serialize_param(default),
            }
        )

    return {
        "algorithm": algorithm,
        "className": packer_cls.__name__,
        "engine": "env2.ipynb",
        "containerCm": {
            "length": float(container_obj.length),
            "width": float(container_obj.width),
            "height": float(container_obj.height),
        },
        "boxCount": len(getattr(instance, "boxes", []) or getattr(instance, "original_boxes", []) or []),
        "parameters": parameters,
    }


def _run_packer(
    packer_cls: type,
    container_obj: Any,
    catalog: list[dict[str, Any]],
    *,
    algorithm: str,
    ns: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], float, dict[str, Any]]:
    """Call .run() with env2 defaults (no web-side parameter overrides)."""
    instance = _instantiate_packer(packer_cls, container_obj, catalog)
    search_config = extract_search_config(
        instance, packer_cls, algorithm=algorithm, container_obj=container_obj, ns=ns
    )
    out = instance.run()
    if not isinstance(out, dict):
        raise RuntimeError(f"{packer_cls.__name__}.run() must return a dict")
    best_result, best_score = _normalize_packer_output(out, instance, packer_cls)
    return best_result, best_score, search_config


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
    search_config: dict[str, Any] | None = None,
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
        "searchConfig": search_config,
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


def run_list_algorithms() -> dict[str, Any]:
    ns = load_env2_namespace()
    return {"algorithms": list_web_algorithms(ns), "engine": "env2.ipynb"}


def run_pack(payload: dict[str, Any]) -> dict[str, Any]:
    algorithm = payload.get("algorithm")
    web_boxes = payload.get("boxes") or []
    container = payload.get("container") or {}

    ns = load_env2_namespace()
    registry = resolve_web_algorithms(ns)

    if not algorithm:
        raise ValueError("algorithm is required")
    if algorithm not in registry:
        valid = ", ".join(registry.keys()) or ", ".join(_DEFAULT_LABELS.keys())
        raise ValueError(f"Unknown algorithm {algorithm!r}. Valid: {valid}")

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

    packer_cls = registry[algorithm]
    with _quiet_stdout():
        best_result, best_score, search_config = _run_packer(
            packer_cls,
            container_obj,
            catalog,
            algorithm=algorithm,
            ns=ns,
        )

    return build_web_response(best_result, best_score, web_boxes, search_config)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        if payload.get("listAlgorithms"):
            result = run_list_algorithms()
        else:
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
