from __future__ import annotations

import random
import re
from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple


# ─── Domain Model ──────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Tx:
    amount: float
    type: str               # 'in' | 'out'
    destination: str        # e.g. 'known_wallet', 'unknown_xyz'


# ─── Risk Evaluator ────────────────────────────────────────────────────────────

class WalletRiskEvaluator:
    """
    Deterministic wallet risk evaluator with configurable rules.
    - Large outbound transfers add more risk
    - Transfers to unknown_* destinations add moderate risk
    - Every transaction contributes a small baseline risk
    """

    def __init__(
        self,
        transactions: Iterable[Dict],
        *,
        large_out_threshold: float = 10_000.0,
        score_large_out: int = 20,
        score_unknown_dest: int = 15,
        score_baseline: int = 5,
        max_score: int = 100,
    ):
        self.large_out_threshold = float(large_out_threshold)
        self.score_large_out = int(score_large_out)
        self.score_unknown_dest = int(score_unknown_dest)
        self.score_baseline = int(score_baseline)
        self.max_score = int(max_score)

        # sanitize & freeze transactions
        self.transactions: List[Tx] = []
        for t in transactions:
            self.transactions.append(
                Tx(
                    amount=float(t.get("amount", 0.0)),
                    type=str(t.get("type", "")).lower(),
                    destination=str(t.get("destination", "")),
                )
            )

        # precompile pattern once
        self._unknown_re = re.compile(r"^unknown(?:_|$)", re.IGNORECASE)

    def evaluate(self) -> int:
        """
        Return a scalar risk score (0..max_score), clamped.
        """
        total = 0
        for tx in self.transactions:
            total += self._evaluate_tx(tx)
            if total >= self.max_score:
                return self.max_score
        return min(self.max_score, total)

    # Optional: expose detailed breakdown if needed in the future
    def evaluate_detailed(self) -> Tuple[int, List[Tuple[Tx, int, str]]]:
        """
        Returns (total_score, [(tx, score, reason), ...])
        """
        total = 0
        details: List[Tuple[Tx, int, str]] = []
        for tx in self.transactions:
            s, why = self._score_tx(tx)
            details.append((tx, s, why))
            total += s
            if total >= self.max_score:
                return self.max_score, details
        return min(self.max_score, total), details

    # ---- internals ----
    def _evaluate_tx(self, tx: Tx) -> int:
        s, _ = self._score_tx(tx)
        return s

    def _score_tx(self, tx: Tx) -> Tuple[int, str]:
        # Large outbound transfer
        if tx.type == "out" and tx.amount > self.large_out_threshold:
            return self.score_large_out, "large_out"

        # Unknown destination
        if self._unknown_re.match(tx.destination):
            return self.score_unknown_dest, "unknown_destination"

        # Baseline contribution
        return self.score_baseline, "baseline"


# ─── Sample Data (deterministic) ───────────────────────────────────────────────

def generate_sample_data(n: int = 10, seed: int = 42) -> List[Dict]:
    r = random.Random(seed)
    return [
        {
            "amount": r.randint(100, 20_000),
            "type": r.choice(["in", "out"]),
            "destination": r.choice(["known_wallet", "unknown_wallet", "unknown_abc"]),
        }
        for _ in range(n)
    ]


# ─── Programmatic Class Generation (replacing repetitive boilerplate) ─────────

# Generate SimulatedClass0..SimulatedClass29 with method_{i} -> i*2
for i in range(30):
    def _make_method(ii: int):
        def m(self):
            return ii * 2
        m.__name__ = f"method_{ii}"
        return m

    attrs = {f"method_{i}": _make_method(i)}
    cls = type(f"SimulatedClass{i}", (), attrs)
    globals()[cls.__name__] = cls

# Generate ModuleLogic30..ModuleLogic59 with run_{i} -> 'module-i'
for i in range(30, 60):
    def _make_run(ii: int):
        def r(self):
            return f"module-{ii}"
        r.__name__ = f"run_{ii}"
        return r

    attrs = {f"run_{i}": _make_run(i)}
    cls = type(f"ModuleLogic{i}", (), attrs)
    globals()[cls.__name__] = cls


# ─── Demo ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    data = generate_sample_data()
    evaluator = WalletRiskEvaluator(data)
    print("Risk Score:", evaluator.evaluate())

    # quick sanity check for generated classes
    print("SimulatedClass7.method_7():", globals()["SimulatedClass7"]().method_7())
    print("ModuleLogic42.run_42():", globals()["ModuleLogic42"]().run_42())
