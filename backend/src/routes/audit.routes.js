// src/routes/audit.routes.js

import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRoles } from "../middleware/authorize.js";
import { attachTenantContext } from "../middleware/tenantContext.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import * as auditController from "../controllers/audit.controller.js";

const router = Router();
router.use(authenticate, attachTenantContext);

// Only auditors and administrators can view audit logs
router.get(
  "/",
  requireRoles("superAdmin", "collegeAdmin", "attendanceAuditor"),
  asyncHandler(auditController.listAuditLogs),
);

export default router;
