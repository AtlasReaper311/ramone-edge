/**
 * Cached awake/asleep probe.
 *
 * The Lab page and the standalone interface both poll /status to show a
 * live indicator. We cache the result in KV for `WAKE_CHECK_CACHE_SECONDS`
 * so frequent polling doesn't hammer the tunnel; a stale result is
 * acceptable for an awake/asleep dot.
 *
 * The check itself is a GET against the tunnel's /health endpoint with a
 * short timeout. Anything other than HTTP 200 is treated as asleep,
 * including timeouts, connection refused, and DNS failures.
 */

import { corsHeaders } from "./cors.js";

const CACHE_KEY = "ramone:wake_state";

export async function handleStatus(request, env, ctx) {
  const cached = await env.RL.get(CACHE_KEY, "json");
  if (cached && cached.checkedAt > Date.now() - cacheMs(env)) {
    return statusResponse(cached, request, env);
  }

  const fresh = await probe(env);
  ctx.waitUntil(
    env.RL.put(CACHE_KEY, JSON.stringify(fresh), {
      expirationTtl: cacheMs(env) / 1000 + 60,
    }),
  );
  return statusResponse(fresh, request, env);
}

function cacheMs(env) {
  return (parseInt(env.WAKE_CHECK_CACHE_SECONDS, 10) || 30) * 1000;
}

async function probe(env) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`https://${env.TUNNEL_HOST}/health`, {
      method: "GET",
      headers: { "x-atlas-secret": env.UPSTREAM_SECRET || "" },
      signal: controller.signal,
    });
    return {
      awake: res.ok,
      status: res.status,
      checkedAt: Date.now(),
    };
  } catch (err) {
    return {
      awake: false,
      status: 0,
      reason: err && err.name === "AbortError" ? "timeout" : "unreachable",
      checkedAt: Date.now(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function statusResponse(state, request, env) {
  return new Response(
    JSON.stringify({
      awake: !!state.awake,
      checked_at: new Date(state.checkedAt).toISOString(),
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Allow browsers to dedupe rapid polls without bypassing the
        // server-side cache enforcement.
        "cache-control": `public, max-age=${
          parseInt(env.WAKE_CHECK_CACHE_SECONDS, 10) || 30
        }`,
        ...corsHeaders(request, env),
      },
    },
  );
}
