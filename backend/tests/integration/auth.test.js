import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import User from "../../src/models/User.js";
import College from "../../src/models/College.js";
import { hashPassword } from "../../src/services/auth.service.js";
import { connectTestDb, clearTestDb, closeTestDb } from "../helpers/db.js";

describe("Authentication & Session Flow (Integration)", () => {
  let college;
  let testUser;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    college = await College.create({
      name: "Test University",
      tenantCode: "TEST",
      status: "active",
    });

    const hashedPassword = await hashPassword("ValidPass123!");
    testUser = await User.create({
      email: "user@test.edu",
      hashedPassword,
      role: "faculty",
      collegeId: college._id,
      profile: { firstName: "Alice", lastName: "Smith" },
      accountStatus: "active",
      emailVerified: true,
    });
  });

  it("rejects login with invalid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "user@test.edu", password: "WrongPassword!" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("successfully logs in, returns access token, and sets HttpOnly refresh cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "user@test.edu", password: "ValidPass123!" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe("user@test.edu");

    // Verify Set-Cookie header contains refreshToken
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("HttpOnly");
  });

  it("rotates refresh token and detects reuse attempts", async () => {
    // 1. Initial login
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "user@test.edu", password: "ValidPass123!" });

    const cookieHeader = loginRes.headers["set-cookie"];
    const initialCookie = cookieHeader.find((c) =>
      c.startsWith("refreshToken="),
    );

    // 2. Perform refresh using the initial cookie
    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [initialCookie]);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();

    const newCookies = refreshRes.headers["set-cookie"];
    const rotatedCookie = newCookies.find((c) => c.startsWith("refreshToken="));
    expect(rotatedCookie).toBeDefined();

    // 3. Attempt to reuse the old, already-rotated refresh token (simulating theft)
    const replayRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [initialCookie]);

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.message).toContain("compromised");
  });

  it("allows forgot-password and reset-password lifecycle", async () => {
    const forgotRes = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "user@test.edu" });

    expect(forgotRes.status).toBe(200);
    const resetToken = forgotRes.body.data?.devToken;
    expect(resetToken).toBeDefined();

    const resetRes = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: resetToken, newPassword: "NewValidPass123!" });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Verify login with new password
    const newLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "user@test.edu", password: "NewValidPass123!" });

    expect(newLoginRes.status).toBe(200);
  });
});
