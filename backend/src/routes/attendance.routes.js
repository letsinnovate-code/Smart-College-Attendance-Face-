// src/routes/attendance.routes.js
// Attendance session management, challenge issuance, and attendance recording.

import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/authenticate.js";
import { requireRoles, requireMinRole } from "../middleware/authorize.js";
import { attachTenantContext } from "../middleware/tenantContext.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { faceLimiter, reportLimiter } from "../middleware/rateLimiter.js";
import * as attendanceController from "../controllers/attendance.controller.js";
import env from "../config/env.js";
import { z } from "zod";

const router = Router();

// All attendance routes require authentication
router.use(authenticate, attachTenantContext);

// Multer for image upload — temp files only, deleted after processing
const upload = multer({
  storage: multer.memoryStorage(), // Buffer only — no disk persistence
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
    cb(null, true);
  },
});

// Validation schemas
const createSessionSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  sessionDate: z.string().datetime(),
  scheduledStartTime: z.string().datetime(),
  scheduledEndTime: z.string().datetime(),
  attendanceWindowMinutes: z.number().int().min(1).max(180).optional(),
  topic: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

const sessionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  state: z.enum(["draft", "open", "closed", "cancelled"]).optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ----- Session endpoints -----

router.post(
  "/sessions",
  requireRoles("faculty", "collegeAdmin", "superAdmin"),
  validate(createSessionSchema),
  asyncHandler(attendanceController.createSession),
);

router.get(
  "/sessions",
  requireMinRole("faculty"),
  validate(sessionQuerySchema, "query"),
  asyncHandler(attendanceController.listSessions),
);

router.get(
  "/sessions/:sessionId",
  requireMinRole("student"),
  asyncHandler(attendanceController.getSession),
);

router.patch(
  "/sessions/:sessionId/open",
  requireRoles("faculty", "collegeAdmin", "superAdmin"),
  asyncHandler(attendanceController.openSession),
);

router.patch(
  "/sessions/:sessionId/close",
  requireRoles("faculty", "collegeAdmin", "superAdmin"),
  asyncHandler(attendanceController.closeSession),
);

router.patch(
  "/sessions/:sessionId/cancel",
  requireRoles("faculty", "collegeAdmin", "superAdmin"),
  asyncHandler(attendanceController.cancelSession),
);

// ----- Challenge issuance (student requests challenge before submitting face) -----

router.post(
  "/sessions/:sessionId/challenge",
  requireRoles("student"),
  asyncHandler(attendanceController.issueChallenge),
);

// ----- Attendance verification -----

router.post(
  "/sessions/:sessionId/verify",
  requireRoles("student"),
  faceLimiter,
  upload.single("image"),
  asyncHandler(attendanceController.verifyAttendance),
);

// ----- Records -----

router.get(
  "/sessions/:sessionId/records",
  requireMinRole("faculty"),
  asyncHandler(attendanceController.getSessionRecords),
);

router.get(
  "/students/:studentId/summary",
  requireMinRole("student"),
  asyncHandler(attendanceController.getStudentSummary),
);

// ----- Corrections -----

router.post(
  "/corrections",
  requireRoles("student", "faculty", "collegeAdmin"),
  asyncHandler(attendanceController.requestCorrection),
);

router.get(
  "/corrections",
  requireMinRole("faculty"),
  asyncHandler(attendanceController.listCorrections),
);

router.patch(
  "/corrections/:correctionId/review",
  requireRoles("faculty", "collegeAdmin", "superAdmin"),
  asyncHandler(attendanceController.reviewCorrection),
);

export default router;
