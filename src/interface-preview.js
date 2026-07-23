import { handleBrowserIcon } from "./browser-icons.js";
import { renderFrontend } from "./frontend.js";

const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: https:; connect-src https://api.atlas-systems.uk; font-src https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
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
      return withHeaders(Response.json({
        message: "Inference is disabled in the non-production interface preview.",
      }, { status: 503 }));
    }

    if (url.pathname !== "/" && url.pathname !== "/index.html") {
      return withHeaders(new Response("Not found", { status: 404 }));
    }

    return withHeaders(new Response(renderFrontend({}), {
      headers: { "content-type": "text/html; charset=utf-8" },
    }));
  },
};
