// src/routes/face.routes.js

import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/authenticate.js";
import { requireRoles, requireSelf } from "../middleware/authorize.js";
import { attachTenantContext } from "../middleware/tenantContext.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { faceLimiter } from "../middleware/rateLimiter.js";
import * as faceController from "../controllers/face.controller.js";
import env from "../config/env.js";

const router = Router();
router.use(authenticate, attachTenantContext);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype))
      return cb(new Error("Only JPEG, PNG, WebP images are allowed"));
    cb(null, true);
  },
});

// Issue enrollment challenge (student self-serves or admin for student)
router.post(
  "/students/:id/face-enrollment",
  requireSelf("id"),
  asyncHandler(faceController.initiateEnrollment),
);

// Submit face for enrollment (with challenge + consent)
router.post(
  "/students/:id/face-enrollment/confirm",
  requireSelf("id"),
  faceLimiter,
  upload.single("image"),
  asyncHandler(faceController.confirmEnrollment),
);

// Revoke face template
router.delete(
  "/students/:id/face-template",
  requireRoles("student", "collegeAdmin", "superAdmin"),
  requireSelf("id"),
  asyncHandler(faceController.revokeFaceTemplate),
);

// Get enrollment status
router.get(
  "/students/:id/face-enrollment/status",
  requireSelf("id"),
  asyncHandler(faceController.getEnrollmentStatus),
);

export default router;
