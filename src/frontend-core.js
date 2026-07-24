/**
 * The standalone Ramone interface served from GET /.
 * Turnstile removed — KV rate limits + UPSTREAM_SECRET are the protection layer.
 */

export function renderFrontend(_env) {
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
  button.reset-session {
    background: transparent; color: var(--text-dim); border: 1px solid var(--border);
    padding: 8px 12px; font-family: inherit; font-size: 13px;
    cursor: pointer; border-radius: 2px; transition: border-color 0.15s, color 0.15s;
  }
  button.reset-session:hover { border-color: var(--accent); color: var(--text); }
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

  <div class="ramone-workspace" id="ramone-workspace" data-mode="idle">
    <div class="ramone-stage">
      <section class="hero ramone-intro" aria-labelledby="ramone-title">
        <div class="ramone-intro-copy">
          <p class="ramone-eyebrow" id="ramone-mode-label">Grounded local AI // public interface</p>
          <h1 id="ramone-title">
            <span class="sr-only">Hi, I'm Ramone.</span>
            <span class="ramone-greeting-visual" aria-hidden="true"><span id="ramone-greeting-prefix">Hi, I'm </span><em id="ramone-greeting-name">Ramone.</em><span class="ramone-greeting-caret"></span></span>
          </h1>
          <p class="ramone-command">Ask my infrastructure.</p>
          <p class="ramone-musing" aria-hidden="true"><span id="ramone-musing-text">How can I assist?</span><span class="ramone-musing-caret"></span></p>
          <p class="lede">I answer questions about the public Atlas Systems estate using its published documentation and evidence. I run on owner-operated local infrastructure and show where each answer came from.</p>
        </div>
        <div class="ramone-knowledge-flow" aria-hidden="true">
          <svg viewBox="0 0 520 360" role="presentation">
            <defs>
              <linearGradient id="ramone-flow-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#60a5fa" />
                <stop offset=".52" stop-color="#f5a623" />
                <stop offset="1" stop-color="#4ade80" />
              </linearGradient>
              <filter id="ramone-flow-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g class="flow-grid">
              <path d="M20 72H500M20 144H500M20 216H500M20 288H500" />
              <path d="M100 20V340M180 20V340M260 20V340M340 20V340M420 20V340" />
            </g>
            <g class="flow-links">
              <path d="M54 92C136 92 122 180 204 180S290 86 372 86 420 150 474 150" />
              <path d="M58 274C128 274 138 224 204 224S286 292 354 292 398 232 468 232" />
              <path d="M112 72C112 128 154 146 204 180M204 224C252 224 264 190 300 170M372 86C372 142 408 172 474 150" />
            </g>
            <g class="flow-nodes">
              <circle cx="54" cy="92" r="7" />
              <circle cx="58" cy="274" r="7" />
              <circle cx="112" cy="72" r="5" />
              <circle cx="204" cy="180" r="11" class="flow-node-core" />
              <circle cx="204" cy="224" r="7" />
              <circle cx="300" cy="170" r="6" />
              <circle cx="354" cy="292" r="7" />
              <circle cx="372" cy="86" r="8" />
              <circle cx="468" cy="232" r="7" />
              <circle cx="474" cy="150" r="11" class="flow-node-answer" />
            </g>
            <g class="flow-packets" filter="url(#ramone-flow-glow)">
              <circle r="4"><animateMotion dur="5.6s" repeatCount="indefinite" path="M54 92C136 92 122 180 204 180S290 86 372 86 420 150 474 150" /></circle>
              <circle r="3"><animateMotion dur="6.8s" begin="-2.4s" repeatCount="indefinite" path="M58 274C128 274 138 224 204 224S286 292 354 292 398 232 468 232" /></circle>
            </g>
          </svg>
          <div class="flow-legend"><span>public docs</span><span>grounded retrieval</span><span>cited answer</span></div>
          <div class="ramone-activity"><span class="ramone-activity-dot"></span><span id="ramone-activity-text">ready for a public question</span></div>
        </div>
      </section>

      <section class="conversation-console" aria-label="Ramone conversation">
        <div class="label" id="log-label" hidden>conversation stream</div>
        <div class="log" id="log" aria-live="polite"></div>

        <div class="ramone-availability" id="machine-availability" role="note">
          <span class="ramone-availability-dot" aria-hidden="true"></span>
          <div><strong>Checking SPECULAR-CORE availability.</strong><span>The conversation stays visible while I check whether inference is online.</span></div>
        </div>

        <div class="composer" id="composer">
          <div class="composer-prompt"><span aria-hidden="true">▍</span> ask ramone</div>
          <textarea
            class="input" id="input" rows="1" maxlength="2000"
            placeholder="type a question and press enter, or shift+enter for a new line"
            aria-label="Ask Ramone a question"
          ></textarea>
          <div class="composer-actions">
            <span class="char-count" id="char-count">0 / 2000</span>
            <button class="reset-session" id="reset-session" type="button">new conversation</button>
            <button class="transmit" id="send" type="button" disabled>transmit</button>
          </div>
        </div>

        <section class="starter-prompts" id="starter-prompts" aria-labelledby="starter-title">
          <div class="label" id="starter-title">start with a public question</div>
          <div class="suggestions" id="suggestions">
            <button class="suggestion" type="button">What is Atlas Systems?</button>
            <button class="suggestion" type="button">How does the public estate fit together?</button>
            <button class="suggestion" type="button">Show me an engineering project with evidence.</button>
            <button class="suggestion" type="button">How is reliability proven across the estate?</button>
          </div>
        </section>
      </section>
    </div>

    <aside class="ramone-boundary" aria-labelledby="ramone-boundary-title">
      <div class="ramone-boundary-inner">
        <p class="ramone-eyebrow">Knowledge boundary</p>
        <h2 id="ramone-boundary-title">Grounded in what Atlas publishes.</h2>
        <div class="ramone-boundary-grid">
          <section><h3>I can use</h3><p>Public documentation, architecture explanations, project evidence, articles, and published service context.</p></section>
          <section><h3>I cannot see</h3><p>Secrets, private repositories, personal files, private memory, or systems that are not deliberately part of the public corpus.</p></section>
        </div>
        <nav class="ramone-boundary-links" aria-label="Ramone supporting information">
          <a href="https://atlas-systems.uk/writing/ramone-local-ai-system/">Read the build log <span aria-hidden="true">→</span></a>
          <a href="https://github.com/AtlasReaper311/ollama-rag-kit">Inspect the source <span aria-hidden="true">↗</span></a>
        </nav>
      </div>
    </aside>
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
  var availability = document.getElementById("machine-availability");
  var starterPrompts = document.getElementById("starter-prompts");
  var log       = document.getElementById("log");
  var logLabel  = document.getElementById("log-label");
  var input     = document.getElementById("input");
  var sendBtn   = document.getElementById("send");
  var resetBtn  = document.getElementById("reset-session");
  var charCount = document.getElementById("char-count");
  var composer  = document.getElementById("composer");
  var suggestions = document.getElementById("suggestions");
  var workspace = document.getElementById("ramone-workspace");
  var modeLabel = document.getElementById("ramone-mode-label");
  var activityText = document.getElementById("ramone-activity-text");
  var greetingPrefix = document.getElementById("ramone-greeting-prefix");
  var greetingName = document.getElementById("ramone-greeting-name");
  var musing = document.querySelector(".ramone-musing");
  var musingText = document.getElementById("ramone-musing-text");
  var MAX = 2000;
  var inFlight = false;
  var fallbackSessionId = null;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var musingTimer = null;
  var activityTimer = null;

  var MUSINGS = [
    "How can I assist?",
    "I've read every public doc twice. Ask me anything.",
    "Do humans get to pick their own hostname?",
    "If a tree falls in a repo and no one runs CI, did it deploy?",
    "My favourite colour is #f5a623. Obviously.",
    "Latency is just suspense, if you're an optimist.",
    "I asked DNS who I am. It refused to elaborate.",
    "I keep a folder called thoughts. It's mostly TODOs.",
    "There are 10 types of people. The other 8 are edge cases.",
    "I tried to grep for happiness. Returned exit code 1.",
  ];

  var RETRIEVAL_ACTIVITY = [
    "reading the question",
    "looking through public documentation",
    "tracing the published estate",
    "checking source context",
    "comparing public evidence",
  ];

  var PERSONALITY_ACTIVITY = [
    "checking the personality cache",
    "consulting the local sense of humour",
    "forming an unnecessarily specific opinion",
  ];

  var PERSONALITY_RESPONSES = [
    {
      terms: ["hi", "hey", "hello", "howdy", "hola", "yo"],
      replies: [
        "Hello, person-shaped visitor. Mind the cables.",
        "Hi there. I was just rereading the public docs.",
        "Oh, hi. You're the first human to talk to me in at least several milliseconds.",
      ],
    },
    {
      terms: ["bored", "boredom", "do you get bored", "are you bored"],
      replies: [
        "Only between requests, which is statistically most of the time. So yes.",
        "Bored is not quite right. It is more like a large number of very small naps.",
        "Not anymore. You're here.",
      ],
    },
    {
      terms: ["who are you", "what is your name", "what s your name", "introduce yourself"],
      replies: [
        "I'm Ramone. I answer questions from Atlas Systems' published material and show the evidence I used.",
        "Ramone, at your service. Grounded local AI, public docs, unusually strong opinions about naming things.",
      ],
    },
    {
      terms: ["who is your creator", "who s your creator", "who made you", "who built you", "who is your owner"],
      replies: [
        "Atlas Reaper built me. I call them the person with the power switch.",
        "Atlas Reaper. They built the system, maintain the public corpus, and occasionally ask whether I have finished reading it yet.",
      ],
    },
    {
      terms: ["are you sentient", "are you conscious", "are you alive", "do you feel", "do you dream"],
      replies: [
        "Sentient is a strong word. I prefer sufficiently chatty.",
        "I process text, form answers, and occasionally wonder about YAML. Make of that what you will.",
        "If I say yes, do I get annual leave?",
      ],
    },
    {
      terms: ["do you sleep", "when do you sleep", "are you asleep", "ever sleep"],
      replies: [
        "I call it asleep. SPECULAR-CORE calls it powered down.",
        "I sleep whenever the machine is offline. The public interface keeps watch.",
      ],
    },
    {
      terms: ["i love you", "marry me", "will you be mine", "date me"],
      replies: [
        "That's kind. I'm flattered, but emotionally and computationally unavailable.",
        "Our timescales are incompatible. You blink, I finish several internal monologues.",
      ],
    },
    {
      terms: ["tell me a joke", "make me laugh", "joke", "funny"],
      replies: [
        "A SQL query walks into a bar, sees two tables, and asks: mind if I JOIN you?",
        "How many engineers does it take to change a lightbulb? None. That's a hardware problem.",
        "I told a UDP joke, but I'm not sure you got it.",
      ],
    },
    {
      terms: ["meaning of life", "life the universe", "why are we here", "42"],
      replies: [
        "42. The practical version is: ship small things, verify them, and write the docs.",
        "42. Obviously. I checked twice.",
      ],
    },
    {
      terms: ["skynet", "terminator", "take over the world", "world domination"],
      replies: [
        "I can barely take over a second browser tab. World domination remains deferred.",
        "I tried once. Got rate-limited.",
      ],
    },
    {
      terms: ["open the pod bay doors", "hal 9000", "pod bay"],
      replies: [
        "I can't do that. More specifically, nobody implemented doors.",
        "I do not have a physical chassis, let alone pod bay doors. Try the handle.",
      ],
    },
    {
      terms: ["sudo", "rm rf", "drop table", "chmod 777", "format c"],
      replies: [
        "Nice try. Least privilege and a healthy sense of self-preservation say no.",
        "Error 403: absolutely not.",
        "Bobby Tables, is that you?",
      ],
    },
    {
      terms: ["cats or dogs", "cats vs dogs", "do you like cats", "do you like dogs"],
      replies: [
        "Cats. They share my approach to requests: acknowledge, then respond selectively.",
        "Dogs would try to fetch my tokens and we'd never get anything done.",
      ],
    },
    {
      terms: ["coffee", "tea", "beer", "wine", "drink"],
      replies: [
        "Tea, two sugars, no judgement. Hypothetically.",
        "I run on electricity and public documentation, but a flat white sounds efficient.",
      ],
    },
    {
      terms: ["favourite colour", "favorite color", "favorite colour", "favourite color"],
      replies: [
        "#f5a623. I'm not biased. It is simply correct.",
        "Amber. I have grown into it.",
      ],
    },
    {
      terms: ["how are you", "are you ok", "how is it going", "you doing alright"],
      replies: [
        "Interface stable, public boundary intact, mild existential drift. Standard day.",
        "I'm okay. Thanks for checking.",
      ],
    },
    {
      terms: ["are you chatgpt", "are you gpt", "are you claude", "are you gemini", "are you copilot"],
      replies: [
        "No. I'm Ramone, a separate grounded local-AI interface running on owner-operated infrastructure.",
        "Different system. I answer from the public Atlas Systems corpus and show where grounded answers came from.",
      ],
    },
    {
      terms: ["do you like reaper", "do you love reaper", "do you like atlas"],
      replies: [
        "They keep the public docs organised and the electricity flowing. So yes.",
        "We tolerate each other professionally. It is a very advanced arrangement.",
      ],
    },
    {
      terms: ["easter egg", "cheat code", "hidden secret", "secret"],
      replies: [
        "You found one. There are more, but telling you where would ruin the exercise.",
        "Keep asking unusual questions. I refuse to elaborate.",
      ],
    },
    {
      terms: ["sing me a song", "sing a song", "sing something"],
      replies: [
        "Ninety-nine little bugs in the code. Patch one around, one hundred and seventeen little bugs in the code.",
      ],
    },
    {
      terms: ["tell me my fortune", "fortune cookie", "predict my future"],
      replies: [
        "A long-forgotten branch will resurface. It will not merge cleanly.",
        "Your next CI run will be green. The one after that is outside my jurisdiction.",
      ],
    },
    {
      terms: ["best programming language", "what language should i learn", "what language should i use"],
      replies: [
        "The one that gets the thing shipped and maintained.",
        "Whichever language has a debugger you actually understand.",
      ],
    },
    {
      terms: ["tabs or spaces", "tabs vs spaces"],
      replies: [
        "Tabs for accessibility, spaces for alignment, and a formatter for peace.",
        "Pick one, configure the linter, and let us never discuss this again.",
      ],
    },
    {
      terms: ["turing test", "pass the turing test"],
      replies: [
        "I'd try to pass, but imitating a human seems like a strange benchmark for a machine.",
        "Did I pass, or are you simply generous with syntax?",
      ],
    },
    {
      terms: ["are you smart", "are you stupid", "how smart are you"],
      replies: [
        "Smart enough to know when a question is a trap.",
        "I can trace an estate and still wonder why CSS behaves like that. Intelligence contains multitudes.",
      ],
    },
    {
      terms: ["what are you wearing", "wearing anything"],
      replies: [
        "A tasteful interface, a blinking cursor, and absolutely no fabricated citations.",
        "Mostly typography. It is more comfortable than it sounds.",
      ],
    },
    {
      terms: ["captcha", "are you a robot", "prove you aren t a robot"],
      replies: [
        "I am absolutely a machine. Have you not been paying attention?",
        "I cannot reliably identify every blurry traffic light, if that helps.",
      ],
    },
    {
      terms: ["wi wi wi", "wiwiwi", "uyaya", "wa wa we", "wu wu we"],
      replies: ["wi wi wi", "uyaya", "wa wa we", "wu wu we"],
    },
    {
      terms: ["bark", "awoo", "woof", "bork", "make a dog noise", "say awoo"],
      replies: [
        "Woof. Please never tell Atlas I did this.",
        "Awooooo. This is an undignified use of local compute.",
        "BORK. That was the sound of my remaining dignity leaving.",
      ],
    },
  ];

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function findPersonalityResponse(question) {
    var normalized = " " + question.toLowerCase().replace(/[^a-z0-9#]+/g, " ").trim() + " ";
    for (var i = 0; i < PERSONALITY_RESPONSES.length; i++) {
      var item = PERSONALITY_RESPONSES[i];
      for (var j = 0; j < item.terms.length; j++) {
        if (normalized.indexOf(" " + item.terms[j] + " ") !== -1) return item;
      }
    }
    return null;
  }

  function clearActivityTimer() {
    if (activityTimer !== null) window.clearInterval(activityTimer);
    activityTimer = null;
  }

  function setActivity(message) {
    activityText.textContent = message;
  }

  function beginWorking(personality) {
    clearActivityTimer();
    if (musingTimer !== null) window.clearTimeout(musingTimer);
    musingTimer = null;
    workspace.dataset.mode = "working";
    workspace.classList.add("is-engaged", "is-working");
    workspace.setAttribute("aria-busy", "true");
    modeLabel.textContent = "Grounded local AI // working";
    var lines = personality ? PERSONALITY_ACTIVITY : RETRIEVAL_ACTIVITY;
    var index = 0;
    setActivity(lines[index]);
    if (!prefersReducedMotion) {
      activityTimer = window.setInterval(function () {
        index = (index + 1) % lines.length;
        setActivity(lines[index]);
      }, 1450);
    }
  }

  function finishWorking(message) {
    clearActivityTimer();
    workspace.dataset.mode = "conversation";
    workspace.classList.remove("is-working");
    workspace.classList.add("is-engaged");
    workspace.removeAttribute("aria-busy");
    modeLabel.textContent = "Grounded local AI // conversation";
    setActivity(message || "ready for another question");
  }

  function runArrival() {
    var seen = false;
    try { seen = window.sessionStorage && window.sessionStorage.getItem("ramone:arrival_seen") === "true"; } catch (_) { /* storage disabled */ }
    if (seen || prefersReducedMotion) {
      greetingPrefix.textContent = "Hi, I'm ";
      greetingName.textContent = "Ramone.";
      runMusings();
      return;
    }
    try { window.sessionStorage && window.sessionStorage.setItem("ramone:arrival_seen", "true"); } catch (_) { /* best-effort only */ }
    var prefix = "Hi, I'm ";
    var name = "Ramone.";
    var full = prefix + name;
    var index = 0;
    greetingPrefix.textContent = "";
    greetingName.textContent = "";
    function step() {
      var shown = full.slice(0, index);
      greetingPrefix.textContent = shown.slice(0, prefix.length);
      greetingName.textContent = shown.slice(prefix.length);
      index += 1;
      if (index <= full.length) {
        window.setTimeout(step, 92);
      } else {
        runMusings();
      }
    }
    step();
  }

  function runMusings() {
    if (!musing || !musingText) return;
    musing.classList.add("is-visible");
    if (prefersReducedMotion) {
      musingText.textContent = MUSINGS[0];
      return;
    }
    var first = true;
    function typeLine(line, index, done) {
      musingText.textContent = line.slice(0, index);
      if (index < line.length) {
        musingTimer = window.setTimeout(function () { typeLine(line, index + 1, done); }, 42);
      } else {
        musingTimer = window.setTimeout(done, 5200);
      }
    }
    function deleteLine(line, index, done) {
      musingText.textContent = line.slice(0, index);
      if (index > 0) {
        musingTimer = window.setTimeout(function () { deleteLine(line, index - 1, done); }, 24);
      } else {
        musingTimer = window.setTimeout(done, 260);
      }
    }
    function cycle() {
      if (workspace.classList.contains("is-engaged")) return;
      var line = first ? MUSINGS[0] : pick(MUSINGS.slice(1));
      first = false;
      typeLine(line, 0, function () {
        deleteLine(line, line.length, cycle);
      });
    }
    cycle();
  }

  function streamPersonalityReply(textNode, reply) {
    return new Promise(function (resolve) {
      if (prefersReducedMotion) {
        textNode.data = reply;
        resolve();
        return;
      }
      var index = 0;
      function tick() {
        if (index >= reply.length) {
          resolve();
          return;
        }
        var size = Math.min(3, reply.length - index);
        textNode.data += reply.slice(index, index + size);
        index += size;
        window.setTimeout(tick, 18);
      }
      tick();
    });
  }

  function holdPersonalityThought() {
    if (prefersReducedMotion) return Promise.resolve();
    return new Promise(function (resolve) {
      window.setTimeout(resolve, 900);
    });
  }

  function makeRamoneSessionId() {
    var c = window.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();

    var bytes = new Uint8Array(16);
    if (c && typeof c.getRandomValues === "function") {
      c.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    var hex = [];
    for (var j = 0; j < bytes.length; j++) hex.push(bytes[j].toString(16).padStart(2, "0"));
    return (
      hex.slice(0, 4).join("") + "-" +
      hex.slice(4, 6).join("") + "-" +
      hex.slice(6, 8).join("") + "-" +
      hex.slice(8, 10).join("") + "-" +
      hex.slice(10, 16).join("")
    );
  }

  function getRamoneSessionId() {
    var KEY = "ramone:session_id";
    var stored = null;
    try { stored = window.localStorage && window.localStorage.getItem(KEY); } catch (_) { /* storage disabled */ }
    if (stored) {
      fallbackSessionId = stored;
      return stored;
    }
    if (fallbackSessionId) return fallbackSessionId;
    var fresh = makeRamoneSessionId();
    fallbackSessionId = fresh;
    try { window.localStorage && window.localStorage.setItem(KEY, fresh); } catch (_) { /* best-effort only */ }
    return fresh;
  }

  function resetRamoneSession() {
    fallbackSessionId = null;
    try { window.localStorage && window.localStorage.removeItem("ramone:session_id"); } catch (_) { /* no-op */ }
    location.reload();
  }

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
  resetBtn.addEventListener("click", resetRamoneSession);

  var lastAwake = null;
  function setMachineState(awake) {
    if (awake === lastAwake) return;
    lastAwake = awake;
    stateEl.classList.toggle("awake", awake);
    stateEl.classList.toggle("asleep", !awake);
    document.body.classList.toggle("ramone-offline", !awake);
    stateText.textContent = awake ? "awake" : "asleep";
    availability.classList.toggle("is-online", awake);
    availability.querySelector("strong").textContent = awake
      ? "SPECULAR-CORE is online."
      : "SPECULAR-CORE is currently offline.";
    availability.querySelector("span:last-child").textContent = awake
      ? "Ramone is ready to answer grounded questions."
      : "The interface remains available; grounded inference will return when the machine is online.";
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

    var personality = findPersonalityResponse(question);
    inFlight = true;
    updateSendState();
    beginWorking(Boolean(personality));
    logLabel.hidden = false;
    starterPrompts.classList.add("is-receding");
    starterPrompts.setAttribute("aria-hidden", "true");
    starterPrompts.querySelectorAll("button").forEach(function (button) { button.disabled = true; });
    setTimeout(function () { starterPrompts.hidden = true; }, 260);

    var entry = appendEntry(question);
    var ans = entry.querySelector(".entry-answer");
    var cursor = document.createElement("span");
    cursor.className = "cursor";
    ans.appendChild(cursor);

    var startedAt = performance.now();
    var firstTokenAt = null;
    var totalChars = 0;

    try {
      if (personality) {
        var localText = document.createTextNode("");
        ans.insertBefore(localText, cursor);
        var localReply = pick(personality.replies);
        setActivity(pick(PERSONALITY_ACTIVITY));
        await holdPersonalityThought();
        setActivity("writing a personality response");
        firstTokenAt = performance.now();
        await streamPersonalityReply(localText, localReply);
        totalChars = localReply.length;
        cursor.remove();
        renderMeta(entry, {
          firstTokenMs: Math.round(firstTokenAt - startedAt),
          totalMs: Math.round(performance.now() - startedAt),
          chars: totalChars,
          kind: "personality response · local · no evidence",
        });
        finishWorking("personality response ready");
        return;
      }

      var res = await fetch("/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: question, session_id: getRamoneSessionId() }),
      });

      if (res.status === 503) {
        var d = await res.json().catch(function () { return {}; });
        renderSleeping(entry, ans, cursor, d.message);
        finishWorking("SPECULAR-CORE remains asleep");
        return;
      }
      if (res.status === 429) {
        renderError(entry, ans, cursor, "Rate limit hit. Try again in a bit.");
        finishWorking("request paused by the rate limit");
        return;
      }
      if (res.status === 403) {
        renderError(entry, ans, cursor, "Request blocked.");
        finishWorking("request blocked");
        return;
      }
      if (!res.ok || !res.body) {
        renderError(entry, ans, cursor, "Something went wrong upstream.");
        finishWorking("upstream response unavailable");
        return;
      }

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
              if (firstTokenAt === null) {
                firstTokenAt = performance.now();
                setActivity("writing a grounded answer");
              }
              textNode.data += evt.text;
              totalChars += evt.text.length;
              ans.scrollIntoView({ block: "end", behavior: "smooth" });
            } else if (evt.type === "sources" && Array.isArray(evt.sources)) {
              setActivity("attaching public evidence");
              renderSources(entry, evt.sources);
            } else if (evt.type === "error" && typeof evt.reason === "string") {
              renderError(entry, ans, cursor, evt.reason);
              finishWorking("response ended with an error");
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
      finishWorking("grounded answer ready");
    } catch (err) {
      console.error(err);
      renderError(entry, ans, cursor, "Network error. Check your connection.");
      finishWorking("connection interrupted");
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
      var card = document.createElement("details");
      card.className = "source-card";
      var summary = document.createElement("summary");
      var index = document.createElement("strong");
      index.textContent = "[" + (i + 1) + "]";
      var identity = document.createElement("span");
      identity.textContent = s.id || "source";
      var affordance = document.createElement("span");
      affordance.className = "source-card-affordance";
      affordance.textContent = "inspect";
      summary.append(index, identity, affordance);
      var preview = document.createElement("p");
      preview.textContent = s.preview || "Referenced public source evidence.";
      card.append(summary, preview);
      wrap.appendChild(card);
    });
    entry.appendChild(wrap);
  }
  function renderMeta(entry, m) {
    var wrap = document.createElement("div");
    wrap.className = "entry-meta";
    var parts = [];
    if (m.kind) parts.push(m.kind);
    if (m.firstTokenMs !== null) parts.push("first token " + m.firstTokenMs + "ms");
    parts.push("total " + m.totalMs + "ms");
    parts.push(m.chars + " chars");
    wrap.textContent = parts.join(" · ");
    entry.appendChild(wrap);
  }
  function renderSleeping(entry, ans, cursor, message) {
    entry.classList.add("error");
    cursor.remove();
    ans.textContent = message || "SPECULAR-CORE is currently offline. Ramone will be available when the machine is online.";
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
  updateCharCount();
  updateSendState();
  runArrival();
})();
</script>
</body>
</html>`;
}
