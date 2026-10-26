// src/config/database.js
// Mongoose connection with exponential back-off retry.
// Emits connection lifecycle events to the logger.

import mongoose from "mongoose";
import env from "./env.js";
import logger from "./logger.js";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

async function connectWithRetry(attempt = 1) {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
    });
    logger.info(
      { uri: env.MONGODB_URI.replace(/\/\/.*@/, "//***@") },
      "MongoDB connected",
    );
  } catch (err) {
    if (attempt >= MAX_RETRIES) {
      logger.fatal(
        { err },
        "MongoDB connection failed after max retries — exiting",
      );
      process.exit(1);
    }
    const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
    logger.warn(
      { attempt, delay },
      `MongoDB connection failed — retrying in ${delay}ms`,
    );
    await new Promise((r) => setTimeout(r, delay));
    return connectWithRetry(attempt + 1);
  }
}

mongoose.connection.on("disconnected", () =>
  logger.warn("MongoDB disconnected"),
);
mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
mongoose.connection.on("error", (err) =>
  logger.error({ err }, "MongoDB error"),
);

export async function connect() {
  await connectWithRetry();
}

export async function disconnect() {
  await mongoose.connection.close();
  logger.info("MongoDB connection closed");
}

export { mongoose };
