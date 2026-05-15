"""
Load executable code from environment/env2.ipynb into a cached namespace.
Does not modify the notebook file — reads and exec()s code cells in order.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

_NAMESPACE: dict[str, Any] | None = None


def default_notebook_path() -> Path:
    env = os.environ.get("ENV2_NOTEBOOK_PATH")
    if env:
        return Path(env).resolve()
    # web/server/python -> repo root is parents[3]
    return (Path(__file__).resolve().parents[3] / "environment" / "env2.ipynb").resolve()


def load_env2_namespace(notebook_path: Path | None = None) -> dict[str, Any]:
    global _NAMESPACE
    if _NAMESPACE is not None:
        return _NAMESPACE

    path = (notebook_path or default_notebook_path()).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"env2.ipynb not found at {path}")

    with path.open(encoding="utf-8") as f:
        nb = json.load(f)

    ns: dict[str, Any] = {"__name__": "env2_notebook_runtime"}
    for cell in nb.get("cells", []):
        if cell.get("cell_type") != "code":
            continue
        src = "".join(cell.get("source", []))
        if not src.strip():
            continue
        code = compile(src, str(path), "exec")
        exec(code, ns)  # noqa: S102 — intentional notebook bridge

    required = ("Container", "GreedyBFD", "SimulatedAnnealing", "GeneticAlgorithm")
    missing = [name for name in required if name not in ns]
    if missing:
        raise RuntimeError(f"env2.ipynb missing definitions: {', '.join(missing)}")

    _NAMESPACE = ns
    return ns


def reset_namespace_cache() -> None:
    global _NAMESPACE
    _NAMESPACE = None
