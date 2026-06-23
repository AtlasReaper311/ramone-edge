/**
 * POST /ask
 *
 * The full pipeline for a question:
 *   1. parse + validate body
 *   2. verify Turnstile token from X-Atlas-Turnstile header
 *   3. check rate limits (per-IP hourly, global daily)
 *   4. probe tunnel for awake state; if asleep, return 503 sleeping payload
 *   5. proxy the question to the FastAPI /ask/stream endpoint
 *   6. pipe the SSE response back to the client through a teeing
 *      transform that lets us count answer length and source IDs
 *   7. fire a single atlas-notify event on stream completion via waitUntil
 *
 * The response body is Server-Sent Events. Each event is one of:
 *   data: {"type":"token","text":"..."}
 *   data: {"type":"sources","sources":[{"id":"...","preview":"..."}]}
 *   data: {"type":"done"}
 *   data: {"type":"error","reason":"..."}
 */

import { verifyTurnstile } from "./turnstile.js";
import { checkRateLimits, incrementCounters } from "./ratelimit.js";
import { notify, buildAskEvent } from "./notify.js";
import { corsHeaders } from "./cors.js";

export async function handleAsk(request, env, ctx) {
  const startedAt = Date.now();
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  const ipHash = await sha256(ip);

  // --- 1. Parse body ----------------------------------------------------
  let body;
  try {
    body = await request.json();
  } catch {
    return reject(
      request,
      env,
      ctx,
      400,
      "invalid_json",
      ipHash,
      startedAt,
      0,
    );
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const turnstileToken =
    request.headers.get("x-atlas-turnstile") ||
    (typeof body.turnstileToken === "string" ? body.turnstileToken : "");

  const maxChars = parseInt(env.MAX_PROMPT_CHARS, 10) || 2000;
  if (!question) {
    return reject(request, env, ctx, 400, "empty_question", ipHash, startedAt, 0);
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

  // --- 2. Turnstile -----------------------------------------------------
  const turnstile = await verifyTurnstile(turnstileToken, ip, env);
  if (!turnstile.ok) {
    return reject(
      request,
      env,
      ctx,
      403,
      `turnstile:${turnstile.reason}`,
      ipHash,
      startedAt,
      question.length,
    );
  }

  // --- 3. Rate limits ---------------------------------------------------
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

  // --- 4. Wake probe ----------------------------------------------------
  const awake = await probeAwake(env);
  if (!awake) {
    const sleeping = sleepingResponse(request, env);
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
    return sleeping;
  }

  // --- 5. Proxy to tunnel ----------------------------------------------
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

  // --- 6 + 7. Tee, count, fire-and-forget log --------------------------
  const counters = { answerChars: 0, sources: 0 };
  const teed = teeAndCount(upstream.body, counters);

  // Increment rate-limit counters and fire notify after the response
  // closes. Both run in waitUntil so the user gets bytes immediately.
  ctx.waitUntil(
    (async () => {
      await incrementCounters(env, rl.hourKey, rl.dayKey);
      // We can only know totals after the stream fully drains; the
      // teeAndCount transform updates counters in place, and we delay
      // notify until the upstream signals done. A safe upper bound on
      // wait time matches Workers' 30s subrequest CPU window.
      await counters.donePromise;
      await notify(
        env,
        buildAskEvent({
          ipHash,
          promptChars: question.length,
          latencyMs: Date.now() - startedAt,
          status: 200,
          reason: null,
          sources: counters.sources,
          answerChars: counters.answerChars,
        }),
      );
    })(),
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

/**
 * Build a response that rejects the request with a structured JSON
 * payload, and queue a notify call so even bad requests are visible in
 * the Lab page failure log.
 */
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

function sleepingResponse(request, env) {
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

/**
 * Wrap an SSE stream in a TransformStream that:
 *   - passes bytes straight through to the client
 *   - parses each `data: ...` line as JSON so we can count tokens and
 *     source events for the notify payload
 *
 * counters: { answerChars, sources, donePromise }
 * donePromise resolves when the stream ends (or errors).
 */
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
        // Each event is terminated by a blank line.
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
              // Non-JSON SSE payload is fine; we just don't count it.
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
