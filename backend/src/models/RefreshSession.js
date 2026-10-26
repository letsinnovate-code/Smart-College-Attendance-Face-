// src/models/RefreshSession.js
// Tracks rotating refresh tokens.
// Each session stores a hash of the token (never the token itself).
// Reuse detection uses parentTokenHash to identify token family.

import mongoose from "mongoose";
import crypto from "crypto";

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College" },

    // SHA-256 hash of the refresh token (token itself never stored)
    tokenHash: { type: String, required: true, unique: true, select: false },

    // The token hash that was rotated to create this one (for reuse detection)
    parentTokenHash: { type: String, select: false },

    // Device / session metadata
    deviceFingerprint: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String },

    issuedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revokedReason: {
      type: String,
      enum: ["logout", "logout-all", "reuse-detected", "admin", "expired"],
    },

    isRevoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// TTL index — MongoDB deletes expired sessions automatically
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshSessionSchema.index({ userId: 1, isRevoked: 1 });
refreshSessionSchema.index({ parentTokenHash: 1 }, { sparse: true });

// Static helper: hash a raw token for storage/lookup
refreshSessionSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

export default mongoose.model("RefreshSession", refreshSessionSchema);
