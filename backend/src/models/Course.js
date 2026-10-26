// src/models/Course.js

import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
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
    level: {
      type: String,
      enum: ["undergraduate", "postgraduate", "diploma", "certificate", "phd"],
      default: "undergraduate",
    },
    durationSemesters: { type: Number, default: 8 },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

courseSchema.index({ collegeId: 1, code: 1 }, { unique: true });
courseSchema.index({ collegeId: 1, departmentId: 1 });

export default mongoose.model("Course", courseSchema);
