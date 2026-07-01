import { describe, it, expect } from "vitest";
import { isValidSessionId } from "../src/ask.js";

describe("isValidSessionId", () => {
  it("accepts a well-formed UUID v4", () => {
    expect(isValidSessionId("110e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts uppercase UUID v4", () => {
    expect(isValidSessionId("110E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(isValidSessionId("not-a-session-id")).toBe(false);
  });

  it("rejects a UUID v1 shape", () => {
    expect(isValidSessionId("110e8400-e29b-11d4-a716-446655440000")).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isValidSessionId(null)).toBe(false);
    expect(isValidSessionId(undefined)).toBe(false);
  });

  it("rejects a number", () => {
    expect(isValidSessionId(12345)).toBe(false);
  });

  it("rejects a string with trailing garbage", () => {
    expect(isValidSessionId("110e8400-e29b-41d4-a716-446655440000; DROP TABLE")).toBe(false);
  });
});
