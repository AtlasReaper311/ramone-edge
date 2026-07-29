import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { renderFrontend } from "../src/frontend-phase6.js";

test("Ramone production and preview entrypoints use the Phase 6 wrapper", () => {
  const production = fs.readFileSync("src/index.js", "utf8");
  const preview = fs.readFileSync("src/interface-preview.js", "utf8");
  assert.match(production, /from "\.\/frontend-phase6\.js"/);
  assert.match(preview, /from "\.\/frontend-phase6\.js"/);
  assert.match(production, /handleAsk/);
  assert.match(production, /handleStatus/);
  assert.match(preview, /text\/event-stream/);
});

test("Ramone renders one complete product footer", () => {
  const html = renderFrontend({});
  const matches = html.match(/<footer\b[\s\S]*?<\/footer>/g) || [];
  assert.equal(matches.length, 1);
  const footer = matches[0];
  assert.match(footer, /atlas-footer--product/);
  assert.match(footer, /aria-label="Ramone product footer"/);
  assert.match(footer, /atlas-footer__identity/);
  assert.match(footer, /atlas-footer__context/);
  assert.match(footer, /atlas-footer__evidence/);
  assert.match(footer, /atlas-footer__escape/);
  assert.match(footer, /Grounded local AI on owner-operated infrastructure/);
  assert.match(footer, /Atlas Systems home/);
  assert.doesNotMatch(footer, /atlas-footer__sequence/);
  assert.doesNotMatch(footer, /built and maintained by/);
});

test("footer adoption preserves the inference interface anchors", () => {
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
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.match(html, /fetch\("\/status"/);
  assert.match(html, /fetch\("\/ask"/);
});

test("footer presentation keeps v0.4.0 responsive behaviour", () => {
  const html = renderFrontend({});
  assert.match(html, /grid-template-areas:/);
  assert.match(html, /min-height: var\(--atlas-touch-min\)/);
  assert.match(html, /safe-area-inset-bottom/);
  assert.match(html, /@media \(max-width: 767px\)/);
});

test("Ramone preview provider writes require explicit approval", () => {
  const workflow = fs.readFileSync(".github/workflows/interface-preview.yml", "utf8");
  assert.match(workflow, /types: \[opened, synchronize, reopened, labeled\]/);
  assert.match(workflow, /src\/frontend-phase6\.js/);
  assert.match(
    workflow,
    /contains\(github\.event\.pull_request\.labels\.\*\.name, 'interface-preview-approved'\)/,
  );
});
