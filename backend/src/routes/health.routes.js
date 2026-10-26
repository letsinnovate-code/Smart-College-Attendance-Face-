// src/routes/health.routes.js
/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Returns 200 if the process is alive. Used by orchestrators to restart unhealthy pods.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Process is alive
 *
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Returns 200 if the application is ready to serve traffic (DB connected, provider ready).
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Application is ready
 *       503:
 *         description: Application is not ready
 */

import { Router } from "express";
import mongoose from "mongoose";
import { getFaceProvider } from "../providers/face/index.js";

const router = Router();

router.get("/live", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.get("/ready", async (req, res) => {
  const checks = {};

  // MongoDB check
  checks.mongodb = mongoose.connection.readyState === 1 ? "ok" : "degraded";

  // Face provider check (non-blocking)
  try {
    const provider = await getFaceProvider();
    const health = await provider.getProviderHealth();
    checks.faceProvider = health.healthy ? "ok" : "degraded";
  } catch {
    checks.faceProvider = "unavailable";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ready" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
