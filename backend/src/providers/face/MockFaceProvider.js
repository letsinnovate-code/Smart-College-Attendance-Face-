// src/providers/face/MockFaceProvider.js
// Test-only mock provider. MUST NEVER BE LOADED IN PRODUCTION.
// Returns configurable preset results for unit and integration tests.
// The env.js validation prevents FACE_PROVIDER=mock in NODE_ENV=production.

import { FaceProviderInterface } from "./FaceProviderInterface.js";

export class MockFaceProvider extends FaceProviderInterface {
  #config;

  constructor(config = {}) {
    super();
    this.#config = {
      detectResult: {
        detected: true,
        count: 1,
        faces: [{ bbox: [0, 0, 100, 100], confidence: 0.99 }],
      },
      qualityResult: { score: 0.95, acceptable: true, reasons: [] },
      embeddingResult: {
        embedding: new Array(512).fill(0).map((_, i) => i / 512),
        dimension: 512,
      },
      livenessResult: { live: true, score: 0.97, method: "mock-passive" },
      compareResult: null, // If null, computes cosine similarity
      healthResult: {
        healthy: true,
        latencyMs: 1,
        details: { provider: "mock" },
      },
      ...config,
    };
  }

  get metadata() {
    return {
      name: "mock",
      modelVersion: "mock-v1",
      supportsLiveness: true, // Mock always supports liveness for testing
    };
  }

  async detectFace(_imageBuffer) {
    return { ...this.#config.detectResult };
  }

  async assessImageQuality(_imageBuffer) {
    return { ...this.#config.qualityResult };
  }

  async generateEmbedding(_imageBuffer) {
    return { ...this.#config.embeddingResult };
  }

  async verifyLiveness(_imageBuffer) {
    return { ...this.#config.livenessResult };
  }

  async compareEmbeddings(embedding1, embedding2, threshold) {
    if (this.#config.compareResult !== null) {
      return { ...this.#config.compareResult };
    }
    // Compute actual cosine similarity for realistic tests
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dot += embedding1[i] * embedding2[i];
      normA += embedding1[i] ** 2;
      normB += embedding2[i] ** 2;
    }
    const score = dot / (Math.sqrt(normA) * Math.sqrt(normB)) || 0;
    return {
      match: score >= threshold,
      score: parseFloat(score.toFixed(4)),
      threshold,
    };
  }

  async getProviderHealth() {
    return { ...this.#config.healthResult };
  }

  // Test helper: override results mid-test
  setConfig(overrides) {
    Object.assign(this.#config, overrides);
  }
}
