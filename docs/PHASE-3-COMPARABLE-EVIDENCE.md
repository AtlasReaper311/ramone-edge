# Phase 3 comparable interface evidence

Ramone keeps its existing product-specific evidence for deterministic offline state, source cards, local personality response, workspace transitions, navigation, and composer layout.

A separate `atlas-public-interface/evidence/v1` record adds comparable Chrome and Firefox measurements at 320, 375, 768, 1024, 1440, and reporting-only 1920 pixel widths. It records semantic structure, WCAG 2.2 findings, keyboard focus, console and page errors, failed requests, HTTP errors, request counts, transfer sizes, and CSS and JavaScript resource counts.

Product findings are reporting-only during Phase 3. Existing Ramone contract failures remain blocking. The preview stays isolated, binding-free, inference-free, deterministic, and offline. No request is sent to `/ask`, no runtime binding or secret is used, and production deployment behaviour is unchanged.
