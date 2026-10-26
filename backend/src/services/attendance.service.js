// src/services/attendance.service.js
// Attendance session management and attendance recording business logic.

import AttendanceSession from "../models/AttendanceSession.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import StudentEnrollment from "../models/StudentEnrollment.js";
import FacultyAssignment from "../models/FacultyAssignment.js";
import AuditLog from "../models/AuditLog.js";
import { verifyFaceForAttendance } from "./face.service.js";
import { AppError } from "../middleware/errorHandler.js";
import { generateSecureToken } from "../utils/crypto.js";
import logger from "../config/logger.js";
import env from "../config/env.js";

// In-memory store for attendance challenges (use Redis in production)
const attendanceChallenges = new Map(); // challengeId → { sessionId, studentId, expiresAt }
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ----- Session management -----

export async function createSession({
  collegeId,
  classId,
  subjectId,
  facultyId,
  sessionDate,
  scheduledStartTime,
  scheduledEndTime,
  attendanceWindowMinutes,
  topic,
  notes,
  requestId,
}) {
  // Verify faculty is assigned to this class+subject
  const assignment = await FacultyAssignment.findOne({
    collegeId,
    facultyId,
    classId,
    subjectId,
    isActive: true,
  });
  if (!assignment) {
    throw AppError.forbidden(
      "Faculty is not assigned to this class and subject",
    );
  }

  // Count enrolled students
  const enrolledCount = await StudentEnrollment.countDocuments({
    collegeId,
    classId,
    status: "active",
  });

  const session = await AttendanceSession.create({
    collegeId,
    classId,
    subjectId,
    facultyId,
    sessionDate: new Date(sessionDate),
    scheduledStartTime: new Date(scheduledStartTime),
    scheduledEndTime: new Date(scheduledEndTime),
    attendanceWindowMinutes: attendanceWindowMinutes || 30,
    enrolledCount,
    state: "draft",
    topic,
    notes,
  });

  await AuditLog.create({
    actor: facultyId,
    action: "attendance.session.created",
    targetType: "AttendanceSession",
    targetId: session._id.toString(),
    collegeId,
    requestId,
  });
  return session;
}

export async function openSession({
  sessionId,
  collegeId,
  facultyId,
  requestId,
}) {
  const session = await AttendanceSession.findOne({
    _id: sessionId,
    collegeId,
  });
  if (!session) throw AppError.notFound("Session not found");
  if (
    session.facultyId.toString() !== facultyId &&
    !["collegeAdmin", "superAdmin"].includes(req?.user?.role)
  ) {
    throw AppError.forbidden("Only the session faculty can open this session");
  }
  if (session.state !== "draft") {
    throw AppError.conflict(
      `Session is in state '${session.state}' — cannot open`,
    );
  }

  session.state = "open";
  session.openedAt = new Date();
  await session.save();

  await AuditLog.create({
    actor: facultyId,
    action: "attendance.session.opened",
    targetType: "AttendanceSession",
    targetId: session._id.toString(),
    collegeId,
    requestId,
  });
  return session;
}

export async function closeSession({
  sessionId,
  collegeId,
  actorId,
  requestId,
}) {
  const session = await AttendanceSession.findOne({
    _id: sessionId,
    collegeId,
  });
  if (!session) throw AppError.notFound("Session not found");
  if (session.state !== "open") {
    throw AppError.conflict(
      `Session is in state '${session.state}' — cannot close`,
    );
  }

  // Compute final counts
  const [presentCount, absentCount] = await Promise.all([
    AttendanceRecord.countDocuments({
      sessionId,
      collegeId,
      status: { $in: ["present", "late"] },
    }),
    AttendanceRecord.countDocuments({ sessionId, collegeId, status: "absent" }),
  ]);

  session.state = "closed";
  session.closedAt = new Date();
  session.presentCount = presentCount;
  session.absentCount = absentCount;
  await session.save();

  await AuditLog.create({
    actor: actorId,
    action: "attendance.session.closed",
    targetType: "AttendanceSession",
    targetId: session._id.toString(),
    collegeId,
    requestId,
  });
  return session;
}

export async function cancelSession({
  sessionId,
  collegeId,
  actorId,
  reason,
  requestId,
}) {
  const session = await AttendanceSession.findOne({
    _id: sessionId,
    collegeId,
  });
  if (!session) throw AppError.notFound("Session not found");
  if (session.state === "closed") {
    throw AppError.conflict("Cannot cancel a closed session");
  }

  session.state = "cancelled";
  session.cancelledReason = reason;
  session.cancelledBy = actorId;
  await session.save();

  await AuditLog.create({
    actor: actorId,
    action: "attendance.session.cancelled",
    targetType: "AttendanceSession",
    targetId: session._id.toString(),
    collegeId,
    requestId,
    metadata: { reason },
  });
  return session;
}

// ----- Attendance challenge -----

export function issueAttendanceChallenge(sessionId, studentId) {
  const challengeId = generateSecureToken(24);
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  attendanceChallenges.set(challengeId, { sessionId, studentId, expiresAt });

  if (attendanceChallenges.size > 10000) {
    for (const [id, data] of attendanceChallenges) {
      if (data.expiresAt < Date.now()) attendanceChallenges.delete(id);
    }
  }

  return { challengeId, expiresAt: new Date(expiresAt) };
}

function consumeAttendanceChallenge(challengeId, sessionId, studentId) {
  const challenge = attendanceChallenges.get(challengeId);
  if (!challenge)
    throw AppError.badRequest("Invalid or expired attendance challenge");
  if (challenge.expiresAt < Date.now()) {
    attendanceChallenges.delete(challengeId);
    throw AppError.badRequest(
      "Attendance challenge expired — please request a new one",
    );
  }
  if (challenge.sessionId !== sessionId || challenge.studentId !== studentId) {
    throw AppError.forbidden(
      "Challenge does not match this session or student",
    );
  }
  attendanceChallenges.delete(challengeId); // Single use
}

// ----- Attendance recording -----

/**
 * Verify and record attendance for a student in an open session.
 * This is the critical path — every check is server-authoritative.
 */
export async function recordAttendance({
  sessionId,
  studentId,
  collegeId,
  imageBuffer,
  challengeId,
  requestId,
}) {
  // 1. Load and validate session
  const session = await AttendanceSession.findOne({
    _id: sessionId,
    collegeId,
  });
  if (!session) throw AppError.notFound("Session not found");
  if (session.state !== "open") {
    return { result: "session_not_open", status: "rejected" };
  }

  // 2. Check attendance time window (server time — not client supplied)
  const now = new Date();
  const windowEnd = new Date(
    session.openedAt.getTime() + session.attendanceWindowMinutes * 60 * 1000,
  );
  const latenessEnd = new Date(
    session.openedAt.getTime() + session.latenessWindowMinutes * 60 * 1000,
  );
  const isLate = now > latenessEnd;

  if (now > windowEnd) {
    return { result: "window_closed", status: "rejected" };
  }

  // 3. Validate student enrollment in this class
  const enrollment = await StudentEnrollment.findOne({
    collegeId,
    studentId,
    classId: session.classId,
    status: "active",
  });
  if (!enrollment) {
    return { result: "not_enrolled", status: "rejected" };
  }

  // 4. Validate and consume challenge
  consumeAttendanceChallenge(
    challengeId,
    sessionId.toString(),
    studentId.toString(),
  );

  // 5. Check for existing attendance record (atomic protection is also at DB level)
  const existing = await AttendanceRecord.findOne({
    collegeId,
    sessionId,
    studentId,
  });
  if (existing) {
    return { result: "already_recorded", status: existing.status };
  }

  // 6. Face verification
  let verificationResult;
  try {
    verificationResult = await verifyFaceForAttendance({
      studentId,
      collegeId,
      imageBuffer,
      requestId,
    });
  } catch (err) {
    logger.error(
      { err: err.message, studentId, sessionId },
      "Face verification service error",
    );
    return { result: "verification_service_error", status: "rejected" };
  }

  if (!verificationResult.verified) {
    await AuditLog.create({
      actor: studentId,
      action: "attendance.verification.failed",
      targetType: "AttendanceSession",
      targetId: sessionId.toString(),
      collegeId,
      requestId,
      metadata: { reason: verificationResult.reason },
    });

    // Record unverified attendance for audit (not counted as present)
    await AttendanceRecord.create({
      collegeId,
      sessionId,
      studentId,
      classId: session.classId,
      subjectId: session.subjectId,
      status: "unverified",
      verificationMethod: "face",
      verificationFailed: true,
      failureReason: verificationResult.reason,
      livenessVerified: verificationResult.livenessVerified ?? false,
      markedAt: now,
    }).catch(() => {}); // May already exist

    return {
      result: verificationResult.reason || "verification_failed",
      status: "rejected",
    };
  }

  // 7. Create attendance record atomically
  // The unique index on (collegeId, sessionId, studentId) prevents duplicates at DB level
  try {
    const record = await AttendanceRecord.create({
      collegeId,
      sessionId,
      studentId,
      classId: session.classId,
      subjectId: session.subjectId,
      status: isLate ? "late" : "present",
      verificationMethod: "face",
      verificationScore: verificationResult.internalScore,
      livenessVerified: verificationResult.livenessVerified ?? false,
      markedAt: now,
    });

    await AuditLog.create({
      actor: studentId,
      action: "attendance.marked",
      targetType: "AttendanceRecord",
      targetId: record._id.toString(),
      collegeId,
      requestId,
      metadata: { status: record.status },
    });

    return {
      result: "accepted",
      status: record.status,
      markedAt: record.markedAt,
    };
  } catch (err) {
    if (err.code === 11000) {
      // Race condition — another request beat us to it
      const existing = await AttendanceRecord.findOne({
        collegeId,
        sessionId,
        studentId,
      });
      return {
        result: "already_recorded",
        status: existing?.status || "present",
      };
    }
    throw err;
  }
}

// ----- Records retrieval -----

export async function getSessionRecords(
  sessionId,
  collegeId,
  { page, limit, skip },
) {
  const [records, total] = await Promise.all([
    AttendanceRecord.find({ sessionId, collegeId })
      .populate(
        "studentId",
        "email profile.firstName profile.lastName profile.studentId",
      )
      .sort({ markedAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AttendanceRecord.countDocuments({ sessionId, collegeId }),
  ]);
  return { records, total };
}

export async function getStudentAttendanceSummary(
  studentId,
  collegeId,
  { startDate, endDate, classId, subjectId },
) {
  const filter = { collegeId, studentId };
  if (classId) filter.classId = classId;
  if (subjectId) filter.subjectId = subjectId;
  if (startDate || endDate) {
    filter.markedAt = {};
    if (startDate) filter.markedAt.$gte = new Date(startDate);
    if (endDate) filter.markedAt.$lte = new Date(endDate);
  }

  const records = await AttendanceRecord.find(filter)
    .populate("sessionId", "sessionDate scheduledStartTime")
    .populate("subjectId", "name code")
    .sort({ markedAt: -1 })
    .lean();

  const total = records.length;
  const present = records.filter((r) =>
    ["present", "late"].includes(r.status),
  ).length;
  const absent = records.filter((r) => r.status === "absent").length;
  const percentage =
    total > 0 ? parseFloat(((present / total) * 100).toFixed(2)) : 0;

  return {
    records,
    summary: {
      total,
      present,
      absent,
      unverified: total - present - absent,
      percentage,
    },
  };
}
