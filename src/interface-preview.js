import { handleBrowserIcon } from "./browser-icons.js";
import { renderFrontend } from "./frontend.js";

const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.atlas-systems.uk; font-src https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

function withHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  headers.set("cache-control", "no-store");
  headers.set("x-atlas-preview", "ramone-interface");
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const icon = handleBrowserIcon(url.pathname);
    if (icon) return withHeaders(icon);

    if (url.pathname === "/status") {
      return withHeaders(Response.json({
        awake: false,
        checked_at: new Date().toISOString(),
        preview: true,
      }));
    }

    if (url.pathname === "/ask") {
      if (request.method !== "POST") {
        return withHeaders(new Response("Method not allowed", {
          status: 405,
          headers: { allow: "POST" },
        }));
      }

      const fixtureEvents = [
        {
          type: "token",
          text: "This is a deterministic preview response. It demonstrates Ramone's grounded answer and evidence treatment without contacting SPECULAR-CORE.",
        },
        {
          type: "sources",
          sources: [
            {
              id: "atlas-systems/public-interface-v2",
              preview: "Public interface policy, navigation order, maturity language, and accessibility requirements.",
            },
            {
              id: "ramone-edge/interface-contract",
              preview: "The public gateway contract for status, temporary sessions, streaming answers, and cited evidence.",
            },
          ],
        },
      ];
      const body = fixtureEvents
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join("");
      return withHeaders(new Response(body, {
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-store",
        },
      }));
    }

    if (url.pathname !== "/" && url.pathname !== "/index.html") {
      return withHeaders(new Response("Not found", { status: 404 }));
    }

    return withHeaders(new Response(renderFrontend({}), {
      headers: { "content-type": "text/html; charset=utf-8" },
    }));
  },
};
