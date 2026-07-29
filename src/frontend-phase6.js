import { renderFrontend as renderInterfaceFrontend } from "./frontend.js";

const PHASE_6_FOOTER_CSS = `
  .ramone-product-footer {
    max-width: none;
    margin-top: var(--atlas-space-8);
    padding: var(--atlas-space-6) 0 var(--atlas-space-8);
    display: grid;
    grid-template-columns: minmax(0,1fr) auto;
    grid-template-areas:
      "identity escape"
      "context context"
      "evidence evidence";
    align-items: start;
    gap: var(--atlas-space-4) var(--atlas-space-6);
    border-top: 1px solid var(--atlas-border);
    color: var(--atlas-text-faint);
    font: 400 var(--atlas-type-meta)/1.6 var(--atlas-font-body);
  }
  .ramone-product-footer .atlas-footer__identity { grid-area: identity; min-width: 0; color: var(--atlas-text); }
  .ramone-product-footer .atlas-footer__identity strong,
  .ramone-product-footer .atlas-footer__identity span { display: block; }
  .ramone-product-footer .atlas-footer__identity strong { font-weight: 500; letter-spacing: .05em; text-transform: uppercase; }
  .ramone-product-footer .atlas-footer__identity span { margin-top: var(--atlas-space-1); color: var(--atlas-text-faint); }
  .ramone-product-footer .atlas-footer__context { grid-area: context; }
  .ramone-product-footer .atlas-footer__evidence { grid-area: evidence; }
  .ramone-product-footer .atlas-footer__escape { grid-area: escape; justify-self: end; }
  .ramone-product-footer .atlas-footer__context,
  .ramone-product-footer .atlas-footer__evidence,
  .ramone-product-footer .atlas-footer__escape { display: flex; flex-wrap: wrap; align-items: center; gap: var(--atlas-space-2) var(--atlas-space-4); }
  .ramone-product-footer a { min-height: var(--atlas-touch-min); display: inline-flex; align-items: center; color: var(--atlas-text-dim); text-underline-offset: .22em; }
  .ramone-product-footer a:hover { color: var(--atlas-text); text-decoration: none; }
  .ramone-product-footer a:focus-visible { outline: 2px solid var(--atlas-accent); outline-offset: 3px; }
  @media (max-width: 767px) {
    .ramone-product-footer {
      grid-template-columns: 1fr;
      grid-template-areas: "identity" "context" "evidence" "escape";
      gap: var(--atlas-space-3);
      padding-bottom: calc(var(--atlas-space-8) + env(safe-area-inset-bottom));
    }
    .ramone-product-footer .atlas-footer__escape { justify-self: start; }
  }
`;

const PHASE_6_FOOTER = `<footer class="atlas-footer atlas-footer--product ramone-product-footer" aria-label="Ramone product footer">
    <div class="atlas-footer__identity"><strong>Ramone</strong><span>Grounded local AI on owner-operated infrastructure</span></div>
    <div class="atlas-footer__context"><a href="https://atlas-systems.uk/writing/ramone-local-ai-system/">Build log</a><a href="https://atlas-systems.uk/lab/">Atlas Systems Lab</a></div>
    <div class="atlas-footer__evidence"><a href="https://status.atlas-systems.uk/">Estate status</a><a href="https://github.com/AtlasReaper311/ramone-edge">Edge source</a><a href="https://github.com/AtlasReaper311/ollama-rag-kit">Inference source</a></div>
    <div class="atlas-footer__escape"><a href="https://atlas-systems.uk/">Atlas Systems home</a></div>
  </footer>`;

export function applyPhase6Footer(html) {
  const original = `<footer class="footer atlas-footer">
    <div>built and maintained by <a href="https://atlas-systems.uk/about">atlas reaper</a></div>
    <div>
      <a href="https://atlas-systems.uk/writing/ramone-local-ai-system/">read the build log</a>
      &nbsp;·&nbsp;
      <a href="https://github.com/AtlasReaper311/ollama-rag-kit">source</a>
    </div>
  </footer>`;
  if (!html.includes(original)) {
    throw new Error("Ramone Phase 6 footer anchor drifted");
  }
  const withStyles = html.replace("</style>\n</head>", `${PHASE_6_FOOTER_CSS}\n</style>\n</head>`);
  return withStyles.replace(original, PHASE_6_FOOTER);
}

export function renderFrontend(env) {
  return applyPhase6Footer(renderInterfaceFrontend(env));
}

export { PHASE_6_FOOTER, PHASE_6_FOOTER_CSS };
