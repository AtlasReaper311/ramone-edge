const BASE_SECURITY_HEADERS = Object.freeze({
  "permissions-policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "referrer-policy": "no-referrer",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
});

const MACHINE_CONTENT_SECURITY_POLICY =
  "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const INTERFACE_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "base-uri 'self'",
  "connect-src 'self' https://api.atlas-systems.uk",
  "font-src 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https://atlas-systems.uk",
  "manifest-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'unsafe-inline'",
].join("; ");

export function secureResponse(response) {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    secured.headers.set(name, value);
  }
  const contentType = secured.headers.get("content-type") || "";
  secured.headers.set(
    "content-security-policy",
    contentType.includes("text/html")
      ? INTERFACE_CONTENT_SECURITY_POLICY
      : MACHINE_CONTENT_SECURITY_POLICY,
  );
  return secured;
}
