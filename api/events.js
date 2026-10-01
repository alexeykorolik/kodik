// src/eventSchema.ts
var eventNames = ["lesson_open", "first_action", "block_added", "check", "hint", "tutorial_step", "python_view", "replay", "adaptive_decision", "support_changed", "corrective_inserted", "corrective_completed", "ai_hint_requested", "ai_hint_generated", "ai_hint_fallback", "ai_explanation_requested", "ai_example_requested", "ai_response_failed", "ai_hint_outcome", "lesson_completed", "theory_open"];
var numbers = /* @__PURE__ */ new Set(["elapsedMs", "completionMs", "attempt", "stars", "level", "latencyMs", "nextAttempt", "returnLessonId", "meaningfulErrors"]);
var booleans = /* @__PURE__ */ new Set(["passed", "first", "solution"]);
var words = /* @__PURE__ */ new Set(["kind", "type", "step", "skillId", "supportLevel", "previousSupport", "nextSupport", "reason", "practiceId", "provider", "action", "errorType"]);
var categories = {
  kind: /* @__PURE__ */ new Set(["interaction", "open_picker", "create_variable", "edit_value", "edit_text"]),
  type: /* @__PURE__ */ new Set(["text_print", "text", "math_number", "variables_set", "variables_get", "math_arithmetic", "logic_compare", "controls_if", "controls_repeat_ext", "kodik_define", "kodik_call"]),
  step: /* @__PURE__ */ new Set(["command", "value", "greeting", "second-command", "second-value", "finish", "number-value", "seven", "store", "stored-text", "mira", "read-command", "read-value", "sum", "operator", "condition", "comparison", "score", "threshold", "ten", "at-least", "action", "message", "congratulation", "otherwise", "otherwise-text", "otherwise-message", "loop-body", "loop-text", "loop-message", "call"]),
  skillId: /* @__PURE__ */ new Set(["", "print", "string", "number", "sequence", "variable", "assignment", "arithmetic", "comparison", "if", "loop", "function", "indentation", "text_syntax", "list", "input", "drawing"]),
  supportLevel: /* @__PURE__ */ new Set(["", "blocks", "blocks_with_code", "guided_code", "code_tokens", "free_code"]),
  reason: /* @__PURE__ */ new Set(["keep", "advance", "restore", "fallback", "corrective", "review", "disabled", "rate_limit", "timeout", "provider_error", "invalid_response", "unknown", "provider_429", "provider_502", "provider_503", "provider_403", "provider_400"]),
  provider: /* @__PURE__ */ new Set(["server", "groq", "openai", "mock"]),
  action: /* @__PURE__ */ new Set(["hint", "error_explanation", "concept", "example"]),
  errorType: /* @__PURE__ */ new Set(["", "wrong_order", "wrong_value", "missing_block", "wrong_structure", "syntax_error", "wrong_indentation", "wrong_condition", "loop_error", "wrong_function_call", "runtime_error"])
};
categories.previousSupport = categories.nextSupport = categories.supportLevel;
var practiceIds = /* @__PURE__ */ new Set(["print-review-1", "string-corrective-1", "number-review-1", "sequence-review-1", "variable-review-1", "assignment-corrective-1", "arithmetic-review-1", "comparison-review-1", "if-corrective-1", "loop-review-1", "comparison-if-review", "function-review-1", "text-syntax-review-1", "code-string-fix", "code-arithmetic-fix", "code-variable-fix", "code-assignment-fix", "code-if-fix", "code-comparison-fix", "code-loop-fix", "code-function-fix", "list-index-fix", "list-loop-fix", "list-review", "input-fix", "input-number-fix", "input-review", "drawing-fix", "drawing-loop-fix", "drawing-review", ...["arithmetic", "variable", "if", "comparison", "loop", "function", "string", "assignment"].map((id) => `code-${id}-review`)]);
categories.practiceId = practiceIds;
function cleanEventData(raw) {
  const result = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  for (const [key, value] of Object.entries(raw)) {
    if (numbers.has(key) && typeof value === "number" && Number.isFinite(value) && value >= -1e3 && value <= 365 * 864e5) result[key] = value;
    if (booleans.has(key) && typeof value === "boolean") result[key] = value;
    if (words.has(key) && typeof value === "string" && categories[key]?.has(value)) result[key] = value;
  }
  return result;
}

// server/storage.ts
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
var secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
var digest = (value) => createHmac("sha256", secret()).update(value).digest("hex");
function identity(req, res) {
  const cookie = typeof req.headers.cookie === "string" ? req.headers.cookie.match(/(?:^|;\s*)kodik_learner=([a-f0-9-]+)\.([a-f0-9]{64})(?:;|$)/) : null;
  let id = randomUUID();
  if (cookie && cookie[1].length === 36) {
    const expected = Buffer.from(digest(cookie[1]), "hex"), actual = Buffer.from(cookie[2], "hex");
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) id = cookie[1];
  }
  if (!cookie || id !== cookie[1]) res.setHeader("Set-Cookie", `kodik_learner=${id}.${digest(id)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`);
  const forwarded = process.env.VERCEL ? req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"] : void 0;
  const address = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || "unknown";
  return { learner: digest(id), address: digest(address) };
}
function sameOrigin(req) {
  if (typeof req.headers.origin !== "string") return true;
  try {
    return new URL(req.headers.origin).host === req.headers.host;
  } catch {
    return false;
  }
}
async function database(path, body, prefer) {
  const url = process.env.SUPABASE_URL, key = secret();
  if (!url || !key) throw Error("storage_unavailable");
  const response = await fetch(`${url}/rest/v1/${path}`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...prefer ? { Prefer: prefer } : {} }, body: JSON.stringify(body), signal: AbortSignal.timeout(2500) });
  if (!response.ok) {
    console.warn("learning_storage_failed", { status: response.status });
    throw Error("storage_unavailable");
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
function bucket(key, limit, windowMs) {
  const window = Math.floor(Date.now() / windowMs);
  return { key: `${key}:${window}`, limit, expires: new Date((window + 1) * windowMs).toISOString() };
}
async function claim(buckets) {
  return await database("rpc/claim_learning_budget", { p_buckets: buckets }) === true;
}

// server/events.ts
var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!sameOrigin(req)) return res.status(403).json({ error: "forbidden" });
  let body;
  try {
    const serialized = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!serialized || serialized.length > 3e4) throw Error();
    body = JSON.parse(serialized);
  } catch {
    return res.status(400).json({ error: "invalid_request" });
  }
  if (!Array.isArray(body.events) || body.events.length < 1 || body.events.length > 40 || !uuid.test(body.learnerId || "")) return res.status(400).json({ error: "invalid_request" });
  const now = Date.now(), rows = [];
  for (const event of body.events) {
    if (!event || !uuid.test(event.id || "") || !uuid.test(event.sessionId || "") || !eventNames.includes(event.name) || !Number.isInteger(event.lesson) || event.lesson < -1e3 || event.lesson > 100 || typeof event.at !== "number" || event.at < now - 90 * 864e5 || event.at > now + 6e4) return res.status(400).json({ error: "invalid_event" });
    rows.push({ id: event.id, learner_id: digest(body.learnerId), session_id: event.sessionId, name: event.name, lesson: event.lesson, occurred_at: new Date(event.at).toISOString(), data: cleanEventData(event.data) });
  }
  try {
    const user = identity(req, res);
    if (!await claim([bucket(`events:ip:${user.address}`, 120, 6e4)])) return res.status(429).json({ error: "rate_limit" });
    await database("learning_events?on_conflict=id", rows, "resolution=ignore-duplicates,return=minimal");
    return res.status(200).json({ accepted: rows.map((row) => row.id) });
  } catch {
    return res.status(503).json({ error: "storage_unavailable" });
  }
}
export {
  handler as default
};
