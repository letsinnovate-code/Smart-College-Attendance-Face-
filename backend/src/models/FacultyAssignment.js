// src/models/FacultyAssignment.js

import mongoose from "mongoose";

const facultyAssignmentSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    facultyId: {
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
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true },
);

// A faculty member cannot be assigned the same subject in the same class twice
facultyAssignmentSchema.index(
  { collegeId: 1, facultyId: 1, classId: 1, subjectId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);
facultyAssignmentSchema.index({ collegeId: 1, classId: 1 });
facultyAssignmentSchema.index({ collegeId: 1, facultyId: 1 });

export default mongoose.model("FacultyAssignment", facultyAssignmentSchema);
