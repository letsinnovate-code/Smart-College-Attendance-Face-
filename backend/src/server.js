// src/server.js
// Server entry point.
// Connects to database, starts HTTP listener, and manages graceful shutdown.

import { createServer } from "http";
import { createHttpTerminator } from "http-terminator";
import app from "./app.js";
import env from "./config/env.js";
import logger from "./config/logger.js";
import { connect, disconnect } from "./config/database.js";
import { closeRedis } from "./config/redis.js";
import { closeWorkers } from "./jobs/index.js";

let server;
let httpTerminator;

async function bootstrap() {
  logger.info(
    { nodeEnv: env.NODE_ENV, port: env.PORT },
    "Starting Smart College Attendance Backend...",
  );

  // Connect to MongoDB
  await connect();

  // Create HTTP server
  server = createServer(app);
  httpTerminator = createHttpTerminator({ server });

  server.listen(env.PORT, () => {
    logger.info(
      `🚀 Server listening on port ${env.PORT} (${env.NODE_ENV} mode)`,
    );
    logger.info(
      `📚 Swagger docs available at: http://localhost:${env.PORT}/api/docs`,
    );
    logger.info(
      `✨ Live healthcheck at: http://localhost:${env.PORT}/api/v1/health/live`,
    );
  });
}

async function shutdown(signal) {
  logger.info({ signal }, "Graceful shutdown initiated...");

  try {
    if (httpTerminator) {
      logger.info("Terminating active HTTP connections...");
      await httpTerminator.terminate();
    }

    logger.info("Closing background job workers...");
    await closeWorkers();

    logger.info("Closing Redis connection...");
    await closeRedis();

    logger.info("Closing MongoDB connection...");
    await disconnect();

    logger.info("Graceful shutdown completed successfully");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error occurred during graceful shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled Promise Rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception");
  process.exit(1);
});

bootstrap();
