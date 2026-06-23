import { describe, it, expect } from "vitest";
import { corsHeaders, handlePreflight } from "../src/cors.js";

const env = {
  ALLOWED_ORIGINS: "https://atlas-systems.uk,https://ramone.atlas-systems.uk",
};

function req(origin) {
  return new Request("https://ramone.atlas-systems.uk/ask", {
    method: "POST",
    headers: origin ? { origin } : {},
  });
}

describe("corsHeaders", () => {
  it("echoes back an allowed origin", () => {
    const h = corsHeaders(req("https://atlas-systems.uk"), env);
    expect(h["access-control-allow-origin"]).toBe("https://atlas-systems.uk");
  });

  it("does not echo an unknown origin", () => {
    const h = corsHeaders(req("https://evil.example.com"), env);
    expect(h["access-control-allow-origin"]).toBeUndefined();
  });

  it("omits the header for missing origin (server-to-server)", () => {
    const h = corsHeaders(req(null), env);
    expect(h["access-control-allow-origin"]).toBeUndefined();
  });

  it("always sets vary: Origin so caches don't poison", () => {
    const h = corsHeaders(req("https://atlas-systems.uk"), env);
    expect(h.vary).toBe("Origin");
  });
});

describe("handlePreflight", () => {
  it("returns 204 for an allowed origin", async () => {
    const res = handlePreflight(req("https://atlas-systems.uk"), env);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://atlas-systems.uk",
    );
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("returns 403 for an unknown origin", async () => {
    const res = handlePreflight(req("https://evil.example.com"), env);
    expect(res.status).toBe(403);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
