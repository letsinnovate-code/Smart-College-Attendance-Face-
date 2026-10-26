// src/routes/user.routes.js

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { requireRoles, requireSelf } from "../middleware/authorize.js";
import { attachTenantContext } from "../middleware/tenantContext.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import * as userController from "../controllers/user.controller.js";

const router = Router();
router.use(authenticate, attachTenantContext);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum([
    "superAdmin",
    "collegeAdmin",
    "faculty",
    "student",
    "attendanceAuditor",
  ]),
  collegeId: z.string().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  gender: z.enum(["male", "female", "other", "preferNotToSay"]).optional(),
  dateOfBirth: z.string().datetime().optional(),
  accountStatus: z
    .enum(["active", "inactive", "suspended", "pendingVerification"])
    .optional(),
});

const updateUserSchema = z.object({
  profile: z
    .object({
      firstName: z.string().max(100).optional(),
      lastName: z.string().max(100).optional(),
      phone: z.string().optional(),
      studentId: z.string().optional(),
      employeeId: z.string().optional(),
      gender: z.enum(["male", "female", "other", "preferNotToSay"]).optional(),
      dateOfBirth: z.string().datetime().optional(),
    })
    .optional(),
  accountStatus: z
    .enum(["active", "inactive", "suspended", "pendingVerification"])
    .optional(),
  role: z
    .enum([
      "superAdmin",
      "collegeAdmin",
      "faculty",
      "student",
      "attendanceAuditor",
    ])
    .optional(),
});

// Admin endpoints
router.post(
  "/",
  requireRoles("superAdmin", "collegeAdmin"),
  validate(createUserSchema),
  asyncHandler(userController.createUser),
);
router.get(
  "/",
  requireRoles("superAdmin", "collegeAdmin", "attendanceAuditor", "faculty"),
  asyncHandler(userController.listUsers),
);

// Resource-level: self or admin
router.get("/:id", requireSelf("id"), asyncHandler(userController.getUser));
router.put(
  "/:id",
  requireSelf("id"),
  validate(updateUserSchema),
  asyncHandler(userController.updateUser),
);

export default router;
