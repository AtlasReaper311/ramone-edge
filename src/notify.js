/**
 * atlas-notify dispatch.
 *
 * Fires a single POST per Q&A to the central event bus. We use the
 * `persist_only: true` pattern documented in atlas-notify: it writes
 * into the ring buffer (so the Lab page Failure log can see 5xx events
 * and the new #ramone-log channel has history) without forcing a Discord
 * post on every successful question. A separate channel still receives
 * Discord-formatted summaries; that routing happens server-side in
 * atlas-notify based on signal_class.
 *
 * Called from `ctx.waitUntil(...)` so a slow or down atlas-notify never
 * blocks the user's response.
 */

export async function notify(env, payload) {
  if (!env.NOTIFY_URL || !env.NOTIFY_TOKEN) {
    return;
  }
  try {
    await fetch(env.NOTIFY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.NOTIFY_TOKEN}`,
      },
      body: JSON.stringify({
        signal_class: env.NOTIFY_SIGNAL_CLASS || "ramone",
        persist_only: payload.level === "info",
        ...payload,
      }),
    });
  } catch (err) {
    // Logging is best-effort.
    console.error("notify failed:", err);
  }
}

export function buildAskEvent({
  ipHash,
  promptChars,
  latencyMs,
  status,
  reason,
  sources,
  answerChars,
}) {
  return {
    level: status >= 500 ? "failure" : status >= 400 ? "warning" : "info",
    title:
      status === 503
        ? "ramone: asleep"
        : status >= 500
          ? "ramone: upstream error"
          : status === 429
            ? "ramone: rate limit"
            : status === 403
              ? "ramone: rejected"
              : "ramone: answered",
    message: reason
      ? `status=${status} reason=${reason} ip_hash=${ipHash}`
      : `status=${status} prompt=${promptChars}ch answer=${answerChars}ch latency=${latencyMs}ms sources=${sources}`,
    fields: {
      ip_hash: ipHash,
      prompt_chars: promptChars,
      answer_chars: answerChars,
      latency_ms: latencyMs,
      sources_used: sources,
      status,
      reason: reason || null,
    },
  };
}
