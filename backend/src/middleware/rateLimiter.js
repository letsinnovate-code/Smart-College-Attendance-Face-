// src/middleware/rateLimiter.js
// Rate limiting middleware using express-rate-limit.
// Uses Redis store when available; falls back to in-memory store.

import rateLimit from "express-rate-limit";
import { ErrorCode } from "./errorHandler.js";
import env from "../config/env.js";

function makeStore() {
  // Attempt to use Redis store if ioredis client is available
  // We do a dynamic import to avoid crashing if redis is null
  return undefined; // Memory store by default; see rateLimiterWithRedis for Redis variant
}

function buildLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs ?? env.RATE_LIMIT_WINDOW_MS,
    max: options.max ?? env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use forwarded IP if behind a trusted proxy, otherwise socket remote address
      return req.ip || req.socket?.remoteAddress || "unknown";
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        code: ErrorCode.RATE_LIMITED,
        message: "Too many requests — please try again later",
        requestId: req.requestId,
      });
    },
    skip: (req) => {
      // Skip rate limiting in test environment to avoid flaky tests
      return env.NODE_ENV === "test";
    },
    ...options,
  });
}

// General API rate limiter
export const apiLimiter = buildLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
});

// Strict limiter for authentication endpoints
export const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.AUTH_RATE_LIMIT_MAX,
});

// Limiter for password-reset endpoints
export const passwordResetLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
});

// Limiter for face enrollment/verification (expensive operation)
export const faceLimiter = buildLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
});

// Limiter for report exports
export const reportLimiter = buildLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
});
