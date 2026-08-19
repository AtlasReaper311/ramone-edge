# Phase 7 browser identity

## Finding

The Ramone root already exposes the accepted product identity:

- page-first title and description;
- exact canonical and Open Graph URL;
- route-specific social image and matching alt text;
- complete local browser-icon and manifest routes;
- repository-local interface assets;
- independent Worker deployment.

The measured gap was the unknown-route response. Every unmatched path returned JSON, including top-level browser navigation. That preserved an API boundary but provided no product-specific noindex error identity.

## Change

Unknown requests now use content negotiation:

- a `GET` request that accepts `text/html`, or declares browser navigation mode, receives a noindex HTML 404;
- API-style `GET` requests retain `{ "error": "not_found" }` JSON;
- unknown non-GET requests retain JSON;
- `/`, `/status`, `/ask`, `/_meta`, browser icons, interface assets, and `security.txt` retain their existing routes and behavior.

The HTML error response includes:

- `404 // Ramone // Atlas Systems` title;
- description, `noindex, follow`, theme colour, interface version, and bundle fingerprint;
- no canonical URL or social card;
- repository-local icon and manifest routes;
- product identity, recovery links, source evidence, and Atlas estate escape;
- no JavaScript, inference input, wake request, Turnstile path, tunnel call, or private-route disclosure.

## Protected boundaries

This branch does not modify:

- inference routing or model selection;
- the private tunnel;
- Turnstile validation;
- rate limiting;
- SSE transport;
- awake, asleep, or offline decisions;
- grounding and source authority;
- `/ask` or `/status` response contracts;
- bindings, provider settings, or secrets.

## Validation

Repository-native tests must prove root metadata, browser HTML 404 behavior, API JSON fallback, non-GET JSON fallback, secure response headers, and absence of inference or script paths in the error document.

The existing interface preview remains deterministic, offline, inference-free, and binding-free.

## Rollout boundary

This branch stops at a draft pull request. A later merge will trigger the Worker deployment and requires separate exact-head rollout approval and live verification.
