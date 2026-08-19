import { afterEach, describe, expect, it, vi } from "vitest";

import { handleFailureCapture, normalizePayload } from "../src/failure-capture.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function ctx() {
  const pending = [];
  return {
    value: {
      waitUntil: (promise) => pending.push(promise),
    },
    wait: () => Promise.all(pending),
  };
}

describe("failure capture gateway", () => {
  it("normalizes the user-clicked payload without session or IP fields", () => {
    const normalized = normalizePayload({
      question: "What is Ramone?",
      answer: "Ramone is local.",
      reason: "Missing citation",
      session_id: "110e8400-e29b-41d4-a716-446655440000",
      ip: "127.0.0.1",
      sources: [{ id: "doc.md#0", preview: "Public preview" }],
    });

    expect(normalized.ok).toBe(true);
    expect(normalized.value).toEqual({
      question: "What is Ramone?",
      answer: "Ramone is local.",
      reason: "Missing citation",
      sources: [{ id: "doc.md#0", preview: "Public preview" }],
    });
    expect(JSON.stringify(normalized.value)).not.toContain("110e8400");
    expect(JSON.stringify(normalized.value)).not.toContain("127.0.0.1");
  });

  it("forwards only approved fields to the protected local endpoint", async () => {
    let captured;
    globalThis.fetch = vi.fn(async (url, init) => {
      captured = { url, init, body: JSON.parse(init.body) };
      return new Response(
        JSON.stringify({
          stored: true,
          case_id: "pending-ramone-rag-generation-test",
          filename: "pending-ramone-rag-generation-test.toml",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const holder = ctx();
    const request = new Request("https://ramone.atlas-systems.uk/feedback/failure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: "What is Ramone?",
        answer: "Ramone is local.",
        reason: "Missing citation",
        sources: [{ id: "doc.md#0", preview: "Public preview" }],
        session_id: "110e8400-e29b-41d4-a716-446655440000",
      }),
    });

    const response = await handleFailureCapture(
      request,
      {
        TUNNEL_HOST: "ramone-tunnel.example",
        UPSTREAM_SECRET: "test-secret",
      },
      holder.value,
    );
    await holder.wait();

    expect(response.status).toBe(202);
    expect(captured.url).toBe("https://ramone-tunnel.example/feedback/failure");
    expect(captured.init.headers["x-atlas-secret"]).toBe("test-secret");
    expect(captured.body).toEqual({
      question: "What is Ramone?",
      answer: "Ramone is local.",
      reason: "Missing citation",
      sources: [{ id: "doc.md#0", preview: "Public preview" }],
    });
  });
});
