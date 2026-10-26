// src/config/logger.js
// Pino structured JSON logger.
// In development, uses pino-pretty for human-readable output.
// Never log sensitive fields (passwords, tokens, biometric vectors).

import pino from "pino";
import env from "./env.js";

const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.currentPassword",
      "body.newPassword",
      "body.token",
      "body.refreshToken",
      "body.imageData",
      "body.embedding",
      "*.hashedPassword",
      "*.refreshToken",
      "*.embedding",
      "*.encryptedVector",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

export default logger;
