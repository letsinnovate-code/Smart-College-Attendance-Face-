// src/providers/face/index.js
// Provider factory — selects the implementation based on FACE_PROVIDER env variable.
// Returns a singleton instance; the app never instantiates providers directly.

import env from "../../config/env.js";
import logger from "../../config/logger.js";

let providerInstance = null;

export async function getFaceProvider() {
  if (providerInstance) return providerInstance;

  const providerName = env.FACE_PROVIDER;
  logger.info(
    { provider: providerName },
    "Initializing face recognition provider",
  );

  switch (providerName) {
    case "onnx": {
      const { OnnxFaceProvider } = await import("./OnnxFaceProvider.js");
      providerInstance = new OnnxFaceProvider();
      break;
    }
    case "http": {
      const { HttpFaceProvider } = await import("./HttpFaceProvider.js");
      providerInstance = new HttpFaceProvider();
      break;
    }
    case "mock": {
      if (env.NODE_ENV === "production") {
        throw new Error("Mock face provider cannot be used in production");
      }
      const { MockFaceProvider } = await import("./MockFaceProvider.js");
      providerInstance = new MockFaceProvider();
      break;
    }
    default:
      throw new Error(`Unknown face provider: ${providerName}`);
  }

  logger.info(
    {
      provider: providerName,
      supportsLiveness: providerInstance.metadata.supportsLiveness,
    },
    "Face provider ready",
  );
  return providerInstance;
}

// For testing: replace the singleton (test files only)
export function setFaceProvider(provider) {
  providerInstance = provider;
}

export function clearFaceProvider() {
  providerInstance = null;
}
