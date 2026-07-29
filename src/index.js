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
 *   *    /*            404
 */

import { handleAsk } from "./ask.js";
import { handleStatus } from "./status.js";
import { renderFrontend } from "./frontend-phase6.js";
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
    { method: "GET", path: "/_meta", description: "This document" },
  ],
  source: "https://github.com/AtlasReaper311/ramone-edge",
};

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
        return handlePreflight();
    }

    if (url.pathname === "/.well-known/security.txt") {
        if (request.method !== "GET" && request.method !== "HEAD") {
            return new Response("Method not allowed", {
                status: 405,
                headers: { allow: "GET, HEAD" },
            });
        }
        return new Response(request.method === "HEAD" ? null : SECURITY_TEXT, {
            headers: {
                "content-type": "text/plain; charset=utf-8",
                "cache-control": "public, max-age=86400",
            },
        });
    }

    if (url.pathname === "/" && request.method === "GET") {
        return new Response(renderFrontend(env), {
            headers: {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "public, max-age=300",
            },
        });
    }

    if (url.pathname === "/status" && request.method === "GET") {
        return handleStatus(env, ctx);
    }

    if (url.pathname === "/ask" && request.method === "POST") {
        return handleAsk(request, env, ctx);
    }

    return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { "content-type": "application/json", ...corsHeaders() },
    });
}

export default {
  async fetch(request, env, ctx) {
    return secureResponse(await routeRequest(request, env, ctx));
  },
};
