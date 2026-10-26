import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { connectTestDb, closeTestDb } from "../helpers/db.js";

describe("Health Endpoints (Integration)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("GET / returns service metadata and running status", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("Smart College Attendance API");
    expect(res.body.status).toBe("running");
  });

  it("GET /api/v1/health/live returns 200 ok", async () => {
    const res = await request(app).get("/api/v1/health/live");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("GET /api/v1/health/ready returns 200 when DB is connected", async () => {
    const res = await request(app).get("/api/v1/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.checks.mongodb).toBe("ok");
  });
});
