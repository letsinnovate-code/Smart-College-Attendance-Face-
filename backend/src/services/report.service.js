// src/services/report.service.js
// Aggregation and reporting service for attendance analytics and CSV exports.

import AttendanceSession from "../models/AttendanceSession.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import StudentEnrollment from "../models/StudentEnrollment.js";
import AcademicClass from "../models/AcademicClass.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";
import { generateCsv } from "../utils/csv.js";

export async function getClassAttendanceReport(
  collegeId,
  { classId, subjectId, startDate, endDate },
) {
  const cls = await AcademicClass.findOne({ _id: classId, collegeId })
    .populate("courseId", "name code")
    .populate("departmentId", "name code")
    .lean();
  if (!cls) throw AppError.notFound("Class not found");

  // Build session query
  const sessionQuery = { collegeId, classId, state: "closed" };
  if (subjectId) sessionQuery.subjectId = subjectId;
  if (startDate || endDate) {
    sessionQuery.sessionDate = {};
    if (startDate) sessionQuery.sessionDate.$gte = new Date(startDate);
    if (endDate) sessionQuery.sessionDate.$lte = new Date(endDate);
  }

  const sessions = await AttendanceSession.find(sessionQuery)
    .select("_id sessionDate subjectId")
    .lean();
  const sessionIds = sessions.map((s) => s._id);
  const totalSessions = sessionIds.length;

  // Get all active students enrolled in this class
  const enrollments = await StudentEnrollment.find({
    collegeId,
    classId,
    status: "active",
  })
    .populate(
      "studentId",
      "profile.firstName profile.lastName profile.studentId email",
    )
    .sort("rollNumber")
    .lean();

  if (totalSessions === 0) {
    return {
      class: cls,
      totalSessions: 0,
      students: enrollments.map((e) => ({
        studentId: e.studentId?._id,
        studentCode: e.studentId?.profile?.studentId || "N/A",
        studentName:
          `${e.studentId?.profile?.firstName || ""} ${e.studentId?.profile?.lastName || ""}`.trim(),
        rollNumber: e.rollNumber || "N/A",
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        totalClasses: 0,
        attendancePercentage: 0,
      })),
    };
  }

  // Aggregate attendance records for these sessions
  const records = await AttendanceRecord.aggregate([
    { $match: { collegeId, sessionId: { $in: sessionIds } } },
    {
      $group: {
        _id: { studentId: "$studentId", status: "$status" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Map student counts
  const countMap = {};
  for (const r of records) {
    const sId = r._id.studentId.toString();
    if (!countMap[sId])
      countMap[sId] = { present: 0, late: 0, absent: 0, excused: 0 };
    countMap[sId][r._id.status] = r.count;
  }

  const studentReports = enrollments.map((e) => {
    const sId = e.studentId?._id.toString();
    const counts = countMap[sId] || {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
    };
    const effectivePresent = counts.present + counts.late;
    const percentage =
      totalSessions > 0
        ? Math.round((effectivePresent / totalSessions) * 100 * 10) / 10
        : 0;

    return {
      studentId: e.studentId?._id,
      studentCode: e.studentId?.profile?.studentId || "N/A",
      studentName:
        `${e.studentId?.profile?.firstName || ""} ${e.studentId?.profile?.lastName || ""}`.trim(),
      rollNumber: e.rollNumber || "N/A",
      presentCount: counts.present,
      lateCount: counts.late,
      absentCount: totalSessions - effectivePresent,
      totalClasses: totalSessions,
      attendancePercentage: percentage,
    };
  });

  return {
    class: cls,
    totalSessions,
    students: studentReports,
  };
}

export async function getStudentAttendanceReport(
  collegeId,
  studentId,
  { startDate, endDate },
) {
  const student = await User.findOne({
    _id: studentId,
    collegeId,
    role: "student",
  }).lean();
  if (!student) throw AppError.notFound("Student not found");

  const matchFilter = { collegeId, studentId: student._id };
  if (startDate || endDate) {
    matchFilter.markedAt = {};
    if (startDate) matchFilter.markedAt.$gte = new Date(startDate);
    if (endDate) matchFilter.markedAt.$lte = new Date(endDate);
  }

  const records = await AttendanceRecord.find(matchFilter)
    .populate({
      path: "sessionId",
      populate: [
        { path: "subjectId", select: "name code" },
        { path: "classId", select: "section academicYear semester" },
      ],
    })
    .sort("-markedAt")
    .lean();

  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const late = records.filter((r) => r.status === "late").length;
  const absent = records.filter((r) => r.status === "absent").length;

  return {
    student: {
      id: student._id,
      name: `${student.profile?.firstName || ""} ${student.profile?.lastName || ""}`.trim(),
      studentId: student.profile?.studentId,
      email: student.email,
    },
    summary: {
      total,
      present,
      late,
      absent,
      attendancePercentage:
        total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 0,
    },
    history: records.map((r) => ({
      recordId: r._id,
      date: r.sessionId?.sessionDate || r.markedAt,
      subject: r.sessionId?.subjectId?.name,
      subjectCode: r.sessionId?.subjectId?.code,
      status: r.status,
      verificationMethod: r.verificationMethod,
      markedAt: r.markedAt,
    })),
  };
}

export async function getCollegeDailyOverview(collegeId, dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const [sessionCounts, totalRecords, totalStudents] = await Promise.all([
    AttendanceSession.aggregate([
      {
        $match: {
          collegeId,
          sessionDate: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      { $group: { _id: "$state", count: { $sum: 1 } } },
    ]),
    AttendanceRecord.countDocuments({
      collegeId,
      markedAt: { $gte: startOfDay, $lte: endOfDay },
    }),
    StudentEnrollment.countDocuments({ collegeId, status: "active" }),
  ]);

  const stateMap = {};
  for (const s of sessionCounts) {
    stateMap[s._id] = s.count;
  }

  return {
    date: startOfDay.toISOString().split("T")[0],
    totalStudents,
    totalAttendanceMarkedToday: totalRecords,
    sessions: {
      draft: stateMap.draft || 0,
      open: stateMap.open || 0,
      closed: stateMap.closed || 0,
      cancelled: stateMap.cancelled || 0,
      total: Object.values(stateMap).reduce((a, b) => a + b, 0),
    },
  };
}

export async function exportClassAttendanceCsv(collegeId, queryParams) {
  const report = await getClassAttendanceReport(collegeId, queryParams);

  const columns = [
    "rollNumber",
    "studentCode",
    "studentName",
    "totalClasses",
    "presentCount",
    "lateCount",
    "absentCount",
    "attendancePercentage",
  ];

  const headerMap = {
    rollNumber: "Roll Number",
    studentCode: "Student ID",
    studentName: "Student Name",
    totalClasses: "Total Classes",
    presentCount: "Present",
    lateCount: "Late",
    absentCount: "Absent",
    attendancePercentage: "Attendance %",
  };

  return generateCsv(report.students, columns, headerMap);
}
