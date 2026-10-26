import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import User from "../../src/models/User.js";
import College from "../../src/models/College.js";
import {
  hashPassword,
  signAccessToken,
} from "../../src/services/auth.service.js";
import { connectTestDb, clearTestDb, closeTestDb } from "../helpers/db.js";

describe("Academic Structure Hierarchy (Integration)", () => {
  let adminToken;
  let college;
  let facultyUser;
  let studentUser;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    college = await College.create({
      name: "Delta Institute",
      tenantCode: "DELTA",
      status: "active",
    });

    const dummyPassword = await hashPassword("Password123!");
    const admin = await User.create({
      email: "admin@delta.edu",
      hashedPassword: dummyPassword,
      role: "collegeAdmin",
      collegeId: college._id,
      accountStatus: "active",
      emailVerified: true,
    });
    adminToken = await signAccessToken(
      admin._id.toString(),
      "collegeAdmin",
      college._id.toString(),
    );

    facultyUser = await User.create({
      email: "prof@delta.edu",
      hashedPassword: dummyPassword,
      role: "faculty",
      collegeId: college._id,
      accountStatus: "active",
      emailVerified: true,
    });

    studentUser = await User.create({
      email: "student@delta.edu",
      hashedPassword: dummyPassword,
      role: "student",
      collegeId: college._id,
      accountStatus: "active",
      emailVerified: true,
    });
  });

  it("provisions complete academic hierarchy end-to-end", async () => {
    // 1. Create Department
    const deptRes = await request(app)
      .post("/api/v1/academic/departments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Electronics Engineering", code: "ECE" });

    expect(deptRes.status).toBe(201);
    const deptId = deptRes.body.data._id;

    // 2. Create Course
    const courseRes = await request(app)
      .post("/api/v1/academic/courses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        departmentId: deptId,
        code: "BTECH-ECE",
        name: "B.Tech in Electronics",
        credits: 4,
      });

    expect(courseRes.status).toBe(201);
    const courseId = courseRes.body.data._id;

    // 3. Create Class
    const classRes = await request(app)
      .post("/api/v1/academic/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseId,
        departmentId: deptId,
        section: "A",
        academicYear: "2026-2027",
        semester: 3,
      });

    expect(classRes.status).toBe(201);
    const classId = classRes.body.data._id;

    // 4. Create Subject
    const subjectRes = await request(app)
      .post("/api/v1/academic/subjects")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseId,
        code: "EC301",
        name: "Digital Signal Processing",
        credits: 4,
        semester: 3,
      });

    expect(subjectRes.status).toBe(201);
    const subjectId = subjectRes.body.data._id;

    // 5. Assign Faculty
    const assignRes = await request(app)
      .post("/api/v1/academic/faculty-assignments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        facultyId: facultyUser._id.toString(),
        classId,
        subjectId,
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.isActive).toBe(true);

    // 6. Enroll Student
    const enrollRes = await request(app)
      .post("/api/v1/academic/student-enrollments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        studentId: studentUser._id.toString(),
        classId,
        rollNumber: "ECE-01",
      });

    expect(enrollRes.status).toBe(201);
    expect(enrollRes.body.data.status).toBe("active");
  });
});
