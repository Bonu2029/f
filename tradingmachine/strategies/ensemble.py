"""Weighted vote across several strategies.

Combining a trend model with a mean-reversion model is not a way to be right
more often — it is a way to have *something* to trade in more regimes, and to
stand aside when the two flatly disagree. Disagreement producing FLAT is the
feature, not a bug to be tuned away.
"""

from __future__ import annotations

from typing import Sequence

from ..models import Candle, Side, Signal
from .base import Strategy


class Ensemble(Strategy):
    name = "ensemble"

    def __init__(
        self,
        members: Sequence[Strategy],
        weights: Sequence[float] | None = None,
        threshold: float = 0.35,
    ) -> None:
        if not members:
            raise ValueError("ensemble needs at least one member strategy")
        if weights is None:
            weights = [1.0] * len(members)
        if len(weights) != len(members):
            raise ValueError("weights and members must be the same length")
        total = sum(abs(w) for w in weights)
        if total <= 0:
            raise ValueError("weights must not sum to zero")

        super().__init__(
            members=[m.describe() for m in members],
            weights=list(weights),
            threshold=threshold,
        )
        self.members = list(members)
        # Normalised so `threshold` means the same thing regardless of scale.
        self.weights = [w / total for w in weights]
        self.threshold = threshold
        self.warmup = max(m.warmup for m in members)

    def describe(self) -> str:
        parts = ", ".join(
            f"{m.name}x{w:.2g}" for m, w in zip(self.members, self.weights)
        )
        return f"ensemble[{parts}] @ threshold {self.threshold:.2f}"

    def evaluate(self, candles: Sequence[Candle]) -> Signal:
        if len(candles) < self.warmup:
            return self._flat("warming up")

        score = 0.0
        votes: list[str] = []
        meta: dict = {"votes": {}}
        best_atr: float | None = None
        best_weight = -1.0

        for member, weight in zip(self.members, self.weights):
            sig = member.evaluate(candles)
            score += weight * sig.strength * sig.side.sign
            meta["votes"][member.name] = {
                "side": sig.side.value,
                "strength": round(sig.strength, 3),
                "reason": sig.reason,
            }
            if sig.side is not Side.FLAT:
                votes.append(f"{member.name}:{sig.side.value}")
            atr_v = sig.meta.get("atr")
            if atr_v and weight > best_weight:
                best_atr, best_weight = atr_v, weight

        if best_atr is not None:
            meta["atr"] = best_atr
        meta["score"] = round(score, 4)

        if abs(score) < self.threshold:
            return Signal(Side.FLAT, 0.0, f"no consensus (score {score:+.2f})", meta)

        side = Side.LONG if score > 0 else Side.SHORT
        reason = f"consensus {score:+.2f} [{', '.join(votes) or 'n/a'}]"
        return Signal(side, min(1.0, abs(score)), reason, meta)
