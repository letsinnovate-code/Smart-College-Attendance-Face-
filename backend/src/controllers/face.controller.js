// src/controllers/face.controller.js

import * as faceService from "../services/face.service.js";
import { AppError } from "../middleware/errorHandler.js";

export async function initiateEnrollment(req, res) {
  const studentId = req.params.id;
  // Students must enroll themselves unless they are an admin
  if (req.user.role === "student" && req.user.id !== studentId) {
    throw AppError.forbidden();
  }

  const challenge = faceService.issueEnrollmentChallenge(studentId);
  res.json({
    success: true,
    data: {
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt,
      instructions:
        "Submit a clear front-facing photo along with this challengeId and your consent to /face-enrollment/confirm",
    },
    requestId: req.requestId,
  });
}

export async function confirmEnrollment(req, res) {
  const studentId = req.params.id;
  if (req.user.role === "student" && req.user.id !== studentId) {
    throw AppError.forbidden();
  }

  if (!req.file) throw AppError.badRequest("Image file is required");

  const { challengeId, consent } = req.body;
  if (!challengeId) throw AppError.badRequest("challengeId is required");
  if (consent !== "true" && consent !== true) {
    throw AppError.badRequest(
      "Biometric consent is required — set consent=true",
    );
  }

  const result = await faceService.enrollFaceTemplate({
    studentId,
    collegeId: req.tenantId,
    imageBuffer: req.file.buffer,
    challengeId,
    consentRecordedAt: new Date(),
    actorId: req.user.id,
    requestId: req.requestId,
  });

  res
    .status(201)
    .json({ success: true, data: result, requestId: req.requestId });
}

export async function revokeFaceTemplate(req, res) {
  const studentId = req.params.id;
  if (req.user.role === "student" && req.user.id !== studentId) {
    throw AppError.forbidden();
  }

  const result = await faceService.revokeFaceTemplate({
    studentId,
    collegeId: req.tenantId,
    actorId: req.user.id,
    reason: req.body?.reason,
    requestId: req.requestId,
  });

  res.json({ success: true, data: result, requestId: req.requestId });
}

export async function getEnrollmentStatus(req, res) {
  const studentId = req.params.id;
  if (req.user.role === "student" && req.user.id !== studentId) {
    throw AppError.forbidden();
  }

  const status = await faceService.getEnrollmentStatus(studentId, req.tenantId);
  res.json({ success: true, data: status, requestId: req.requestId });
}
