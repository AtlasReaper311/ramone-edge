/**
 * POST /ask
 *
 * Pipeline: parse → rate limit → wake probe (KV-cached) → proxy → SSE tee → notify
 * Turnstile removed: KV rate limits + UPSTREAM_SECRET are the protection layer.
 *
 * Fixes applied:
 *   1. Notify fires after stream completes so real answerChars/sources are reported.
 *   2. probeAwake reads the KV cache written by status.js before doing a live probe.
 *   3. Dead Turnstile import removed.
 *
 * Conversation memory:
 *   A client-generated session_id, if present and well-formed, is
 *   forwarded to the upstream /ask/stream call unchanged. This Worker
 *   never reads or writes memory itself.
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

  const sessionId = isValidSessionId(body.session_id) ? body.session_id : null;

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

  // --- 3. Wake probe (reads KV cache written by /status) --------------
  const awake = await probeAwake(env);
  if (!awake) {
    ctx.waitUntil(
      notify(
        env,
        buildAskEvent({
          ipHash,
          promptChars: question.length,
          promptText: question,
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
      body: JSON.stringify({ question, session_id: sessionId }),
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

  // --- 5. Tee, count, notify after stream completes ------------------
  const counters = { answerChars: 0, sources: 0 };
  const teed = teeAndCount(upstream.body, counters);

  // Rate-limit counters: increment immediately, don't block the response.
  ctx.waitUntil(incrementCounters(env, rl.hourKey, rl.dayKey));

  // Notify: defer until donePromise resolves so we report real counts.
  // The service binding (env.ATLAS_NOTIFY) means this is a direct
  // Worker-to-Worker call — no public internet round trip, no 522 risk.
  ctx.waitUntil(
    counters.donePromise.then(() =>
      notify(
        env,
        buildAskEvent({
          ipHash,
          promptChars: question.length,
          promptText: question,
          latencyMs: Date.now() - startedAt,
          status: 200,
          reason: null,
          sources: counters.sources,
          answerChars: counters.answerChars,
        }),
      ),
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

/**
 * UUID v4 check, mirrored from the Python-side validator in
 * ollama-rag-kit's app/memory.py. The Worker only decides whether a
 * client-supplied session_id is well-formed enough to forward.
 */
export function isValidSessionId(raw) {
  return (
    typeof raw === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw,
    )
  );
}

/**
 * Check the KV cache written by status.js before doing a live tunnel probe.
 * This avoids a 2s round trip on every /ask when /status was hit recently.
 */
async function probeAwake(env) {
  // Read the cache that status.js maintains under the same key.
  const cached = await env.RL.get("ramone:wake_state", "json");
  const cacheMs = (parseInt(env.WAKE_CHECK_CACHE_SECONDS, 10) || 30) * 1000;
  if (cached && cached.checkedAt > Date.now() - cacheMs) {
    return !!cached.awake;
  }

  // Cache miss — do a live probe and write the result back so the
  // next request (and /status) can reuse it.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`https://${env.TUNNEL_HOST}/health`, {
      method: "GET",
      headers: { "x-atlas-secret": env.UPSTREAM_SECRET || "" },
      signal: controller.signal,
    });
    const fresh = { awake: res.ok, checkedAt: Date.now() };
    // Best-effort write — don't block on it.
    env.RL.put("ramone:wake_state", JSON.stringify(fresh), {
      expirationTtl: 90,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Wrap the SSE stream in a TransformStream that:
 *   - passes bytes through to the client unchanged
 *   - counts token chars and source events in-place
 *   - resolves counters.donePromise on flush so the deferred notify
 *     fires with accurate counts
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
