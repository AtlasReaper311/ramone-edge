/**
 * ramone-edge
 *
 * Public Worker that fronts the Ramone local AI inference stack running on
 * SPECULAR-CORE through a Cloudflare Tunnel. The Worker is the only
 * publicly addressable component; it serves the standalone interface on
 * GET requests, validates Turnstile, enforces rate limits, proxies
 * question/answer traffic into the tunnel, and reports every interaction
 * to atlas-notify.
 *
 * Routes:
 *   GET  /             standalone HTML interface
 *   GET  /status       cached awake/asleep probe for live indicators
 *   POST /ask          proxied Q&A, streams SSE back to the client
 *   *    /*            404
 */

import { handleAsk } from "./ask.js";
import { handleStatus } from "./status.js";
import { renderFrontend } from "./frontend.js";
import { handleBrowserIcon } from "./browser-icons.js";
import { corsHeaders, handlePreflight } from "./cors.js";
import { handleMeta } from "./_meta.js";

const META = {
  name: "ramone-edge",
  description: "Public edge for the Ramone local-AI tunnel with Turnstile, rate limits, and SSE responses",
  version: "1.0.0",
  endpoints: [
    { method: "GET", path: "/", description: "Standalone Ramone interface" },
    { method: "GET", path: "/status", description: "Cached awake/asleep probe for live indicators" },
    { method: "POST", path: "/ask", description: "Turnstile-protected Q&A proxy streaming SSE from the local stack" },
    { method: "GET", path: "/_meta", description: "This document" },
  ],
  source: "https://github.com/AtlasReaper311/ramone-edge",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      const browserIcon = handleBrowserIcon(url.pathname);
      if (browserIcon) return browserIcon;
    }

    const meta = handleMeta(url, META);
    if (meta) return meta;

    if (request.method === "OPTIONS") {
      return handlePreflight(request, env);
    }

    try {
      if (request.method === "GET" && url.pathname === "/") {
        return new Response(renderFrontend(env), {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=300",
            "x-content-type-options": "nosniff",
            "referrer-policy": "no-referrer",
          },
        });
      }

      if (request.method === "GET" && url.pathname === "/status") {
        return handleStatus(request, env, ctx);
      }

      if (request.method === "POST" && url.pathname === "/ask") {
        return handleAsk(request, env, ctx);
      }

      return json({ error: "not_found" }, 404, request, env);
    } catch (err) {
      // Never leak stack traces. Log to tail, return a generic 500.
      console.error("unhandled error:", err && err.stack ? err.stack : err);
      return json({ error: "internal_error" }, 500, request, env);
    }
  },
};

/**
 * JSON response helper with CORS headers attached.
 * Centralising this means CORS can never be forgotten on an error path.
 */
function json(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
    },
  });
}
