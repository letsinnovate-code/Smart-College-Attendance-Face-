// src/models/Subject.js

import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
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
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    credits: { type: Number, required: true, min: 0, max: 10 },
    weeklyHours: { type: Number, default: 3 },
    semester: { type: Number, required: true, min: 1, max: 12 },
    isElective: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

subjectSchema.index({ collegeId: 1, code: 1 }, { unique: true });
subjectSchema.index({ collegeId: 1, courseId: 1 });

export default mongoose.model("Subject", subjectSchema);
