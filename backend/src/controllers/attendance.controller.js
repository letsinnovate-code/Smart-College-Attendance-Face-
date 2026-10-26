// src/controllers/attendance.controller.js

import * as attendanceService from "../services/attendance.service.js";
import AttendanceCorrectionRequest from "../models/AttendanceCorrectionRequest.js";
import AttendanceSession from "../models/AttendanceSession.js";
import AuditLog from "../models/AuditLog.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  parsePagination,
  paginatedResponse,
  parseSortAllowlist,
} from "../utils/pagination.js";
import { scopeQueryToTenant } from "../middleware/tenantContext.js";

export async function createSession(req, res) {
  const session = await attendanceService.createSession({
    collegeId: req.tenantId,
    facultyId: req.user.id,
    ...req.body,
    requestId: req.requestId,
  });
  res
    .status(201)
    .json({ success: true, data: session, requestId: req.requestId });
}

export async function listSessions(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const { state, classId, subjectId, startDate, endDate } = req.query;

  const filter = scopeQueryToTenant({}, req.tenantId);
  if (state) filter.state = state;
  if (classId) filter.classId = classId;
  if (subjectId) filter.subjectId = subjectId;
  if (startDate || endDate) {
    filter.sessionDate = {};
    if (startDate) filter.sessionDate.$gte = new Date(startDate);
    if (endDate) filter.sessionDate.$lte = new Date(endDate);
  }

  // Faculty only sees their sessions; admins see all
  if (req.user.role === "faculty") filter.facultyId = req.user.id;

  const sort = parseSortAllowlist(req.query.sort, [
    "sessionDate",
    "createdAt",
    "state",
  ]);
  const [sessions, total] = await Promise.all([
    AttendanceSession.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("classId", "section academicYear semester")
      .populate("subjectId", "name code")
      .lean(),
    AttendanceSession.countDocuments(filter),
  ]);

  res.json(paginatedResponse(sessions, total, { page, limit }));
}

export async function getSession(req, res) {
  const filter = scopeQueryToTenant(
    { _id: req.params.sessionId },
    req.tenantId,
  );
  const session = await AttendanceSession.findOne(filter)
    .populate(
      "classId subjectId facultyId",
      "section name code email profile.firstName profile.lastName",
    )
    .lean();
  if (!session) throw AppError.notFound("Session not found");
  res.json({ success: true, data: session, requestId: req.requestId });
}

export async function openSession(req, res) {
  const session = await attendanceService.openSession({
    sessionId: req.params.sessionId,
    collegeId: req.tenantId,
    facultyId: req.user.id,
    requestId: req.requestId,
  });
  res.json({ success: true, data: session, requestId: req.requestId });
}

export async function closeSession(req, res) {
  const session = await attendanceService.closeSession({
    sessionId: req.params.sessionId,
    collegeId: req.tenantId,
    actorId: req.user.id,
    requestId: req.requestId,
  });
  res.json({ success: true, data: session, requestId: req.requestId });
}

export async function cancelSession(req, res) {
  const session = await attendanceService.cancelSession({
    sessionId: req.params.sessionId,
    collegeId: req.tenantId,
    actorId: req.user.id,
    reason: req.body?.reason,
    requestId: req.requestId,
  });
  res.json({ success: true, data: session, requestId: req.requestId });
}

export async function issueChallenge(req, res) {
  const session = await AttendanceSession.findOne(
    scopeQueryToTenant(
      { _id: req.params.sessionId, state: "open" },
      req.tenantId,
    ),
  ).lean();
  if (!session) throw AppError.notFound("Open session not found");

  const challenge = attendanceService.issueAttendanceChallenge(
    req.params.sessionId,
    req.user.id,
  );
  res.json({ success: true, data: challenge, requestId: req.requestId });
}

export async function verifyAttendance(req, res) {
  if (!req.file) throw AppError.badRequest("Image file is required");

  const result = await attendanceService.recordAttendance({
    sessionId: req.params.sessionId,
    studentId: req.user.id,
    collegeId: req.tenantId,
    imageBuffer: req.file.buffer,
    challengeId: req.body?.challengeId,
    requestId: req.requestId,
  });

  const statusMap = {
    accepted: 200,
    already_recorded: 200,
    session_not_open: 409,
    window_closed: 409,
    not_enrolled: 403,
    verification_failed: 422,
    face_mismatch: 422,
    no_face_detected: 422,
    liveness_failed: 422,
    verification_service_error: 503,
  };

  const httpStatus = statusMap[result.result] ?? 422;
  res
    .status(httpStatus)
    .json({
      success:
        result.result === "accepted" || result.result === "already_recorded",
      data: { result: result.result, status: result.status },
      requestId: req.requestId,
    });
}

export async function getSessionRecords(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const { records, total } = await attendanceService.getSessionRecords(
    req.params.sessionId,
    req.tenantId,
    { page, limit, skip },
  );
  res.json(paginatedResponse(records, total, { page, limit }));
}

export async function getStudentSummary(req, res) {
  const { studentId } = req.params;
  // Students can only see their own summary
  if (req.user.role === "student" && req.user.id !== studentId) {
    throw AppError.forbidden();
  }

  const result = await attendanceService.getStudentAttendanceSummary(
    studentId,
    req.tenantId,
    req.query,
  );
  res.json({ success: true, data: result, requestId: req.requestId });
}

export async function requestCorrection(req, res) {
  const { attendanceRecordId, reason, requestedStatus } = req.body;
  if (!attendanceRecordId || !reason || !requestedStatus) {
    throw AppError.badRequest(
      "attendanceRecordId, reason, and requestedStatus are required",
    );
  }

  const record = await (
    await import("../models/AttendanceRecord.js")
  ).default.findOne(
    scopeQueryToTenant({ _id: attendanceRecordId }, req.tenantId),
  );
  if (!record) throw AppError.notFound("Attendance record not found");

  // Students can only request correction for their own records
  if (
    req.user.role === "student" &&
    record.studentId.toString() !== req.user.id
  ) {
    throw AppError.forbidden();
  }

  const correction = await AttendanceCorrectionRequest.create({
    collegeId: req.tenantId,
    attendanceRecordId,
    sessionId: record.sessionId,
    studentId: record.studentId,
    requestedBy: req.user.id,
    originalStatus: record.status,
    requestedStatus,
    reason,
    auditTrail: [
      { actor: req.user.id, action: "submitted", timestamp: new Date() },
    ],
  });

  await AuditLog.create({
    actor: req.user.id,
    action: "attendance.correction.requested",
    targetType: "AttendanceCorrectionRequest",
    targetId: correction._id.toString(),
    collegeId: req.tenantId,
    requestId: req.requestId,
  });

  res
    .status(201)
    .json({ success: true, data: correction, requestId: req.requestId });
}

export async function listCorrections(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = scopeQueryToTenant({}, req.tenantId);
  if (req.query.status) filter.reviewStatus = req.query.status;
  if (req.user.role === "faculty") {
    // Faculty can only see corrections for sessions they own
    const sessions = await AttendanceSession.find({
      collegeId: req.tenantId,
      facultyId: req.user.id,
    })
      .select("_id")
      .lean();
    filter.sessionId = { $in: sessions.map((s) => s._id) };
  }

  const [corrections, total] = await Promise.all([
    AttendanceCorrectionRequest.find(filter)
      .populate(
        "studentId",
        "email profile.firstName profile.lastName profile.studentId",
      )
      .populate("requestedBy", "email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AttendanceCorrectionRequest.countDocuments(filter),
  ]);

  res.json(paginatedResponse(corrections, total, { page, limit }));
}

export async function reviewCorrection(req, res) {
  const { correctionId } = req.params;
  const { decision, comment } = req.body;

  if (!["approved", "rejected"].includes(decision)) {
    throw AppError.badRequest('Decision must be "approved" or "rejected"');
  }

  const correction = await AttendanceCorrectionRequest.findOne(
    scopeQueryToTenant({ _id: correctionId }, req.tenantId),
  );
  if (!correction) throw AppError.notFound("Correction request not found");
  if (correction.reviewStatus !== "pending") {
    throw AppError.conflict("Correction has already been reviewed");
  }

  correction.reviewStatus = decision;
  correction.reviewedBy = req.user.id;
  correction.reviewedAt = new Date();
  correction.reviewComment = comment;
  correction.auditTrail.push({
    actor: req.user.id,
    action: decision,
    comment,
    previousStatus: "pending",
    newStatus: decision,
    timestamp: new Date(),
  });
  await correction.save();

  // If approved, update the actual attendance record
  if (decision === "approved") {
    const AttendanceRecord = (await import("../models/AttendanceRecord.js"))
      .default;
    const record = await AttendanceRecord.findById(
      correction.attendanceRecordId,
    );
    if (record) {
      record.originalStatus = record.status;
      record.status = correction.requestedStatus;
      record.isCorrected = true;
      record.lastCorrectedAt = new Date();
      record.lastCorrectedBy = req.user.id;
      await record.save();
    }
  }

  await AuditLog.create({
    actor: req.user.id,
    action:
      decision === "approved"
        ? "attendance.correction.approved"
        : "attendance.correction.rejected",
    targetType: "AttendanceCorrectionRequest",
    targetId: correctionId,
    collegeId: req.tenantId,
    requestId: req.requestId,
    metadata: { decision, comment },
  });

  res.json({ success: true, data: correction, requestId: req.requestId });
}
