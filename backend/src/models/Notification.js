// src/models/Notification.js
// Background notification jobs — stored for BullMQ processing.

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College" },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "account.invitation",
        "account.password_reset",
        "account.email_verification",
        "account.suspended",
        "attendance.low_percentage",
        "attendance.correction.requested",
        "attendance.correction.reviewed",
        "session.opened",
        "session.closed",
      ],
    },
    channel: {
      type: String,
      enum: ["email", "sms", "push", "in_app"],
      default: "email",
    },
    payload: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "pending",
    },
    scheduledAt: { type: Date, default: Date.now },
    sentAt: { type: Date },
    error: { type: String },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, status: 1, scheduledAt: 1 });
notificationSchema.index({ status: 1, scheduledAt: 1 });
// TTL — delete sent/failed notifications after 30 days
notificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { status: { $in: ["sent", "failed", "skipped"] } },
  },
);

export default mongoose.model("Notification", notificationSchema);
