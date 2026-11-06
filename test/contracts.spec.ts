import { describe, it, expect } from "vitest";
import fs from "node:fs";
const routes = JSON.parse(fs.readFileSync("docs/routes.json", "utf8"));
describe("route inventory", () => {
  it("has unique method/path combinations", () => {
    const keys = routes.map((r: any) => r.method + " " + r.path.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("every documented handler exists", () => {
    for (const r of routes) {
      const source = fs.readFileSync(
        `src/model/${r.feature}/${r.feature}.operations.js`,
        "utf8",
      );
      expect(source).toContain(r.handler);
    }
  });
});
