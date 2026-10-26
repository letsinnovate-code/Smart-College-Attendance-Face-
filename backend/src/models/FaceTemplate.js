// src/models/FaceTemplate.js
// Biometric data model — highly sensitive.
// Templates are encrypted at rest; the raw embedding is NEVER stored unencrypted.
// Template bytes are NEVER returned in API responses.

import mongoose from "mongoose";

const faceTemplateSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Biometric data — AES-256-GCM encrypted JSON, stored as base64
    // Contains: { embedding: number[], iv: string, tag: string }
    encryptedVector: {
      type: String,
      required: true,
      select: false, // NEVER returned in normal queries
    },
    // Metadata about the model that generated this template
    provider: {
      type: String,
      required: true,
      enum: ["onnx", "http", "mock"],
    },
    modelVersion: {
      type: String,
      required: true,
    },
    embeddingDimension: { type: Number, required: true },
    qualityScore: { type: Number, min: 0, max: 1 },

    // Enrollment lifecycle
    enrollmentStatus: {
      type: String,
      enum: ["active", "revoked", "expired", "pending"],
      default: "pending",
    },
    enrolledAt: { type: Date },
    revokedAt: { type: Date },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    revocationReason: { type: String, trim: true },

    // Consent record
    consentRecordedAt: {
      type: Date,
      required: [true, "Biometric consent timestamp is required"],
    },
    consentVersion: { type: String, default: "1.0" },

    // Challenge used for enrollment (prevents replay)
    enrollmentChallengeId: { type: String, select: false },
  },
  { timestamps: true },
);

// Only one active template per student per college
faceTemplateSchema.index(
  { collegeId: 1, studentId: 1 },
  {
    unique: true,
    partialFilterExpression: { enrollmentStatus: "active" },
  },
);
faceTemplateSchema.index({ collegeId: 1, studentId: 1, enrollmentStatus: 1 });
faceTemplateSchema.index({ enrollmentChallengeId: 1 }, { sparse: true });

// Prevent returning encryptedVector and other sensitive fields in toJSON
faceTemplateSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.encryptedVector;
    delete ret.enrollmentChallengeId;
    return ret;
  },
});

export default mongoose.model("FaceTemplate", faceTemplateSchema);
