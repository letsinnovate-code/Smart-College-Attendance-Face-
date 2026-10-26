import { describe, it, expect } from "vitest";
import { generateCsv } from "../../src/utils/csv.js";

describe("Safe CSV Generation", () => {
  it("generates valid CSV rows and headers", async () => {
    const data = [
      { name: "John Doe", roll: "101", score: 95 },
      { name: "Jane Smith", roll: "102", score: 98 },
    ];
    const columns = ["name", "roll", "score"];
    const headerMap = { name: "Full Name", roll: "Roll No", score: "Score" };

    const csv = await generateCsv(data, columns, headerMap);
    expect(csv).toContain('"Full Name","Roll No","Score"');
    expect(csv).toContain('"John Doe","101","95"');
    expect(csv).toContain('"Jane Smith","102","98"');
  });

  it("neutralizes formula injection characters (=, +, -, @, tab, return)", async () => {
    const dangerousPayloads = [
      { field: "=SUM(A1:A10)" },
      { field: "+cmd|/C calc.exe" },
      { field: "-2+3*cmd" },
      { field: "@dangerous" },
      { field: "\tattack" },
    ];

    const csv = await generateCsv(dangerousPayloads, ["field"]);

    // Each dangerous payload must be prefixed with a single quote (') inside the quotes
    expect(csv).toContain(`"'=SUM(A1:A10)"`);
    expect(csv).toContain(`"'+cmd|/C calc.exe"`);
    expect(csv).toContain(`"'-2+3*cmd"`);
    expect(csv).toContain(`"'@dangerous"`);
    expect(csv).toContain(`"'\tattack"`);
  });
});
