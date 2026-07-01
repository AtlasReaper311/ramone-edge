/**
 * atlas-notify dispatch for ramone-edge.
 * Uses a Service Binding (env.ATLAS_NOTIFY) to call atlas-notify
 * directly inside Cloudflare's network — no public internet hop.
 */

export async function notify(env, payload) {
  if (!env.NOTIFY_TOKEN) {
    console.error("notify: NOTIFY_TOKEN not set");
    return;
  }

  const signalClass = env.NOTIFY_SIGNAL_CLASS || "ramone";
  const body = {
    signal_class: signalClass,
    persist_only: payload.level === "info",
    title: payload.title,
    level: payload.level,
    message: payload.message,
    fields: payload.fields,
    reason: payload.reason,
  };

  // Remove undefined keys so the JSON is clean
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  const requestInit = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.NOTIFY_TOKEN}`,
    },
    body: JSON.stringify(body),
  };

  try {
    let res;
    if (env.ATLAS_NOTIFY) {
      // Service binding: direct Worker-to-Worker call, no public internet
      res = await env.ATLAS_NOTIFY.fetch(
        "https://atlas-notify/notify",
        requestInit,
      );
    } else if (env.NOTIFY_URL) {
      // Fallback to URL (for local dev)
      res = await fetch(env.NOTIFY_URL, requestInit);
    } else {
      console.error("notify: no ATLAS_NOTIFY binding or NOTIFY_URL");
      return;
    }
    console.log("notify: status", res.status, "signal_class:", signalClass);
  } catch (err) {
    console.error("notify failed:", err);
  }
}

export function buildAskEvent({
  ipHash,
  promptChars,
  promptText,
  latencyMs,
  status,
  reason,
  sources,
  answerChars,
  hasMemory = false,
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
      prompt: promptText || undefined,
      answer_chars: answerChars,
      latency_ms: latencyMs,
      sources_used: sources,
      has_memory: !!hasMemory,
      status,
      reason: reason || undefined,
    },
  };
}
