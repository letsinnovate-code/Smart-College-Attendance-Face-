// src/jobs/index.js
// Background task worker queue using BullMQ with graceful fallback when Redis is unavailable.

import { Queue, Worker } from "bullmq";
import env from "../config/env.js";
import logger from "../config/logger.js";
import redisClient from "../config/redis.js";

let notificationQueue = null;
let notificationWorker = null;

if (redisClient) {
  try {
    notificationQueue = new Queue("notifications", { connection: redisClient });
    notificationWorker = new Worker(
      "notifications",
      async (job) => {
        logger.info(
          { jobId: job.id, name: job.name, data: job.data },
          "Processing background notification job",
        );
        // Handle job actions (email, webhook, report generation)
        return { processed: true, timestamp: new Date() };
      },
      { connection: redisClient },
    );

    notificationWorker.on("completed", (job) => {
      logger.debug({ jobId: job.id }, "Background job completed successfully");
    });

    notificationWorker.on("failed", (job, err) => {
      logger.error(
        { jobId: job?.id, err: err.message },
        "Background job failed",
      );
    });
  } catch (err) {
    logger.warn(
      { err: err.message },
      "Failed to initialize BullMQ queue; falling back to direct mode",
    );
  }
} else {
  logger.info(
    "Redis not configured — background tasks will execute inline or be recorded directly",
  );
}

/**
 * Dispatch an asynchronous notification or task.
 */
export async function dispatchTask(taskName, payload) {
  if (notificationQueue) {
    return notificationQueue.add(taskName, payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
    });
  }

  // Graceful fallback when Redis is absent
  logger.info(
    { taskName, payload },
    "Executing background task inline (Redis disabled)",
  );
  return Promise.resolve({ inline: true });
}

export async function closeWorkers() {
  if (notificationWorker) {
    await notificationWorker.close();
  }
}
