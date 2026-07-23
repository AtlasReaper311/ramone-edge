import { renderFrontend as renderCoreFrontend } from "./frontend-core.js";

const HEAD = `<title>Ramone // Atlas Systems</title>
<meta name="description" content="A grounded local-AI interface for exploring the public Atlas Systems engineering estate." />
<meta name="theme-color" content="#0a0a0f" />
<link rel="canonical" href="https://ramone.atlas-systems.uk/" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
<link rel="manifest" href="/site.webmanifest" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Ramone // Atlas Systems" />
<meta property="og:description" content="A grounded local-AI interface for exploring the public Atlas Systems engineering estate." />
<meta property="og:url" content="https://ramone.atlas-systems.uk/" />
<meta property="og:site_name" content="Atlas Systems" />
<meta property="og:image" content="https://atlas-systems.uk/og-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Ramone: the Atlas Systems grounded local-AI interface" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Ramone // Atlas Systems" />
<meta name="twitter:description" content="A grounded local-AI interface for exploring the public Atlas Systems engineering estate." />
<meta name="twitter:image" content="https://atlas-systems.uk/og-default.png" />`;

const SHELL_CSS = `
  .atlas-global-nav {
    position: sticky; top: 0; z-index: 100;
    min-height: 56px; display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 0 clamp(20px,5vw,48px);
    border-bottom: 1px solid var(--border); background: rgba(10,10,15,.92);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  }
  .atlas-brand-cluster { display: inline-flex; align-items: center; gap: 12px; min-width: 0; }
  .atlas-wordmark { color: var(--text); font-size: 13px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; white-space: nowrap; }
  .atlas-wordmark:hover { text-decoration: none; color: var(--text); }
  .atlas-wordmark span { color: var(--accent); }
  .atlas-global-links { display: flex; align-items: center; margin: 0; padding: 0; list-style: none; }
  .atlas-global-links a { display: flex; align-items: center; min-height: 44px; padding: 6px 13px; color: var(--text-dim); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
  .atlas-global-links a:hover, .atlas-global-links a:focus-visible { color: var(--text); text-decoration: none; }
  .atlas-estate-status { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 3px 8px; border: 1px solid var(--border); color: var(--text-dim); font-size: 9px; line-height: 1; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
  .atlas-estate-status:hover, .atlas-estate-status:focus-visible { border-color: var(--border-hi); color: var(--text); text-decoration: none; }
  .atlas-estate-status-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: var(--text-faint); }
  .atlas-estate-status[data-state="nominal"] .atlas-estate-status-dot { background: var(--status-live); box-shadow: 0 0 0 3px rgba(74,222,128,.12); }
  .atlas-estate-status[data-state="degraded"] .atlas-estate-status-dot, .atlas-estate-status[data-state="checking"] .atlas-estate-status-dot { background: var(--accent); box-shadow: 0 0 0 3px rgba(245,166,35,.12); }
  .atlas-estate-status[data-state="unavailable"] .atlas-estate-status-dot { background: var(--status-down); box-shadow: 0 0 0 3px rgba(226,75,74,.12); }
  .atlas-search-trigger { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 5px 9px; border: 1px solid var(--border); background: transparent; color: var(--text-dim); font: inherit; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
  .atlas-search-trigger:hover, .atlas-search-trigger:focus-visible { color: var(--text); border-color: var(--border-hi); }
  .atlas-search-trigger svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.5; }
  .atlas-search-trigger kbd { color: var(--text-faint); font: inherit; font-size: 8px; }
  .shell { padding-top: 28px; }
  .topbar { border-radius: 0; }
  .atlas-search-root { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: start center; padding: min(12vh,7rem) 16px 16px; }
  .atlas-search-root[hidden] { display: none; }
  .atlas-search-scrim { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: rgba(4,4,8,.82); backdrop-filter: blur(8px); cursor: default; }
  .atlas-search-panel { position: relative; width: min(720px,100%); max-height: min(720px,78vh); overflow: auto; padding: 20px; border: 1px solid var(--border-hi); background: var(--bg-1); box-shadow: 0 24px 80px rgba(0,0,0,.45); }
  .atlas-search-heading { margin: 0 0 12px; color: var(--accent); font-size: 10px; letter-spacing: .14em; }
  .atlas-search-input { width: 100%; min-height: 48px; padding: 12px 16px; border: 1px solid var(--border-hi); background: var(--bg-2); color: var(--text); font: inherit; }
  .atlas-search-status { min-height: 24px; margin: 10px 0; color: var(--text-dim); font-size: 11px; }
  .atlas-search-results { display: grid; gap: 1px; margin: 0; padding: 0; list-style: none; background: var(--border); }
  .atlas-search-result { background: var(--bg); }
  .atlas-search-result-main { display: grid; gap: 6px; padding: 14px 16px; color: var(--text-dim); }
  .atlas-search-result-main:hover, .atlas-search-result-main:focus-visible { background: var(--bg-2); color: var(--text); text-decoration: none; }
  .atlas-search-result-main strong { color: var(--text); font-size: 11px; overflow-wrap: anywhere; }
  .atlas-search-result-main span { font-size: 11px; line-height: 1.65; }
  .atlas-search-close { margin-top: 16px; min-height: 40px; padding: 8px 14px; border: 1px solid var(--border-hi); background: var(--bg-2); color: var(--text); font: inherit; cursor: pointer; }
  body.atlas-search-open { overflow: hidden; }
  :where(a,button,textarea,input,[tabindex]):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  @media (max-width: 760px) {
    .atlas-global-nav { position: relative; align-items: stretch; flex-direction: column; padding-block: 12px; }
    .atlas-global-links { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); width: 100%; }
    .atlas-global-links a, .atlas-search-trigger { min-width: 0; min-height: 44px; justify-content: center; padding: 6px 4px; font-size: 9px; text-align: center; }
    .atlas-search-trigger span, .atlas-search-trigger kbd { display: none; }
    .shell { padding-top: 20px; }
  }
  @media (max-width: 420px) {
    .atlas-estate-status-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
    .atlas-estate-status { width: 32px; justify-content: center; padding: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *,*::before,*::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
  }
`;

const HEADER = `<nav class="atlas-global-nav" aria-label="Primary navigation">
  <div class="atlas-brand-cluster">
    <a class="atlas-wordmark" href="https://atlas-systems.uk/">Atlas<span>_</span>Systems</a>
    <a class="atlas-estate-status" href="https://status.atlas-systems.uk/" data-state="checking" aria-label="Atlas Systems status: checking">
      <span class="atlas-estate-status-dot" aria-hidden="true"></span>
      <span class="atlas-estate-status-label">checking</span>
    </a>
  </div>
  <ul class="atlas-global-links">
    <li><a href="https://atlas-systems.uk/work/">Work</a></li>
    <li><a href="https://atlas-systems.uk/writing/">Writing</a></li>
    <li><a href="https://atlas-systems.uk/lab/">Lab</a></li>
    <li><a href="https://atlas-systems.uk/about/">About</a></li>
    <li><button class="atlas-search-trigger" type="button" data-estate-search-open aria-label="Search the estate" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.2" y2="16.2"></line></svg><span>Search</span><kbd>ctrl k</kbd></button></li>
  </ul>
</nav>`;

const SHELL_SCRIPT = `<script>
(function () {
  "use strict";
  var STATUS_URL = "https://api.atlas-systems.uk/v1/stats";
  var SEARCH_URL = "https://api.atlas-systems.uk/v1/search";
  var OWNED = new Set(["api.atlas-systems.uk","atlas-systems.uk","cv.atlas-systems.uk","ramone.atlas-systems.uk","status.atlas-systems.uk"]);
  var searchUi = null;
  var searchRequest = null;
  var searchTimer = null;
  var previousFocus = null;

  function statusState(data) {
    var estate = data && data.estate;
    var operational = Number(estate && estate.operational);
    var total = Number(estate && estate.total_components);
    var checked = Date.parse(estate && estate.checked_at);
    if (!Number.isFinite(operational) || !Number.isFinite(total) || total <= 0 || operational < 0 || operational > total || !Number.isFinite(checked)) return { state: "unknown", detail: "Status evidence is unavailable." };
    var age = Date.now() - checked;
    if (age < 0 || age > 1200000) return { state: "unknown", detail: "Status evidence is stale." };
    if (operational === total) return { state: "nominal", detail: operational + " of " + total + " monitored components operational." };
    if (operational > total / 2) return { state: "degraded", detail: operational + " of " + total + " monitored components operational." };
    return { state: "unavailable", detail: operational + " of " + total + " monitored components operational." };
  }

  function setStatus(result) {
    var chip = document.querySelector(".atlas-estate-status");
    if (!chip) return;
    chip.dataset.state = result.state;
    chip.querySelector(".atlas-estate-status-label").textContent = result.state;
    chip.setAttribute("aria-label", "Atlas Systems status: " + result.state);
    chip.title = result.detail;
  }

  async function refreshStatus() {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 6000);
    try {
      var response = await fetch(STATUS_URL, { cache: "no-store", headers: { Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) throw new Error();
      setStatus(statusState(await response.json()));
    } catch (_) {
      setStatus({ state: "unknown", detail: "Status evidence could not be loaded." });
    } finally {
      clearTimeout(timeout);
    }
  }

  function normalizeLink(anchor) {
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;
    var raw = anchor.getAttribute("href") || "";
    if (!raw || raw.charAt(0) === "#" || raw.indexOf("mailto:") === 0 || raw.indexOf("tel:") === 0) return;
    var url;
    try { url = new URL(anchor.href, location.href); } catch (_) { return; }
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (OWNED.has(url.hostname)) {
      anchor.removeAttribute("target");
      anchor.removeAttribute("rel");
    } else {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
  }

  function normalizeLinks(root) {
    (root || document).querySelectorAll("a[href]").forEach(normalizeLink);
  }

  function resultHref(hit) {
    var repo = String(hit.source_repo || hit.repo || "");
    var path = String(hit.file_path || hit.path || "");
    if (repo === "atlas-systems" && /\\.html?$/i.test(path)) return "https://atlas-systems.uk/" + path.replace(/^\\/+/, "").replace(/index\\.html?$/i, "");
    if (repo && path) return "https://github.com/AtlasReaper311/" + encodeURIComponent(repo) + "/blob/main/" + path.split("/").map(encodeURIComponent).join("/");
    return null;
  }

  function cleanText(value) {
    var text = String(value || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\\\"").replace(/&#39;/g, "'").replace(/\\s+/g, " ").trim();
    return text.length > 220 ? text.slice(0,220).replace(/\\s+\\S*$/, "") + "…" : text;
  }

  function buildSearch() {
    var root = document.createElement("div"); root.className = "atlas-search-root"; root.hidden = true;
    var scrim = document.createElement("button"); scrim.type = "button"; scrim.className = "atlas-search-scrim"; scrim.setAttribute("aria-label", "Close estate search");
    var panel = document.createElement("section"); panel.className = "atlas-search-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-label", "Search the Atlas Systems estate");
    var heading = document.createElement("p"); heading.className = "atlas-search-heading"; heading.textContent = "ATLAS ESTATE // search";
    var input = document.createElement("input"); input.className = "atlas-search-input"; input.type = "search"; input.maxLength = 500; input.placeholder = "search the estate…"; input.autocomplete = "off"; input.setAttribute("aria-label", "Search query");
    var status = document.createElement("p"); status.className = "atlas-search-status"; status.setAttribute("aria-live", "polite"); status.textContent = "type at least two characters";
    var results = document.createElement("ol"); results.className = "atlas-search-results";
    var close = document.createElement("button"); close.className = "atlas-search-close"; close.type = "button"; close.textContent = "Close";
    panel.append(heading,input,status,results,close); root.append(scrim,panel); document.body.appendChild(root);
    return { root:root, scrim:scrim, panel:panel, input:input, status:status, results:results, close:close };
  }

  function renderSearch(data) {
    searchUi.results.replaceChildren();
    var hits = Array.isArray(data && data.hits) ? data.hits.slice(0,5) : [];
    if (!hits.length) { searchUi.status.textContent = "no matches in the public estate corpus"; return; }
    hits.forEach(function (hit) {
      var item = document.createElement("li"); item.className = "atlas-search-result";
      var destination = resultHref(hit); var main = document.createElement(destination ? "a" : "div"); main.className = "atlas-search-result-main";
      if (destination) { main.href = destination; if (!new URL(destination).hostname.endsWith("atlas-systems.uk")) { main.target = "_blank"; main.rel = "noopener noreferrer"; } }
      var label = document.createElement("strong"); label.textContent = String(hit.source_repo || hit.repo || "estate") + "/" + String(hit.file_path || hit.path || "document");
      var text = document.createElement("span"); text.textContent = cleanText(hit.text || hit.excerpt || ""); main.append(label,text); item.appendChild(main); searchUi.results.appendChild(item);
    });
    searchUi.status.textContent = hits.length + (hits.length === 1 ? " result" : " results");
  }

  async function runSearch(query) {
    if (searchRequest) searchRequest.abort();
    searchRequest = new AbortController();
    var timeout = setTimeout(function () { searchRequest.abort(); }, 8000);
    searchUi.status.textContent = "searching…";
    try {
      var url = new URL(SEARCH_URL); url.searchParams.set("q",query); url.searchParams.set("top_k","5");
      var response = await fetch(url, { cache:"no-store", headers:{Accept:"application/json"}, signal:searchRequest.signal });
      if (response.status === 429) { searchUi.results.replaceChildren(); searchUi.status.textContent = "search rate limit reached; try again shortly"; return; }
      if (!response.ok) throw new Error();
      renderSearch(await response.json());
    } catch (error) {
      if (error && error.name === "AbortError") return;
      searchUi.results.replaceChildren(); searchUi.status.textContent = "estate search unavailable";
    } finally { clearTimeout(timeout); }
  }

  function openSearch(trigger) { previousFocus = trigger || document.activeElement; searchUi.root.hidden = false; document.body.classList.add("atlas-search-open"); searchUi.input.focus(); searchUi.input.select(); }
  function closeSearch() { if (searchRequest) searchRequest.abort(); searchUi.root.hidden = true; document.body.classList.remove("atlas-search-open"); if (previousFocus && previousFocus.focus) previousFocus.focus(); }
  function trap(event) { var controls = Array.from(searchUi.panel.querySelectorAll("a[href],button,input")).filter(function (node) { return !node.disabled; }); if (!controls.length) return; var first=controls[0], last=controls[controls.length-1]; if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); } }

  function installSearch() {
    searchUi = buildSearch();
    document.querySelectorAll("[data-estate-search-open]").forEach(function (trigger) { trigger.addEventListener("click", function () { openSearch(trigger); }); });
    searchUi.scrim.addEventListener("click",closeSearch); searchUi.close.addEventListener("click",closeSearch);
    searchUi.panel.addEventListener("keydown",function (event) { if (event.key === "Tab") trap(event); });
    searchUi.input.addEventListener("input",function () { var query=searchUi.input.value.trim(); if (searchTimer) clearTimeout(searchTimer); if (query.length<2) { if (searchRequest) searchRequest.abort(); searchUi.results.replaceChildren(); searchUi.status.textContent=query?"keep typing…":"type at least two characters"; return; } searchTimer=setTimeout(function () { runSearch(query); },250); });
    window.addEventListener("keydown",function (event) { var key=event.key.toLowerCase(); if ((event.ctrlKey||event.metaKey)&&!event.altKey&&key==="k") { event.preventDefault(); openSearch(document.activeElement); } else if (key==="escape"&&!searchUi.root.hidden) closeSearch(); });
  }

  function installResponseAnnouncements() {
    var log = document.getElementById("log"); var region = document.getElementById("response-announcer"); if (!log || !region) return;
    var announced = new WeakSet();
    function inspect(entry) {
      if (!entry || announced.has(entry)) return;
      if (entry.classList.contains("error") && !entry.querySelector(".cursor")) { announced.add(entry); region.textContent = "Ramone response ended with an error."; return; }
      if (entry.querySelector(".entry-meta")) { announced.add(entry); region.textContent = "Ramone response complete."; }
    }
    var observer = new MutationObserver(function (records) { records.forEach(function (record) { var entry = record.target instanceof Element ? record.target.closest(".entry") : null; inspect(entry); record.addedNodes.forEach(function (node) { if (!(node instanceof Element)) return; inspect(node.matches(".entry") ? node : node.closest(".entry")); node.querySelectorAll && node.querySelectorAll(".entry").forEach(inspect); }); }); });
    observer.observe(log,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  }

  normalizeLinks(document);
  new MutationObserver(function (records) { records.forEach(function (record) { record.addedNodes.forEach(function (node) { if (node instanceof Element) normalizeLinks(node); }); }); }).observe(document.body,{childList:true,subtree:true});
  installSearch(); installResponseAnnouncements(); refreshStatus();
})();
</script>`;

export function renderFrontend(env) {
  let html = renderCoreFrontend(env);
  html = html.replace(
    /<title>Ramone — Atlas Systems<\/title>[\s\S]*?<link rel="icon" href="https:\/\/atlas-systems\.uk\/favicon\.ico" \/>/,
    HEAD,
  );
  html = html.replace("</style>\n</head>", `${SHELL_CSS}\n</style>\n</head>`);
  html = html.replace("<body>\n<div class=\"shell\">", `<body>\n${HEADER}\n<div class="shell">`);
  html = html.replace(
    '<div class="log" id="log" aria-live="polite"></div>',
    '<div class="log" id="log"></div><p class="sr-only" id="response-announcer" role="status" aria-live="polite" aria-atomic="true"></p>',
  );
  html = html.replace("</body>\n</html>", `${SHELL_SCRIPT}\n</body>\n</html>`);
  return html;
}
