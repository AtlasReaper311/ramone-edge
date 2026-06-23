/**
 * The standalone Ramone interface served from GET /.
 * Turnstile removed — KV rate limits + UPSTREAM_SECRET are the protection layer.
 */

export function renderFrontend(env) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ramone — Atlas Systems</title>
<meta name="description" content="A local AI you can ask anything about Atlas Systems. Runs entirely on SPECULAR-CORE; no cloud inference." />
<meta name="theme-color" content="#0a0a0f" />
<meta property="og:title" content="Ramone — ask my infrastructure" />
<meta property="og:description" content="A grounded Q&A interface to Atlas Systems infrastructure, served by a local RTX 5070 through a Cloudflare Tunnel." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://ramone.atlas-systems.uk/" />
<link rel="icon" href="https://atlas-systems.uk/favicon.ico" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=DM+Serif+Display:ital@0;1&display=swap" />
<style>
  :root {
    --bg: #0a0a0f; --bg-1: #111118; --bg-2: #1a1a24;
    --border: rgba(255,255,255,0.08); --border-hi: rgba(255,255,255,0.16);
    --text: #e8e8e0; --text-dim: #aaa9a0; --text-faint: #555560;
    --accent: #f5a623; --accent-hover: #f7b84a; --accent-dim: rgba(245,166,35,0.12);
    --status-live: #4ade80; --status-down: #e24b4a;
    --grid: rgba(255,255,255,0.03);
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--bg); color: var(--text);
    font-family: "IBM Plex Mono", monospace;
    font-size: 14px; line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  body {
    background-image:
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 80px 80px; min-height: 100vh;
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { color: var(--accent-hover); text-decoration: underline; }
  .shell { max-width: 920px; margin: 0 auto; padding: 24px 20px 80px; }
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; background: var(--bg-1);
    border: 1px solid var(--border); border-radius: 4px; margin-bottom: 32px;
  }
  .brand { font-size: 13px; letter-spacing: 0.02em; color: var(--text-dim); }
  .brand strong { color: var(--text); font-weight: 500; }
  .brand a { color: var(--text-dim); }
  .brand a:hover { color: var(--accent); text-decoration: none; }
  .machine-state { display: flex; align-items: center; gap: 16px; font-size: 12px; color: var(--text-dim); }
  .machine-state .dot {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    margin-right: 6px; background: var(--text-faint);
    transition: background 0.3s, box-shadow 0.3s;
  }
  .machine-state.awake .dot {
    background: var(--status-live);
    box-shadow: 0 0 8px rgba(74,222,128,0.5);
    animation: pulse 2.4s ease-in-out infinite;
  }
  .machine-state.asleep .dot { background: var(--status-down); }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 8px rgba(74,222,128,0.5); }
    50%     { box-shadow: 0 0 14px rgba(74,222,128,0.9); }
  }
  .hero { margin-bottom: 32px; }
  .hero h1 {
    font-family: "DM Serif Display", Georgia, serif;
    font-weight: 400; font-size: 56px; line-height: 1.05;
    margin: 0 0 12px; color: var(--text);
  }
  .hero h1 em { color: var(--accent); font-style: italic; }
  .hero .lede { color: var(--text-dim); max-width: 640px; font-size: 14px; margin: 0; }
  .label {
    text-transform: uppercase; font-size: 10px; letter-spacing: 0.18em;
    color: var(--text-faint); margin: 32px 0 12px;
    display: flex; align-items: center; gap: 12px;
  }
  .label::after { content: ""; flex: 1; height: 1px; background: var(--border); }
  .suggestions { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; margin-bottom: 24px; }
  .suggestion {
    background: var(--bg-1); border: 1px solid var(--border);
    color: var(--text-dim); padding: 12px 14px; text-align: left;
    font-family: inherit; font-size: 13px; cursor: pointer; border-radius: 2px;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .suggestion:hover { border-color: var(--accent); color: var(--text); background: var(--accent-dim); }
  .suggestion::before { content: "→ "; color: var(--accent); margin-right: 4px; }
  @media (max-width:640px) { .suggestions { grid-template-columns: 1fr; } }
  .log { display: flex; flex-direction: column; gap: 24px; }
  .entry { border-left: 2px solid var(--border); padding: 0 0 0 16px; }
  .entry.error { border-left-color: var(--status-down); }
  .entry-prompt { color: var(--text); margin-bottom: 10px; word-wrap: break-word; }
  .entry-prompt::before {
    content: "you →"; display: inline-block; min-width: 56px;
    color: var(--text-faint); margin-right: 8px;
  }
  .entry-answer { color: var(--text-dim); white-space: pre-wrap; word-wrap: break-word; }
  .entry-answer::before {
    content: "R →"; display: inline-block; min-width: 56px;
    color: var(--accent); margin-right: 8px; vertical-align: top;
  }
  .cursor {
    display: inline-block; width: 7px; height: 14px;
    background: var(--accent); vertical-align: text-bottom; margin-left: 2px;
    animation: blink 1s steps(2,start) infinite;
  }
  @keyframes blink { to { visibility: hidden; } }
  .entry-meta { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: var(--text-faint); }
  .entry-sources { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
  .source { background: var(--bg-1); border: 1px solid var(--border); color: var(--text-dim); padding: 3px 8px; font-size: 11px; border-radius: 2px; }
  .source strong { color: var(--accent); font-weight: 500; margin-right: 4px; }
  .composer {
    position: sticky; bottom: 16px; margin-top: 32px;
    background: var(--bg-1); border: 1px solid var(--border);
    border-radius: 4px; padding: 14px;
  }
  .composer.focused { border-color: var(--accent); }
  .composer-prompt { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; margin-bottom: 8px; }
  textarea.input {
    width: 100%; background: transparent; border: none; outline: none;
    color: var(--text); font-family: inherit; font-size: 14px;
    line-height: 1.5; resize: none; min-height: 24px; max-height: 240px;
  }
  textarea.input::placeholder { color: var(--text-faint); }
  .composer-actions { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
  .char-count { color: var(--text-faint); font-size: 11px; margin-right: auto; }
  .char-count.warn { color: var(--accent); }
  .char-count.over { color: var(--status-down); }
  button.transmit {
    background: var(--accent); color: var(--bg); border: none;
    padding: 8px 18px; font-family: inherit; font-size: 13px;
    font-weight: 500; cursor: pointer; border-radius: 2px; transition: background 0.15s;
  }
  button.transmit:hover { background: var(--accent-hover); }
  button.transmit:disabled { background: var(--bg-2); color: var(--text-faint); cursor: not-allowed; }
  .footer {
    margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border);
    color: var(--text-faint); font-size: 11px;
    display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between;
  }
  .footer a { color: var(--text-dim); }
  .footer a:hover { color: var(--accent); text-decoration: none; }
  @media (prefers-reduced-motion: reduce) {
    .machine-state.awake .dot { animation: none; }
    .cursor { animation: none; opacity: 0.6; }
    * { transition: none !important; }
  }
</style>
</head>
<body>
<div class="shell">
  <header class="topbar">
    <div class="brand">
      <a href="https://atlas-systems.uk/">atlas-systems</a>
      <span style="color:var(--text-faint)">//</span>
      <strong>ramone</strong>
    </div>
    <div class="machine-state" id="machine-state" aria-live="polite">
      <span class="dot"></span><span id="state-text">connecting</span>
    </div>
  </header>

  <section class="hero">
    <h1>Ask my <em>infrastructure</em>.</h1>
    <p class="lede">A local AI grounded on Atlas Systems documentation. Every query runs on the RTX 5070 inside SPECULAR-CORE through a Cloudflare Tunnel, with no third-party inference. Sources are surfaced beneath every answer.</p>
  </section>

  <div class="label">try one of these</div>
  <div class="suggestions" id="suggestions">
    <button class="suggestion" type="button">What runs at api.atlas-systems.uk?</button>
    <button class="suggestion" type="button">How does the CI/CD pipeline work?</button>
    <button class="suggestion" type="button">Why Cloudflare Workers over a VPS?</button>
    <button class="suggestion" type="button">What's the local AI stack on SPECULAR-CORE?</button>
  </div>

  <div class="label" id="log-label" style="display:none">transmission log</div>
  <div class="log" id="log" aria-live="polite"></div>

  <div class="composer" id="composer">
    <div class="composer-prompt">&gt; ask ramone</div>
    <textarea
      class="input" id="input" rows="1" maxlength="2000"
      placeholder="type a question and press enter, or shift+enter for a new line"
      aria-label="Ask Ramone a question"
    ></textarea>
    <div class="composer-actions">
      <span class="char-count" id="char-count">0 / 2000</span>
      <button class="transmit" id="send" type="button" disabled>transmit</button>
    </div>
  </div>

  <footer class="footer">
    <div>built and maintained by <a href="https://atlas-systems.uk/about">atlas reaper</a></div>
    <div>
      <a href="https://atlas-systems.uk/writing/ramone-local-ai-system/">read the build log</a>
      &nbsp;·&nbsp;
      <a href="https://github.com/AtlasReaper311/ollama-rag-kit">source</a>
    </div>
  </footer>
</div>

<script>
(function () {
  "use strict";

  var stateEl   = document.getElementById("machine-state");
  var stateText = document.getElementById("state-text");
  var log       = document.getElementById("log");
  var logLabel  = document.getElementById("log-label");
  var input     = document.getElementById("input");
  var sendBtn   = document.getElementById("send");
  var charCount = document.getElementById("char-count");
  var composer  = document.getElementById("composer");
  var suggestions = document.getElementById("suggestions");
  var MAX = 2000;
  var inFlight = false;

  function updateCharCount() {
    var n = input.value.length;
    charCount.textContent = n + " / " + MAX;
    charCount.classList.toggle("warn", n > MAX * 0.8 && n <= MAX);
    charCount.classList.toggle("over", n > MAX);
  }
  function updateSendState() {
    var has = input.value.trim().length > 0 && input.value.length <= MAX;
    sendBtn.disabled = !(has && !inFlight);
  }
  function autosize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 240) + "px";
  }

  input.addEventListener("input", function () {
    updateCharCount(); updateSendState(); autosize();
  });
  input.addEventListener("focus", function () { composer.classList.add("focused"); });
  input.addEventListener("blur",  function () { composer.classList.remove("focused"); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); transmit(); }
  });
  suggestions.addEventListener("click", function (e) {
    var btn = e.target.closest("button.suggestion");
    if (!btn) return;
    input.value = btn.textContent;
    updateCharCount(); autosize(); updateSendState(); input.focus();
  });
  sendBtn.addEventListener("click", transmit);

  var lastAwake = null;
  function setMachineState(awake) {
    if (awake === lastAwake) return;
    lastAwake = awake;
    stateEl.classList.toggle("awake", awake);
    stateEl.classList.toggle("asleep", !awake);
    stateText.textContent = awake ? "awake · llama3.1:8b · RTX 5070" : "asleep";
  }
  async function pollStatus() {
    try {
      var res = await fetch("/status", { cache: "no-store" });
      if (!res.ok) throw new Error();
      var data = await res.json();
      setMachineState(data.awake);
    } catch (_) { setMachineState(false); }
  }
  pollStatus();
  setInterval(pollStatus, 30000);

  async function transmit() {
    var question = input.value.trim();
    if (!question || question.length > MAX || inFlight) return;

    inFlight = true;
    updateSendState();
    logLabel.style.display = "";

    var entry = appendEntry(question);
    var ans = entry.querySelector(".entry-answer");
    var cursor = document.createElement("span");
    cursor.className = "cursor";
    ans.appendChild(cursor);

    var startedAt = performance.now();
    var firstTokenAt = null;
    var totalChars = 0;
    var sourcesRendered = false;

    try {
      var res = await fetch("/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: question }),
      });

      if (res.status === 503) {
        var d = await res.json().catch(function () { return {}; });
        renderSleeping(entry, ans, cursor, d.message);
        return;
      }
      if (res.status === 429) { renderError(entry, ans, cursor, "Rate limit hit. Try again in a bit."); return; }
      if (res.status === 403) { renderError(entry, ans, cursor, "Request blocked."); return; }
      if (!res.ok || !res.body) { renderError(entry, ans, cursor, "Something went wrong upstream."); return; }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var textNode = document.createTextNode("");
      ans.insertBefore(textNode, cursor);

      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        var idx;
        while ((idx = buffer.indexOf("\\n\\n")) >= 0) {
          var raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          var lines = raw.split("\\n");
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line.startsWith("data:")) continue;
            var payload = line.slice(5).trim();
            if (!payload) continue;
            var evt;
            try { evt = JSON.parse(payload); } catch (_) { continue; }
            if (evt.type === "token" && typeof evt.text === "string") {
              if (firstTokenAt === null) firstTokenAt = performance.now();
              textNode.data += evt.text;
              totalChars += evt.text.length;
              ans.scrollIntoView({ block: "end", behavior: "smooth" });
            } else if (evt.type === "sources" && Array.isArray(evt.sources)) {
              renderSources(entry, evt.sources);
              sourcesRendered = true;
            } else if (evt.type === "error" && typeof evt.reason === "string") {
              renderError(entry, ans, cursor, evt.reason);
              return;
            }
          }
        }
      }
      cursor.remove();
      renderMeta(entry, {
        firstTokenMs: firstTokenAt !== null ? Math.round(firstTokenAt - startedAt) : null,
        totalMs: Math.round(performance.now() - startedAt),
        chars: totalChars,
      });
    } catch (err) {
      console.error(err);
      renderError(entry, ans, cursor, "Network error. Check your connection.");
    } finally {
      inFlight = false;
      input.value = "";
      updateCharCount(); autosize(); updateSendState();
    }
  }

  function appendEntry(question) {
    var el = document.createElement("article");
    el.className = "entry";
    var p = document.createElement("div");
    p.className = "entry-prompt";
    p.textContent = question;
    var a = document.createElement("div");
    a.className = "entry-answer";
    el.appendChild(p); el.appendChild(a);
    log.appendChild(el);
    return el;
  }
  function renderSources(entry, sources) {
    var wrap = document.createElement("div");
    wrap.className = "entry-sources";
    sources.forEach(function (s, i) {
      var tag = document.createElement("span");
      tag.className = "source";
      tag.innerHTML = "<strong>[" + (i + 1) + "]</strong> " + escapeHtml(s.id || "source");
      if (s.preview) tag.title = s.preview;
      wrap.appendChild(tag);
    });
    entry.appendChild(wrap);
  }
  function renderMeta(entry, m) {
    var wrap = document.createElement("div");
    wrap.className = "entry-meta";
    var parts = [];
    if (m.firstTokenMs !== null) parts.push("first token " + m.firstTokenMs + "ms");
    parts.push("total " + m.totalMs + "ms");
    parts.push(m.chars + " chars");
    wrap.textContent = parts.join(" · ");
    entry.appendChild(wrap);
  }
  function renderSleeping(entry, ans, cursor, message) {
    entry.classList.add("error");
    cursor.remove();
    ans.textContent = message || "Ramone is asleep right now. Try again later.";
  }
  function renderError(entry, ans, cursor, message) {
    entry.classList.add("error");
    cursor.remove();
    if (!ans.textContent) { ans.textContent = message; }
    else {
      var e = document.createElement("div");
      e.style.color = "var(--status-down)";
      e.style.marginTop = "8px";
      e.textContent = message;
      entry.appendChild(e);
    }
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  updateCharCount();
  updateSendState();
})();
</script>
</body>
</html>`;
}
