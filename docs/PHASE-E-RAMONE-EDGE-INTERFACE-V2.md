# Phase E: Ramone Edge Interface V2

## Outcome

Bring the human-facing `GET /` Ramone surface into the accepted Atlas Public
Interface System v2 and improve its visitor experience while preserving
`ramone-edge` as the independently deployed, bounded gateway to the existing
local inference service.

This is a presentation and interaction-design migration. It is not an
inference, memory, transport, security, or service-contract redesign.

## Source authority

- Governance: `AtlasReaper311/atlas-infra` accepted ADR-0008 and
  `policy/public-interface-system-v2.json`
- Shared implementation: repository-local Atlas Interface Kit v0.1.1
- Public edge behaviour: this repository's `src/index.js`, `src/ask.js`,
  `src/status.js`, `src/ratelimit.js`, and `src/cors.js`
- Product interaction: this repository's existing streaming conversation,
  source evidence, session identifier, awake/asleep state, and composer

## Protected boundaries

The phase must not:

- add, remove, rename, or change `/`, `/status`, `/ask`, `/_meta`, or browser
  icon routes;
- change request or response bodies, Server-Sent Event parsing, rate limits,
  CORS, session identifiers, upstream authentication, error status meanings,
  status polling, or notification events;
- change Worker routes, service bindings, KV bindings, secrets, schedules, or
  deployment ownership;
- call, modify, or expose `ramone-memory` directly;
- reveal private prompts, memory contents, tunnel credentials, internal
  addresses, or new local infrastructure detail in the visitor interface;
- create a cross-domain runtime stylesheet or other shared runtime dependency;
- merge or deploy to production before manual visual approval of the exact
  preview commit.

## Accepted interface contract

### Global shell

- Desktop uses the three-zone Atlas header:
  - left: `ATLAS_SYSTEMS` and aggregate status;
  - centre: Work, Writing, Lab, Systems, About;
  - right: compact estate search.
- The aggregate state starts as `Checking` and uses `Operational`, `Degraded`,
  `Unavailable`, or `Unknown` only from the bounded estate status projection.
- Mobile retains wordmark, aggregate status, and search in the top header and
  moves the five estate routes to fixed bottom navigation.
- The product strip identifies Ramone as a Production product and keeps the
  public awake/asleep state distinct from estate-wide runtime state.
- Atlas-owned destinations open in the same tab. External destinations open
  in a new tab with `noopener noreferrer`.

### Ramone identity and conversation

- Preserve the established Ramone product identity, opening experience,
  streaming response behaviour, composer, suggestions, response evidence, and
  new-conversation action.
- Keep one principal heading, one main landmark, a logical focus order, and a
  purpose-specific footer with an estate escape.
- Product copy may explain that Ramone is grounded on the public Atlas Systems
  estate and runs on owner-operated local infrastructure. It must not depend on
  hardware, model, tunnel, prompt, or memory implementation details.
- Awake/asleep, rate-limited, blocked, upstream-error, and network-error states
  remain honest and actionable.
- Streaming tokens are not announced individually. Assistive technology
  receives one bounded completion or error announcement per response.

### Visual and responsive foundation

- Pin Atlas Interface Kit v0.1.1 inside this repository and verify its manifest
  fingerprints.
- Keep Ramone's stronger product typography and expressive character while
  using the shared spacing, type, focus, touch, state, z-index, and
  reduced-motion foundations.
- Prefer a spacious conversation surface with diagrams or topology motifs over
  decorative imagery.
- Body copy is at least 15px and preferably 16px, supporting copy is at least
  13px and preferably 14px, metadata is at least 11px, and essential touch
  targets are at least 44px.
- The document must not overflow horizontally and fixed mobile navigation must
  not obscure content or focus.

## Owner-approved product direction

The owner resolved the Phase E product-expression choices as follows:

1. Ramone introduces himself personally and then explains the grounded public
   Atlas Systems interface.
2. The composition is a polished chat product expressed through a technical
   terminal and console character.
3. The full interface remains visible while asleep, with an intentional offline
   state that says `SPECULAR-CORE` is currently offline.
4. Answer evidence uses well-structured expandable source cards with source
   identity and bounded preview text.
5. Suggested questions are prominent on first load and recede after the first
   conversation begins.
6. A concise, public-safe explanation states what Ramone knows and does not
   know.
7. A lightly animated knowledge-flow or topology motif gives the product a
   visually expressive identity, with a complete reduced-motion fallback.
8. The existing temporary session and `new conversation` model remains; browser
   conversation history is deferred.

The Lab Ramone treatment is the quality and atmosphere reference, but the
standalone product keeps its own composition rather than copying the Lab card.

## Implementation ownership

- `src/frontend-core.js` retains the product interaction and streaming
  conversation implementation.
- `src/frontend.js` owns the Atlas shell and bounded presentation integration.
- Product-specific styles and interactions remain local to `ramone-edge`.
- The pinned Interface Kit bundle is copied into this repository, verified
  against its manifest, and embedded into the Worker output without a runtime
  cross-domain dependency.
- `src/index.js`, `src/ask.js`, `src/status.js`, `src/ratelimit.js`, and
  `src/cors.js` remain the public edge contract owners.
- `.github/workflows/interface-preview.yml` owns the isolated, non-production
  visual approval preview and deterministic evidence.

## Validation and evidence

The exact pull-request head must pass:

1. deterministic Interface Kit fingerprint and embedded-output checks;
2. JavaScript syntax checks, ESLint, and the complete Vitest suite;
3. focused tests proving the public edge route and streaming contracts did not
   change;
4. production-shaped and isolated-preview Wrangler dry runs;
5. Chrome and Firefox at 320, 375, 768, 1024, and 1440px;
6. zero serious or critical accessibility violations;
7. checks for heading and landmark structure, desktop and mobile navigation,
   status failure states, search focus containment and restoration, visible
   focus, 44px touch controls, horizontal overflow, and bottom-navigation
   clearance;
8. a deterministic asleep/unavailable fixture that cannot reach inference,
   memory, KV, service bindings, or production routes;
9. screenshots and machine-readable evidence retained for 14 days and tied to
   the exact commit.

## Rollout gate

The pull request remains draft while its isolated preview is reviewed. The
preview must identify its exact commit and state that production and inference
are unchanged. Phase E stops after evidence and preview delivery until the owner
explicitly approves that exact visual result. Merge and production deployment
remain separate owner-approved actions.

## Rollback

Before merge, close the draft pull request and remove its isolated preview
Worker. After an approved merge, revert the Phase E merge commit and let the
existing Worker deployment workflow restore the previous interface. The
inference service, memory service, API contracts, bindings, rate-limit data,
and deployment ownership are unchanged, so rollback is limited to presentation
assets and presentation code.
