import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { renderFrontend } from "../src/frontend-phase6.js";
import { renderNotFoundFrontend } from "../src/not-found.js";

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

  it("renders one complete and bounded product footer", () => {
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
    expect(footer.match(/<a\b/g) || []).toHaveLength(4);
    expect(footer).not.toMatch(/Atlas Systems Lab/);
    expect(footer).not.toMatch(/Estate status/);
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

  it("keeps a single underlined rail and the v0.4.0 responsive footer behaviour", () => {
    const html = renderFrontend({});
    expect(html).toMatch(/\.ramone-product-footer\s*\{[\s\S]*display: flex;/);
    expect(html).toMatch(/flex-wrap: wrap/);
    expect(html).toMatch(/margin-top: var\(--atlas-space-7\)/);
    expect(html).toMatch(/padding: var\(--atlas-space-4\) 0/);
    expect(html).toMatch(/text-decoration: underline/);
    expect(html).not.toMatch(/a:hover \{ color: var\(--atlas-text\); text-decoration: none;/);
    expect(html).toMatch(/min-width: var\(--atlas-touch-min\)/);
    expect(html).toMatch(/min-height: var\(--atlas-touch-min\)/);
    expect(html).toMatch(/safe-area-inset-bottom/);
    expect(html).toMatch(/@media \(max-width: 767px\)/);
    expect(html).toMatch(/\.ramone-product-footer \.atlas-footer__identity \{[\s\S]*?flex: 0 0 auto;/);
    expect(html).toMatch(
      /\.ramone-product-footer \.atlas-footer__context,[\s\S]*?\.ramone-product-footer \.atlas-footer__escape \{[\s\S]*?flex: 0 0 auto;/,
    );
  });

  it("keeps the route-unavailable footer compact on mobile", () => {
    const html = renderNotFoundFrontend();
    expect(html).toMatch(/class="atlas-footer atlas-footer--product error-footer"/);
    expect(html).toMatch(/@media\(max-width:767px\)/);
    expect(html).toMatch(
      /\.error-footer \.atlas-footer__identity,[\s\S]*?\.error-footer \.atlas-footer__escape\{width:100%;flex:0 0 auto;/,
    );
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
