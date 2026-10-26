// src/routes/report.routes.js

import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRoles, requireMinRole } from "../middleware/authorize.js";
import { attachTenantContext } from "../middleware/tenantContext.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { reportLimiter } from "../middleware/rateLimiter.js";
import * as reportController from "../controllers/report.controller.js";

const router = Router();
router.use(authenticate, attachTenantContext);

// Overview / Dashboard stats
router.get(
  "/overview",
  requireMinRole("faculty"),
  asyncHandler(reportController.getDailyOverview),
);

// Class report
router.get(
  "/classes/:classId",
  requireMinRole("faculty"),
  asyncHandler(reportController.getClassReport),
);

// CSV export for class report (rate limited to protect against export abuse)
router.get(
  "/classes/:classId/export/csv",
  requireMinRole("faculty"),
  reportLimiter,
  asyncHandler(reportController.exportClassCsv),
);

// Student personal or administrative report
router.get(
  "/students/:studentId",
  requireMinRole("student"),
  asyncHandler(reportController.getStudentReport),
);

export default router;
