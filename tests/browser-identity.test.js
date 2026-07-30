import { describe, expect, it, vi } from "vitest";

import worker from "../src/index.js";

const env = { ALLOWED_ORIGINS: "https://atlas-systems.uk" };
const ctx = { waitUntil: vi.fn() };

describe("Ramone browser identity", () => {
  it("serves complete product metadata at the root", async () => {
    const response = await worker.fetch(
      new Request("https://ramone.atlas-systems.uk/", {
        headers: { accept: "text/html" },
      }),
      env,
      ctx,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("<title>Ramone // Atlas Systems</title>");
    expect(html).toContain('<link rel="canonical" href="https://ramone.atlas-systems.uk/"');
    expect(html).toContain('property="og:url" content="https://ramone.atlas-systems.uk/"');
    expect(html).toContain('property="og:image" content="https://atlas-systems.uk/og/ramone.png"');
    expect(html).toContain('name="twitter:image:alt" content="Ramone. Local AI, self-hosted. // Atlas Systems"');
    expect(html).toContain('<link rel="manifest" href="/site.webmanifest"');
  });

  it("serves a noindex HTML 404 with bounded live aggregate status", async () => {
    const response = await worker.fetch(
      new Request("https://ramone.atlas-systems.uk/not-a-route", {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "sec-fetch-mode": "navigate",
        },
      }),
      env,
      ctx,
    );
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(html).toContain("<title>404 // Ramone // Atlas Systems</title>");
    expect(html).toContain('<meta name="robots" content="noindex, follow">');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('property="og:');
    expect(html).not.toContain('name="twitter:');
    expect(html).not.toContain("/ask");
    expect(html).not.toContain("turnstile");
    expect(html).toContain('data-atlas-status data-state="checking"');
    expect(html).toContain('data-atlas-status-label>Checking</span>');
    expect(html).toContain("https://api.atlas-systems.uk/v1/stats");
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html).toContain('<a href="/">Open Ramone</a>');
    expect(html).toContain('<link rel="manifest" href="/site.webmanifest">');
  });

  it("preserves the bounded JSON 404 for API-style requests", async () => {
    const response = await worker.fetch(
      new Request("https://ramone.atlas-systems.uk/not-a-route", {
        headers: { accept: "application/json" },
      }),
      env,
      ctx,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ error: "not_found" });
  });

  it("does not convert unknown non-GET routes into browser HTML", async () => {
    const response = await worker.fetch(
      new Request("https://ramone.atlas-systems.uk/not-a-route", {
        method: "POST",
        headers: { accept: "text/html" },
      }),
      env,
      ctx,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
