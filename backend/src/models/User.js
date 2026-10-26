// src/models/User.js

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    hashedPassword: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Never returned in queries unless explicitly selected
    },
    role: {
      type: String,
      enum: [
        "superAdmin",
        "collegeAdmin",
        "faculty",
        "student",
        "attendanceAuditor",
      ],
      required: [true, "Role is required"],
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      // Required for all roles except superAdmin
      required: function () {
        return this.role !== "superAdmin";
      },
    },
    profile: {
      firstName: { type: String, trim: true, maxlength: 100 },
      lastName: { type: String, trim: true, maxlength: 100 },
      phone: { type: String, trim: true },
      employeeId: { type: String, trim: true }, // for faculty/admin
      studentId: { type: String, trim: true }, // for students
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
      dateOfBirth: { type: Date },
      gender: {
        type: String,
        enum: ["male", "female", "other", "preferNotToSay"],
      },
      profileImageUrl: { type: String },
    },
    accountStatus: {
      type: String,
      enum: ["active", "inactive", "suspended", "pendingVerification"],
      default: "pendingVerification",
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    invitationToken: { type: String, select: false },
    invitationExpires: { type: Date, select: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },
  },
  { timestamps: true },
);

// Unique email per college (or globally for superAdmin)
userSchema.index({ email: 1, collegeId: 1 }, { unique: true, sparse: true });
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { role: "superAdmin" } },
);
userSchema.index({ collegeId: 1, role: 1 });
userSchema.index({ "profile.studentId": 1, collegeId: 1 }, { sparse: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });
userSchema.index({ invitationToken: 1 }, { sparse: true });

// Virtual full name
userSchema.virtual("fullName").get(function () {
  return `${this.profile?.firstName || ""} ${this.profile?.lastName || ""}`.trim();
});

// Never return sensitive fields in toJSON
userSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.hashedPassword;
    delete ret.mfaSecret;
    delete ret.passwordResetToken;
    delete ret.emailVerificationToken;
    delete ret.invitationToken;
    delete ret.failedLoginAttempts;
    delete ret.lockedUntil;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
