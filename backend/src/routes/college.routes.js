// src/routes/college.routes.js

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { requireRoles } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import * as collegeController from "../controllers/college.controller.js";

const router = Router();
router.use(authenticate);

const createCollegeSchema = z.object({
  name: z.string().min(2).max(200),
  shortName: z.string().max(20).optional(),
  domain: z
    .string()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)
    .optional(),
  tenantCode: z.string().min(2).max(10),
  address: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  settings: z
    .object({
      attendanceWindowMinutes: z.number().int().min(5).max(180).optional(),
      latenessWindowMinutes: z.number().int().min(1).max(60).optional(),
      minAttendancePercentage: z.number().min(0).max(100).optional(),
      allowFaceAttendance: z.boolean().optional(),
      allowManualAttendance: z.boolean().optional(),
      requireBiometricConsent: z.boolean().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

const updateCollegeSchema = createCollegeSchema.partial();

const statusSchema = z.object({
  status: z.enum(["active", "suspended", "pending"]),
});

// SuperAdmin endpoints
router.post(
  "/",
  requireRoles("superAdmin"),
  validate(createCollegeSchema),
  asyncHandler(collegeController.createCollege),
);
router.get(
  "/",
  requireRoles("superAdmin"),
  asyncHandler(collegeController.listColleges),
);
router.patch(
  "/:id/status",
  requireRoles("superAdmin"),
  validate(statusSchema),
  asyncHandler(collegeController.updateCollegeStatus),
);

// Scoped endpoints: accessible by superAdmin or collegeAdmin for their own college
router.get(
  "/:id",
  requireRoles("superAdmin", "collegeAdmin"),
  asyncHandler(collegeController.getCollege),
);
router.put(
  "/:id",
  requireRoles("superAdmin", "collegeAdmin"),
  validate(updateCollegeSchema),
  asyncHandler(collegeController.updateCollege),
);

export default router;
