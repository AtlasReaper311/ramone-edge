import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { renderFrontend } from "../src/frontend.js";
import { handleBrowserIcon } from "../src/browser-icons.js";
import { BROWSER_ICONS } from "../src/browser-icons.generated.js";

const rendered = renderFrontend({});
const core = fs.readFileSync("src/frontend-core.js", "utf8");
const indexSource = fs.readFileSync("src/index.js", "utf8");
const wrangler = fs.readFileSync("wrangler.toml", "utf8");

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

  it("adds global navigation, search, local icons, and complete metadata", () => {
    for (const route of ["/work/", "/writing/", "/lab/", "/about/"]) {
      expect(rendered).toContain(`https://atlas-systems.uk${route}`);
    }
    expect(rendered).toContain("data-estate-search-open");
    expect(rendered).toContain('<link rel="canonical" href="https://ramone.atlas-systems.uk/"');
    expect(rendered).toContain('<link rel="icon" href="/favicon.ico"');
    expect(rendered).toContain('property="og:image:alt"');
    expect(rendered).toContain('name="twitter:card"');
  });

  it("removes token streaming from the live region and announces completion once", () => {
    expect(rendered).toContain('<div class="log" id="log"></div>');
    expect(rendered).not.toContain('<div class="log" id="log" aria-live="polite"></div>');
    expect(rendered).toContain('id="response-announcer" role="status" aria-live="polite"');
    expect(rendered).toContain('region.textContent = "Ramone response complete."');
    expect(rendered).toContain('region.textContent = "Ramone response ended with an error."');
  });

  it("preserves the Ramone product strip and machine state semantics", () => {
    expect(rendered).toContain('<strong>ramone</strong>');
    expect(rendered).toContain('id="machine-state" aria-live="polite"');
    expect(rendered).toContain('id="state-text">connecting</span>');
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
