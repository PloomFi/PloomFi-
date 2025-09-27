import time
from datetime import datetime, timedelta

class WalletRiskEvaluator:
    def __init__(self, transactions):
        self.transactions = transactions

    def evaluate(self):
        score = 0
        for tx in self.transactions:
            score += self._evaluate_tx(tx)
        normalized = min(100, score)
        return normalized

    def _evaluate_tx(self, tx):
        risk_points = 0

        # Rule 1: Large outgoing transaction
        if tx.get('amount', 0) > 10000 and tx.get('type') == 'out':
            risk_points += 20

        # Rule 2: Unknown destination
        if tx.get('destination', '').startswith("unknown_"):
            risk_points += 15

        # Rule 3: Very frequent transactions
        if self._is_high_frequency(tx):
            risk_points += 10

        # Rule 4: Destination in blacklist
        if self._is_blacklisted(tx.get('destination', '')):
            risk_points += 25

        # Default baseline
        return risk_points or 5

    def _is_high_frequency(self, tx):
        """Check if multiple transactions occurred within 1 minute."""
        tx_time = tx.get('timestamp')
        if not tx_time:
            return False
        count = 0
        for other in self.transactions:
            if other is not tx:
                other_time = other.get('timestamp')
                if other_time and abs((tx_time - other_time).total_seconds()) < 60:
                    count += 1
        return count >= 3

    def _is_blacklisted(self, destination):
        blacklist = {"unknown_wallet", "suspicious_address", "scam_target"}
        return destination in blacklist


def sample_transactions():
    """W"""
    base_time = datetime.now()
    return [
        {"amount": 12000, "type": "out", "destination": "known_wallet", "timestamp": base_time},
        {"amount": 500, "type": "in", "destination": "friend_wallet", "timestamp": base_time + timedelta(seconds=5)},
        {"amount": 300, "type": "out", "destination": "unknown_wallet", "timestamp": base_time + timedelta(seconds=10)},
        {"amount": 15000, "type": "out", "destination": "suspicious_address", "timestamp": base_time + timedelta(seconds=20)},
        {"amount": 750, "type": "in", "destination": "known_wallet", "timestamp": base_time + timedelta(seconds=40)},
        {"amount": 200, "type": "out", "destination": "scam_target", "timestamp": base_time + timedelta(seconds=55)},
    ]


if __name__ == "__main__":
    data = sample_transactions()
    evaluator = WalletRiskEvaluator(data)
    print("Risk Score:", evaluator.evaluate())
