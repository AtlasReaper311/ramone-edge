import { renderFrontend as renderInterfaceFrontend } from "./frontend.js";

const PHASE_6_FOOTER_CSS = `
  .ramone-product-footer {
    max-width: none;
    margin-top: var(--atlas-space-7);
    padding: var(--atlas-space-4) 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--atlas-space-4);
    border-top: 1px solid var(--atlas-border-hi);
    color: var(--atlas-text-faint);
    font: 400 var(--atlas-type-meta)/1.5 var(--atlas-font-body);
  }
  .ramone-product-footer .atlas-footer__identity {
    min-width: min(100%,220px);
    flex: 1 1 260px;
    display: grid;
    gap: 2px;
    color: var(--atlas-text);
  }
  .ramone-product-footer .atlas-footer__identity strong,
  .ramone-product-footer .atlas-footer__identity span { display: block; }
  .ramone-product-footer .atlas-footer__identity strong {
    font-weight: 500;
    letter-spacing: .06em;
    line-height: 1.35;
    text-transform: uppercase;
  }
  .ramone-product-footer .atlas-footer__identity span {
    color: var(--atlas-text-faint);
    line-height: 1.45;
  }
  .ramone-product-footer .atlas-footer__context,
  .ramone-product-footer .atlas-footer__evidence,
  .ramone-product-footer .atlas-footer__escape {
    min-width: 0;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0 var(--atlas-space-3);
    white-space: nowrap;
  }
  .ramone-product-footer .atlas-footer__evidence,
  .ramone-product-footer .atlas-footer__escape {
    border-left: 1px solid var(--atlas-border);
    padding-left: var(--atlas-space-4);
  }
  .ramone-product-footer a {
    min-width: var(--atlas-touch-min);
    min-height: var(--atlas-touch-min);
    display: inline-flex;
    align-items: center;
    color: var(--atlas-text-dim);
    text-decoration: underline;
    text-decoration-color: currentColor;
    text-decoration-thickness: from-font;
    text-underline-offset: .22em;
  }
  .ramone-product-footer a:hover { color: var(--atlas-text); }
  .ramone-product-footer a:focus-visible { outline: 2px solid var(--atlas-accent); outline-offset: 3px; }
  @media (max-width: 767px) {
    .ramone-product-footer {
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: flex-start;
      gap: 0;
      padding-bottom: calc(var(--atlas-space-8) + env(safe-area-inset-bottom));
    }
    .ramone-product-footer .atlas-footer__identity {
      width: 100%;
      min-width: 0;
      margin-bottom: var(--atlas-space-1);
    }
    .ramone-product-footer .atlas-footer__context,
    .ramone-product-footer .atlas-footer__evidence,
    .ramone-product-footer .atlas-footer__escape {
      width: 100%;
      flex-wrap: wrap;
      gap: 0 var(--atlas-space-3);
      border-left: 0;
      padding-left: 0;
      white-space: normal;
    }
  }
`;

const PHASE_6_FOOTER = `<footer class="atlas-footer atlas-footer--product ramone-product-footer" aria-label="Ramone product footer">
    <div class="atlas-footer__identity"><strong>Ramone</strong><span>Grounded local AI on owner-operated infrastructure</span></div>
    <div class="atlas-footer__context"><a href="https://atlas-systems.uk/writing/ramone-local-ai-system/">Build log</a></div>
    <div class="atlas-footer__evidence"><a href="https://github.com/AtlasReaper311/ramone-edge">Edge source</a><a href="https://github.com/AtlasReaper311/ollama-rag-kit">Inference source</a></div>
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
