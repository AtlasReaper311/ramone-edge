/**
 * CORS handling for ramone-edge.
 *
 * Origins are taken from `env.ALLOWED_ORIGINS` (comma-separated). The
 * Worker echoes the origin back only if it matches the allowlist, so an
 * untrusted page calling `/ask` from a browser cannot read the response.
 * Server-to-server calls (no Origin header) are unaffected.
 */

const STANDARD_HEADERS = {
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, X-Atlas-Turnstile",
  "access-control-max-age": "86400",
  vary: "Origin",
};

function parseAllowed(env) {
  return (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = parseAllowed(env);
  if (origin && allowed.includes(origin)) {
    return { "access-control-allow-origin": origin, vary: "Origin" };
  }
  // No CORS headers means same-origin only. Fail closed.
  return { vary: "Origin" };
}

export function handlePreflight(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = parseAllowed(env);
  const status = origin && allowed.includes(origin) ? 204 : 403;
  return new Response(null, {
    status,
    headers: {
      ...STANDARD_HEADERS,
      ...(status === 204 ? { "access-control-allow-origin": origin } : {}),
    },
  });
}
