import { handleBrowserIcon } from "./browser-icons.js";
import { handleInterfaceAsset } from "./interface-assets.js";
import { renderFrontend } from "./frontend.js";
import { secureResponse } from "./security.js";

const SECURITY_HEADERS = {
  "cache-control": "no-store",
  "x-atlas-preview": "ramone-interface",
};

function withHeaders(response) {
  const secured = secureResponse(response);
  const headers = new Headers(secured.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(secured.body, { status: secured.status, headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const icon = handleBrowserIcon(url.pathname);
    if (icon) return withHeaders(icon);
    const interfaceAsset = handleInterfaceAsset(url.pathname);
    if (interfaceAsset) return withHeaders(interfaceAsset);

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
