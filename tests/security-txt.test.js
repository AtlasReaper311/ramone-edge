import { describe, expect, it } from "vitest";
import worker from "../src/index.js";

describe("security.txt", () => {
  it("serves the canonical Atlas Systems security contact", async () => {
    const response = await worker.fetch(
      new Request("https://ramone.atlas-systems.uk/.well-known/security.txt"),
      {},
      { waitUntil() {} },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const body = await response.text();
    expect(body).toContain("Contact: mailto:atlas@atlas-systems.uk");
    expect(body).toContain("Expires: 2027-07-24T23:59:59Z");
    expect(body).toContain("Preferred-Languages: en");
    expect(body).toContain("Canonical: https://ramone.atlas-systems.uk/.well-known/security.txt");
  });
});
