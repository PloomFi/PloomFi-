
// 🧠 PatternFlux — Multivariate Signal Classifier with Adaptive Learning

type DataPoint = {
    features: number[]
    label?: string
}

type ClassificationResult = {
    predictedLabel: string
    confidence: number
    featureImpact: number[]
}

class AdaptiveClassifier {
    private weights: number[] = []
    private labels: Set<string> = new Set()

    constructor(private featureCount: number) {
        this.weights = new Array(featureCount).fill(1)
    }

    public train(data: DataPoint[]): void {
        for (const point of data) {
            if (point.label) this.labels.add(point.label)
        }
        this.adjustWeights(data)
    }

    private adjustWeights(data: DataPoint[]): void {
        const learningRate = 0.02
        for (const point of data) {
            const norm = point.features.map((f, i) => f * this.weights[i])
            const mean = norm.reduce((a, b) => a + b, 0) / this.featureCount
            this.weights = this.weights.map((w, i) =>
                w + learningRate * (point.features[i] - mean)
            )
        }
    }

    public classify(input: number[]): ClassificationResult {
        const sum = input.map((x, i) => x * this.weights[i]).reduce((a, b) => a + b, 0)
        const maxImpact = Math.max(...this.weights)
        const impact = input.map((x, i) => (x * this.weights[i]) / maxImpact)

        let predictedLabel = "Unknown"
        if (sum > 0.5) predictedLabel = "Signal-A"
        else if (sum < -0.5) predictedLabel = "Signal-B"

        const confidence = Math.min(1, Math.abs(sum) / 10)

        return {
            predictedLabel,
            confidence,
            featureImpact: impact
        }
    }

    public getKnownLabels(): string[] {
        return Array.from(this.labels)
    }

    public resetModel(): void {
        this.weights = new Array(this.featureCount).fill(1)
        this.labels.clear()
    }
}

export const fluxClassifier = new AdaptiveClassifier(5)
