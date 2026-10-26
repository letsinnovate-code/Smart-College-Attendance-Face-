import { describe, it, expect } from "vitest";
import College from "../../src/models/College.js";
import User from "../../src/models/User.js";
import AcademicClass from "../../src/models/AcademicClass.js";

describe("Model Schema Validations", () => {
  it("validates required fields on College schema", () => {
    const invalidCollege = new College({});
    const err = invalidCollege.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
    expect(err.errors.tenantCode).toBeDefined();
  });

  it("validates email format and role enum on User schema", () => {
    const invalidUser = new User({
      email: "not-an-email",
      role: "superHacker",
    });
    const err = invalidUser.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.role).toBeDefined();
  });

  it("validates academic year regex and semester boundaries on AcademicClass", () => {
    const invalidClass = new AcademicClass({
      academicYear: "2026", // invalid format (needs YYYY-YYYY)
      semester: 15, // max is 12
    });
    const err = invalidClass.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.academicYear).toBeDefined();
    expect(err.errors.semester).toBeDefined();
  });
});
