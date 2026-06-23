import { describe, it, expect } from "vitest";
import { buildAskEvent } from "../src/notify.js";

describe("buildAskEvent", () => {
  it("classifies 2xx as info and uses persist-only path", () => {
    const e = buildAskEvent({
      ipHash: "abc123",
      promptChars: 42,
      latencyMs: 1340,
      status: 200,
      reason: null,
      sources: 3,
      answerChars: 512,
    });
    expect(e.level).toBe("info");
    expect(e.title).toBe("ramone: answered");
    expect(e.fields.prompt_chars).toBe(42);
    expect(e.fields.answer_chars).toBe(512);
    expect(e.fields.sources_used).toBe(3);
    expect(e.fields.latency_ms).toBe(1340);
  });

  it("classifies 4xx as warning", () => {
    const e = buildAskEvent({
      ipHash: "abc123",
      promptChars: 0,
      latencyMs: 10,
      status: 429,
      reason: "per_ip_hourly_exceeded",
      sources: 0,
      answerChars: 0,
    });
    expect(e.level).toBe("warning");
    expect(e.title).toBe("ramone: rate limit");
    expect(e.fields.reason).toBe("per_ip_hourly_exceeded");
  });

  it("uses a sleeping title for 503", () => {
    const e = buildAskEvent({
      ipHash: "abc123",
      promptChars: 12,
      latencyMs: 2010,
      status: 503,
      reason: "asleep",
      sources: 0,
      answerChars: 0,
    });
    expect(e.title).toBe("ramone: asleep");
  });

  it("classifies 5xx as failure", () => {
    const e = buildAskEvent({
      ipHash: "abc123",
      promptChars: 100,
      latencyMs: 500,
      status: 502,
      reason: "upstream_status_500",
      sources: 0,
      answerChars: 0,
    });
    expect(e.level).toBe("failure");
    expect(e.title).toBe("ramone: upstream error");
  });

  it("never includes a raw IP in the payload", () => {
    const e = buildAskEvent({
      ipHash: "abc123",
      promptChars: 1,
      latencyMs: 1,
      status: 200,
      reason: null,
      sources: 0,
      answerChars: 1,
    });
    const flat = JSON.stringify(e);
    expect(flat).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
});
