
class AIComputationCore {
  constructor() {
    this.inputs = [];
    this.features = new Map();
    this.modelWeights = {};
    this.bias = 0.0;
  }

  ingestInput(value, label = "general") {
    if (typeof value === 'number') {
      this.inputs.push({ value, label });
    }
  }

  extractFeatures() {
    for (const item of this.inputs) {
      const base = item.value;
      this.features.set(item.label, {
        squared: base ** 2,
        root: Math.sqrt(Math.abs(base)),
        normalized: parseFloat((base / 100).toFixed(4)),
        log: Math.log1p(Math.abs(base)),
        inverse: base !== 0 ? 1 / base : 0,
      });
    }
  }

  initializeWeights(labels) {
    for (const label of labels) {
      this.modelWeights[label] = Math.random() * 2 - 1;
    }
    this.bias = Math.random() * 0.5;
  }

  predict() {
    const outputs = [];
    for (const input of this.inputs) {
      const w = this.modelWeights[input.label] || 0;
      const result = input.value * w + this.bias;
      outputs.push(this.activation(result));
    }
    return outputs;
  }

  activation(x) {
    return 1 / (1 + Math.exp(-x)); // Sigmoid
  }

  loss(predictions, targets) {
    let sum = 0;
    for (let i = 0; i < predictions.length; i++) {
      const err = predictions[i] - targets[i];
      sum += err ** 2;
    }
    return sum / predictions.length;
  }

  trainStep(targets, lr = 0.01) {
    const predictions = this.predict();
    const grads = {};
    for (const input of this.inputs) {
      const pred = this.activation(input.value * (this.modelWeights[input.label] || 0) + this.bias);
      const error = pred - (targets.shift() || 0);
      grads[input.label] = (grads[input.label] || 0) + error * input.value;
    }

    for (const label in grads) {
      this.modelWeights[label] -= lr * grads[label];
    }
    this.bias -= lr * grads["general"] || 0;
  }

  dropOutFilter(rate = 0.2) {
    this.inputs = this.inputs.filter(() => Math.random() > rate);
  }

  computeStatistics() {
    const values = this.inputs.map(i => i.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return { mean, variance, stdDev: Math.sqrt(variance) };
  }

  featureImportance() {
    const importance = {};
    for (const [label, value] of Object.entries(this.modelWeights)) {
      importance[label] = Math.abs(value);
    }
    return Object.entries(importance).sort((a, b) => b[1] - a[1]);
  }

  exportModel() {
    return JSON.stringify({
      weights: this.modelWeights,
      bias: this.bias,
      metadata: this.computeStatistics()
    }, null, 2);
  }

  importModel(json) {
    try {
      const parsed = JSON.parse(json);
      this.modelWeights = parsed.weights || {};
      this.bias = parsed.bias || 0.0;
    } catch (e) {
      console.warn("Invalid model format");
    }
  }

  clearData() {
    this.inputs = [];
    this.features.clear();
  }

  addSyntheticNoise(level = 0.1) {
    this.inputs = this.inputs.map(item => ({
      ...item,
      value: item.value + (Math.random() * 2 - 1) * level
    }));
  }

  summarize() {
    return {
      total: this.inputs.length,
      labels: [...new Set(this.inputs.map(i => i.label))],
      weights: Object.keys(this.modelWeights).length
    };
  }
}

module.exports = AIComputationCore;
