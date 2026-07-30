import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { renderFrontend } from "../src/frontend-phase6.js";

describe("Ramone Phase 6 footer", () => {
  it("uses the Phase 6 wrapper for production and preview entrypoints", () => {
    const production = fs.readFileSync("src/index.js", "utf8");
    const preview = fs.readFileSync("src/interface-preview.js", "utf8");
    expect(production).toMatch(/from "\.\/frontend-phase6\.js"/);
    expect(preview).toMatch(/from "\.\/frontend-phase6\.js"/);
    expect(production).toMatch(/handleAsk/);
    expect(production).toMatch(/handleStatus/);
    expect(preview).toMatch(/text\/event-stream/);
  });

  it("renders one complete product footer", () => {
    const html = renderFrontend({});
    const matches = html.match(/<footer\b[\s\S]*?<\/footer>/g) || [];
    expect(matches).toHaveLength(1);
    const footer = matches[0];
    expect(footer).toMatch(/atlas-footer--product/);
    expect(footer).toMatch(/aria-label="Ramone product footer"/);
    expect(footer).toMatch(/atlas-footer__identity/);
    expect(footer).toMatch(/atlas-footer__context/);
    expect(footer).toMatch(/atlas-footer__evidence/);
    expect(footer).toMatch(/atlas-footer__escape/);
    expect(footer).toMatch(/Grounded local AI on owner-operated infrastructure/);
    expect(footer).toMatch(/Atlas Systems home/);
    expect(footer).not.toMatch(/atlas-footer__sequence/);
    expect(footer).not.toMatch(/built and maintained by/);
  });

  it("preserves the inference interface anchors", () => {
    const html = renderFrontend({});
    for (const id of [
      "machine-state",
      "machine-availability",
      "log",
      "input",
      "send",
      "reset-session",
      "composer",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toMatch(/fetch\("\/status"/);
    expect(html).toMatch(/fetch\("\/ask"/);
  });

  it("keeps a compact two-band desktop rail and the v0.4.0 responsive footer behaviour", () => {
    const html = renderFrontend({});
    expect(html).toMatch(/grid-template-areas:\s*"identity escape"\s*"context evidence"/);
    expect(html).toMatch(/margin-top: var\(--atlas-space-7\)/);
    expect(html).toMatch(/padding: var\(--atlas-space-5\) 0/);
    expect(html).toMatch(/min-width: var\(--atlas-touch-min\)/);
    expect(html).toMatch(/min-height: var\(--atlas-touch-min\)/);
    expect(html).toMatch(/safe-area-inset-bottom/);
    expect(html).toMatch(/@media \(max-width: 767px\)/);
  });

  it("requires explicit approval for preview provider writes", () => {
    const workflow = fs.readFileSync(".github/workflows/interface-preview.yml", "utf8");
    expect(workflow).toMatch(/types: \[opened, synchronize, reopened, labeled\]/);
    expect(workflow).toMatch(/src\/frontend-phase6\.js/);
    expect(workflow).toMatch(
      /contains\(github\.event\.pull_request\.labels\.\*\.name, 'interface-preview-approved'\)/,
    );
  });
});
