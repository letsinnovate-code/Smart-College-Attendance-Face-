// src/models/College.js

import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    attendanceWindowMinutes: { type: Number, default: 30 },
    latenessWindowMinutes: { type: Number, default: 10 },
    minAttendancePercentage: { type: Number, default: 75 },
    allowFaceAttendance: { type: Boolean, default: true },
    allowManualAttendance: { type: Boolean, default: true },
    requireBiometricConsent: { type: Boolean, default: true },
    timezone: { type: String, default: "Asia/Kolkata" },
  },
  { _id: false },
);

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "College name is required"],
      trim: true,
      maxlength: [200, "Name too long"],
    },
    shortName: {
      type: String,
      trim: true,
      maxlength: [20, "Short name too long"],
      uppercase: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9.-]+\.[a-z]{2,}$/, "Invalid domain format"],
    },
    tenantCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [10, "Tenant code too long"],
    },
    address: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "active",
    },
    settings: { type: settingsSchema, default: () => ({}) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

collegeSchema.index({ status: 1 });

export default mongoose.model("College", collegeSchema);
