// src/providers/face/HttpFaceProvider.js
// Production face recognition provider that calls a separately deployed Python sidecar.
// The sidecar handles GPU-accelerated inference (e.g., InsightFace + liveness detection).
// All communication is over an authenticated internal HTTP API.
//
// The sidecar contract expected:
//   POST /detect       { imageBase64: string } → { detected, count, faces }
//   POST /quality      { imageBase64: string } → { score, acceptable, reasons }
//   POST /embed        { imageBase64: string } → { embedding, dimension }
//   POST /liveness     { imageBase64: string } → { live, score, method }
//   POST /compare      { embedding1, embedding2, threshold } → { match, score, threshold }
//   GET  /health                               → { healthy, latencyMs, details }

import { FaceProviderInterface } from "./FaceProviderInterface.js";
import { AppError } from "../../middleware/errorHandler.js";
import logger from "../../config/logger.js";
import env from "../../config/env.js";

export class HttpFaceProvider extends FaceProviderInterface {
  #baseUrl;
  #apiKey;
  #timeout;

  constructor() {
    super();
    if (!env.FACE_PROVIDER_URL) {
      throw new Error("FACE_PROVIDER_URL is required when FACE_PROVIDER=http");
    }
    this.#baseUrl = env.FACE_PROVIDER_URL.replace(/\/$/, "");
    this.#apiKey = env.FACE_PROVIDER_API_KEY;
    this.#timeout = 30_000; // 30s timeout for inference calls
  }

  get metadata() {
    return {
      name: "http",
      modelVersion: env.FACE_MODEL_VERSION || "remote",
      supportsLiveness: true, // Assumed: the sidecar must document its actual capability
    };
  }

  async #post(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeout);
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-Internal": "true",
      };
      if (this.#apiKey) headers["Authorization"] = `Bearer ${this.#apiKey}`;

      const res = await fetch(`${this.#baseUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw AppError.serviceUnavailable(
          `Face provider returned ${res.status}`,
        );
      }
      return res.json();
    } catch (err) {
      if (err.name === "AbortError") {
        throw AppError.serviceUnavailable("Face provider request timed out");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async #toBase64(imageBuffer) {
    return imageBuffer.toString("base64");
  }

  async detectFace(imageBuffer) {
    return this.#post("/detect", {
      imageBase64: await this.#toBase64(imageBuffer),
    });
  }

  async assessImageQuality(imageBuffer) {
    return this.#post("/quality", {
      imageBase64: await this.#toBase64(imageBuffer),
    });
  }

  async generateEmbedding(imageBuffer) {
    return this.#post("/embed", {
      imageBase64: await this.#toBase64(imageBuffer),
    });
  }

  async verifyLiveness(imageBuffer) {
    return this.#post("/liveness", {
      imageBase64: await this.#toBase64(imageBuffer),
    });
  }

  async compareEmbeddings(embedding1, embedding2, threshold) {
    return this.#post("/compare", { embedding1, embedding2, threshold });
  }

  async getProviderHealth() {
    const start = Date.now();
    try {
      const headers = { "X-Internal": "true" };
      if (this.#apiKey) headers["Authorization"] = `Bearer ${this.#apiKey}`;

      const res = await fetch(`${this.#baseUrl}/health`, { headers });
      const data = await res.json();
      return {
        healthy: res.ok && data.healthy !== false,
        latencyMs: Date.now() - start,
        details: data,
      };
    } catch (err) {
      logger.warn({ err: err.message }, "Face provider health check failed");
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        details: { error: err.message },
      };
    }
  }
}
