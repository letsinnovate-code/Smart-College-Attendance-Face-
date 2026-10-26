// src/config/env.js
// Validates all environment variables at startup using Zod.
// The app will refuse to start if required variables are missing or invalid.

import { z } from "zod";
import { config } from "dotenv";

config(); // Load .env file

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),

  // MongoDB
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // JWT / Token secrets
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),

  // Cookies
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  // Redis (optional — degrades gracefully if absent)
  REDIS_URL: z.string().url().optional(),

  // Face recognition
  FACE_PROVIDER: z
    .enum(["onnx", "http", "mock"])
    .default("onnx")
    .refine(
      (v) => !(process.env.NODE_ENV === "production" && v === "mock"),
      "FACE_PROVIDER=mock is not allowed in production",
    ),
  FACE_MODEL_VERSION: z.string().default("arcface-r100"),
  FACE_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
  FACE_LIVENESS_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  FACE_PROVIDER_URL: z.string().url().optional(),
  FACE_PROVIDER_API_KEY: z.string().optional(),

  // Uploads
  UPLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024), // 5 MB

  // Logging
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  // Email (optional)
  EMAIL_PROVIDER: z.enum(["smtp", "sendgrid", "none"]).default("none"),
  EMAIL_FROM: z.string().email().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  // Biometric encryption key (AES-256-GCM, hex-encoded 32-byte key)
  BIOMETRIC_ENCRYPTION_KEY: z
    .string()
    .min(64, "Must be a 64-char hex string (32-byte AES key)")
    .optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

let env;
try {
  env = envSchema.parse(process.env);
} catch (err) {
  // Output validation errors in a readable format and exit immediately
  console.error("❌  Environment validation failed:\n");
  if (err.errors) {
    err.errors.forEach((e) => {
      console.error(`  ${e.path.join(".")}: ${e.message}`);
    });
  }
  process.exit(1);
}

export default env;
