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

describe("College Management & Tenant Scoping (Integration)", () => {
  let superAdminToken;
  let collegeAdminToken;
  let collegeA;
  let collegeB;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // 1. Create Colleges
    collegeA = await College.create({
      name: "Alpha College",
      tenantCode: "ALPHA",
      status: "active",
    });
    collegeB = await College.create({
      name: "Beta Institute",
      tenantCode: "BETA",
      status: "active",
    });

    // 2. Create Users & generate tokens
    const dummyPassword = await hashPassword("Password123!");
    const superAdmin = await User.create({
      email: "super@system.local",
      hashedPassword: dummyPassword,
      role: "superAdmin",
      accountStatus: "active",
      emailVerified: true,
    });
    superAdminToken = await signAccessToken(
      superAdmin._id.toString(),
      "superAdmin",
      null,
    );

    const adminA = await User.create({
      email: "admin@alpha.edu",
      hashedPassword: dummyPassword,
      role: "collegeAdmin",
      collegeId: collegeA._id,
      accountStatus: "active",
      emailVerified: true,
    });
    collegeAdminToken = await signAccessToken(
      adminA._id.toString(),
      "collegeAdmin",
      collegeA._id.toString(),
    );
  });

  it("allows superAdmin to create a new college tenant", async () => {
    const res = await request(app)
      .post("/api/v1/colleges")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Gamma University",
        tenantCode: "GAMMA",
        domain: "gamma.edu",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tenantCode).toBe("GAMMA");
  });

  it("forbids collegeAdmin from registering new colleges", async () => {
    const res = await request(app)
      .post("/api/v1/colleges")
      .set("Authorization", `Bearer ${collegeAdminToken}`)
      .send({
        name: "Rogue College",
        tenantCode: "ROGUE",
      });

    expect(res.status).toBe(403);
  });

  it("prevents collegeAdmin from accessing another college details (cross-tenant IDOR defense)", async () => {
    // CollegeAdmin A attempts to read College B
    const res = await request(app)
      .get(`/api/v1/colleges/${collegeB._id}`)
      .set("Authorization", `Bearer ${collegeAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("Access denied");
  });

  it("allows collegeAdmin to read their own college details", async () => {
    const res = await request(app)
      .get(`/api/v1/colleges/${collegeA._id}`)
      .set("Authorization", `Bearer ${collegeAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Alpha College");
  });
});
