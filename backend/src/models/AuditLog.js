// src/models/AuditLog.js
// Immutable audit trail for all sensitive operations.
// Records must not be modifiable after creation.
// Access restricted to superAdmin and attendanceAuditor.

import mongoose from "mongoose";
import env from "../config/env.js";

const AUDIT_LOG_RETENTION_DAYS = 365; // 1 year default

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.Mixed, // ObjectId or 'anonymous' string
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Auth
        "auth.login.success",
        "auth.login.failed",
        "auth.logout",
        "auth.logout.all",
        "auth.refresh.success",
        "auth.refresh.reuse",
        "auth.refresh.revoked",
        "auth.password.reset.requested",
        "auth.password.reset.completed",
        "auth.password.changed",
        // Account
        "user.created",
        "user.invited",
        "user.updated",
        "user.suspended",
        "user.activated",
        "user.role.changed",
        // Face
        "face.enrollment.initiated",
        "face.enrollment.completed",
        "face.enrollment.failed",
        "face.template.revoked",
        "face.template.deleted",
        "face.verification.success",
        "face.verification.failed",
        "face.liveness.failed",
        // Attendance
        "attendance.session.created",
        "attendance.session.opened",
        "attendance.session.closed",
        "attendance.session.cancelled",
        "attendance.marked",
        "attendance.verification.failed",
        "attendance.correction.requested",
        "attendance.correction.approved",
        "attendance.correction.rejected",
        "attendance.correction.withdrawn",
        "attendance.manual.override",
        // Reports
        "report.generated",
        "report.exported",
        // Admin
        "college.created",
        "college.updated",
        "college.suspended",
        "college.status.changed",
        "department.created",
        "department.updated",
        "course.created",
        "course.updated",
        "class.created",
        "class.updated",
        "subject.created",
        "subject.updated",
        "faculty.assigned",
        "faculty.unassigned",
        "student.enrolled",
        "student.enrollment.status.changed",
        "enrollment.created",
        "assignment.created",
      ],
    },
    targetType: { type: String }, // Mongoose model name
    targetId: { type: String }, // Resource ID
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College" },
    requestId: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    // TTL expiry marker set at creation time
    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    // Disable updates — audit logs are write-once
    statics: {
      updateOne: () => {
        throw new Error("AuditLog records are immutable");
      },
      updateMany: () => {
        throw new Error("AuditLog records are immutable");
      },
      findOneAndUpdate: () => {
        throw new Error("AuditLog records are immutable");
      },
    },
  },
);

// TTL index — MongoDB automatically deletes expired documents
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
auditLogSchema.index({ collegeId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ requestId: 1 }, { sparse: true });

export default mongoose.model("AuditLog", auditLogSchema);
