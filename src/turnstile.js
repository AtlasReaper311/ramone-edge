/**
 * Cloudflare Turnstile verification.
 *
 * Frontend submits the Turnstile token in the X-Atlas-Turnstile header.
 * We verify it against the siteverify endpoint with the secret key
 * (kept in wrangler secret, never embedded). A failed verification
 * means a 403 before any GPU work happens.
 *
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token, remoteIp, env) {
  if (!token || typeof token !== "string") {
    return { ok: false, reason: "missing_token" };
  }
  if (!env.TURNSTILE_SECRET) {
    // Misconfiguration: refuse to fail open.
    console.error("TURNSTILE_SECRET is not set; refusing all requests.");
    return { ok: false, reason: "server_misconfigured" };
  }

  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  if (remoteIp) {
    body.append("remoteip", remoteIp);
  }

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body });
    if (!res.ok) {
      return { ok: false, reason: `siteverify_${res.status}` };
    }
    const data = await res.json();
    if (!data.success) {
      const codes =
        Array.isArray(data["error-codes"]) && data["error-codes"].length
          ? data["error-codes"].join(",")
          : "unknown";
      return { ok: false, reason: `siteverify_failed:${codes}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("turnstile verify error:", err);
    return { ok: false, reason: "siteverify_error" };
  }
}
