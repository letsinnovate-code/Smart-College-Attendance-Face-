// src/config/redis.js
// Optional Redis client using ioredis.
// When REDIS_URL is absent the module exports null and callers degrade gracefully.

import Redis from "ioredis";
import env from "./env.js";
import logger from "./logger.js";

let redis = null;

if (env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    reconnectOnError: (err) => {
      const targetErrors = ["READONLY", "ECONNRESET"];
      return targetErrors.some((msg) => err.message.includes(msg));
    },
  });

  redis.on("connect", () => logger.info("Redis connected"));
  redis.on("error", (err) => logger.error({ err }, "Redis error"));
  redis.on("close", () => logger.warn("Redis connection closed"));

  try {
    await redis.connect();
  } catch (err) {
    logger.warn(
      { err },
      "Redis initial connect failed — continuing without Redis",
    );
    redis = null;
  }
} else {
  logger.info("REDIS_URL not configured — Redis features disabled");
}

export async function closeRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export default redis;
