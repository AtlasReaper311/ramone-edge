import { describe, expect, it } from "vitest";

import { secureResponse } from "../src/security.js";

const EXPECTED = {
  "permissions-policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "referrer-policy": "no-referrer",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

describe("security response boundary", () => {
  it("preserves streaming and CORS headers on machine responses", async () => {
    const response = secureResponse(
      new Response("data: fixture\n\n", {
        headers: {
          "access-control-allow-origin": "https://atlas-systems.uk",
          "content-type": "text/event-stream; charset=utf-8",
        },
      }),
    );

    expect(await response.text()).toBe("data: fixture\n\n");
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://atlas-systems.uk",
    );
    for (const [name, value] of Object.entries(EXPECTED)) {
      expect(response.headers.get(name)).toBe(value);
    }
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
  });

  it("permits only the interface resources Ramone actually uses", () => {
    const response = secureResponse(
      new Response("<!doctype html>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
    const policy = response.headers.get("content-security-policy");

    expect(policy).toContain("connect-src 'self' https://api.atlas-systems.uk");
    expect(policy).toContain("script-src 'unsafe-inline'");
    expect(policy).toContain("style-src 'unsafe-inline'");
    expect(policy).toContain("font-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("fonts.googleapis.com");
    expect(policy).not.toContain("fonts.gstatic.com");
  });
});
