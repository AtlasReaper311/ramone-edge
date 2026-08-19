import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runner = readFileSync("scripts/capture-comparable-interface-evidence.mjs", "utf8");
const workflow = readFileSync(".github/workflows/interface-preview.yml", "utf8");

describe("comparable Ramone evidence", () => {
  it("uses the shared evidence schema", () => {
    expect(runner).toContain("atlas-public-interface/evidence/v1");
    expect(runner).toContain("reporting-only");
    expect(runner).toContain("wcag22aa");
    expect(runner).toContain("1920");
  });

  it("records comparable diagnostics", () => {
    for (const token of ["pageerror", "console", "requestfailed", "response", "resource", "focus_visible"]) {
      expect(runner, `missing ${token}`).toContain(token);
    }
  });

  it("publishes exact-head evidence", () => {
    expect(workflow).toContain("PRODUCT_ID: ramone-edge");
    expect(workflow).toContain("capture-comparable-interface-evidence.mjs");
    expect(workflow).toContain("comparable-evidence.json");
    expect(workflow).toContain("ramone-interface-evidence-${{ github.event.pull_request.head.sha }}");
  });
});
