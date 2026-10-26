// src/controllers/report.controller.js

import * as reportService from "../services/report.service.js";
import { AppError } from "../middleware/errorHandler.js";

function getEffectiveCollegeId(req) {
  return req.tenantId || req.user.collegeId?.toString() || req.query.collegeId;
}

export async function getClassReport(req, res) {
  const result = await reportService.getClassAttendanceReport(
    getEffectiveCollegeId(req),
    {
      classId: req.params.classId,
      subjectId: req.query.subjectId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    },
  );

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}

export async function getStudentReport(req, res) {
  const studentId = req.params.studentId || req.user.id;
  // If user is a student, ensure they can only access their own report
  if (req.user.role === "student" && studentId !== req.user.id) {
    throw AppError.forbidden("Access denied to other student report");
  }

  const result = await reportService.getStudentAttendanceReport(
    getEffectiveCollegeId(req),
    studentId,
    {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    },
  );

  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}

export async function getDailyOverview(req, res) {
  const result = await reportService.getCollegeDailyOverview(
    getEffectiveCollegeId(req),
    req.query.date,
  );
  res.json({
    success: true,
    data: result,
    requestId: req.requestId,
  });
}

export async function exportClassCsv(req, res) {
  const csvData = await reportService.exportClassAttendanceCsv(
    getEffectiveCollegeId(req),
    {
      classId: req.params.classId,
      subjectId: req.query.subjectId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    },
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="attendance-report-${req.params.classId}.csv"`,
  );
  res.status(200).send(csvData);
}
