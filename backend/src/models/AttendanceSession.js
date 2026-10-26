// src/models/AttendanceSession.js
// Represents a single class session during which attendance is taken.
// State machine: draft → open → closed | cancelled

import mongoose from "mongoose";

const SESSION_STATES = ["draft", "open", "closed", "cancelled"];

const attendanceSessionSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
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
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Session date — stored in UTC as a date-only value (midnight UTC)
    sessionDate: { type: Date, required: true },

    // Scheduled start/end times in UTC
    scheduledStartTime: { type: Date, required: true },
    scheduledEndTime: { type: Date, required: true },

    // Actual open/close times (set by the server)
    openedAt: { type: Date },
    closedAt: { type: Date },

    // How long after session open students can mark attendance (college-configurable)
    attendanceWindowMinutes: { type: Number, default: 30 },
    latenessWindowMinutes: { type: Number, default: 10 },

    state: {
      type: String,
      enum: SESSION_STATES,
      default: "draft",
    },

    // Topic covered in this session (optional)
    topic: { type: String, trim: true, maxlength: 500 },

    notes: { type: String, trim: true, maxlength: 2000 },

    // Total students enrolled at the time of session creation
    enrolledCount: { type: Number, default: 0 },

    // Populated after session closes
    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },

    cancelledReason: { type: String, trim: true },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

attendanceSessionSchema.index({ collegeId: 1, classId: 1, sessionDate: 1 });
attendanceSessionSchema.index({ collegeId: 1, facultyId: 1, state: 1 });
attendanceSessionSchema.index({ collegeId: 1, state: 1, openedAt: 1 });

export { SESSION_STATES };
export default mongoose.model("AttendanceSession", attendanceSessionSchema);
