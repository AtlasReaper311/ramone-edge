/**
 * Rate limiting backed by Cloudflare KV.
 *
 * Two windows:
 *   - per-IP hourly: `rl:ip:<sha256(ip)>:<YYYY-MM-DD-HH>`
 *   - global daily:  `rl:global:<YYYY-MM-DD>`
 *
 * KV is eventually consistent (~60s globally) which means a burst from a
 * single client across regions can momentarily exceed the per-IP limit.
 * That is acceptable here: the global daily counter remains the real
 * GPU-cost guard, and a few extra inferences a day from a determined
 * attacker is not a budget concern at zero pounds.
 *
 * IPs are hashed before being used as KV keys. Storing raw IPs would
 * make the namespace a liability under any future audit; the hash gives
 * us counting without storage of identifiable data.
 */

export async function checkRateLimits(ip, env) {
  const now = new Date();
  const hourKey = `rl:ip:${await sha256(ip)}:${formatHour(now)}`;
  const dayKey = `rl:global:${formatDay(now)}`;

  const perHourLimit = parseInt(env.RATE_LIMIT_PER_HOUR, 10) || 10;
  const perDayLimit = parseInt(env.RATE_LIMIT_PER_DAY_GLOBAL, 10) || 500;

  const [ipCountStr, globalCountStr] = await Promise.all([
    env.RL.get(hourKey),
    env.RL.get(dayKey),
  ]);

  const ipCount = parseInt(ipCountStr || "0", 10);
  const globalCount = parseInt(globalCountStr || "0", 10);

  if (ipCount >= perHourLimit) {
    return {
      ok: false,
      reason: "per_ip_hourly_exceeded",
      retryAfterSeconds: secondsUntilNextHour(now),
    };
  }
  if (globalCount >= perDayLimit) {
    return {
      ok: false,
      reason: "global_daily_exceeded",
      retryAfterSeconds: secondsUntilNextDay(now),
    };
  }

  return { ok: true, ipCount, globalCount, hourKey, dayKey };
}

/**
 * Increment both counters. Called from `ctx.waitUntil` after the
 * response has been delivered so KV writes never block the user.
 *
 * TTLs are set generously past the window boundary so the keys
 * self-clean without a cron.
 */
export async function incrementCounters(env, hourKey, dayKey) {
  await Promise.all([
    bumpKey(env.RL, hourKey, 60 * 60 * 2),
    bumpKey(env.RL, dayKey, 60 * 60 * 26),
  ]);
}

async function bumpKey(kv, key, ttlSeconds) {
  const current = parseInt((await kv.get(key)) || "0", 10);
  await kv.put(key, String(current + 1), { expirationTtl: ttlSeconds });
}

async function sha256(text) {
  const buffer = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatHour(d) {
  // YYYY-MM-DD-HH in UTC, hour-aligned bucket.
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}-${pad(d.getUTCHours())}`;
}

function formatDay(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function secondsUntilNextHour(d) {
  const next = new Date(d);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return Math.max(1, Math.floor((next.getTime() - d.getTime()) / 1000));
}

function secondsUntilNextDay(d) {
  const next = new Date(d);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.floor((next.getTime() - d.getTime()) / 1000));
}
