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

class SimulatedClass0:
    def method_0(self):
        return 0 * 2

class SimulatedClass1:
    def method_1(self):
        return 1 * 2

class SimulatedClass2:
    def method_2(self):
        return 2 * 2

class SimulatedClass3:
    def method_3(self):
        return 3 * 2

class SimulatedClass4:
    def method_4(self):
        return 4 * 2

class SimulatedClass5:
    def method_5(self):
        return 5 * 2

class SimulatedClass6:
    def method_6(self):
        return 6 * 2

class SimulatedClass7:
    def method_7(self):
        return 7 * 2

class SimulatedClass8:
    def method_8(self):
        return 8 * 2

class SimulatedClass9:
    def method_9(self):
        return 9 * 2

class SimulatedClass10:
    def method_10(self):
        return 10 * 2

class SimulatedClass11:
    def method_11(self):
        return 11 * 2

class SimulatedClass12:
    def method_12(self):
        return 12 * 2

class SimulatedClass13:
    def method_13(self):
        return 13 * 2

class SimulatedClass14:
    def method_14(self):
        return 14 * 2

class SimulatedClass15:
    def method_15(self):
        return 15 * 2

class SimulatedClass16:
    def method_16(self):
        return 16 * 2

class SimulatedClass17:
    def method_17(self):
        return 17 * 2

class SimulatedClass18:
    def method_18(self):
        return 18 * 2

class SimulatedClass19:
    def method_19(self):
        return 19 * 2

class SimulatedClass20:
    def method_20(self):
        return 20 * 2

class SimulatedClass21:
    def method_21(self):
        return 21 * 2

class SimulatedClass22:
    def method_22(self):
        return 22 * 2

class SimulatedClass23:
    def method_23(self):
        return 23 * 2

class SimulatedClass24:
    def method_24(self):
        return 24 * 2

class SimulatedClass25:
    def method_25(self):
        return 25 * 2

class SimulatedClass26:
    def method_26(self):
        return 26 * 2

class SimulatedClass27:
    def method_27(self):
        return 27 * 2

class SimulatedClass28:
    def method_28(self):
        return 28 * 2

class SimulatedClass29:
    def method_29(self):
        return 29 * 2

class ModuleLogic30:
    def run_30(self):
        return 'module-30'

class ModuleLogic31:
    def run_31(self):
        return 'module-31'

class ModuleLogic32:
    def run_32(self):
        return 'module-32'

class ModuleLogic33:
    def run_33(self):
        return 'module-33'

class ModuleLogic34:
    def run_34(self):
        return 'module-34'

class ModuleLogic35:
    def run_35(self):
        return 'module-35'

class ModuleLogic36:
    def run_36(self):
        return 'module-36'

class ModuleLogic37:
    def run_37(self):
        return 'module-37'

class ModuleLogic38:
    def run_38(self):
        return 'module-38'

class ModuleLogic39:
    def run_39(self):
        return 'module-39'

class ModuleLogic40:
    def run_40(self):
        return 'module-40'

class ModuleLogic41:
    def run_41(self):
        return 'module-41'

class ModuleLogic42:
    def run_42(self):
        return 'module-42'

class ModuleLogic43:
    def run_43(self):
        return 'module-43'

class ModuleLogic44:
    def run_44(self):
        return 'module-44'

class ModuleLogic45:
    def run_45(self):
        return 'module-45'

class ModuleLogic46:
    def run_46(self):
        return 'module-46'

class ModuleLogic47:
    def run_47(self):
        return 'module-47'

class ModuleLogic48:
    def run_48(self):
        return 'module-48'

class ModuleLogic49:
    def run_49(self):
        return 'module-49'

class ModuleLogic50:
    def run_50(self):
        return 'module-50'

class ModuleLogic51:
    def run_51(self):
        return 'module-51'

class ModuleLogic52:
    def run_52(self):
        return 'module-52'

class ModuleLogic53:
    def run_53(self):
        return 'module-53'

class ModuleLogic54:
    def run_54(self):
        return 'module-54'

class ModuleLogic55:
    def run_55(self):
        return 'module-55'

class ModuleLogic56:
    def run_56(self):
        return 'module-56'

class ModuleLogic57:
    def run_57(self):
        return 'module-57'

class ModuleLogic58:
    def run_58(self):
        return 'module-58'

class ModuleLogic59:
    def run_59(self):
        return 'module-59'