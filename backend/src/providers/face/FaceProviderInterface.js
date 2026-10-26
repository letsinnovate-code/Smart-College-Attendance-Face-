// src/providers/face/FaceProviderInterface.js
// Abstract interface (base class) for all face recognition providers.
// Every provider implementation MUST implement all methods defined here.
// The application layer only calls methods on this interface — never on a concrete provider directly.
//
// IMPORTANT HONESTY NOTE:
// - liveness/presentation-attack detection is a distinct capability from face detection.
// - The local ONNX provider DOES NOT provide liveness detection.
// - Only providers with documented liveness capabilities may set supportsLiveness = true.
// - Do not substitute face detection for liveness detection in public-facing claims.

export class FaceProviderInterface {
  /**
   * Provider name and version metadata.
   * @returns {{ name: string, modelVersion: string, supportsLiveness: boolean }}
   */
  get metadata() {
    throw new Error("metadata getter must be implemented");
  }

  /**
   * Detect faces in an image buffer.
   * @param {Buffer} imageBuffer
   * @returns {Promise<{ detected: boolean, count: number, faces: Array<{ bbox: number[], confidence: number }> }>}
   */
  async detectFace(imageBuffer) {
    // eslint-disable-line no-unused-vars
    throw new Error("detectFace must be implemented");
  }

  /**
   * Assess image quality for enrollment suitability.
   * @param {Buffer} imageBuffer
   * @returns {Promise<{ score: number, acceptable: boolean, reasons: string[] }>}
   *   score: 0–1 (1 = perfect quality)
   *   acceptable: boolean — whether quality is sufficient for enrollment
   *   reasons: list of quality issues found
   */
  async assessImageQuality(imageBuffer) {
    // eslint-disable-line no-unused-vars
    throw new Error("assessImageQuality must be implemented");
  }

  /**
   * Generate a face embedding from an image buffer.
   * @param {Buffer} imageBuffer
   * @returns {Promise<{ embedding: number[], dimension: number }>}
   */
  async generateEmbedding(imageBuffer) {
    // eslint-disable-line no-unused-vars
    throw new Error("generateEmbedding must be implemented");
  }

  /**
   * Perform liveness / presentation-attack detection.
   * MUST throw an error if the provider does not support liveness detection.
   * @param {Buffer} imageBuffer
   * @returns {Promise<{ live: boolean, score: number, method: string }>}
   */
  async verifyLiveness(imageBuffer) {
    // eslint-disable-line no-unused-vars
    throw new Error("verifyLiveness must be implemented");
  }

  /**
   * Compare two embeddings and determine if they match.
   * @param {number[]} embedding1 - Reference embedding (enrolled)
   * @param {number[]} embedding2 - Probe embedding (current capture)
   * @param {number} threshold - Minimum similarity score to consider a match
   * @returns {Promise<{ match: boolean, score: number, threshold: number }>}
   */
  async compareEmbeddings(embedding1, embedding2, threshold) {
    // eslint-disable-line no-unused-vars
    throw new Error("compareEmbeddings must be implemented");
  }

  /**
   * Health check for the provider backend.
   * @returns {Promise<{ healthy: boolean, latencyMs: number, details: object }>}
   */
  async getProviderHealth() {
    throw new Error("getProviderHealth must be implemented");
  }
}
