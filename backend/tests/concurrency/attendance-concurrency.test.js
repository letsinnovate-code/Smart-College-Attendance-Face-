import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import sharp from "sharp";
import User from "../../src/models/User.js";
import College from "../../src/models/College.js";
import Department from "../../src/models/Department.js";
import Course from "../../src/models/Course.js";
import AcademicClass from "../../src/models/AcademicClass.js";
import Subject from "../../src/models/Subject.js";
import FacultyAssignment from "../../src/models/FacultyAssignment.js";
import StudentEnrollment from "../../src/models/StudentEnrollment.js";
import AttendanceSession from "../../src/models/AttendanceSession.js";
import AttendanceRecord from "../../src/models/AttendanceRecord.js";
import FaceTemplate from "../../src/models/FaceTemplate.js";
import { hashPassword } from "../../src/services/auth.service.js";
import { encryptEmbedding } from "../../src/utils/crypto.js";
import {
  recordAttendance,
  issueAttendanceChallenge,
} from "../../src/services/attendance.service.js";
import { connectTestDb, clearTestDb, closeTestDb } from "../helpers/db.js";

describe("Concurrency & Duplicate Attendance Prevention", () => {
  let college;
  let academicClass;
  let subject;
  let studentUser;
  let session;
  let sampleImageBuffer;

  beforeAll(async () => {
    await connectTestDb();
    sampleImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 150, g: 150, b: 150 },
      },
    })
      .jpeg()
      .toBuffer();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Setup college and hierarchy
    college = await College.create({
      name: "Concurrency Univ",
      tenantCode: "CONC",
      status: "active",
    });
    const dept = await Department.create({
      collegeId: college._id,
      name: "CS",
      code: "CS",
    });
    const course = await Course.create({
      collegeId: college._id,
      departmentId: dept._id,
      name: "CS UG",
      code: "CS-UG",
      credits: 4,
    });
    academicClass = await AcademicClass.create({
      collegeId: college._id,
      courseId: course._id,
      departmentId: dept._id,
      section: "A",
      academicYear: "2026-2027",
      semester: 1,
    });
    subject = await Subject.create({
      collegeId: college._id,
      courseId: course._id,
      name: "Algorithms",
      code: "ALGO101",
      credits: 4,
      semester: 1,
    });

    const dummyPassword = await hashPassword("Secret123!");
    const facultyUser = await User.create({
      email: "prof.concurrency@conc.edu",
      hashedPassword: dummyPassword,
      role: "faculty",
      collegeId: college._id,
      accountStatus: "active",
      emailVerified: true,
    });

    studentUser = await User.create({
      email: "stu.concurrency@conc.edu",
      hashedPassword: dummyPassword,
      role: "student",
      collegeId: college._id,
      accountStatus: "active",
      emailVerified: true,
    });

    await FacultyAssignment.create({
      collegeId: college._id,
      facultyId: facultyUser._id,
      classId: academicClass._id,
      subjectId: subject._id,
      assignedBy: facultyUser._id,
    });

    await StudentEnrollment.create({
      collegeId: college._id,
      studentId: studentUser._id,
      classId: academicClass._id,
      rollNumber: "001",
      status: "active",
    });

    // Enrolled Face Template
    const vector = new Array(512).fill(0).map((_, i) => i / 512);
    await FaceTemplate.create({
      collegeId: college._id,
      studentId: studentUser._id,
      encryptedVector: encryptEmbedding(vector),
      provider: "mock",
      modelVersion: "mock-v1",
      embeddingDimension: 512,
      qualityScore: 0.95,
      consentRecordedAt: new Date(),
      enrollmentStatus: "active",
      enrolledAt: new Date(),
    });

    // Create and open attendance session
    session = await AttendanceSession.create({
      collegeId: college._id,
      classId: academicClass._id,
      subjectId: subject._id,
      facultyId: facultyUser._id,
      sessionDate: new Date(),
      scheduledStartTime: new Date(),
      scheduledEndTime: new Date(Date.now() + 60 * 60 * 1000),
      state: "open",
      openedAt: new Date(),
      attendanceWindowMinutes: 30,
      latenessWindowMinutes: 10,
    });
  });

  it("guarantees atomic upsert: concurrent mark requests result in exactly ONE database record", async () => {
    // Generate 10 challenges for parallel submissions
    const challenges = Array.from({ length: 10 }, () =>
      issueAttendanceChallenge(
        session._id.toString(),
        studentUser._id.toString(),
      ),
    );

    // Fire 10 concurrent attendance recording requests simultaneously
    const promises = challenges.map(({ challengeId }) =>
      recordAttendance({
        sessionId: session._id,
        studentId: studentUser._id,
        collegeId: college._id,
        imageBuffer: sampleImageBuffer,
        challengeId,
        requestId: "concurrent-test",
      }).catch((err) => ({ error: err.message })),
    );

    const results = await Promise.all(promises);

    // Verify exactly 1 AttendanceRecord exists in the database
    const recordCount = await AttendanceRecord.countDocuments({
      collegeId: college._id,
      sessionId: session._id,
      studentId: studentUser._id,
    });

    expect(recordCount).toBe(1);

    // At least one request succeeded with 'present'
    const successResult = results.find((r) => r.status === "present");
    expect(successResult).toBeDefined();
  });
});
