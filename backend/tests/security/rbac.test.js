import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import User from "../../src/models/User.js";
import College from "../../src/models/College.js";
import {
  hashPassword,
  signAccessToken,
} from "../../src/services/auth.service.js";
import { connectTestDb, closeTestDb } from "../helpers/db.js";

describe("Role-Based Access Control & Privilege Escalation Defense (Security)", () => {
  let studentToken;
  let college;

  beforeAll(async () => {
    await connectTestDb();

    college = await College.create({
      name: "Security College",
      tenantCode: "SEC",
      status: "active",
    });
    const dummyPassword = await hashPassword("Secret123!");
    const student = await User.create({
      email: "student@sec.edu",
      hashedPassword: dummyPassword,
      role: "student",
      collegeId: college._id,
      accountStatus: "active",
      emailVerified: true,
    });

    studentToken = await signAccessToken(
      student._id.toString(),
      "student",
      college._id.toString(),
    );
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("rejects unauthenticated requests to protected endpoints with 401", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects tampered or malformed JWT Bearer tokens with 401", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.invalid.payload");

    expect(res.status).toBe(401);
  });

  it("prohibits student from creating departments (403 Forbidden)", async () => {
    const res = await request(app)
      .post("/api/v1/academic/departments")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "Hacked Department", code: "HACK" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("prohibits student from creating colleges (403 Forbidden)", async () => {
    const res = await request(app)
      .post("/api/v1/colleges")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "Rogue College", tenantCode: "ROGUE" });

    expect(res.status).toBe(403);
  });
});
