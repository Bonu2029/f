"""Strategy registry — name -> class, plus a builder used by config and CLI."""

from __future__ import annotations

from typing import Any

from .base import Strategy, StrategyError
from .breakout import Breakout
from .ensemble import Ensemble
from .meanrev import MeanReversion
from .trend import TrendFollow

REGISTRY: dict[str, type[Strategy]] = {
    "trend": TrendFollow,
    "meanrev": MeanReversion,
    "breakout": Breakout,
}


def build_strategy(spec: str | dict[str, Any]) -> Strategy:
    """Build a strategy from a name or a config dict.

    Accepts either::

        "trend"
        {"name": "trend", "fast": 10, "slow": 40}
        {"name": "ensemble", "threshold": 0.4,
         "members": [{"name": "trend", "weight": 2}, "breakout"]}
    """
    if isinstance(spec, str):
        spec = {"name": spec}
    if not isinstance(spec, dict):
        raise StrategyError(f"cannot build strategy from {spec!r}")

    params = dict(spec)
    name = params.pop("name", None)
    if not name:
        raise StrategyError("strategy spec is missing 'name'")
    params.pop("weight", None)  # consumed by the parent ensemble, not the child

    if name == "ensemble":
        raw_members = params.pop("members", None) or []
        if not raw_members:
            raise StrategyError("ensemble needs a non-empty 'members' list")
        members, weights = [], []
        for entry in raw_members:
            members.append(build_strategy(entry))
            weights.append(
                float(entry.get("weight", 1.0)) if isinstance(entry, dict) else 1.0
            )
        return Ensemble(members, weights, **params)

    cls = REGISTRY.get(name)
    if cls is None:
        known = ", ".join(sorted([*REGISTRY, "ensemble"]))
        raise StrategyError(f"unknown strategy {name!r}; known: {known}")
    try:
        return cls(**params)
    except TypeError as exc:
        raise StrategyError(f"bad params for strategy {name!r}: {exc}") from exc


__all__ = [
    "Breakout",
    "Ensemble",
    "MeanReversion",
    "REGISTRY",
    "Strategy",
    "StrategyError",
    "TrendFollow",
    "build_strategy",
]
