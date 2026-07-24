import crypto from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { renderFrontend } from "../src/frontend.js";
import { handleBrowserIcon } from "../src/browser-icons.js";
import { BROWSER_ICONS } from "../src/browser-icons.generated.js";
import previewWorker from "../src/interface-preview.js";
import {
  RAMONE_INTERFACE_CSS,
  RAMONE_INTERFACE_SHA256,
  RAMONE_INTERFACE_VERSION,
} from "../src/interface-bundle.generated.js";

const rendered = renderFrontend({});
const core = fs.readFileSync("src/frontend-core.js", "utf8");
const indexSource = fs.readFileSync("src/index.js", "utf8");
const wrangler = fs.readFileSync("wrangler.toml", "utf8");
const previewWrangler = fs.readFileSync("wrangler.interface-preview.toml", "utf8");
const previewWorkflow = fs.readFileSync(".github/workflows/interface-preview.yml", "utf8");
const bundleRoot = "assets/interface/v0.1.1";

function sha256(path) {
  return crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
}

describe("Ramone estate shell", () => {
  it("keeps the original operational renderer as the core authority", () => {
    expect(core).toContain('fetch("/status"');
    expect(core).toContain('fetch("/ask"');
    expect(core).toContain('var MAX = 2000');
    expect(core).toContain('ramone:session_id');
    expect(core).toContain('evt.type === "token"');
    expect(core).toContain('evt.type === "sources"');
    expect(core).toContain('setInterval(pollStatus, 30000)');
  });

  it("materializes the accepted V2 shell, search, local icons, and metadata", () => {
    for (const route of ["/work/", "/writing/", "/lab/", "/systems/", "/about/"]) {
      expect(rendered).toContain(`https://atlas-systems.uk${route}`);
    }
    expect(rendered).toContain('class="atlas-global-header ramone-global-header"');
    expect(rendered).toContain('class="atlas-bottom-nav ramone-bottom-nav"');
    expect(rendered).toContain('class="topbar atlas-product-strip ramone-product-strip"');
    expect(rendered).toContain("data-estate-search-open");
    expect(rendered).toContain('data-state="checking"');
    expect(rendered).toContain(">Checking</span>");
    expect(rendered).toContain('<link rel="canonical" href="https://ramone.atlas-systems.uk/"');
    expect(rendered).toContain('<link rel="icon" href="/favicon.ico"');
    expect(rendered).toContain('property="og:image:alt"');
    expect(rendered).toContain('name="twitter:card"');
    expect(rendered).toContain(`name="atlas-interface-version" content="${RAMONE_INTERFACE_VERSION}"`);
    expect(rendered).toContain(`name="atlas-interface-sha256" content="${RAMONE_INTERFACE_SHA256}"`);
  });

  it("keeps the accepted route order in desktop and mobile navigation", () => {
    const expected = ["Work", "Writing", "Lab", "Systems", "About"];
    const desktop = rendered.match(/<nav class="atlas-global-header__nav"[\s\S]*?<\/nav>/)?.[0];
    const mobile = rendered.match(/<nav class="atlas-bottom-nav ramone-bottom-nav"[\s\S]*?<\/nav>/)?.[0];
    expect(desktop).toBeTruthy();
    expect(mobile).toBeTruthy();
    for (const source of [desktop, mobile]) {
      let previous = -1;
      for (const route of expected) {
        const position = source.indexOf(`>${route}</a>`);
        expect(position).toBeGreaterThan(previous);
        previous = position;
      }
    }
    expect(desktop).toContain('href="https://atlas-systems.uk/lab/" aria-current="page"');
    expect(mobile).toContain('href="https://atlas-systems.uk/lab/" aria-current="page"');
  });

  it("uses one main landmark and one principal heading", () => {
    expect(rendered.match(/<main>/g)).toHaveLength(1);
    expect(rendered.match(/<\/main>/g)).toHaveLength(1);
    expect(rendered.match(/<h1\b/g)).toHaveLength(1);
    expect(rendered).toContain('<h1 id="ramone-title">Hi, I\'m <em>Ramone.</em></h1>');
    expect(rendered).toContain('<p class="ramone-command">Ask my infrastructure.</p>');
  });

  it("removes token streaming from the live region and announces completion once", () => {
    expect(rendered).toContain('<div class="log" id="log"></div>');
    expect(rendered).not.toContain('<div class="log" id="log" aria-live="polite"></div>');
    expect(rendered).toContain('id="response-announcer" role="status" aria-live="polite"');
    expect(rendered).toContain('region.textContent = "Ramone response complete."');
    expect(rendered).toContain('region.textContent = "Ramone response ended with an error."');
  });

  it("preserves the Ramone product strip and separates machine availability", () => {
    expect(rendered).toContain('class="ramone-product-name">Ramone</strong>');
    expect(rendered).toContain('class="atlas-badge atlas-badge--maturity">Production</span>');
    expect(rendered).toContain('id="machine-state" aria-live="polite"');
    expect(rendered).toContain('id="state-text">connecting</span>');
    expect(rendered).toContain("SPECULAR-CORE is currently offline.");
    expect(rendered).toContain('document.body.classList.toggle("ramone-offline", !awake)');
    expect(rendered).toContain('awake ? "SPECULAR-CORE online" : "SPECULAR-CORE offline"');
    expect(rendered).toContain('state: "operational"');
    expect(rendered).toContain('operational: "Operational"');
    expect(rendered).not.toContain('state: "nominal"');
  });

  it("keeps visitor copy public-safe while explaining the knowledge boundary", () => {
    expect(rendered).toContain("I answer questions about the public Atlas Systems estate");
    expect(rendered).toContain("Grounded in what Atlas publishes.");
    expect(rendered).toContain("I can use");
    expect(rendered).toContain("I cannot see");
    for (const privateDetail of [
      "RTX 5070",
      "llama3.1:8b",
      "Cloudflare Tunnel",
      "ramone-tunnel.atlas-systems.uk",
      "UPSTREAM_SECRET",
      "X-Atlas-Secret",
    ]) {
      expect(rendered).not.toContain(privateDetail);
    }
  });

  it("adds the approved product interactions without changing session ownership", () => {
    expect(rendered).toContain('class="ramone-knowledge-flow" aria-hidden="true"');
    expect(rendered).toContain("prefers-reduced-motion: reduce");
    expect(rendered).toContain(".flow-packets { display: none; }");
    expect(rendered).toContain('starterPrompts.classList.add("is-receding")');
    expect(rendered).toContain('document.createElement("details")');
    expect(rendered).toContain('card.className = "source-card"');
    expect(rendered).toContain('var KEY = "ramone:session_id"');
    expect(rendered).toContain('window.localStorage.removeItem("ramone:session_id")');
  });

  it("keeps Atlas-owned links same-tab and external links safe", () => {
    expect(rendered).toContain('var OWNED = new Set([');
    expect(rendered).toContain('anchor.removeAttribute("target")');
    expect(rendered).toContain('anchor.rel = "noopener noreferrer"');
  });

  it("keeps the machine API routes and meanings unchanged", () => {
    expect(indexSource).toContain('url.pathname === "/"');
    expect(indexSource).toContain('url.pathname === "/status"');
    expect(indexSource).toContain('url.pathname === "/ask"');
    expect(indexSource).toContain('return handleAsk(request, env, ctx)');
    expect(indexSource).toContain('return handleStatus(request, env, ctx)');
    expect(indexSource).toContain('const meta = handleMeta(url, META)');
  });

  it("enables version preview URLs without defining a production preview route", () => {
    expect(wrangler).toMatch(/^preview_urls = true$/m);
    expect(wrangler).not.toContain("interface-pr-");
  });

  it("keeps the review preview isolated and demonstrates the full evidence UX", async () => {
    expect(previewWrangler).toMatch(/^workers_dev = true$/m);
    expect(previewWrangler).toMatch(/^preview_urls = false$/m);
    expect(previewWrangler).not.toMatch(/^(route|routes|\[\[routes\]\]|\[triggers\]|\[\[services\]\]|\[\[kv_namespaces\]\])/m);

    const status = await previewWorker.fetch(new Request("https://preview.invalid/status"));
    expect(status.status).toBe(200);
    expect(await status.json()).toMatchObject({ awake: false, preview: true });

    const ask = await previewWorker.fetch(new Request("https://preview.invalid/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "preview" }),
    }));
    expect(ask.status).toBe(200);
    expect(ask.headers.get("content-type")).toContain("text/event-stream");
    const stream = await ask.text();
    expect(stream).toContain('"type":"token"');
    expect(stream).toContain('"type":"sources"');
    expect(stream).toContain("deterministic preview response");
    expect(stream).not.toContain("UPSTREAM_SECRET");
  });

  it("governs previews by exact SHA and captures the accepted browser matrix", () => {
    expect(previewWorkflow).toContain("ref: ${{ github.event.pull_request.head.sha }}");
    expect(previewWorkflow).not.toContain("feat/estate-shell-v1");
    expect(previewWorkflow).toContain("permissions:\n  contents: read");
    expect(previewWorkflow).toContain("pull-requests: write");
    expect(previewWorkflow).toContain("scripts/capture-interface-evidence.mjs");
    expect(previewWorkflow).toContain("playwright@1.61.1");
    expect(previewWorkflow).toContain("@axe-core/playwright@4.12.1");
    expect(previewWorkflow).toContain("retention-days: 14");
    const evidenceRunner = fs.readFileSync("scripts/capture-interface-evidence.mjs", "utf8");
    for (const width of [320, 375, 768, 1024, 1440]) {
      expect(evidenceRunner).toContain(`"${width}"`);
    }
    expect(evidenceRunner).toContain('["chrome"');
    expect(evidenceRunner).toContain('["firefox"');
    expect(evidenceRunner).toContain("details.source-card[open]");
    expect(evidenceRunner).toContain("target.width < 44 || target.height < 44");
  });

  it("embeds the pinned, fingerprinted Interface Kit without a runtime dependency", () => {
    const manifest = JSON.parse(
      fs.readFileSync(`${bundleRoot}/manifest.json`, "utf8"),
    );
    expect(RAMONE_INTERFACE_VERSION).toBe("0.1.1");
    expect(manifest.contract_version).toBe("2.0.0");
    expect(Object.keys(manifest.files).sort()).toEqual([
      "atlas-interface-kit.css",
      "components.json",
      "tokens.json",
    ]);
    for (const [name, record] of Object.entries(manifest.files)) {
      expect(fs.statSync(`${bundleRoot}/${name}`).size).toBe(record.bytes);
      expect(sha256(`${bundleRoot}/${name}`)).toBe(record.sha256);
    }
    expect(RAMONE_INTERFACE_SHA256).toBe(
      manifest.files["atlas-interface-kit.css"].sha256,
    );
    expect(RAMONE_INTERFACE_CSS).toContain("Atlas Interface Kit v0.1.1");
    expect(RAMONE_INTERFACE_CSS).toContain(".atlas-global-header");
    expect(RAMONE_INTERFACE_CSS).toContain(".atlas-bottom-nav");
    expect(RAMONE_INTERFACE_CSS).not.toMatch(/https?:\/\//);
  });

  it("serves only generated local browser icons", async () => {
    expect(handleBrowserIcon("/not-an-icon")).toBeNull();
    const routes = Object.keys(BROWSER_ICONS);
    if (routes.length === 0) return;
    expect(routes).toEqual([
      "/favicon.ico",
      "/favicon-16x16.png",
      "/favicon-32x32.png",
      "/apple-touch-icon.png",
      "/android-chrome-192x192.png",
      "/android-chrome-512x512.png",
      "/site.webmanifest",
    ]);
    for (const route of routes) {
      const response = handleBrowserIcon(route);
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
    }
  });
});
