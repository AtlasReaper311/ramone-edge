import { corsHeaders } from "./cors.js";
import { notify, buildFailureCaptureEvent } from "./notify.js";

const MAX_QUESTION_CHARS = 4000;
const MAX_ANSWER_CHARS = 8000;
const MAX_REASON_CHARS = 500;
const MAX_SOURCES = 10;

export async function handleFailureCapture(request, env, ctx) {
  const startedAt = Date.now();
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400, request, env);
  }

  const payload = normalizePayload(body);
  if (!payload.ok) {
    return json({ error: payload.error }, payload.status, request, env);
  }

  let upstream;
  try {
    upstream = await fetch(`https://${env.TUNNEL_HOST}/feedback/failure`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-atlas-secret": env.UPSTREAM_SECRET || "",
        "x-request-id": crypto.randomUUID(),
      },
      body: JSON.stringify(payload.value),
    });
  } catch (err) {
    console.error("failure capture upstream fetch error:", err);
    ctx.waitUntil(
      notify(
        env,
        buildFailureCaptureEvent({
          status: 502,
          reason: "upstream_unreachable",
          latencyMs: Date.now() - startedAt,
          promptChars: payload.value.question.length,
          answerChars: payload.value.answer.length,
          sources: payload.value.sources.length,
        }),
      ),
    );
    return json({ error: "upstream_unreachable" }, 502, request, env);
  }

  const responseBody = await upstream.json().catch(() => ({}));
  const stored = upstream.ok && responseBody?.stored === true;
  ctx.waitUntil(
    notify(
      env,
      buildFailureCaptureEvent({
        status: upstream.status,
        reason: stored ? null : responseBody.error || responseBody.detail || "capture_failed",
        latencyMs: Date.now() - startedAt,
        promptChars: payload.value.question.length,
        answerChars: payload.value.answer.length,
        sources: payload.value.sources.length,
        caseId: stored ? responseBody.case_id : undefined,
      }),
    ),
  );

  if (!stored) {
    return json({ error: "capture_failed" }, 502, request, env);
  }
  return json(
    { stored: true, case_id: responseBody.case_id, filename: responseBody.filename },
    202,
    request,
    env,
  );
}

export function normalizePayload(body) {
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  const reason =
    typeof body?.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, MAX_REASON_CHARS)
      : "reported from Ramone interface";

  if (!question) return { ok: false, status: 400, error: "empty_question" };
  if (!answer) return { ok: false, status: 400, error: "empty_answer" };
  if (question.length > MAX_QUESTION_CHARS) {
    return { ok: false, status: 413, error: "question_too_long" };
  }
  if (answer.length > MAX_ANSWER_CHARS) {
    return { ok: false, status: 413, error: "answer_too_long" };
  }

  const rawSources = Array.isArray(body?.sources) ? body.sources : [];
  const sources = rawSources.slice(0, MAX_SOURCES).map((source) => ({
    id: typeof source?.id === "string" ? source.id.slice(0, 300) : "",
    preview: typeof source?.preview === "string" ? source.preview.slice(0, 800) : "",
  }));

  return {
    ok: true,
    value: {
      question,
      answer,
      reason,
      sources,
    },
  };
}

function json(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
    },
  });
}
