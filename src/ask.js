/**
 * POST /ask
 *
 * Pipeline: parse → rate limit → wake probe → proxy → SSE tee → notify
 * Turnstile removed: KV rate limits + UPSTREAM_SECRET are the protection layer.
 */

import { checkRateLimits, incrementCounters } from "./ratelimit.js";
import { notify, buildAskEvent } from "./notify.js";
import { corsHeaders } from "./cors.js";

export async function handleAsk(request, env, ctx) {
  const startedAt = Date.now();
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  const ipHash = await sha256(ip);

  // --- 1. Parse body --------------------------------------------------
  let body;
  try {
    body = await request.json();
  } catch {
    return reject(request, env, ctx, 400, "invalid_json", ipHash, startedAt, 0);
  }
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  const maxChars = parseInt(env.MAX_PROMPT_CHARS, 10) || 2000;
  if (!question) {
    return reject(
      request,
      env,
      ctx,
      400,
      "empty_question",
      ipHash,
      startedAt,
      0,
    );
  }
  if (question.length > maxChars) {
    return reject(
      request,
      env,
      ctx,
      413,
      "prompt_too_long",
      ipHash,
      startedAt,
      question.length,
    );
  }

  // --- 2. Rate limits -------------------------------------------------
  const rl = await checkRateLimits(ip, env);
  if (!rl.ok) {
    const res = reject(
      request,
      env,
      ctx,
      429,
      rl.reason,
      ipHash,
      startedAt,
      question.length,
    );
    res.headers.set("retry-after", String(rl.retryAfterSeconds));
    return res;
  }

  // --- 3. Wake probe --------------------------------------------------
  const awake = await probeAwake(env);
  if (!awake) {
    ctx.waitUntil(
      notify(
        env,
        buildAskEvent({
          ipHash,
          promptChars: question.length,
          latencyMs: Date.now() - startedAt,
          status: 503,
          reason: "asleep",
          sources: 0,
          answerChars: 0,
        }),
      ),
    );
    return new Response(
      JSON.stringify({
        error: "asleep",
        message:
          "Ramone runs on a single GPU at SPECULAR-CORE; that machine is currently powered down. Try again later or reach me at atlas@atlas-systems.uk.",
      }),
      {
        status: 503,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "retry-after": "300",
          ...corsHeaders(request, env),
        },
      },
    );
  }

  // --- 4. Proxy to tunnel ---------------------------------------------
  let upstream;
  try {
    upstream = await fetch(`https://${env.TUNNEL_HOST}/ask/stream`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-atlas-secret": env.UPSTREAM_SECRET || "",
        "x-request-id": crypto.randomUUID(),
      },
      body: JSON.stringify({ question }),
    });
  } catch (err) {
    console.error("upstream fetch error:", err);
    return reject(
      request,
      env,
      ctx,
      502,
      "upstream_unreachable",
      ipHash,
      startedAt,
      question.length,
    );
  }

  if (!upstream.ok || !upstream.body) {
    return reject(
      request,
      env,
      ctx,
      502,
      `upstream_status_${upstream.status}`,
      ipHash,
      startedAt,
      question.length,
    );
  }

  // --- 5. Tee, count, notify ------------------------------------------
  const counters = { answerChars: 0, sources: 0 };
  const teed = teeAndCount(upstream.body, counters);

  // Increment rate-limit counters immediately — don't wait for stream.
  ctx.waitUntil(incrementCounters(env, rl.hourKey, rl.dayKey));

  // Fire notify immediately with what we know now.
  // We won't have final token/source counts but latency and status are correct.
  ctx.waitUntil(
    notify(
      env,
      buildAskEvent({
        ipHash,
        promptChars: question.length,
        latencyMs: Date.now() - startedAt,
        status: 200,
        reason: null,
        sources: 0,
        answerChars: 0,
      }),
    ),
  );

  return new Response(teed, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      ...corsHeaders(request, env),
    },
  });
}

function reject(
  request,
  env,
  ctx,
  status,
  reason,
  ipHash,
  startedAt,
  promptChars,
) {
  ctx.waitUntil(
    notify(
      env,
      buildAskEvent({
        ipHash,
        promptChars,
        latencyMs: Date.now() - startedAt,
        status,
        reason,
        sources: 0,
        answerChars: 0,
      }),
    ),
  );
  return new Response(JSON.stringify({ error: reason }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
    },
  });
}

async function probeAwake(env) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`https://${env.TUNNEL_HOST}/health`, {
      method: "GET",
      headers: { "x-atlas-secret": env.UPSTREAM_SECRET || "" },
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function teeAndCount(upstream, counters) {
  const decoder = new TextDecoder();
  let buffer = "";
  let resolveDone;
  counters.donePromise = new Promise((r) => {
    resolveDone = r;
  });

  return upstream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        buffer += decoder.decode(chunk, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const line of raw.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const evt = JSON.parse(payload);
              if (evt.type === "token" && typeof evt.text === "string") {
                counters.answerChars += evt.text.length;
              } else if (evt.type === "sources" && Array.isArray(evt.sources)) {
                counters.sources = evt.sources.length;
              }
            } catch {
              /* non-JSON SSE line, skip */
            }
          }
        }
      },
      flush() {
        resolveDone();
      },
    }),
  );
}

async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
