// src/models/StudentEnrollment.js

import mongoose from "mongoose";

const studentEnrollmentSchema = new mongoose.Schema(
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
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicClass",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "dropped", "completed", "transferred"],
      default: "active",
    },
    enrolledAt: { type: Date, default: Date.now },
    droppedAt: { type: Date },
    completedAt: { type: Date },
    enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rollNumber: { type: String, trim: true },
  },
  { timestamps: true },
);

// A student cannot be enrolled in the same class twice with active status
studentEnrollmentSchema.index(
  { collegeId: 1, studentId: 1, classId: 1 },
  { unique: true },
);
studentEnrollmentSchema.index({ collegeId: 1, classId: 1, status: 1 });
studentEnrollmentSchema.index({ collegeId: 1, studentId: 1, status: 1 });

export default mongoose.model("StudentEnrollment", studentEnrollmentSchema);
