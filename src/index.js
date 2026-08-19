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
 *   GET  /.well-known/security.txt security contact
 *   GET  /status       cached awake/asleep probe for live indicators
 *   POST /ask          proxied Q&A, streams SSE back to the client
 *   POST /feedback/failure user-clicked draft eval capture
 *   GET  /*            noindex HTML 404 for browser navigation, JSON otherwise
 *   *    /*            JSON 404
 */

import { handleAsk } from "./ask.js";
import { handleFailureCapture } from "./failure-capture.js";
import { handleStatus } from "./status.js";
import { renderFrontend } from "./frontend-phase6.js";
import { renderNotFoundFrontend } from "./not-found.js";
import { handleBrowserIcon } from "./browser-icons.js";
import { handleInterfaceAsset } from "./interface-assets.js";
import { corsHeaders, handlePreflight } from "./cors.js";
import { handleMeta } from "./_meta.js";
import { secureResponse } from "./security.js";

const SECURITY_TEXT = `Contact: mailto:atlas@atlas-systems.uk
Expires: 2027-07-24T23:59:59Z
Preferred-Languages: en
Canonical: https://ramone.atlas-systems.uk/.well-known/security.txt
`;

const META = {
  name: "ramone-edge",
  description: "Public edge for the Ramone local-AI tunnel with Turnstile, rate limits, and SSE responses",
  version: "1.0.0",
  endpoints: [
    { method: "GET", path: "/", description: "Standalone Ramone interface" },
    { method: "GET", path: "/.well-known/security.txt", description: "Security contact" },
    { method: "GET", path: "/status", description: "Cached awake/asleep probe for live indicators" },
    { method: "POST", path: "/ask", description: "Turnstile-protected Q&A proxy streaming SSE from the local stack" },
    { method: "POST", path: "/feedback/failure", description: "User-clicked draft eval capture for a completed Ramone answer" },
    { method: "GET", path: "/_meta", description: "This document" },
  ],
  source: "https://github.com/AtlasReaper311/ramone-edge",
};

function wantsHtml(request) {
  if (request.method !== "GET") return false;
  const accept = request.headers.get("accept") || "";
  const mode = request.headers.get("sec-fetch-mode") || "";
  return accept.toLowerCase().includes("text/html") || mode.toLowerCase() === "navigate";
}

async function routeRequest(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      const browserIcon = handleBrowserIcon(url.pathname);
      if (browserIcon) return browserIcon;
      const interfaceAsset = handleInterfaceAsset(url.pathname);
      if (interfaceAsset) return interfaceAsset;
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

      if (request.method === "GET" && url.pathname === "/.well-known/security.txt") {
        return new Response(SECURITY_TEXT, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      }

      if (request.method === "GET" && url.pathname === "/status") {
        return handleStatus(request, env, ctx);
      }

      if (request.method === "POST" && url.pathname === "/ask") {
        return handleAsk(request, env, ctx);
      }

      if (request.method === "POST" && url.pathname === "/feedback/failure") {
        return handleFailureCapture(request, env, ctx);
      }

      if (wantsHtml(request)) {
        return new Response(renderNotFoundFrontend(), {
          status: 404,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
            "referrer-policy": "no-referrer",
          },
        });
      }

      return json({ error: "not_found" }, 404, request, env);
    } catch (err) {
      console.error("unhandled error:", err && err.stack ? err.stack : err);
      return json({ error: "internal_error" }, 500, request, env);
    }
}

export default {
  async fetch(request, env, ctx) {
    return secureResponse(await routeRequest(request, env, ctx));
  },
};

function json(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
    },
  });
}
