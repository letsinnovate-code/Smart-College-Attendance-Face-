import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import sharp from "sharp";
import app from "../../src/app.js";
import User from "../../src/models/User.js";
import College from "../../src/models/College.js";
import Department from "../../src/models/Department.js";
import Course from "../../src/models/Course.js";
import AcademicClass from "../../src/models/AcademicClass.js";
import Subject from "../../src/models/Subject.js";
import FacultyAssignment from "../../src/models/FacultyAssignment.js";
import StudentEnrollment from "../../src/models/StudentEnrollment.js";
import FaceTemplate from "../../src/models/FaceTemplate.js";
import {
  hashPassword,
  signAccessToken,
} from "../../src/services/auth.service.js";
import { encryptEmbedding } from "../../src/utils/crypto.js";
import { connectTestDb, clearTestDb, closeTestDb } from "../helpers/db.js";

describe("Attendance Session Lifecycle & Verification (Integration)", () => {
  let facultyToken;
  let studentToken;
  let college;
  let academicClass;
  let subject;
  let facultyUser;
  let studentUser;
  let sampleImageBuffer;

  beforeAll(async () => {
    await connectTestDb();
    sampleImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 200, g: 200, b: 200 },
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

    // 1. College
    college = await College.create({
      name: "Tech University",
      tenantCode: "TECH",
      status: "active",
    });

    // 2. Department & Course
    const dept = await Department.create({
      collegeId: college._id,
      name: "Computing",
      code: "CS",
    });
    const course = await Course.create({
      collegeId: college._id,
      departmentId: dept._id,
      name: "Computer Science",
      code: "CS-UG",
      credits: 4,
    });

    // 3. Class & Subject
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
      code: "CS101",
      credits: 4,
      semester: 1,
    });

    // 4. Users
    const dummyPassword = await hashPassword("Password123!");
    facultyUser = await User.create({
      email: "prof.smith@tech.edu",
      hashedPassword: dummyPassword,
      role: "faculty",
      collegeId: college._id,
      accountStatus: "active",
      emailVerified: true,
    });
    facultyToken = await signAccessToken(
      facultyUser._id.toString(),
      "faculty",
      college._id.toString(),
    );

    studentUser = await User.create({
      email: "stu.john@tech.edu",
      hashedPassword: dummyPassword,
      role: "student",
      collegeId: college._id,
      accountStatus: "active",
      emailVerified: true,
    });
    studentToken = await signAccessToken(
      studentUser._id.toString(),
      "student",
      college._id.toString(),
    );

    // 5. Faculty Assignment & Student Enrollment
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

    // 6. Pre-enroll Student FaceTemplate with Mock vector
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
  });

  it("executes full attendance session lifecycle with biometric face verification", async () => {
    // 1. Faculty creates attendance session
    const createRes = await request(app)
      .post("/api/v1/attendance/sessions")
      .set("Authorization", `Bearer ${facultyToken}`)
      .send({
        classId: academicClass._id.toString(),
        subjectId: subject._id.toString(),
        sessionDate: new Date().toISOString(),
        scheduledStartTime: new Date().toISOString(),
        scheduledEndTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        attendanceWindowMinutes: 30,
        topic: "Graph Algorithms",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.state).toBe("draft");
    const sessionId = createRes.body.data._id;

    // 2. Faculty opens attendance session
    const openRes = await request(app)
      .patch(`/api/v1/attendance/sessions/${sessionId}/open`)
      .set("Authorization", `Bearer ${facultyToken}`);

    expect(openRes.status).toBe(200);
    expect(openRes.body.data.state).toBe("open");

    // 3. Student requests an anti-replay attendance challenge nonce
    const challengeRes = await request(app)
      .post(`/api/v1/attendance/sessions/${sessionId}/challenge`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(challengeRes.status).toBe(200);
    const challengeId = challengeRes.body.data.challengeId;
    expect(challengeId).toBeDefined();

    // 4. Student verifies attendance using selfie image + challenge nonce
    const verifyRes = await request(app)
      .post(`/api/v1/attendance/sessions/${sessionId}/verify`)
      .set("Authorization", `Bearer ${studentToken}`)
      .field("challengeId", challengeId)
      .attach("image", sampleImageBuffer, "selfie.jpg");

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.status).toBe("present");

    // 5. Faculty closes session
    const closeRes = await request(app)
      .patch(`/api/v1/attendance/sessions/${sessionId}/close`)
      .set("Authorization", `Bearer ${facultyToken}`);

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.state).toBe("closed");
    expect(closeRes.body.data.presentCount).toBe(1);

    // 6. Faculty retrieves records for the closed session
    const recordsRes = await request(app)
      .get(`/api/v1/attendance/sessions/${sessionId}/records`)
      .set("Authorization", `Bearer ${facultyToken}`);

    expect(recordsRes.status).toBe(200);
    expect(recordsRes.body.data).toHaveLength(1);
    expect(recordsRes.body.data[0].status).toBe("present");
    expect(recordsRes.body.data[0].verificationMethod).toBe("face");
  });
});
