<div align="center">
  <img src="https://raw.githubusercontent.com/AtlasReaper311/AtlasReaper311/main/atlas-icon-dark-256.png" width="88" alt="Atlas Systems"/>
</div>

# ramone-edge

```
┌─────────────────────────────────────────────┐
│  ATLAS SYSTEMS // ramone-edge               │
│  the public face of a private GPU           │
└─────────────────────────────────────────────┘
```

![Cloudflare Workers](https://img.shields.io/badge/runtime-cloudflare%20workers-f5a623?style=flat-square&labelColor=0a0a0f)
![Rate limits](https://img.shields.io/badge/rate%20limits-workers%20kv-4ade80?style=flat-square&labelColor=0a0a0f)
![SSE](https://img.shields.io/badge/transport-sse-aaa9a0?style=flat-square&labelColor=0a0a0f)
![Cost](https://img.shields.io/badge/cost-%C2%A30-aaa9a0?style=flat-square&labelColor=0a0a0f)

The only publicly addressable component of the [Ramone](https://atlas-systems.uk/writing/ramone-local-ai-system/) ask-my-infrastructure system. Validates Turnstile, enforces rate limits, probes the tunnel for awake state, and pipes Server-Sent Events back from a FastAPI service running on SPECULAR-CORE through a Cloudflare Tunnel.

```
browser ─▶ ramone.atlas-systems.uk ─▶ ramone-edge (this worker)
                                          │
                                          │  X-Atlas-Secret + private CNAME
                                          ▼
                                ramone-tunnel.atlas-systems.uk
                                          │  cloudflared
                                          ▼
                              SPECULAR-CORE :8000 (ollama-rag-kit)
                                          │
                                ┌─────────┴─────────┐
                                ▼                   ▼
                            ChromaDB             Ollama (llama3.1:8b)
```

## Routes

| Method | Path     | Description                                                       |
| ------ | -------- | ----------------------------------------------------------------- |
| GET    | /        | Standalone interface (HTML, no JS framework, embedded Turnstile)  |
| GET    | /status  | Cached awake/asleep probe for the live indicator (30 s cache)     |
| POST   | /ask     | Validated and rate-limited question proxy; streams SSE on success |

## Why a Worker in front of a Tunnel

The same reason every other service in the estate has a Worker in front of it. A naked FastAPI exposed through a Tunnel works, but the Worker buys five things the FastAPI shouldn't have to care about:

- A free, edge-resident Turnstile validation step that filters bots before any GPU work begins.
- KV-backed rate limits that survive Worker isolate eviction.
- A coherent origin allowlist so a third-party page cannot read the response.
- A cached wake-state probe so the Lab page status indicator does not hammer the tunnel.
- A single hop for the atlas-notify hook, keeping the FastAPI free of business-logic awareness about who else cares about its traffic.

## Local development

```bash
npm install
npm run check       # node --check on every src/*.js
npm run lint
npm run test
npm run dev         # wrangler dev with --remote
```

## Required secrets

```bash
wrangler secret put TURNSTILE_SECRET
wrangler secret put UPSTREAM_SECRET      # must match ollama-rag-kit ATLAS_SECRET
wrangler secret put NOTIFY_TOKEN
```

## Required wrangler.toml replacements

Before first deploy, fill in:

- `zone_id` for `atlas-systems.uk`
- KV namespace id for the `RL` binding
- `TURNSTILE_SITE_KEY`

The site key is public and lives in `[vars]`; the secret key is a secret.

## Tests

```bash
npm test
```

Coverage focuses on the security-critical and contract-critical paths: CORS origin enforcement, rate-limit math, and the atlas-notify event shape. The upstream proxy and SSE pipe are exercised end-to-end against `wrangler dev` in CI rather than mocked.

## How it fits into Atlas Systems

`ramone-edge` is the bounded public gateway between the Atlas Systems web surface and local Ramone services. The edge layer owns browser-facing validation, rate limiting, wake-state checks, and streaming transport while local inference stays behind the tunnel.

It also reports operational failures through [`atlas-notify`](https://github.com/AtlasReaper311/atlas-notify) and follows the same fail-closed public/private boundary used by the wider estate.

The transferable principle is to put public trust boundaries at the edge and keep the local service focused on the work only it can perform.

---

Part of [atlas-systems.uk](https://atlas-systems.uk)
