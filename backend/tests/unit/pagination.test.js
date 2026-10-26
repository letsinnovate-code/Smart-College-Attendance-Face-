import { describe, it, expect } from "vitest";
import {
  parsePagination,
  parseSortAllowlist,
  buildPaginationResponse,
} from "../../src/utils/pagination.js";

describe("Pagination Utilities", () => {
  it("parses default pagination params when none provided", () => {
    const { page, limit, skip, sort } = parsePagination({});
    expect(page).toBe(1);
    expect(limit).toBe(20);
    expect(skip).toBe(0);
    expect(sort).toEqual({ createdAt: -1 });
  });

  it("clamps invalid or excessive page and limit values", () => {
    const { page, limit, skip } = parsePagination(
      { page: -5, limit: 500 },
      { maxLimit: 50 },
    );
    expect(page).toBe(1);
    expect(limit).toBe(50);
    expect(skip).toBe(0);
  });

  it("enforces sort allowlist and ignores forbidden fields", () => {
    const sort = parseSortAllowlist("hashedPassword,name,-createdAt", [
      "name",
      "createdAt",
    ]);
    expect(sort).toEqual({ name: 1, createdAt: -1 });
    expect(sort).not.toHaveProperty("hashedPassword");
  });

  it("builds standard paginated response metadata", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const res = buildPaginationResponse(items, 50, 2, 10);

    expect(res.data).toEqual(items);
    expect(res.pagination.page).toBe(2);
    expect(res.pagination.limit).toBe(10);
    expect(res.pagination.total).toBe(50);
    expect(res.pagination.pages).toBe(5);
    expect(res.pagination.hasNext).toBe(true);
    expect(res.pagination.hasPrev).toBe(true);
  });
});
