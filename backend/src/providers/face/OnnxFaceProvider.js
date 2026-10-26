// src/providers/face/OnnxFaceProvider.js
// Local face recognition provider using @huggingface/transformers (ONNX Runtime).
// Uses an ArcFace-style feature extractor for face embeddings.
//
// LIVENESS DISCLAIMER: This provider does NOT support liveness / presentation-attack detection.
// supportsLiveness is explicitly set to false.
// Do not use this provider alone for high-security attendance without a separate liveness step.
//
// MODEL: Uses feature-extraction pipeline with a face model.
// For production use with GPU, prefer the HttpFaceProvider which calls a Python sidecar.

import { FaceProviderInterface } from "./FaceProviderInterface.js";
import logger from "../../config/logger.js";
import env from "../../config/env.js";

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  if (a.length !== b.length) throw new Error("Embedding dimension mismatch");
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

export class OnnxFaceProvider extends FaceProviderInterface {
  #pipeline = null;
  #loading = false;
  #modelId = "Xenova/clip-vit-base-patch32"; // Fallback CLIP model; swap for a face-specific ONNX model

  get metadata() {
    return {
      name: "onnx",
      modelVersion: env.FACE_MODEL_VERSION || "clip-vit-base-patch32",
      supportsLiveness: false,
    };
  }

  async #ensurePipeline() {
    if (this.#pipeline) return this.#pipeline;
    if (this.#loading) {
      // Wait for the ongoing load
      while (this.#loading) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return this.#pipeline;
    }
    this.#loading = true;
    try {
      // Dynamic import to avoid loading transformers until the provider is first used
      const { pipeline } = await import("@huggingface/transformers");
      logger.info(
        "Loading ONNX face model — this may take a moment on first run",
      );
      this.#pipeline = await pipeline("feature-extraction", this.#modelId, {
        dtype: "fp32",
      });
      logger.info({ modelId: this.#modelId }, "ONNX face model loaded");
    } finally {
      this.#loading = false;
    }
    return this.#pipeline;
  }

  async detectFace(imageBuffer) {
    // Basic heuristic: attempt to extract features; if the image is blank or corrupt,
    // the pipeline will throw. A proper face detector (MTCNN/RetinaFace) should be used
    // in production — this implementation provides a reasonable local development stub.
    try {
      await this.#ensurePipeline();
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(imageBuffer).metadata();
      if (!metadata.width || !metadata.height) {
        return {
          detected: false,
          count: 0,
          faces: [],
          error: "Invalid image dimensions",
        };
      }
      // Simplified: assume one face if the image can be processed
      return {
        detected: true,
        count: 1,
        faces: [
          { bbox: [0, 0, metadata.width, metadata.height], confidence: 0.8 },
        ],
      };
    } catch (err) {
      logger.warn({ err: err.message }, "Face detection failed");
      return { detected: false, count: 0, faces: [], error: err.message };
    }
  }

  async assessImageQuality(imageBuffer) {
    const reasons = [];
    try {
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(imageBuffer).metadata();
      const { width, height } = metadata;

      if (!width || !height) {
        return { score: 0, acceptable: false, reasons: ["Invalid image"] };
      }
      if (width < 100 || height < 100) {
        reasons.push("Image resolution too low (minimum 100x100)");
      }
      if (width > 4096 || height > 4096) {
        reasons.push("Image resolution too high");
      }

      // Check image sharpness via stats (simplified)
      const stats = await sharp(imageBuffer).greyscale().stats();
      const stdDev = stats.channels[0]?.std ?? 0;
      if (stdDev < 10) {
        reasons.push("Image appears blurry or uniform");
      }

      const score = Math.max(
        0,
        Math.min(1, (stdDev / 80) * (Math.min(width, 640) / 640)),
      );
      return {
        score,
        acceptable: reasons.length === 0 && score > 0.3,
        reasons,
      };
    } catch (err) {
      return {
        score: 0,
        acceptable: false,
        reasons: [`Quality check failed: ${err.message}`],
      };
    }
  }

  async generateEmbedding(imageBuffer) {
    const pipe = await this.#ensurePipeline();
    const sharp = (await import("sharp")).default;

    // Resize to 224x224 for the model and convert to PNG
    const resized = await sharp(imageBuffer)
      .resize(224, 224, { fit: "cover" })
      .png()
      .toBuffer();

    // The pipeline expects a URL or data URI; convert buffer to base64 data URI
    const dataUri = `data:image/png;base64,${resized.toString("base64")}`;
    const output = await pipe(dataUri, { pooling: "mean", normalize: true });
    const embedding = Array.from(output.data);

    return { embedding, dimension: embedding.length };
  }

  async verifyLiveness(_imageBuffer) {
    // This provider explicitly does NOT support liveness detection.
    // Callers must check provider.metadata.supportsLiveness before calling this method.
    throw new Error(
      "OnnxFaceProvider does not support liveness detection. " +
        "Configure FACE_PROVIDER=http and point FACE_PROVIDER_URL to a sidecar that implements liveness.",
    );
  }

  async compareEmbeddings(embedding1, embedding2, threshold) {
    const score = cosineSimilarity(embedding1, embedding2);
    return {
      match: score >= threshold,
      score: parseFloat(score.toFixed(4)),
      threshold,
    };
  }

  async getProviderHealth() {
    const start = Date.now();
    try {
      await this.#ensurePipeline();
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        details: { model: this.#modelId, liveness: false },
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        details: { error: err.message },
      };
    }
  }
}
