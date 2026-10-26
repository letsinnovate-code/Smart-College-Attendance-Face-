// src/services/face.service.js
// Face enrollment and verification business logic.
// All biometric operations go through this service.

import crypto from "crypto";
import FaceTemplate from "../models/FaceTemplate.js";
import AuditLog from "../models/AuditLog.js";
import { getFaceProvider } from "../providers/face/index.js";
import {
  encryptEmbedding,
  decryptEmbedding,
  generateSecureToken,
} from "../utils/crypto.js";
import { AppError } from "../middleware/errorHandler.js";
import env from "../config/env.js";
import logger from "../config/logger.js";

// Short-lived enrollment challenges (in-memory for single-instance; use Redis in production)
const enrollmentChallenges = new Map(); // challengeId → { studentId, expiresAt }
const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ----- Enrollment challenge -----

export function issueEnrollmentChallenge(studentId) {
  const challengeId = generateSecureToken(24);
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  enrollmentChallenges.set(challengeId, { studentId, expiresAt });

  // Clean up expired challenges periodically
  if (enrollmentChallenges.size > 1000) {
    for (const [id, data] of enrollmentChallenges) {
      if (data.expiresAt < Date.now()) enrollmentChallenges.delete(id);
    }
  }

  return { challengeId, expiresAt: new Date(expiresAt) };
}

function consumeEnrollmentChallenge(challengeId, expectedStudentId) {
  const challenge = enrollmentChallenges.get(challengeId);
  if (!challenge)
    throw AppError.badRequest("Invalid or expired enrollment challenge");
  if (challenge.expiresAt < Date.now()) {
    enrollmentChallenges.delete(challengeId);
    throw AppError.badRequest(
      "Enrollment challenge has expired — please request a new one",
    );
  }
  if (challenge.studentId !== expectedStudentId) {
    throw AppError.forbidden("Enrollment challenge does not match student");
  }
  enrollmentChallenges.delete(challengeId); // Single use
}

// ----- Image validation -----

async function validateImageBuffer(imageBuffer) {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw AppError.badRequest("Empty image buffer");
  }
  if (imageBuffer.length > env.UPLOAD_MAX_BYTES) {
    throw AppError.unprocessable(
      `Image exceeds maximum size of ${env.UPLOAD_MAX_BYTES} bytes`,
    );
  }

  // Validate actual image content using sharp (not just MIME type)
  const sharp = (await import("sharp")).default;
  try {
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image dimensions");
    }
    const allowed = ["jpeg", "png", "webp"];
    if (!allowed.includes(metadata.format)) {
      throw AppError.unprocessable(
        `Unsupported image format: ${metadata.format}. Allowed: ${allowed.join(", ")}`,
      );
    }
    return metadata;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unprocessable("Malformed or unreadable image");
  }
}

// ----- Face enrollment -----

/**
 * Enroll a student's face template.
 * Requires prior consent (consentRecordedAt must be provided by caller after verification).
 *
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.collegeId
 * @param {Buffer} params.imageBuffer
 * @param {string} params.challengeId - Enrollment challenge token
 * @param {Date}   params.consentRecordedAt
 * @param {string} params.actorId - Who is performing the enrollment
 * @param {string} params.requestId
 */
export async function enrollFaceTemplate({
  studentId,
  collegeId,
  imageBuffer,
  challengeId,
  consentRecordedAt,
  actorId,
  requestId,
}) {
  // Validate and consume challenge
  consumeEnrollmentChallenge(challengeId, studentId);

  // Validate image
  await validateImageBuffer(imageBuffer);

  const provider = await getFaceProvider();

  // Step 1: Detect face
  const detection = await provider.detectFace(imageBuffer);
  if (!detection.detected) {
    throw AppError.unprocessable("No face detected in the uploaded image");
  }
  if (detection.count > 1) {
    throw AppError.unprocessable(
      "Multiple faces detected — upload an image with a single face",
    );
  }

  // Step 2: Assess quality
  const quality = await provider.assessImageQuality(imageBuffer);
  if (!quality.acceptable) {
    throw AppError.unprocessable(
      `Image quality insufficient: ${quality.reasons.join("; ")}`,
    );
  }

  // Step 3: Liveness (if enabled and supported)
  if (env.FACE_LIVENESS_ENABLED && provider.metadata.supportsLiveness) {
    const liveness = await provider.verifyLiveness(imageBuffer);
    if (!liveness.live) {
      await AuditLog.create({
        actor: actorId,
        action: "face.enrollment.failed",
        collegeId,
        requestId,
        metadata: { reason: "liveness_failed" },
      });
      throw AppError.unprocessable(
        "Liveness check failed — real face required for enrollment",
      );
    }
  }

  // Step 4: Generate embedding
  const { embedding, dimension } =
    await provider.generateEmbedding(imageBuffer);
  if (!embedding || embedding.length === 0) {
    throw AppError.serviceUnavailable("Failed to generate face embedding");
  }

  // Step 5: Encrypt and store
  const encryptedVector = encryptEmbedding(embedding);

  // Revoke any existing active template for this student
  await FaceTemplate.updateMany(
    { collegeId, studentId, enrollmentStatus: "active" },
    {
      $set: {
        enrollmentStatus: "revoked",
        revokedAt: new Date(),
        revokedBy: actorId,
        revocationReason: "replaced",
      },
    },
  );

  const template = await FaceTemplate.create({
    collegeId,
    studentId,
    encryptedVector,
    provider: provider.metadata.name,
    modelVersion: provider.metadata.modelVersion,
    embeddingDimension: dimension,
    qualityScore: quality.score,
    consentRecordedAt,
    enrollmentStatus: "active",
    enrolledAt: new Date(),
  });

  await AuditLog.create({
    actor: actorId,
    action: "face.enrollment.completed",
    targetType: "FaceTemplate",
    targetId: template._id.toString(),
    collegeId,
    requestId,
    metadata: {
      provider: provider.metadata.name,
      modelVersion: provider.metadata.modelVersion,
    },
  });

  logger.info(
    { studentId, templateId: template._id },
    "Face template enrolled",
  );
  return {
    templateId: template._id,
    provider: provider.metadata.name,
    enrolledAt: template.enrolledAt,
  };
}

// ----- Face verification -----

/**
 * Verify a student's face against their enrolled template.
 * Returns verification result WITHOUT exposing similarity score in the response.
 */
export async function verifyFaceForAttendance({
  studentId,
  collegeId,
  imageBuffer,
  requestId,
}) {
  // Load the student's active template
  const template = await FaceTemplate.findOne({
    collegeId,
    studentId,
    enrollmentStatus: "active",
  }).select("+encryptedVector");

  if (!template) {
    throw AppError.unprocessable(
      "No active face template found — student must enroll first",
    );
  }

  await validateImageBuffer(imageBuffer);

  const provider = await getFaceProvider();

  // Detect face
  const detection = await provider.detectFace(imageBuffer);
  if (!detection.detected) {
    return { verified: false, reason: "no_face_detected" };
  }
  if (detection.count > 1) {
    return { verified: false, reason: "multiple_faces" };
  }

  // Liveness (if enabled)
  let livenessScore = null;
  let livenessVerified = false;
  if (env.FACE_LIVENESS_ENABLED) {
    if (!provider.metadata.supportsLiveness) {
      logger.warn(
        "FACE_LIVENESS_ENABLED=true but provider does not support liveness — attendance cannot be marked via face",
      );
      return { verified: false, reason: "liveness_unavailable" };
    }
    const liveness = await provider.verifyLiveness(imageBuffer);
    livenessScore = liveness.score;
    livenessVerified = liveness.live;
    if (!liveness.live) {
      return { verified: false, reason: "liveness_failed", livenessScore };
    }
  }

  // Generate probe embedding
  const { embedding: probeEmbedding } =
    await provider.generateEmbedding(imageBuffer);

  // Decrypt enrolled template
  const enrolledEmbedding = decryptEmbedding(template.encryptedVector);

  // Compare
  const comparison = await provider.compareEmbeddings(
    enrolledEmbedding,
    probeEmbedding,
    env.FACE_SIMILARITY_THRESHOLD,
  );

  if (!comparison.match) {
    return {
      verified: false,
      reason: "face_mismatch",
      livenessVerified,
      // DO NOT return similarity score — it could be used to calibrate attacks
    };
  }

  return {
    verified: true,
    livenessVerified,
    internalScore: comparison.score, // Only used internally; not returned in API response
    templateId: template._id,
  };
}

// ----- Template revocation -----

export async function revokeFaceTemplate({
  studentId,
  collegeId,
  actorId,
  reason,
  requestId,
}) {
  const result = await FaceTemplate.updateMany(
    { collegeId, studentId, enrollmentStatus: "active" },
    {
      $set: {
        enrollmentStatus: "revoked",
        revokedAt: new Date(),
        revokedBy: actorId,
        revocationReason: reason || "user_request",
      },
    },
  );

  if (result.modifiedCount === 0) {
    throw AppError.notFound("No active face template found to revoke");
  }

  await AuditLog.create({
    actor: actorId,
    action: "face.template.revoked",
    targetType: "FaceTemplate",
    collegeId,
    requestId,
    metadata: { studentId, reason },
  });

  return { revoked: result.modifiedCount };
}

export async function getEnrollmentStatus(studentId, collegeId) {
  const template = await FaceTemplate.findOne(
    { collegeId, studentId },
    {
      enrollmentStatus: 1,
      enrolledAt: 1,
      provider: 1,
      modelVersion: 1,
      qualityScore: 1,
    },
  ).sort({ createdAt: -1 });

  if (!template) return { enrolled: false };
  return {
    enrolled: template.enrollmentStatus === "active",
    status: template.enrollmentStatus,
    enrolledAt: template.enrolledAt,
    provider: template.provider,
    modelVersion: template.modelVersion,
    qualityScore: template.qualityScore,
  };
}
