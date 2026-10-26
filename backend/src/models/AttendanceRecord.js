// src/models/AttendanceRecord.js
// One record per student per session — enforced by unique compound index.
// Status transitions are audited; the original status is never silently overwritten.

import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
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
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicClass",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "present",
        "late",
        "absent",
        "excused",
        "unverified",
        "manualOverride",
      ],
      required: true,
    },

    verificationMethod: {
      type: String,
      enum: ["face", "manual", "qr", "proxy"],
      required: true,
    },

    // Internal score — NOT returned in public API responses
    verificationScore: { type: Number, min: 0, max: 1, select: false },
    livenessScore: { type: Number, min: 0, max: 1, select: false },
    livenessVerified: { type: Boolean, default: false },
    verificationFailed: { type: Boolean, default: false },
    failureReason: { type: String, select: false },

    // Server-side timestamp — clients cannot supply this
    markedAt: { type: Date, required: true, default: Date.now },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null = self-marked

    // Correction tracking
    isCorrected: { type: Boolean, default: false },
    originalStatus: { type: String }, // Preserved when corrected
    lastCorrectedAt: { type: Date },
    lastCorrectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// THE MOST CRITICAL INDEX — prevents duplicate attendance for same student in same session
attendanceRecordSchema.index(
  { collegeId: 1, sessionId: 1, studentId: 1 },
  { unique: true },
);
attendanceRecordSchema.index({ collegeId: 1, sessionId: 1 });
attendanceRecordSchema.index({ collegeId: 1, studentId: 1, markedAt: -1 });
attendanceRecordSchema.index({ collegeId: 1, classId: 1, markedAt: -1 });
attendanceRecordSchema.index({ collegeId: 1, subjectId: 1, markedAt: -1 });

// Never expose sensitive verification details in responses
attendanceRecordSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.verificationScore;
    delete ret.livenessScore;
    delete ret.failureReason;
    return ret;
  },
});

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);
