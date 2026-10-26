// src/models/AttendanceCorrectionRequest.js
// Every correction or manual override goes through this workflow.
// Historical attendance is never silently overwritten.

import mongoose from "mongoose";

const auditTrailEntrySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true }, // 'submitted', 'approved', 'rejected', 'withdrawn'
    comment: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
    previousStatus: { type: String }, // correction request status before this action
    newStatus: { type: String },
  },
  { _id: false },
);

const correctionRequestSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    attendanceRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceRecord",
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSession",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalStatus: {
      type: String,
      required: true,
      enum: [
        "present",
        "late",
        "absent",
        "excused",
        "unverified",
        "manualOverride",
      ],
    },
    requestedStatus: {
      type: String,
      required: true,
      enum: ["present", "late", "absent", "excused"],
    },

    reason: {
      type: String,
      required: [true, "Reason is required for correction requests"],
      trim: true,
      maxlength: 1000,
    },

    supportingEvidence: { type: String, trim: true }, // Optional URL / doc reference

    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "withdrawn"],
      default: "pending",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewComment: { type: String, trim: true },

    auditTrail: [auditTrailEntrySchema],
  },
  { timestamps: true },
);

correctionRequestSchema.index({ collegeId: 1, studentId: 1, reviewStatus: 1 });
correctionRequestSchema.index({ collegeId: 1, sessionId: 1, reviewStatus: 1 });
correctionRequestSchema.index({ collegeId: 1, attendanceRecordId: 1 });

// Only one pending correction per attendance record at a time
correctionRequestSchema.index(
  { attendanceRecordId: 1 },
  { unique: true, partialFilterExpression: { reviewStatus: "pending" } },
);

export default mongoose.model(
  "AttendanceCorrectionRequest",
  correctionRequestSchema,
);
