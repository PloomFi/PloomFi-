import time
import random

class WalletRiskEvaluator:
    def __init__(self, transactions):
        self.transactions = transactions

    def evaluate(self):
        score = 0
        for tx in self.transactions:
            score += self._evaluate_tx(tx)
        return min(100, score)

    def _evaluate_tx(self, tx):
        if tx['amount'] > 10000 and tx['type'] == 'out':
            return 20
        elif tx['destination'].startswith("unknown_"):
            return 15
        return 5

def generate_sample_data():
    return [{'amount': random.randint(100, 20000),
             'type': random.choice(['in', 'out']),
             'destination': random.choice(['known_wallet', 'unknown_wallet'])} for _ in range(10)]

if __name__ == "__main__":
    data = generate_sample_data()
    evaluator = WalletRiskEvaluator(data)
    print("Risk Score:", evaluator.evaluate())
