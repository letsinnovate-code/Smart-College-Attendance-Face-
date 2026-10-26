// src/models/Department.js

import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      maxlength: 200,
    },
    code: {
      type: String,
      required: [true, "Department code is required"],
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    headOfDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    description: { type: String, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

departmentSchema.index({ collegeId: 1, code: 1 }, { unique: true });

export default mongoose.model("Department", departmentSchema);
