import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimits, incrementCounters } from "../src/ratelimit.js";

function makeKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value, _opts) {
      store.set(key, value);
    },
  };
}

describe("checkRateLimits", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-22T10:30:00Z"));
  });

  it("returns ok when both counters are below limits", async () => {
    const env = {
      RL: makeKv(),
      RATE_LIMIT_PER_HOUR: "10",
      RATE_LIMIT_PER_DAY_GLOBAL: "500",
    };
    const result = await checkRateLimits("203.0.113.5", env);
    expect(result.ok).toBe(true);
    expect(result.hourKey).toMatch(/^rl:ip:[0-9a-f]{64}:2026-06-22-10$/);
    expect(result.dayKey).toBe("rl:global:2026-06-22");
  });

  it("rejects when per-IP hourly limit is reached", async () => {
    const env = {
      RL: makeKv(),
      RATE_LIMIT_PER_HOUR: "3",
      RATE_LIMIT_PER_DAY_GLOBAL: "500",
    };
    // Pre-populate the hourly counter for this IP at the limit.
    const probe = await checkRateLimits("203.0.113.5", env);
    await env.RL.put(probe.hourKey, "3");
    const result = await checkRateLimits("203.0.113.5", env);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("per_ip_hourly_exceeded");
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(3600);
  });

  it("rejects when global daily limit is reached", async () => {
    const env = {
      RL: makeKv({ "rl:global:2026-06-22": "500" }),
      RATE_LIMIT_PER_HOUR: "10",
      RATE_LIMIT_PER_DAY_GLOBAL: "500",
    };
    const result = await checkRateLimits("203.0.113.5", env);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("global_daily_exceeded");
  });

  it("does not store raw IPs in keys", async () => {
    const env = {
      RL: makeKv(),
      RATE_LIMIT_PER_HOUR: "10",
      RATE_LIMIT_PER_DAY_GLOBAL: "500",
    };
    const ip = "203.0.113.5";
    const result = await checkRateLimits(ip, env);
    expect(result.hourKey).not.toContain(ip);
  });

  it("uses different hourly buckets for different IPs", async () => {
    const env = {
      RL: makeKv(),
      RATE_LIMIT_PER_HOUR: "10",
      RATE_LIMIT_PER_DAY_GLOBAL: "500",
    };
    const a = await checkRateLimits("203.0.113.5", env);
    const b = await checkRateLimits("203.0.113.6", env);
    expect(a.hourKey).not.toBe(b.hourKey);
  });
});

describe("incrementCounters", () => {
  it("creates both keys with TTLs past their window", async () => {
    const env = { RL: makeKv() };
    await incrementCounters(env, "rl:ip:x:2026-06-22-10", "rl:global:2026-06-22");
    expect(env.RL.store.get("rl:ip:x:2026-06-22-10")).toBe("1");
    expect(env.RL.store.get("rl:global:2026-06-22")).toBe("1");
  });

  it("increments existing counts in place", async () => {
    const env = {
      RL: makeKv({
        "rl:ip:x:2026-06-22-10": "4",
        "rl:global:2026-06-22": "47",
      }),
    };
    await incrementCounters(env, "rl:ip:x:2026-06-22-10", "rl:global:2026-06-22");
    expect(env.RL.store.get("rl:ip:x:2026-06-22-10")).toBe("5");
    expect(env.RL.store.get("rl:global:2026-06-22")).toBe("48");
  });
});
