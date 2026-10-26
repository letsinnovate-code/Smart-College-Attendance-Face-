// src/models/AcademicClass.js

import mongoose from "mongoose";

const classTimingSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
    },
    startTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // HH:MM
    endTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { _id: false },
);

const academicClassSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    academicYear: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{4}$/, "Academic year must be in YYYY-YYYY format"],
    },
    semester: { type: Number, required: true, min: 1, max: 12 },
    room: { type: String, trim: true },
    maxStrength: { type: Number, default: 60 },
    classTiming: [classTimingSchema],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

academicClassSchema.index(
  { collegeId: 1, courseId: 1, section: 1, academicYear: 1, semester: 1 },
  { unique: true },
);
academicClassSchema.index({ collegeId: 1, departmentId: 1 });
academicClassSchema.index({ collegeId: 1, isActive: 1 });

export default mongoose.model("AcademicClass", academicClassSchema);
