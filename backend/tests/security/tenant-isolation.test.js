import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import User from "../../src/models/User.js";
import College from "../../src/models/College.js";
import Department from "../../src/models/Department.js";
import Course from "../../src/models/Course.js";
import AcademicClass from "../../src/models/AcademicClass.js";
import {
  hashPassword,
  signAccessToken,
} from "../../src/services/auth.service.js";
import { connectTestDb, clearTestDb, closeTestDb } from "../helpers/db.js";

describe("Tenant Isolation & IDOR Protection (Security)", () => {
  let facultyA_Token;
  let collegeA;
  let collegeB;
  let classB;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Two isolated colleges
    collegeA = await College.create({
      name: "College A",
      tenantCode: "COLA",
      status: "active",
    });
    collegeB = await College.create({
      name: "College B",
      tenantCode: "COLB",
      status: "active",
    });

    const dummyPassword = await hashPassword("Secret123!");
    const facultyA = await User.create({
      email: "prof@collegeA.edu",
      hashedPassword: dummyPassword,
      role: "faculty",
      collegeId: collegeA._id,
      accountStatus: "active",
      emailVerified: true,
    });
    facultyA_Token = await signAccessToken(
      facultyA._id.toString(),
      "faculty",
      collegeA._id.toString(),
    );

    // Class belonging exclusively to College B
    const deptB = await Department.create({
      collegeId: collegeB._id,
      name: "Physics",
      code: "PHY",
    });
    const courseB = await Course.create({
      collegeId: collegeB._id,
      departmentId: deptB._id,
      name: "B.Sc Physics",
      code: "BSC-PHY",
      credits: 3,
    });
    classB = await AcademicClass.create({
      collegeId: collegeB._id,
      courseId: courseB._id,
      departmentId: deptB._id,
      section: "B1",
      academicYear: "2026-2027",
      semester: 1,
    });
  });

  it("prohibits Faculty in College A from viewing AcademicClass belonging to College B", async () => {
    const res = await request(app)
      .get(`/api/v1/academic/classes/${classB._id}`)
      .set("Authorization", `Bearer ${facultyA_Token}`);

    // Must be 404 Not Found to prevent data exposure across tenants
    expect(res.status).toBe(404);
  });

  it("prevents Faculty in College A from forging collegeId in query parameters", async () => {
    const res = await request(app)
      .get(`/api/v1/academic/classes?collegeId=${collegeB._id}`)
      .set("Authorization", `Bearer ${facultyA_Token}`);

    expect(res.status).toBe(200);
    // Any returned classes must only belong to College A, never College B
    const bClasses = res.body.data.filter(
      (c) => c.collegeId?.toString() === collegeB._id.toString(),
    );
    expect(bClasses).toHaveLength(0);
  });
});
