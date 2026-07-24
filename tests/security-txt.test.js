import { describe, expect, it } from "vitest";

import {
  SECURITY_PATH,
  SECURITY_TEXT,
  handleSecurityTxt,
} from "../src/security-txt.js";
import { secureResponse } from "../src/security.js";

const expected = [
  "Contact: mailto:atlas@atlas-systems.uk",
  "Expires: 2027-07-24T23:59:59Z",
  "Preferred-Languages: en",
  "Canonical: https://ramone.atlas-systems.uk/.well-known/security.txt",
];

describe("Ramone security contact metadata", () => {
  it("serves the exact standards route and content", async () => {
    const response = handleSecurityTxt(`https://ramone.atlas-systems.uk${SECURITY_PATH}`);
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect((await response.text()).trim().split("\n")).toEqual(expected);
    expect(SECURITY_TEXT.trim().split("\n")).toEqual(expected);
  });

  it("does not claim unrelated routes", () => {
    expect(handleSecurityTxt("https://ramone.atlas-systems.uk/status")).toBeNull();
  });

  it("receives the normal Worker security response boundary", () => {
    const response = secureResponse(
      handleSecurityTxt(`https://ramone.atlas-systems.uk${SECURITY_PATH}`),
    );
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=63072000; includeSubDomains",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});
