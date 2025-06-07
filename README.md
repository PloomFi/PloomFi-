# ☁️ PloomFi

**PloomFi** is an intuitive Solana wallet enhanced with AI-powered insights — designed to detect token signals, track subtle market shifts, and help you stay ahead with clarity and speed.

## 🔑 Key Features

### 🌱 Token Bloom Scanner  
Detects risky token mechanics:
- Open Mint Authority  
- Freeze Controls  
- Unlocked Liquidity  

### ⚖️ Trust Petal Scorer  
Scores token trust levels using:
- Blacklist Flags  
- Ownership History  
- Liquidity Lock Signals  

### 🐳 Whale Drift Detector  
Analyzes wallet concentration to detect:
- Whale Clusters  
- Centralization Threats  
- Supply Imbalance

### 🔮 Aura Translator Engine  
Converts scores into intuitive trust signals:
- 🟢 Blooming  
- 🟡 Watchful  
- 🔴 Risky  

### 📜 Memory Petal Tracker  
Builds historical behavior logs to:
- Recognize evolving risk patterns  
- Improve AI predictions  
- Refine alert precision  

---

## 🌬️ Bloom Path Ahead

### 🌱 Q3 2025 — Roots in Place  
✅ Core Launch:
- Send / Swap  
- NFT Viewer  
- Activity Log  
✅ BloomKey Activation Layer (Access Control)  
✅ Live AI Risk Tags for all new tokens  
⚠️ Wallet Clustering (Beta): Early detection of dominance patterns

### 🌿 Q4 2025 — Branching Out  
🔹 Multi-Wallet Interface: Import & sync across sessions  
🔹 Cross-Chain Expansion: Extend beyond Solana  
🔹 Smart Visualizations: Dynamic overlays for price and risk per asset

### 🌸 Q1 2026 — Cognitive Growth  
🔹 Predictive DEX Flow: Early signal mapping for token movement  
🔹 Sentiment Layer: AI interpretation of chain emotion  
🔹 Governance Framework powered by $PLOOM:
- On-chain voting  
- Proposal system  
- Community-driven upgrades

---

## 🌿 Under the Bloom: PloomFi Core Intelligence
PloomFi is powered by a responsive AI core that analyzes contracts, tracks wallet dominance, and adapts to market emotion. Each module is designed to grow smarter as the chain evolves.

### 🌱 Token Bloom Scanner  
**Analyzes contract roots and structural intent**

```python
def scan_token(token):
    flags = []
    if token.get("mint_authority") == "open":
        flags.append("Open Mint Authority")
    if token.get("freeze_authority") == "active":
        flags.append("Transfer Can Be Frozen")
    if not token.get("liquidity_locked", False):
        flags.append("Unlocked Liquidity")
    return flags
```
#### 🧠 AI Insight: Learns from historical scam patterns and surfaces risk traits via token structure comparison.

### ⚖️ Trust Petal Scorer
#### Gives each token a calm or stormy rating

```python
def trust_score(token):
    score = 100
    if token.get("blacklist"): score -= 40
    if token.get("mint_authority") == "open": score -= 25
    if not token.get("liquidity_locked", True): score -= 20
    if token.get("owner_changed_recently"): score -= 15
    return max(0, score)
```
#### 🔍 AI Insight: Trained on loss events and exploit patterns to assess real trustworthiness.

### 🐳 Whale Drift Detector
#### Spots oversized wallet clusters and power imbalance

```javascript
function whaleCheck(holders) {
  const whales = holders.filter(h => h.balance >= 0.05);
  return whales.length > 5 ? 'High Whale Presence' : 'Healthy Spread';
}
```
#### 🔮 AI Insight: Tracks decentralization and warns when control clusters emerge too quickly.

### 🔮 Aura Translator Engine
#### Turns numeric scores into emotional trust tags

```javascript
function interpretAura(score) {
  if (score >= 80) return "🌼 Blooming";
  if (score >= 50) return "🌗 Watchful";
  return "🌪 Risky";
}
```
#### 🧘‍♀️ AI Insight: Uses adaptive logic to evolve labels over time as behaviors shift on-chain.

### 📜 Memory Petal Tracker
#### Builds a living timeline of token behavior

```python
def update_insight(token_id, label, score):
    log = {
        "token": token_id,
        "label": label,
        "score": score,
        "time": datetime.utcnow().isoformat()
    }
    insights_db[token_id] = {**insights_db.get(token_id, {}), **log}
```
#### 📚 AI Insight: Stores and builds history per token, improving detection and refining alert precision with time.

---

## 🌸 Final Bloom

> PloomFi grows with the chain — sensing, adapting, and protecting  
> One signal at a time, one petal at a time.

---
