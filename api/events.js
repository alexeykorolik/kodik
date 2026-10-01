// src/eventSchema.ts
var eventNames = ["lesson_open", "first_action", "block_added", "check", "hint", "tutorial_step", "python_view", "replay", "adaptive_decision", "support_changed", "corrective_inserted", "corrective_completed", "ai_hint_requested", "ai_hint_generated", "ai_hint_fallback", "ai_explanation_requested", "ai_example_requested", "ai_response_failed", "ai_hint_outcome", "lesson_completed", "theory_open"];
var numbers = /* @__PURE__ */ new Set(["elapsedMs", "completionMs", "attempt", "stars", "level", "latencyMs", "nextAttempt", "returnLessonId", "meaningfulErrors", "hintsUsed", "runStartedAt"]);
var booleans = /* @__PURE__ */ new Set(["passed", "first", "solution", "independent"]);
var words = /* @__PURE__ */ new Set(["kind", "type", "step", "skillId", "supportLevel", "previousSupport", "nextSupport", "reason", "practiceId", "provider", "action", "errorType"]);
var categories = {
  kind: /* @__PURE__ */ new Set(["interaction", "open_picker", "create_variable", "edit_value", "edit_text"]),
  type: /* @__PURE__ */ new Set(["text_print", "text", "math_number", "variables_set", "variables_get", "math_arithmetic", "logic_compare", "controls_if", "controls_repeat_ext", "kodik_define", "kodik_call"]),
  step: /* @__PURE__ */ new Set(["command", "value", "greeting", "second-command", "second-value", "finish", "number-value", "seven", "store", "stored-text", "mira", "read-command", "read-value", "sum", "operator", "condition", "comparison", "score", "threshold", "ten", "at-least", "action", "message", "congratulation", "otherwise", "otherwise-text", "otherwise-message", "loop-body", "loop-text", "loop-message", "call"]),
  skillId: /* @__PURE__ */ new Set(["", "print", "string", "number", "sequence", "variable", "assignment", "arithmetic", "comparison", "if", "loop", "function", "indentation", "text_syntax", "list", "input", "drawing"]),
  supportLevel: /* @__PURE__ */ new Set(["", "blocks", "blocks_with_code", "guided_code", "code_tokens", "free_code"]),
  reason: /* @__PURE__ */ new Set(["initial", "keep", "advance", "restore", "fallback", "corrective", "review", "disabled", "rate_limit", "timeout", "provider_error", "invalid_response", "unknown", "provider_429", "provider_502", "provider_503", "provider_403", "provider_400"]),
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
    if (numbers.has(key) && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= (key === "runStartedAt" ? 1e13 : 365 * 864e5)) result[key] = value;
    if (booleans.has(key) && typeof value === "boolean") result[key] = value;
    if (words.has(key) && typeof value === "string" && categories[key]?.has(value)) result[key] = value;
  }
  return result;
}

// src/release.ts
var curriculumVersion = "2026-10-01.2";
function eventRelease(raw) {
  if (raw.curriculumVersion === void 0 && raw.appVersion === void 0) return { curriculumVersion: "legacy", appVersion: "legacy" };
  if (raw.curriculumVersion !== curriculumVersion && raw.curriculumVersion !== "legacy") return null;
  if (typeof raw.appVersion !== "string" || !/^(?:[0-9a-f]{7,40}|development|legacy)$/.test(raw.appVersion)) return null;
  return { curriculumVersion: raw.curriculumVersion, appVersion: raw.appVersion };
}

// src/validation.ts
function issue(message, fallbackSkills = []) {
  const text3 = message.toLowerCase();
  if (/отступ/.test(text3)) return { message, errorType: "wrong_indentation", affectedSkills: ["indentation"] };
  if (/функц|вызов/.test(text3)) return { message, errorType: "wrong_function_call", affectedSkills: ["function"] };
  if (/цикл|повтор|range/.test(text3)) return { message, errorType: "loop_error", affectedSkills: ["loop"] };
  if (/сравнен|услов|равенств|≥|>=/.test(text3)) return { message, errorType: "wrong_condition", affectedSkills: text3.includes("\u0443\u0441\u043B\u043E\u0432") ? ["if", "comparison"] : ["comparison"] };
  if (/порядок|сначала|затем/.test(text3)) return { message, errorType: "wrong_order", affectedSkills: ["sequence"] };
  if (/пуст|добав|нужен блок|встав/.test(text3)) return { message, errorType: "missing_block", affectedSkills: fallbackSkills };
  if (/синтакс|скоб|кавыч|команд/.test(text3)) return { message, errorType: "syntax_error", affectedSkills: ["text_syntax"] };
  if (/значен|числ|текст/.test(text3)) return { message, errorType: "wrong_value", affectedSkills: fallbackSkills };
  return { message, errorType: "wrong_structure", affectedSkills: fallbackSkills };
}

// src/learningEngine.ts
var solution = (blocks) => {
  const names = /* @__PURE__ */ new Set();
  const visit = (value) => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const clone2 = Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, visit(nested)]));
    if ((clone2.type === "variables_set" || clone2.type === "variables_get") && clone2.fields && typeof clone2.fields === "object") {
      const fields = clone2.fields;
      if (typeof fields.VAR === "string") {
        names.add(fields.VAR);
        fields.VAR = { id: `lesson-variable-${fields.VAR}` };
      }
    }
    return clone2;
  };
  const preparedBlocks = visit(blocks);
  return {
    variables: Array.from(names).map((name) => ({ name, id: `lesson-variable-${name}` })),
    blocks: { languageVersion: 0, blocks: preparedBlocks }
  };
};
var textBlock = (text3) => ({ type: "text", fields: { TEXT: text3 } });
var numberBlock = (number3) => ({ type: "math_number", fields: { NUM: number3 } });
var variableBlock = (name) => ({ type: "variables_get", fields: { VAR: name } });
var lessons = [
  {
    id: 1,
    title: "\u0421\u043A\u0430\u0436\u0438 \xAB\u043F\u0440\u0438\u0432\u0435\u0442\xBB",
    kicker: "\u041F\u0435\u0440\u0432\u044B\u0439 \u0432\u044B\u0432\u043E\u0434",
    instruction: "\u041A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442 \u0442\u043E, \u0447\u0442\u043E \u0442\u044B \u0435\u043C\u0443 \u0441\u043A\u0430\u0436\u0435\u0448\u044C. \u0412\u044B\u0432\u0435\u0434\u0438 \u0434\u0440\u0443\u0436\u0435\u043B\u044E\u0431\u043D\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043D\u0430 \u044D\u043A\u0440\u0430\u043D.",
    goal: "\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439: \u041F\u0440\u0438\u0432\u0435\u0442, \u043C\u0438\u0440!",
    hint: "\u041D\u0430\u0436\u043C\u0438 \u043D\u0430 \u0431\u0435\u043B\u043E\u0435 \u043F\u043E\u043B\u0435 \u0442\u0435\u043A\u0441\u0442\u0430 \u0432\u043D\u0443\u0442\u0440\u0438 \u0431\u043B\u043E\u043A\u0430 \u0438 \u0432\u043F\u0438\u0448\u0438 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435.",
    starterHint: "\u0420\u0430\u0437\u043C\u0438\u043D\u043A\u0430: \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0443\u0436\u0435 \u0441\u043E\u0431\u0440\u0430\u043D\u0430. \u0412\u043F\u0438\u0448\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u043A\u0441\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F.",
    expectedOutput: ["\u041F\u0440\u0438\u0432\u0435\u0442, \u043C\u0438\u0440!"],
    starter: solution([{ type: "text_print", x: 72, y: 64, inputs: { TEXT: { block: textBlock("") } } }]),
    solution: solution([{ type: "text_print", x: 72, y: 64, inputs: { TEXT: { block: textBlock("\u041F\u0440\u0438\u0432\u0435\u0442, \u043C\u0438\u0440!") } } }]),
    validate: (p) => p.statements.some((s) => s.kind === "print") ? null : "\u041D\u0443\u0436\u0435\u043D \u0431\u043B\u043E\u043A \xAB\u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C\xBB."
  },
  {
    id: 2,
    title: "\u0417\u0430\u043F\u043E\u043C\u043D\u0438 \u0438\u043C\u044F",
    kicker: "\u041F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435",
    instruction: "\u041F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u2014 \u044D\u0442\u043E \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u043D\u0430\u044F \u043A\u043E\u0440\u043E\u0431\u043A\u0430 \u0434\u043B\u044F \u0434\u0430\u043D\u043D\u044B\u0445. \u0421\u043E\u0445\u0440\u0430\u043D\u0438 \u0438\u043C\u044F, \u0430 \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \u0435\u0433\u043E.",
    goal: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 \xAB\u041C\u0438\u0440\u0430\xBB \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \xAB\u0438\u043C\u044F\xBB \u0438 \u0432\u044B\u0432\u0435\u0434\u0438 \u0435\u0451.",
    hint: "\u041F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u0443\u0436\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0430. \u0412 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB \u0432\u043E\u0437\u044C\u043C\u0438 \u0444\u0438\u043E\u043B\u0435\u0442\u043E\u0432\u044B\u0439 \u0431\u043B\u043E\u043A \xAB\u0438\u043C\u044F\xBB \u0438 \u0432\u0441\u0442\u0430\u0432\u044C \u0435\u0433\u043E \u0432 \u043F\u0443\u0441\u0442\u043E\u0435 \u043C\u0435\u0441\u0442\u043E \u0431\u043B\u043E\u043A\u0430 \u043F\u0435\u0447\u0430\u0442\u0438.",
    starterHint: "\u041E\u0434\u0438\u043D \u0448\u0430\u0433: \u0434\u043E\u0431\u0430\u0432\u044C \u0432 \u043F\u0435\u0447\u0430\u0442\u044C \u0431\u043B\u043E\u043A, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \xAB\u0438\u043C\u044F\xBB.",
    expectedOutput: ["\u041C\u0438\u0440\u0430"],
    starter: solution([
      { type: "variables_set", x: 72, y: 48, fields: { VAR: "\u0438\u043C\u044F" }, inputs: { VALUE: { block: textBlock("\u041C\u0438\u0440\u0430") } }, next: { block: { type: "text_print" } } }
    ]),
    solution: solution([
      { type: "variables_set", x: 72, y: 48, fields: { VAR: "\u0438\u043C\u044F" }, inputs: { VALUE: { block: textBlock("\u041C\u0438\u0440\u0430") } }, next: { block: { type: "text_print", inputs: { TEXT: { block: variableBlock("\u0438\u043C\u044F") } } } } }
    ]),
    validate: (p) => {
      const assignment = p.statements.find((s) => s.kind === "assign");
      if (!assignment) return "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439.";
      if (assignment.name !== "\u0438\u043C\u044F" || !isString(assignment.value, "\u041C\u0438\u0440\u0430")) return "\u0412 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \xAB\u0438\u043C\u044F\xBB \u043D\u0443\u0436\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \xAB\u041C\u0438\u0440\u0430\xBB.";
      return p.statements.some((s) => s.kind === "print" && isVariable(s.value, "\u0438\u043C\u044F")) ? null : "\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u0431\u043B\u043E\u043A\u0430 \xAB\u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0438\u043C\u044F\xBB.";
    }
  },
  {
    id: 3,
    title: "\u0421\u043B\u043E\u0436\u0438 \u0431\u0430\u043B\u043B\u044B",
    kicker: "\u0412\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F",
    instruction: "\u041A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440 \u0443\u043C\u0435\u0435\u0442 \u0441\u0447\u0438\u0442\u0430\u0442\u044C. \u0421\u043E\u0431\u0435\u0440\u0438 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0438 \u043F\u043E\u043A\u0430\u0436\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442.",
    goal: "\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 2 + 3.",
    hint: "\u0412\u0442\u043E\u0440\u043E\u0435 \u0431\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0432 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0438 \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u044F\u043C\u043E \u0432\u043D\u0443\u0442\u0440\u0438 \u0431\u043B\u043E\u043A\u0430.",
    starterHint: "\u0412\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0443\u0436\u0435 \u0433\u043E\u0442\u043E\u0432\u043E: \u0437\u0430\u043F\u043E\u043B\u043D\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0430\u044E\u0449\u0435\u0435 \u0447\u0438\u0441\u043B\u043E.",
    expectedOutput: ["5"],
    starter: solution([{ type: "text_print", x: 72, y: 64, inputs: { TEXT: { block: { type: "math_arithmetic", fields: { OP: "ADD" }, inputs: { A: { block: numberBlock(2) }, B: { block: numberBlock(0) } } } } } }]),
    solution: solution([{ type: "text_print", x: 72, y: 64, inputs: { TEXT: { block: { type: "math_arithmetic", fields: { OP: "ADD" }, inputs: { A: { block: numberBlock(2) }, B: { block: numberBlock(3) } } } } } }]),
    validate: (p) => hasExpression(p, (e) => e.kind === "binary" && e.operator === "+" && (isNumber(e.left, 2) && isNumber(e.right, 3) || isNumber(e.left, 3) && isNumber(e.right, 2))) ? null : "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0441\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0447\u0438\u0441\u0435\u043B 2 \u0438 3 \u0432\u043D\u0443\u0442\u0440\u0438 \u043F\u0435\u0447\u0430\u0442\u0438."
  },
  {
    id: 4,
    title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438 \u0442\u0440\u0438\u0436\u0434\u044B",
    kicker: "\u0426\u0438\u043A\u043B\u044B",
    instruction: "\u041A\u043E\u0433\u0434\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0443\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0440\u0430\u0437, \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u0446\u0438\u043A\u043B. \u041E\u043D \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442 \u0431\u043B\u043E\u043A\u0438 \u0432\u043D\u0443\u0442\u0440\u0438 \u0441\u0435\u0431\u044F.",
    goal: "\u0422\u0440\u0438 \u0440\u0430\u0437\u0430 \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439: \u0423\u0447\u0443\u0441\u044C!",
    hint: "\u0414\u043E\u0431\u0430\u0432\u044C \u0431\u043B\u043E\u043A \xAB\u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C\xBB \u0438\u0437 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 \xAB\u0412\u044B\u0432\u043E\u0434\xBB \u0432\u043D\u0443\u0442\u0440\u044C \u0446\u0438\u043A\u043B\u0430, \u0437\u0430\u0442\u0435\u043C \u0432\u043F\u0438\u0448\u0438 \u0442\u0435\u043A\u0441\u0442.",
    starterHint: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C: \u0446\u0438\u043A\u043B \u0443\u0436\u0435 \u0435\u0441\u0442\u044C, \u0430 \u0435\u0433\u043E \u0442\u0435\u043B\u043E \u0442\u0435\u0431\u0435 \u043D\u0443\u0436\u043D\u043E \u0441\u043E\u0431\u0440\u0430\u0442\u044C \u0441\u0430\u043C\u043E\u043C\u0443.",
    expectedOutput: ["\u0423\u0447\u0443\u0441\u044C!", "\u0423\u0447\u0443\u0441\u044C!", "\u0423\u0447\u0443\u0441\u044C!"],
    starter: solution([{ type: "controls_repeat_ext", x: 72, y: 52, inputs: { TIMES: { block: numberBlock(3) } } }]),
    solution: solution([{ type: "controls_repeat_ext", x: 72, y: 52, inputs: { TIMES: { block: numberBlock(3) }, DO: { block: { type: "text_print", inputs: { TEXT: { block: textBlock("\u0423\u0447\u0443\u0441\u044C!") } } } } } }]),
    validate: (p) => {
      const loop = p.statements.find((s) => s.kind === "repeat");
      if (!loop) return "\u041D\u0443\u0436\u0435\u043D \u0431\u043B\u043E\u043A \xAB\u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C\xBB. \u041F\u043E\u043C\u0435\u0441\u0442\u0438 \u043F\u0435\u0447\u0430\u0442\u044C \u0432\u043D\u0443\u0442\u0440\u044C \u043D\u0435\u0433\u043E.";
      if (!isNumber(loop.times, 3)) return "\u041F\u043E\u0441\u0442\u0430\u0432\u044C \u0447\u0438\u0441\u043B\u043E 3 \u0432 \u0431\u043B\u043E\u043A\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F.";
      return loop.body.some((s) => s.kind === "print" && isString(s.value, "\u0423\u0447\u0443\u0441\u044C!")) ? null : "\u0412\u043D\u0443\u0442\u0440\u0438 \u0446\u0438\u043A\u043B\u0430 \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \xAB\u0423\u0447\u0443\u0441\u044C!\xBB.";
    }
  },
  {
    id: 5,
    title: "\u041E\u0442\u043A\u0440\u043E\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C",
    kicker: "\u0423\u0441\u043B\u043E\u0432\u0438\u044F",
    instruction: "\u0423\u0441\u043B\u043E\u0432\u0438\u0435 \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0435 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435. \u0415\u0441\u043B\u0438 \u0431\u0430\u043B\u043B\u043E\u0432 \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E, \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C.",
    goal: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 12 \u0432 \xAB\u0431\u0430\u043B\u043B\u044B\xBB. \u0415\u0441\u043B\u0438 \u0431\u0430\u043B\u043B\u044B \u2265 10, \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \xAB\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043F\u0440\u043E\u0439\u0434\u0435\u043D!\xBB.",
    hint: "\u042D\u0442\u043E \u0441\u0430\u043C\u043E\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0441\u0431\u043E\u0440\u043A\u0430. \u041D\u0430\u0447\u043D\u0438 \u0441 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB \u2192 \xAB\u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E\xBB, \u0437\u0430\u0442\u0435\u043C \u0434\u043E\u0431\u0430\u0432\u044C \u043F\u0440\u0438\u0441\u0432\u0430\u0438\u0432\u0430\u043D\u0438\u0435, \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u0438 \u043F\u0435\u0447\u0430\u0442\u044C.",
    starterHint: "\u0424\u0438\u043D\u0430\u043B: \u043F\u0443\u0441\u0442\u043E\u0435 \u043F\u043E\u043B\u0435. \u0422\u0435\u043F\u0435\u0440\u044C \u0442\u044B \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0448\u044C \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443 \u0446\u0435\u043B\u0438\u043A\u043E\u043C \u2014 \u043A\u0430\u043A \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0438\u0439 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A.",
    expectedOutput: ["\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043F\u0440\u043E\u0439\u0434\u0435\u043D!"],
    starter: solution([]),
    solution: solution([
      { type: "variables_set", x: 72, y: 48, fields: { VAR: "\u0431\u0430\u043B\u043B\u044B" }, inputs: { VALUE: { block: numberBlock(12) } }, next: { block: { type: "controls_if", inputs: { IF0: { block: { type: "logic_compare", fields: { OP: "GTE" }, inputs: { A: { block: variableBlock("\u0431\u0430\u043B\u043B\u044B") }, B: { block: numberBlock(10) } } } }, DO0: { block: { type: "text_print", inputs: { TEXT: { block: textBlock("\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043F\u0440\u043E\u0439\u0434\u0435\u043D!") } } } } } } } }
    ]),
    validate: (p) => {
      const score = p.statements.find((s) => s.kind === "assign" && s.name === "\u0431\u0430\u043B\u043B\u044B");
      if (!score || !isNumber(score.value, 12)) return "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 \u0447\u0438\u0441\u043B\u043E 12 \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \xAB\u0431\u0430\u043B\u043B\u044B\xBB.";
      const condition = p.statements.find((s) => s.kind === "if");
      if (!condition) return "\u041D\u0443\u0436\u0435\u043D \u0431\u043B\u043E\u043A \xAB\u0435\u0441\u043B\u0438\xBB. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432 \u043D\u0451\u043C \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0431\u0430\u043B\u043B\u043E\u0432.";
      const correctCondition = condition.condition.kind === "comparison" && condition.condition.operator === ">=" && isVariable(condition.condition.left, "\u0431\u0430\u043B\u043B\u044B") && isNumber(condition.condition.right, 10);
      if (!correctCondition) return "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C\u0441\u044F \u0438 \u043F\u0440\u0438 11, 12, 13 \u0431\u0430\u043B\u043B\u0430\u0445. \u0420\u0430\u0432\u0435\u043D\u0441\u0442\u0432\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u0434\u043D\u043E \u0447\u0438\u0441\u043B\u043E. \u0412\u044B\u0431\u0435\u0440\u0438 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \xAB\u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435\xBB.";
      return condition.then.some((s) => s.kind === "print" && isString(s.value, "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043F\u0440\u043E\u0439\u0434\u0435\u043D!")) ? null : "\u041F\u043E\u043B\u043E\u0436\u0438 \u043F\u0435\u0447\u0430\u0442\u044C \xAB\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043F\u0440\u043E\u0439\u0434\u0435\u043D!\xBB \u0432\u043D\u0443\u0442\u0440\u044C \u0443\u0441\u043B\u043E\u0432\u0438\u044F.";
    }
  }
];
function renderExpr(expr) {
  if (expr.kind === "missing") return "...";
  if (expr.kind === "string") return JSON.stringify(expr.value);
  if (expr.kind === "number") return expr.value < 0 ? `(${expr.value})` : String(expr.value);
  if (expr.kind === "variable") return safeName(expr.name);
  const operand = (value) => value.kind === "binary" || value.kind === "comparison" ? `(${renderExpr(value)})` : renderExpr(value);
  return `${operand(expr.left)} ${expr.operator} ${operand(expr.right)}`;
}
function safeName(name) {
  return validName(name) ? name : "\u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435_\u0438\u043C\u044F";
}
var reserved = new Set("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print range".split(" "));
function validName(name) {
  return /^[\p{L}_][\p{L}\p{N}_]*$/u.test(name) && !reserved.has(name) && !name.startsWith("__kodik");
}
function renderStatements(statementsToRender, indent = "") {
  if (!statementsToRender.length) return [`${indent}pass`];
  return statementsToRender.flatMap((statement) => {
    if (statement.kind === "define") return [`${indent}def ${safeName(statement.name)}():`, ...renderStatements(statement.body, `${indent}    `)];
    if (statement.kind === "call") return [`${indent}${safeName(statement.name)}()`];
    if (statement.kind === "print") return [`${indent}print(${renderExpr(statement.value)})`];
    if (statement.kind === "assign") return [`${indent}${safeName(statement.name)} = ${renderExpr(statement.value)}`];
    if (statement.kind === "repeat") return [`${indent}for __kodik_repeat in range(${renderExpr(statement.times)}):`, ...renderStatements(statement.body, `${indent}    `)];
    const lines = [`${indent}if ${renderExpr(statement.condition)}:`, ...renderStatements(statement.then, `${indent}    `)];
    return statement.otherwise.length ? [...lines, `${indent}else:`, ...renderStatements(statement.otherwise, `${indent}    `)] : lines;
  });
}
function renderPython(program) {
  if (!program.statements.length) return "# \u0414\u043E\u0431\u0430\u0432\u044C \u043F\u0435\u0440\u0432\u044B\u0439 \u0431\u043B\u043E\u043A, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C Python";
  const lines = renderStatements(program.statements);
  return lines.length ? lines.join("\n") : "# \u0421\u043E\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443 \u0438\u0437 \u0431\u043B\u043E\u043A\u043E\u0432\n";
}
var LearningError = class extends Error {
};
var primitive = (value) => typeof value === "object" ? value.value : value;
var truthy = (value) => Boolean(primitive(value));
var display = (value) => typeof value === "boolean" ? value ? "True" : "False" : typeof value === "object" ? Number.isInteger(value.value) ? `${value.value}.0` : String(value.value) : String(value);
function bounded(value, real) {
  if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw new LearningError("\u0427\u0438\u0441\u043B\u043E \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0434\u043B\u044F \u0443\u0447\u0435\u0431\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043E\u0442 \u22121 000 000 000 000 \u0434\u043E 1 000 000 000 000.");
  return real ? { kind: "real", value } : value;
}
function evaluate(expr, memory) {
  if (expr.kind === "missing") throw new LearningError("\u0412 \u0431\u043B\u043E\u043A\u0435 \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043F\u0443\u0441\u0442\u043E\u0435 \u043C\u0435\u0441\u0442\u043E. \u0414\u043E\u0431\u0430\u0432\u044C \u0442\u0443\u0434\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.");
  if (expr.kind === "string") {
    if (expr.value.length > 2e3) throw new LearningError("\u0422\u0435\u043A\u0441\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439. \u041E\u0441\u0442\u0430\u0432\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.");
    return expr.value;
  }
  if (expr.kind === "number") return bounded(expr.value, !Number.isInteger(expr.value));
  if (expr.kind === "variable") {
    if (!memory.has(expr.name)) throw new LearningError(`\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \xAB${expr.name}\xBB.`);
    return memory.get(expr.name);
  }
  const rawLeft = evaluate(expr.left, memory), rawRight = evaluate(expr.right, memory);
  const left = primitive(rawLeft), right = primitive(rawRight);
  if (expr.kind === "comparison") {
    if (expr.operator === "==") return left === right;
    if (expr.operator === "!=") return left !== right;
    if (typeof left !== typeof right) throw new LearningError("\u0421\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u0439 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043E\u0434\u043D\u043E\u0433\u043E \u0442\u0438\u043F\u0430: \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430 \u0438\u043B\u0438 \u0434\u0432\u0435 \u0441\u0442\u0440\u043E\u043A\u0438.");
    if (expr.operator === ">") return left > right;
    if (expr.operator === ">=") return left >= right;
    if (expr.operator === "<") return left < right;
    return left <= right;
  }
  if (expr.operator === "+" && typeof left === "string" && typeof right === "string") {
    if (left.length + right.length > 2e3) throw new LearningError("\u0422\u0435\u043A\u0441\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439. \u0423\u043C\u0435\u043D\u044C\u0448\u0438 \u0447\u0438\u0441\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439 \u0438\u043B\u0438 \u0434\u043B\u0438\u043D\u0443 \u0441\u0442\u0440\u043E\u043A\u0438.");
    return left + right;
  }
  if (typeof left !== "number" || typeof right !== "number") throw new LearningError("\u0414\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F \u043D\u0443\u0436\u043D\u044B \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430. \u0422\u0435\u043A\u0441\u0442 \u0432 \u043A\u0430\u0432\u044B\u0447\u043A\u0430\u0445 \u2014 \u044D\u0442\u043E \u0441\u0442\u0440\u043E\u043A\u0430.");
  const real = typeof rawLeft === "object" || typeof rawRight === "object";
  if (expr.operator === "+") return bounded(left + right, real);
  if (expr.operator === "-") return bounded(left - right, real);
  if (expr.operator === "*") return bounded(left * right, real);
  if (expr.operator === "**") {
    const result = left ** right;
    if (!Number.isFinite(result)) throw new LearningError("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0438\u043B\u0438 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C.");
    return bounded(result, real || right < 0);
  }
  if (right === 0) throw new LearningError("\u0414\u0435\u043B\u0438\u0442\u044C \u043D\u0430 \u043D\u043E\u043B\u044C \u043D\u0435\u043B\u044C\u0437\u044F. \u0418\u0437\u043C\u0435\u043D\u0438 \u0432\u0442\u043E\u0440\u043E\u0435 \u0447\u0438\u0441\u043B\u043E.");
  return bounded(left / right, true);
}
function runProgram(program) {
  const memory = /* @__PURE__ */ new Map();
  const functions = /* @__PURE__ */ new Map();
  const output = [];
  let operations = 0;
  const inspect = (items, nested = false) => {
    for (const item of items) {
      if (item.kind === "define") {
        if (nested) throw new LearningError("\u0412 \u044D\u0442\u043E\u043C \u043A\u0443\u0440\u0441\u0435 \u0441\u043E\u0437\u0434\u0430\u0432\u0430\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E, \u0432\u043D\u0435 \u0446\u0438\u043A\u043B\u043E\u0432, \u0443\u0441\u043B\u043E\u0432\u0438\u0439 \u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u0444\u0443\u043D\u043A\u0446\u0438\u0439.");
        inspect(item.body, true);
      } else if (item.kind === "repeat") inspect(item.body, true);
      else if (item.kind === "if") {
        inspect(item.then, true);
        inspect(item.otherwise, true);
      }
    }
  };
  const assignedNames = (items) => items.flatMap((item) => item.kind === "assign" ? [item.name] : item.kind === "repeat" ? assignedNames(item.body) : item.kind === "if" ? [...assignedNames(item.then), ...assignedNames(item.otherwise)] : []);
  const tick = () => {
    if (++operations > 1e3) throw new LearningError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439. \u0423\u043C\u0435\u043D\u044C\u0448\u0438 \u0447\u0438\u0441\u043B\u043E \u0432 \u0446\u0438\u043A\u043B\u0435 \u0438\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u044B\u0437\u043E\u0432\u044B \u0444\u0443\u043D\u043A\u0446\u0438\u0438.");
  };
  const execute = (items, scope = memory, depth = 0) => {
    if (depth > 40) throw new LearningError("\u0424\u0443\u043D\u043A\u0446\u0438\u044F \u0432\u044B\u0437\u044B\u0432\u0430\u0435\u0442 \u0441\u0435\u0431\u044F \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0440\u0430\u0437. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0431\u043B\u043E\u043A\u0438 \u0432\u044B\u0437\u043E\u0432\u0430.");
    for (const item of items) {
      tick();
      if ("name" in item && !validName(item.name)) throw new LearningError("\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0438\u043C\u044F \u0438\u0437 \u0431\u0443\u043A\u0432, \u0446\u0438\u0444\u0440 \u0438 \u043F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u043D\u0438\u0439, \u043D\u0430\u0447\u0438\u043D\u0430\u044F \u0441 \u0431\u0443\u043A\u0432\u044B. \u0421\u043B\u0443\u0436\u0435\u0431\u043D\u044B\u0435 \u0441\u043B\u043E\u0432\u0430 Python \u043D\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442.");
      if (item.kind === "define") {
        if (memory.has(item.name)) throw new LearningError("\u0414\u0430\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u0440\u0430\u0437\u043D\u044B\u0435 \u0438\u043C\u0435\u043D\u0430.");
        functions.set(item.name, item.body);
      }
      if (item.kind === "call") {
        const body = functions.get(item.name);
        if (!body) throw new LearningError(`\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0437\u0434\u0430\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u044E \xAB${item.name}\xBB, \u0437\u0430\u0442\u0435\u043C \u0432\u044B\u0437\u043E\u0432\u0438 \u0435\u0451.`);
        const local = new Map(memory);
        for (const name of assignedNames(body)) local.delete(name);
        execute(body, local, depth + 1);
      }
      if (item.kind === "print") {
        const value = evaluate(item.value, scope);
        output.push(display(value));
      }
      if (item.kind === "assign") {
        if (functions.has(item.name)) throw new LearningError("\u0414\u0430\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u0440\u0430\u0437\u043D\u044B\u0435 \u0438\u043C\u0435\u043D\u0430.");
        scope.set(item.name, evaluate(item.value, scope));
      }
      if (item.kind === "repeat") {
        const times = evaluate(item.times, scope);
        if (typeof times !== "number" || !Number.isInteger(times)) throw new LearningError("\u0427\u0438\u0441\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C.");
        for (let index = 0; index < Number(times); index += 1) {
          tick();
          execute(item.body, scope, depth);
        }
      }
      if (item.kind === "if") execute(truthy(evaluate(item.condition, scope)) ? item.then : item.otherwise, scope, depth);
    }
  };
  try {
    if (program.issues?.length) throw new LearningError(program.issues[0]);
    inspect(program.statements);
    execute(program.statements);
    return { output };
  } catch (error) {
    return { output, error: error instanceof LearningError ? error.message : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443. \u0422\u0432\u043E\u0438 \u0431\u043B\u043E\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0435\u0449\u0451 \u0440\u0430\u0437.", systemError: !(error instanceof LearningError) };
  }
}
function checkLesson(lesson, program) {
  const practicedSkills = lesson.skills?.practices || lesson.skills?.teaches || [];
  const result = runProgram(program);
  if (result.error) {
    const details = issue(result.error, practicedSkills);
    return { passed: false, message: result.error, result: { ...result, errorType: details.errorType, affectedSkills: details.affectedSkills } };
  }
  if (!program.statements.length) return { passed: false, message: "\u041F\u043E\u043B\u0435 \u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E\u0435. \u041D\u0430\u0436\u043C\u0438 \xAB\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0431\u043B\u043E\u043A\xBB \u0438 \u0441\u043E\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443.", result: { output: [], errorType: "missing_block", affectedSkills: practicedSkills } };
  const requiredError = lesson.validate(program);
  if (requiredError) {
    const details = typeof requiredError === "string" ? issue(requiredError, practicedSkills) : requiredError;
    return { passed: false, message: details.message, result: { ...result, errorType: details.errorType, affectedSkills: details.affectedSkills } };
  }
  const correct = result.output.length === lesson.expectedOutput.length && result.output.every((line, index) => line === lesson.expectedOutput[index]);
  if (correct) return { passed: true, message: lesson.success || lesson.instruction, result };
  const errorType = result.output.length === lesson.expectedOutput.length ? "wrong_value" : "wrong_order";
  return { passed: false, message: `\u0421\u0435\u0439\u0447\u0430\u0441 \u0432\u044B\u0432\u043E\u0434 \u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F \u043E\u0442 \u0437\u0430\u0434\u0430\u043D\u0438\u044F. \u041E\u0436\u0438\u0434\u0430\u0435\u043C: ${lesson.expectedOutput.join(" \u2192 ")}. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0431\u043B\u043E\u043A\u043E\u0432.`, result: { ...result, errorType, affectedSkills: practicedSkills } };
}
function hasExpression(program, test) {
  const visitExpr = (expr) => test(expr) || "left" in expr && visitExpr(expr.left) || "right" in expr && visitExpr(expr.right);
  const visitStatements = (items) => items.some((item) => {
    if (item.kind === "call") return false;
    if (item.kind === "define") return visitStatements(item.body);
    if (item.kind === "print" || item.kind === "assign") return visitExpr(item.value);
    if (item.kind === "repeat") return visitExpr(item.times) || visitStatements(item.body);
    return visitExpr(item.condition) || visitStatements(item.then) || visitStatements(item.otherwise);
  });
  return visitStatements(program.statements);
}
function isString(expr, value) {
  return expr.kind === "string" && expr.value === value;
}
function isNumber(expr, value) {
  return expr.kind === "number" && expr.value === value;
}
function isVariable(expr, name) {
  return expr.kind === "variable" && expr.name === name;
}

// src/courseBase.ts
var text = (value) => ({ type: "text", fields: { TEXT: value } });
var number = (value) => ({ type: "math_number", fields: { NUM: value } });
var print = (value) => ({ type: "text_print", inputs: value ? { TEXT: { block: value } } : {} });
var compare = (op, a, b) => ({ type: "logic_compare", fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
var math = (op, a, b) => ({ type: "math_arithmetic", fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
var chain = (...blocks) => blocks.reduceRight((next, block) => ({ ...block, ...next ? { next: { block: next } } : {} }), void 0);
var state = (...blocks) => ({ blocks: { languageVersion: 0, blocks: blocks.map((block, i) => ({ ...block, x: 24, y: 32 + i * 150 })) } });
var walk = (statements) => statements.flatMap((s) => [s, ..."body" in s ? walk(s.body) : s.kind === "if" ? [...walk(s.then), ...walk(s.otherwise)] : []]);
var requires = (kind, message) => (p) => walk(p.statements).some((s) => s.kind === kind) ? null : message;
var define = (body) => ({ type: "kodik_define", fields: { NAME: "\u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435" }, inputs: body ? { BODY: { block: body } } : {} });
var call = () => ({ type: "kodik_call", fields: { NAME: "\u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435" } });
var added = [
  { id: 6, kicker: "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438 \u0441\u0442\u0440\u043E\u043A\u0438", title: "\u0427\u0438\u0441\u043B\u043E \u0438\u043B\u0438 \u0442\u0435\u043A\u0441\u0442?", instruction: "\u0427\u0438\u0441\u043B\u043E \u043C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0432 \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F\u0445. \u0422\u0435\u043A\u0441\u0442 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0432 \u043A\u0430\u0432\u044B\u0447\u043A\u0430\u0445. Python \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442 \u043E\u0431\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F, \u043D\u043E \u0445\u0440\u0430\u043D\u0438\u0442 \u0438\u0445 \u043F\u043E-\u0440\u0430\u0437\u043D\u043E\u043C\u0443.", goal: "\u0412\u044B\u0432\u0435\u0434\u0438 \u0447\u0438\u0441\u043B\u043E 7, \u0430 \u043D\u0430 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0439 \u0441\u0442\u0440\u043E\u043A\u0435 \u2014 \u0442\u0435\u043A\u0441\u0442 \xAB\u0441\u0435\u043C\u044C\xBB.", starterHint: "\u0414\u043E\u0431\u0430\u0432\u044C \u0442\u0435\u043A\u0441\u0442 \u0432 \u043F\u0443\u0441\u0442\u043E\u0435 \u043C\u0435\u0441\u0442\u043E \u0432\u0442\u043E\u0440\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430 \u043F\u0435\u0447\u0430\u0442\u0438.", hint: "\u041D\u0430\u0436\u043C\u0438 \xAB\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0431\u043B\u043E\u043A\xBB \u2192 \xAB\u0422\u0435\u043A\u0441\u0442\xBB. \u0412\u043F\u0438\u0448\u0438 \xAB\u0441\u0435\u043C\u044C\xBB. \u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0431\u043B\u043E\u043A\u043E\u0432 \u0437\u0430\u0434\u0430\u0451\u0442 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0441\u0442\u0440\u043E\u043A.", expectedOutput: ["7", "\u0441\u0435\u043C\u044C"], starter: state(chain(print(number(7)), print())), solution: state(chain(print(number(7)), print(text("\u0441\u0435\u043C\u044C")))), validate: (p) => p.statements.some((s) => s.kind === "print" && s.value.kind === "number") && p.statements.some((s) => s.kind === "print" && s.value.kind === "string") ? null : "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0447\u0438\u0441\u043B\u043E \u0432 \u043F\u0435\u0440\u0432\u043E\u0439 \u043F\u0435\u0447\u0430\u0442\u0438 \u0438 \u0442\u0435\u043A\u0441\u0442 \u0432\u043E \u0432\u0442\u043E\u0440\u043E\u0439.", success: "7 \u2014 \u0447\u0438\u0441\u043B\u043E, \u0430 \xAB\u0441\u0435\u043C\u044C\xBB \u2014 \u0441\u0442\u0440\u043E\u043A\u0430. \u0414\u0432\u0430 \u0431\u043B\u043E\u043A\u0430 print \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E\u0442\u0441\u044F \u0441\u0432\u0435\u0440\u0445\u0443 \u0432\u043D\u0438\u0437." },
  { id: 7, kicker: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439", title: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u2014 \u043D\u0430\u0447\u0430\u043B\u043E", instruction: "Python \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043F\u043E \u043F\u043E\u0440\u044F\u0434\u043A\u0443, \u0441\u0432\u0435\u0440\u0445\u0443 \u0432\u043D\u0438\u0437. \u041A\u0430\u0436\u0434\u0430\u044F \u043F\u0435\u0447\u0430\u0442\u044C \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u0442 \u043D\u043E\u0432\u0443\u044E \u0441\u0442\u0440\u043E\u043A\u0443.", goal: "\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \xAB\u0421\u0442\u0430\u0440\u0442\xBB, \u0437\u0430\u0442\u0435\u043C \xAB\u0424\u0438\u043D\u0438\u0448\xBB.", starterHint: "\u041D\u0430\u0447\u043D\u0438 \u0441 \u0431\u043B\u043E\u043A\u0430 \xAB\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C\xBB. \u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043F\u043E \u043E\u0447\u0435\u0440\u0435\u0434\u0438.", hint: "\u0414\u043E\u0431\u0430\u0432\u044C \u0434\u0432\u0435 \u043F\u0435\u0447\u0430\u0442\u0438. \u0422\u0435\u043A\u0441\u0442 \u043F\u0435\u0440\u0432\u043E\u0439 \u2014 \xAB\u0421\u0442\u0430\u0440\u0442\xBB, \u0432\u0442\u043E\u0440\u043E\u0439 \u2014 \xAB\u0424\u0438\u043D\u0438\u0448\xBB.", expectedOutput: ["\u0421\u0442\u0430\u0440\u0442", "\u0424\u0438\u043D\u0438\u0448"], starter: state(), solution: state(chain(print(text("\u0421\u0442\u0430\u0440\u0442")), print(text("\u0424\u0438\u043D\u0438\u0448")))), validate: requires("print", "\u0414\u043E\u0431\u0430\u0432\u044C \u043F\u0435\u0447\u0430\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F."), success: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u043B\u0430\u0441\u044C \u043F\u0435\u0440\u0432\u0430\u044F \u043F\u0435\u0447\u0430\u0442\u044C, \u0437\u0430\u0442\u0435\u043C \u0432\u0442\u043E\u0440\u0430\u044F. \u041F\u043E\u0440\u044F\u0434\u043E\u043A \u043A\u043E\u043C\u0430\u043D\u0434 \u043C\u0435\u043D\u044F\u0435\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B." },
  { id: 8, kicker: "\u0412\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F", title: "\u0421\u043A\u043E\u0431\u043A\u0438 \u0438\u043C\u0435\u044E\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435", instruction: "\u0412\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0439 \u0431\u043B\u043E\u043A \u0432\u044B\u0447\u0438\u0441\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u0435\u0440\u0432\u044B\u043C. \u042D\u0442\u043E \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0441\u043A\u043E\u0431\u043A\u0430\u043C \u0432 Python.", goal: "\u0421\u043B\u043E\u0436\u0438 2 \u0438 3, \u0437\u0430\u0442\u0435\u043C \u0443\u043C\u043D\u043E\u0436\u044C \u0441\u0443\u043C\u043C\u0443 \u043D\u0430 4. \u041F\u043E\u043B\u0443\u0447\u0438 20.", starterHint: "\u0418\u0437\u043C\u0435\u043D\u0438 \u0437\u043D\u0430\u043A \u0432\u043D\u0435\u0448\u043D\u0435\u0433\u043E \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F: \u043D\u0443\u0436\u043D\u043E \u0443\u043C\u043D\u043E\u0436\u0435\u043D\u0438\u0435.", hint: "\u041E\u0442\u043A\u0440\u043E\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0437\u043D\u0430\u043A\u043E\u0432 \u0432 \u0431\u043E\u043B\u044C\u0448\u043E\u043C \u0431\u043B\u043E\u043A\u0435 \u0438 \u0432\u044B\u0431\u0435\u0440\u0438 \xD7. \u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0439 \u0431\u043B\u043E\u043A 2 + 3 \u043E\u0441\u0442\u0430\u0432\u044C \u043A\u0430\u043A \u0435\u0441\u0442\u044C.", expectedOutput: ["20"], starter: state(print(math("ADD", math("ADD", number(2), number(3)), number(4)))), solution: state(print(math("MULTIPLY", math("ADD", number(2), number(3)), number(4)))), validate: (p) => p.statements.some((s) => s.kind === "print" && s.value.kind === "binary" && s.value.operator === "*" && (s.value.left.kind === "binary" || s.value.right.kind === "binary")) ? null : "\u0423\u043C\u043D\u043E\u0436\u044C \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u0443\u044E \u0441\u0443\u043C\u043C\u0443 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u0431\u043B\u043E\u043A\u0430 \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F.", success: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 2 + 3 = 5. \u0417\u0430\u0442\u0435\u043C 5 \xD7 4 = 20. \u0412 Python \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442 \u0441\u043A\u043E\u0431\u043A\u0438: (2 + 3) * 4." },
  { id: 9, kicker: "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F", title: "\u041F\u0440\u0430\u0432\u0434\u0430 \u0438\u043B\u0438 \u043D\u0435\u0442?", instruction: "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0434\u0430\u0451\u0442 True (\u0438\u0441\u0442\u0438\u043D\u0430) \u0438\u043B\u0438 False (\u043B\u043E\u0436\u044C). \u0417\u043D\u0430\u043A \u2265 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \xAB\u0431\u043E\u043B\u044C\u0448\u0435 \u0438\u043B\u0438 \u0440\u0430\u0432\u043D\u043E\xBB.", goal: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C, \u0447\u0442\u043E 12 \u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 10, \u0438 \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F.", starterHint: "\u0418\u0437\u043C\u0435\u043D\u0438 \u0437\u043D\u0430\u043A = \u0432 \u0431\u043B\u043E\u043A\u0435 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F \u043D\u0430 \u2265.", hint: "\u0420\u0430\u0432\u0435\u043D\u0441\u0442\u0432\u043E \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u0442, \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B \u043B\u0438 \u0447\u0438\u0441\u043B\u0430. \u0417\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u043D\u043E \xAB\u0431\u043E\u043B\u044C\u0448\u0435 \u0438\u043B\u0438 \u0440\u0430\u0432\u043D\u043E\xBB.", expectedOutput: ["True"], starter: state(print(compare("EQ", number(12), number(10)))), solution: state(print(compare("GTE", number(12), number(10)))), validate: (p) => p.statements.some((s) => s.kind === "print" && s.value.kind === "comparison" && (s.value.operator === ">=" && s.value.left.kind === "number" && s.value.left.value === 12 && s.value.right.kind === "number" && s.value.right.value === 10 || s.value.operator === "<=" && s.value.left.kind === "number" && s.value.left.value === 10 && s.value.right.kind === "number" && s.value.right.value === 12)) ? null : "12 \u0438 10 \u043D\u0435 \u0440\u0430\u0432\u043D\u044B. \u041F\u0440\u043E\u0432\u0435\u0440\u044C, \u0447\u0442\u043E 12 \u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 10: \u044D\u0442\u043E \u0432\u0435\u0440\u043D\u043E \u0438 \u0434\u043B\u044F 11, 12, 13\u2026", success: "12 \u2265 10 \u2014 \u0438\u0441\u0442\u0438\u043D\u0430. \u0412 Python \u0442\u0430\u043A\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u043A 12 >= 10 \u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 True." },
  { id: 10, kicker: "\u0423\u0441\u043B\u043E\u0432\u0438\u044F", title: "\u0410 \u0435\u0441\u043B\u0438 \u043D\u0435\u0442?", instruction: "\u0412\u0435\u0442\u043A\u0430 \xAB\u0438\u043D\u0430\u0447\u0435\xBB \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043B\u043E\u0436\u043D\u043E. \u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u0434\u043D\u0443 \u0438\u0437 \u0434\u0432\u0443\u0445 \u0432\u0435\u0442\u043E\u043A.", goal: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C 3 \u2265 10. \u0415\u0441\u043B\u0438 \u0432\u0435\u0440\u043D\u043E, \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \xAB\u041C\u043E\u0436\u043D\u043E\xBB, \u0438\u043D\u0430\u0447\u0435 \u2014 \xAB\u041F\u043E\u043A\u0430 \u0440\u0430\u043D\u043E\xBB.", starterHint: "\u0412\u0435\u0442\u043A\u0430 \xAB\u0438\u043D\u0430\u0447\u0435\xBB \u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u0430\u044F. \u0414\u043E\u0431\u0430\u0432\u044C \u0432 \u043D\u0435\u0451 \u043F\u0435\u0447\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442\u0430.", hint: "\u0412\u044B\u0431\u0435\u0440\u0438 \u0431\u043B\u043E\u043A \xAB\u0435\u0441\u043B\u0438\xBB, \u0437\u0430\u0442\u0435\u043C \u0434\u043E\u0431\u0430\u0432\u044C \u043F\u0435\u0447\u0430\u0442\u044C. \u041E\u043D\u0430 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442 \u043F\u0443\u0441\u0442\u0443\u044E \u0432\u0435\u0442\u043A\u0443. \u0412\u043F\u0438\u0448\u0438 \xAB\u041F\u043E\u043A\u0430 \u0440\u0430\u043D\u043E\xBB.", expectedOutput: ["\u041F\u043E\u043A\u0430 \u0440\u0430\u043D\u043E"], starter: state({ type: "controls_if", extraState: { hasElse: true }, inputs: { IF0: { block: compare("GTE", number(3), number(10)) }, DO0: { block: print(text("\u041C\u043E\u0436\u043D\u043E")) } } }), solution: state({ type: "controls_if", extraState: { hasElse: true }, inputs: { IF0: { block: compare("GTE", number(3), number(10)) }, DO0: { block: print(text("\u041C\u043E\u0436\u043D\u043E")) }, ELSE: { block: print(text("\u041F\u043E\u043A\u0430 \u0440\u0430\u043D\u043E")) } } }), validate: (p) => p.statements.some((s) => s.kind === "if" && s.otherwise.length) ? null : "\u0414\u043E\u0431\u0430\u0432\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0432 \u0432\u0435\u0442\u043A\u0443 \xAB\u0438\u043D\u0430\u0447\u0435\xBB.", success: "3 \u043C\u0435\u043D\u044C\u0448\u0435 10, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043B\u043E\u0436\u043D\u043E. Python \u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u043B \u043F\u0435\u0440\u0432\u0443\u044E \u0432\u0435\u0442\u043A\u0443 \u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u043B else." },
  { id: 11, kicker: "\u0424\u0443\u043D\u043A\u0446\u0438\u0438", title: "\u0414\u0430\u0439 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044E \u0438\u043C\u044F", instruction: "\u0424\u0443\u043D\u043A\u0446\u0438\u044F \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u044F\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043F\u043E\u0434 \u043E\u0434\u043D\u0438\u043C \u0438\u043C\u0435\u043D\u0435\u043C. \u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B, \u0430 \u0432\u044B\u0437\u043E\u0432 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442 \u0438\u0445.", goal: "\u0421\u043E\u0437\u0434\u0430\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u044E \xAB\u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435\xBB, \u043F\u0435\u0447\u0430\u0442\u0430\u044E\u0449\u0443\u044E \xAB\u041F\u0440\u0438\u0432\u0435\u0442!\xBB, \u0438 \u0432\u044B\u0437\u043E\u0432\u0438 \u0435\u0451 \u043E\u0434\u0438\u043D \u0440\u0430\u0437.", starterHint: "\u0424\u0443\u043D\u043A\u0446\u0438\u044F \u0443\u0436\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0430. \u0414\u043E\u0431\u0430\u0432\u044C \u0431\u043B\u043E\u043A \xAB\u0412\u044B\u0437\u0432\u0430\u0442\u044C \u0444\u0443\u043D\u043A\u0446\u0438\u044E\xBB.", hint: "\u0412 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0424\u0443\u043D\u043A\u0446\u0438\u0438\xBB \u0432\u044B\u0431\u0435\u0440\u0438 \u0432\u044B\u0437\u043E\u0432. \u0418\u043C\u044F \u0432 \u043D\u0451\u043C \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0442\u044C \u0441 \u0438\u043C\u0435\u043D\u0435\u043C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u044F.", expectedOutput: ["\u041F\u0440\u0438\u0432\u0435\u0442!"], starter: state(define(print(text("\u041F\u0440\u0438\u0432\u0435\u0442!")))), solution: state(chain(define(print(text("\u041F\u0440\u0438\u0432\u0435\u0442!"))), call())), validate: (p) => walk(p.statements).some((s) => s.kind === "define") && walk(p.statements).some((s) => s.kind === "call") ? null : "\u041E\u0434\u043D\u043E\u0433\u043E \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u044F \u043C\u0430\u043B\u043E: \u0434\u043E\u0431\u0430\u0432\u044C \u0432\u044B\u0437\u043E\u0432 \u0444\u0443\u043D\u043A\u0446\u0438\u0438.", success: "def \u0437\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0444\u0443\u043D\u043A\u0446\u0438\u0438. \u0421\u0442\u0440\u043E\u043A\u0430 \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435() \u0432\u044B\u0437\u044B\u0432\u0430\u0435\u0442 \u0438\u0445 \u0438 \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435." },
  { id: 12, kicker: "\u0424\u0438\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0430", title: "\u041E\u0434\u043D\u0430 \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u2014 \u0442\u0440\u0438 \u043F\u0440\u0438\u0432\u0435\u0442\u0430", instruction: "\u0422\u0435\u043F\u0435\u0440\u044C \u0441\u043E\u0435\u0434\u0438\u043D\u0438 \u0437\u043D\u0430\u043A\u043E\u043C\u044B\u0435 \u0438\u0434\u0435\u0438: \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u0445\u0440\u0430\u043D\u0438\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435, \u0430 \u0446\u0438\u043A\u043B \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442 \u0435\u0451 \u0432\u044B\u0437\u043E\u0432.", goal: "\u0421\u043E\u0437\u0434\u0430\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u044E \xAB\u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435\xBB, \u043A\u043E\u0442\u043E\u0440\u0430\u044F \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442 \xAB\u041F\u0440\u0438\u0432\u0435\u0442!\xBB. \u0412\u044B\u0437\u043E\u0432\u0438 \u0435\u0451 \u0432 \u0446\u0438\u043A\u043B\u0435 3 \u0440\u0430\u0437\u0430.", starterHint: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u043F\u0438\u0448\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044E, \u0437\u0430\u0442\u0435\u043C \u0434\u043E\u0431\u0430\u0432\u044C \u0446\u0438\u043A\u043B \u0438 \u043F\u043E\u043C\u0435\u0441\u0442\u0438 \u0432\u044B\u0437\u043E\u0432 \u0432\u043D\u0443\u0442\u0440\u044C.", hint: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A: \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u0441 \u043F\u0435\u0447\u0430\u0442\u044C\u044E \u2192 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C 3 \u0440\u0430\u0437\u0430 \u2192 \u0432\u043D\u0443\u0442\u0440\u0438 \u0446\u0438\u043A\u043B\u0430 \u0432\u044B\u0437\u0432\u0430\u0442\u044C \xAB\u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435\xBB.", expectedOutput: ["\u041F\u0440\u0438\u0432\u0435\u0442!", "\u041F\u0440\u0438\u0432\u0435\u0442!", "\u041F\u0440\u0438\u0432\u0435\u0442!"], starter: state(), solution: state(chain(define(print(text("\u041F\u0440\u0438\u0432\u0435\u0442!"))), { type: "controls_repeat_ext", inputs: { TIMES: { block: number(3) }, DO: { block: call() } } })), validate: (p) => {
    const all = walk(p.statements);
    return all.some((s) => s.kind === "define") && all.some((s) => s.kind === "repeat" && walk(s.body).some((c) => c.kind === "call")) ? null : "\u041E\u043F\u0438\u0448\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044E, \u0430 \u0435\u0451 \u0432\u044B\u0437\u043E\u0432 \u043F\u043E\u043C\u0435\u0441\u0442\u0438 \u0432\u043D\u0443\u0442\u0440\u044C \u0446\u0438\u043A\u043B\u0430.";
  }, success: "\u0422\u044B \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u0438\u043B \u0444\u0443\u043D\u043A\u0446\u0438\u044E \u0438 \u0446\u0438\u043A\u043B \u0432 \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0443\u044E \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443. \u0422\u0435\u043F\u0435\u0440\u044C \u0442\u044B \u0437\u043D\u0430\u0435\u0448\u044C \u0432\u044B\u0432\u043E\u0434, \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F, \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435, \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F, \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F, \u0443\u0441\u043B\u043E\u0432\u0438\u044F, \u0446\u0438\u043A\u043B\u044B \u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u0438." }
];
var order = [1, 6, 7, 2, 3, 8, 9, 5, 10, 4, 11, 12];
var base = ["text_print", "text", "math_number"];
var lessons2 = order.map((id, index) => {
  const lesson = [...lessons, ...added].find((l) => l.id === id);
  const allowed = [...base, ...index >= 3 ? ["variables_set", "variables_get"] : [], ...index >= 4 ? ["math_arithmetic"] : [], ...index >= 6 ? ["logic_compare"] : [], ...index >= 7 ? ["controls_if"] : [], ...index >= 9 ? ["controls_repeat_ext"] : [], ...index >= 10 ? ["kodik_define", "kodik_call"] : []];
  if (id === 1) allowed.splice(2, 1);
  return {
    ...lesson,
    allowed,
    ...id === 2 ? { hint: "\u041D\u0430\u0436\u043C\u0438 \xAB\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0431\u043B\u043E\u043A\xBB \u2192 \xAB\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E\xBB. \u0411\u043B\u043E\u043A \xAB\u0438\u043C\u044F\xBB \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u0441\u044F \u0432 \u043F\u0443\u0441\u0442\u0443\u044E \u043F\u0435\u0447\u0430\u0442\u044C." } : {},
    ...id === 5 ? { starterHint: "\u0421\u043E\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443 \u0441 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u0435\u043C. \u041D\u0430\u0447\u043D\u0438 \u0441 \xAB\u041F\u0440\u0438\u0441\u0432\u043E\u0438\u0442\u044C\xBB.", hint: "\u0421\u043E\u0437\u0434\u0430\u0439 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \xAB\u0431\u0430\u043B\u043B\u044B\xBB, \u0434\u043E\u0431\u0430\u0432\u044C \u043F\u0440\u0438\u0441\u0432\u0430\u0438\u0432\u0430\u043D\u0438\u0435 12, \u0437\u0430\u0442\u0435\u043C \xAB\u0415\u0441\u043B\u0438\xBB. \u0412 \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u0432\u0441\u0442\u0430\u0432\u044C \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435, \u0430 \u0432\u043D\u0443\u0442\u0440\u044C \u2014 \u043F\u0435\u0447\u0430\u0442\u044C." } : {}
  };
});

// src/skills.ts
function supportForMode(mode = "blocks") {
  if (mode === "blocks") return "blocks_with_code";
  if (mode === "recognition" || mode === "completion") return "guided_code";
  if (mode === "tokens") return "code_tokens";
  return "free_code";
}

// src/pythonExecution.ts
var fail = (message) => {
  throw new Error(message);
};
var number2 = (v) => typeof v === "number" && Number.isFinite(v) ? v : fail("\u0417\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u043D\u043E \u0447\u0438\u0441\u043B\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043A\u0430\u0432\u044B\u0447\u043A\u0438 \u0438 \u043F\u0440\u0435\u043E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u0435 \u0432\u0432\u043E\u0434\u0430 \u0447\u0435\u0440\u0435\u0437 int.");
var list = (v) => Array.isArray(v) ? v : fail("\u0417\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u0435\u043D \u0441\u043F\u0438\u0441\u043E\u043A.");
var display2 = (v) => Array.isArray(v) ? `[${v.map((item) => typeof item === "string" ? JSON.stringify(item) : display2(item)).join(", ")}]` : typeof v === "boolean" ? v ? "True" : "False" : v === null ? "None" : String(v);
var ReturnSignal = class {
  constructor(result) {
    this.result = result;
  }
};
function runPythonAst(program, inputs = []) {
  const output = [], segments = [], observed = /* @__PURE__ */ new Set(), reassigned = /* @__PURE__ */ new Set();
  let operations = 0, inputCursor = 0, x = 0, y = 0, heading = 0;
  const drawingTrail = /* @__PURE__ */ new Set();
  const globals = /* @__PURE__ */ new Map(), functions = /* @__PURE__ */ new Map();
  const tick = () => {
    if (++operations > 1e4) fail("\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043E\u043B\u0433\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0446\u0438\u043A\u043B\u0430.");
  };
  const track = (value, node, values = [], control = /* @__PURE__ */ new Set()) => ({ value, trail: /* @__PURE__ */ new Set([node, ...control, ...values.flatMap((item) => [...item.trail])]) });
  const observe = (result) => {
    for (const node of result.trail) observed.add(node);
  };
  const evaluate2 = (node, scope, depth, control) => {
    tick();
    const done = (value, children2 = []) => track(value, node, children2, control);
    if (node.kind === "literal") return done(node.value);
    if (node.kind === "name") {
      const value = scope.get(node.name) || globals.get(node.name);
      if (!value) return fail(`\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0434\u0430\u0439 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \xAB${node.name}\xBB.`);
      return done(value.value, [value]);
    }
    if (node.kind === "list") {
      if (node.items.length > 1e3) fail("\u0421\u043F\u0438\u0441\u043E\u043A \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439.");
      const items = node.items.map((item) => evaluate2(item, scope, depth, control));
      return done(items.map((item) => item.value), items);
    }
    if (node.kind === "unary") {
      const child = evaluate2(node.value, scope, depth, control);
      return done(node.operator === "not" ? !child.value : -number2(child.value), [child]);
    }
    if (node.kind === "index") {
      const target = evaluate2(node.target, scope, depth, control), position = evaluate2(node.index, scope, depth, control), values2 = list(target.value), index = number2(position.value);
      if (!Number.isInteger(index) || index < -values2.length || index >= values2.length) fail("\u0422\u0430\u043A\u043E\u0433\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0435\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0438\u043D\u0434\u0435\u043A\u0441: \u043F\u0435\u0440\u0432\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0438\u043C\u0435\u0435\u0442 \u0438\u043D\u0434\u0435\u043A\u0441 0.");
      return done(values2[index < 0 ? values2.length + index : index], [target, position]);
    }
    if (node.kind === "binary") {
      const left = evaluate2(node.left, scope, depth, control);
      if (node.operator === "and" && !left.value || node.operator === "or" && left.value) return done(left.value, [left]);
      const right = evaluate2(node.right, scope, depth, control), a = left.value, b = right.value, children2 = [left, right];
      if (node.operator === "and" || node.operator === "or") return done(b, children2);
      if (node.operator === "==") return done(JSON.stringify(a) === JSON.stringify(b), children2);
      if (node.operator === "!=") return done(JSON.stringify(a) !== JSON.stringify(b), children2);
      if (["<", "<=", ">", ">="].includes(node.operator)) {
        if (typeof a !== typeof b || typeof a !== "number" && typeof a !== "string") fail("\u0421\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u0439 \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430 \u0438\u043B\u0438 \u0434\u0432\u0435 \u0441\u0442\u0440\u043E\u043A\u0438.");
        const lhs2 = a, rhs2 = b;
        return done(node.operator === "<" ? lhs2 < rhs2 : node.operator === "<=" ? lhs2 <= rhs2 : node.operator === ">" ? lhs2 > rhs2 : lhs2 >= rhs2, children2);
      }
      if (node.operator === "+" && typeof a === "string" && typeof b === "string") return done(a + b, children2);
      const lhs = number2(a), rhs = number2(b);
      if (["/", "%"].includes(node.operator) && rhs === 0) fail("\u0414\u0435\u043B\u0438\u0442\u044C \u043D\u0430 \u043D\u043E\u043B\u044C \u043D\u0435\u043B\u044C\u0437\u044F. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0434\u0435\u043B\u0438\u0442\u0435\u043B\u044C.");
      const result = node.operator === "+" ? lhs + rhs : node.operator === "-" ? lhs - rhs : node.operator === "*" ? lhs * rhs : node.operator === "/" ? lhs / rhs : node.operator === "%" ? (lhs % rhs + rhs) % rhs : lhs ** rhs;
      if (!Number.isFinite(result) || Math.abs(result) > 1e12) fail("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435.");
      return done(result, children2);
    }
    const args = node.args.map((arg) => evaluate2(arg, scope, depth, control)), values = args.map((arg) => arg.value);
    if (node.name === "print") {
      if (output.length >= 500) fail("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0441\u0442\u0440\u043E\u043A \u0432\u044B\u0432\u043E\u0434\u0430.");
      output.push(values.map(display2).join(" "));
      observe(done(null, args));
      return done(null, args);
    }
    if (node.name === "input") {
      if (args.length > 1) fail("\u0412 input \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043E\u0434\u043D\u043E\u0439 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438.");
      if (inputCursor >= inputs.length) fail("\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043A\u043E\u043C\u0430\u043D\u0434 input: \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u0432\u0432\u043E\u0434 \u0443\u0436\u0435 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0441\u044F.");
      return done(inputs[inputCursor++], args);
    }
    if (["int", "str", "len"].includes(node.name)) {
      if (args.length !== 1) fail(`${node.name} \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u043E\u0434\u043D\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.`);
      if (node.name === "str") return done(display2(values[0]), args);
      if (node.name === "len") return done(list(values[0]).length, args);
      const value = Number(values[0]);
      if (!Number.isInteger(value)) fail("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0432\u0432\u043E\u0434 \u0432 \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C int(input()).");
      return done(value, args);
    }
    if (node.name === "range") {
      if (args.length < 1 || args.length > 3) fail("\u0423 range \u043D\u0443\u0436\u043D\u044B \u0433\u0440\u0430\u043D\u0438\u0446\u044B \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430 \u0438, \u0435\u0441\u043B\u0438 \u043D\u0443\u0436\u043D\u043E, \u0448\u0430\u0433.");
      const numbers2 = values.map(number2), start = numbers2.length === 1 ? 0 : numbers2[0], end = numbers2.length === 1 ? numbers2[0] : numbers2[1], step = numbers2[2] ?? 1;
      if (![start, end, step].every(Number.isInteger) || step === 0) fail("\u0412 range \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0446\u0435\u043B\u044B\u0435 \u0447\u0438\u0441\u043B\u0430 \u0438 \u043D\u0435\u043D\u0443\u043B\u0435\u0432\u043E\u0439 \u0448\u0430\u0433.");
      const result = [];
      for (let current = start; step > 0 ? current < end : current > end; current += step) {
        if (result.length >= 1e3) fail("\u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0433\u0440\u0430\u043D\u0438\u0446\u044B range.");
        result.push(current);
      }
      return done(result, args);
    }
    if (["forward", "right", "left"].includes(node.name)) {
      if (args.length !== 1) fail("\u0414\u043B\u044F \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043F\u043E\u0432\u043E\u0440\u043E\u0442\u0430 \u0443\u043A\u0430\u0436\u0438 \u043E\u0434\u043D\u043E \u0447\u0438\u0441\u043B\u043E.");
      const amount = number2(values[0]);
      if (Math.abs(amount) > 1e4) fail("\u0428\u0430\u0433 \u0438\u043B\u0438 \u043F\u043E\u0432\u043E\u0440\u043E\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0432\u0435\u043B\u0438\u043A. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0447\u0438\u0441\u043B\u043E.");
      if (node.name === "forward") {
        if (segments.length >= 500) fail("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043B\u0438\u043D\u0438\u0439. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0447\u0438\u0441\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439.");
        const nextX = x + Math.cos(heading * Math.PI / 180) * amount, nextY = y + Math.sin(heading * Math.PI / 180) * amount;
        segments.push({ x1: x, y1: y, x2: nextX, y2: nextY });
        x = nextX;
        y = nextY;
      } else heading += node.name === "left" ? amount : -amount;
      const result = done(null, args);
      for (const part of result.trail) drawingTrail.add(part);
      if (node.name === "forward") observe({ value: null, trail: drawingTrail });
      return result;
    }
    const fn = functions.get(node.name);
    if (!fn) return fail(`\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u043F\u0438\u0448\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044E \xAB${node.name}\xBB \u0447\u0435\u0440\u0435\u0437 def, \u0437\u0430\u0442\u0435\u043C \u0432\u044B\u0437\u043E\u0432\u0438 \u0435\u0451.`);
    if (fn.params.length !== args.length) fail(`\u042D\u0442\u0430 \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 ${fn.params.length} \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u044B\u0437\u043E\u0432 \u0438 \u0441\u0442\u0440\u043E\u043A\u0443 def.`);
    if (depth >= 40) fail("\u0424\u0443\u043D\u043A\u0446\u0438\u044F \u0432\u044B\u0437\u044B\u0432\u0430\u0435\u0442 \u0441\u0435\u0431\u044F \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0440\u0430\u0437. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438.");
    const local = new Map(fn.params.map((name, index) => [name, args[index]])), inside = /* @__PURE__ */ new Set([...control, node, fn]);
    try {
      execute(fn.body, local, depth + 1, inside);
    } catch (signal) {
      if (signal instanceof ReturnSignal) return done(signal.result.value, [signal.result, ...args]);
      throw signal;
    }
    return track(null, fn, args, inside);
  };
  const execute = (items, scope, depth, control) => {
    for (const item of items) {
      tick();
      if (item.kind === "pass") continue;
      if (item.kind === "function") {
        functions.set(item.name, item);
        continue;
      }
      if (item.kind === "return") {
        if (!depth) fail("\u041F\u043E\u043C\u0435\u0441\u0442\u0438 return \u0432\u043D\u0443\u0442\u0440\u044C \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C.");
        const result = evaluate2(item.value, scope, depth, control);
        throw new ReturnSignal(track(result.value, item, [result], control));
      }
      if (item.kind === "expression") {
        evaluate2(item.value, scope, depth, /* @__PURE__ */ new Set([...control, item]));
        continue;
      }
      if (item.kind === "assign") {
        const result = evaluate2(item.value, scope, depth, control), assigned = track(result.value, item, [result], control);
        if (item.index) {
          const owner = scope.get(item.name) || globals.get(item.name);
          if (!owner) fail("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0437\u0434\u0430\u0439 \u0441\u043F\u0438\u0441\u043E\u043A, \u0437\u0430\u0442\u0435\u043C \u043C\u0435\u043D\u044F\u0439 \u0435\u0433\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442.");
          const values = list(owner.value), position = evaluate2(item.index, scope, depth, control), index = number2(position.value);
          if (!Number.isInteger(index) || index < -values.length || index >= values.length) fail("\u0422\u0430\u043A\u043E\u0433\u043E \u0438\u043D\u0434\u0435\u043A\u0441\u0430 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0435\u0442.");
          values[index < 0 ? values.length + index : index] = result.value;
          for (const node of [...assigned.trail, ...position.trail]) owner.trail.add(node);
        } else {
          if (scope.has(item.name)) reassigned.add(item);
          scope.set(item.name, assigned);
        }
        continue;
      }
      if (item.kind === "if") {
        const tests = [];
        let body = item.otherwise;
        for (const branch of item.branches) {
          const condition = evaluate2(branch.condition, scope, depth, control);
          tests.push(condition);
          if (condition.value) {
            body = branch.body;
            break;
          }
        }
        execute(body, scope, depth, track(null, item, tests, control).trail);
        continue;
      }
      if (item.kind === "for") {
        const source = evaluate2(item.iterable, scope, depth, control), inside = track(null, item, [source], control).trail;
        for (const value of list(source.value)) {
          tick();
          scope.set(item.name, track(value, item, [source], control));
          execute(item.body, scope, depth, inside);
        }
        continue;
      }
      while (true) {
        const condition = evaluate2(item.condition, scope, depth, control);
        if (!condition.value) break;
        tick();
        execute(item.body, scope, depth, track(null, item, [condition], control).trail);
      }
    }
  };
  try {
    execute(program, globals, 0, /* @__PURE__ */ new Set());
    return { output, segments, operations, observed, reassigned };
  } catch (error) {
    return { output, segments, operations, observed, reassigned, error: error instanceof Error ? error.message : "\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B." };
  }
}
function runCourseProgram(source, inputs = []) {
  try {
    return runPythonAst(parseCourseProgram(source), inputs);
  } catch (error) {
    return { output: [], segments: [], operations: 0, observed: /* @__PURE__ */ new Set(), reassigned: /* @__PURE__ */ new Set(), error: error instanceof Error ? error.message : "\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0437\u0430\u043F\u0438\u0441\u044C Python." };
  }
}

// src/pythonRuntime.ts
var namePattern = /^[\p{L}_][\p{L}\p{N}_]*$/u;
var forbidden = new Set("import from as class async await lambda global nonlocal exec eval open del yield try except finally with raise break continue".split(" "));
function validName2(name) {
  return namePattern.test(name) && !forbidden.has(name) && !name.startsWith("__");
}
function syntax(message) {
  throw new Error(message);
}
function tokenize(source) {
  const tokens = [];
  let position = 0;
  while (position < source.length) {
    const rest = source.slice(position);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      position += whitespace[0].length;
      continue;
    }
    const string = /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/.exec(rest);
    if (string) {
      tokens.push(string[0]);
      position += string[0].length;
      continue;
    }
    const number3 = /^\d+(?:\.\d+)?/.exec(rest);
    if (number3) {
      tokens.push(number3[0]);
      position += number3[0].length;
      continue;
    }
    const name = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(rest);
    if (name) {
      tokens.push(name[0]);
      position += name[0].length;
      continue;
    }
    const operator = /^(==|!=|>=|<=|\*\*|[+\-*/%><(),\[\]])/.exec(rest);
    if (operator) {
      tokens.push(operator[0]);
      position += operator[0].length;
      continue;
    }
    syntax(`\u041D\u0435\u0437\u043D\u0430\u043A\u043E\u043C\u044B\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \xAB${rest.slice(0, 12)}\xBB. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0441\u0438\u043D\u0442\u0430\u043A\u0441\u0438\u0441.`);
  }
  return tokens;
}
function decodeString(token) {
  return token.slice(1, -1).replace(/\\(n|t|\\|"|')/g, (_match, code) => ({ n: "\n", t: "	", "\\": "\\", '"': '"', "'": "'" })[code]);
}
var ExpressionParser = class {
  constructor(tokens) {
    this.tokens = tokens;
  }
  index = 0;
  peek() {
    return this.tokens[this.index];
  }
  take() {
    return this.tokens[this.index++];
  }
  expect(value) {
    if (this.take() !== value) syntax(`\u041E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \xAB${value}\xBB. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0441\u043A\u043E\u0431\u043A\u0438 \u0438 \u0437\u0430\u043F\u044F\u0442\u044B\u0435.`);
  }
  parse() {
    const value = this.expression(0);
    if (this.peek()) syntax(`\u041B\u0438\u0448\u043D\u0438\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \xAB${this.peek()}\xBB \u0432 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0438.`);
    return value;
  }
  expression(minPrecedence) {
    let left = this.primary();
    const precedence = { or: 1, and: 2, "==": 3, "!=": 3, ">": 3, ">=": 3, "<": 3, "<=": 3, "+": 4, "-": 4, "*": 5, "/": 5, "%": 5, "**": 6 };
    while (precedence[this.peek()] && precedence[this.peek()] >= minPrecedence) {
      const operator = this.take();
      const priority = precedence[operator];
      const right = this.expression(priority + (operator === "**" ? 0 : 1));
      left = { kind: "binary", operator, left, right };
    }
    return left;
  }
  primary() {
    const token = this.take();
    if (!token) syntax("\u041F\u043E\u0441\u043B\u0435 \u0437\u043D\u0430\u043A\u0430 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F.");
    let value;
    if (token === "-" || token === "not") value = { kind: "unary", operator: token, value: this.expression(6) };
    else if (token === "(") {
      value = this.expression(0);
      this.expect(")");
    } else if (token === "[") {
      const items = [];
      while (this.peek() !== "]") {
        if (!this.peek()) syntax("\u041D\u0435 \u0437\u0430\u043A\u0440\u044B\u0442 \u0441\u043F\u0438\u0441\u043E\u043A.");
        items.push(this.expression(0));
        if (this.peek() !== "]") this.expect(",");
      }
      this.expect("]");
      value = { kind: "list", items };
    } else if (/^['"]/.test(token)) value = { kind: "literal", value: decodeString(token) };
    else if (/^\d/.test(token)) value = { kind: "literal", value: Number(token) };
    else if (token === "True" || token === "False") value = { kind: "literal", value: token === "True" };
    else if (validName2(token)) value = { kind: "name", name: token };
    else syntax(`\u041D\u0435\u043E\u0436\u0438\u0434\u0430\u043D\u043D\u044B\u0439 \u0437\u043D\u0430\u043A \xAB${token}\xBB.`);
    while (this.peek() === "(" || this.peek() === "[") {
      if (this.peek() === "(") {
        this.take();
        if (value.kind !== "name") syntax("\u041F\u0435\u0440\u0435\u0434 \u0441\u043A\u043E\u0431\u043A\u0430\u043C\u0438 \u0432\u044B\u0437\u043E\u0432\u0430 \u0437\u0430\u043F\u0438\u0448\u0438 \u0438\u043C\u044F \u0444\u0443\u043D\u043A\u0446\u0438\u0438.");
        const args = [];
        while (this.peek() !== ")") {
          if (!this.peek()) syntax("\u041D\u0435 \u0437\u0430\u043A\u0440\u044B\u0442 \u0432\u044B\u0437\u043E\u0432 \u0444\u0443\u043D\u043A\u0446\u0438\u0438.");
          args.push(this.expression(0));
          if (this.peek() !== ")") this.expect(",");
        }
        this.expect(")");
        value = { kind: "call", name: value.name, args };
      } else {
        this.take();
        const index = this.expression(0);
        this.expect("]");
        value = { kind: "index", target: value, index };
      }
    }
    return value;
  }
};
function expression(source) {
  return new ExpressionParser(tokenize(source)).parse();
}
function parseCourseProgram(source) {
  if (source.length > 12e3) syntax("\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u0430\u044F \u0434\u043B\u044F \u0443\u0447\u0435\u0431\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430.");
  const lines = source.replace(/\t/g, "    ").split(/\r?\n/).map((raw, index) => ({ number: index + 1, indent: /^ */.exec(raw)[0].length, text: raw.trim() })).filter((line) => line.text && !line.text.startsWith("#"));
  if (!lines.length) syntax("\u041D\u0430\u043F\u0438\u0448\u0438 \u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u044B, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438 \xAB\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C\xBB.");
  if (lines.length > 250) syntax("\u041E\u0441\u0442\u0430\u0432\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 250 \u0441\u0442\u0440\u043E\u043A.");
  if (lines.some((line) => line.indent % 4 !== 0)) syntax("\u0414\u043B\u044F \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u043E\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043E\u0442\u0441\u0442\u0443\u043F \u0432 4 \u043F\u0440\u043E\u0431\u0435\u043B\u0430.");
  let cursor = 0;
  const block = (indent) => {
    const result = [];
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line.indent < indent) break;
      if (line.indent > indent) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u043E\u0436\u0438\u0434\u0430\u043D\u043D\u044B\u0439 \u043E\u0442\u0441\u0442\u0443\u043F.`);
      if (line.text === "else:" || line.text.startsWith("elif ")) break;
      cursor++;
      const nested = () => {
        const body = block(indent + 4);
        if (!body.length) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u043E\u0441\u043B\u0435 \u0434\u0432\u043E\u0435\u0442\u043E\u0447\u0438\u044F \u043D\u0443\u0436\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C.`);
        return body;
      };
      let match;
      if (match = /^if\s+(.+):$/.exec(line.text)) {
        const branches = [{ condition: expression(match[1]), body: nested() }];
        while (lines[cursor]?.indent === indent && (match = /^elif\s+(.+):$/.exec(lines[cursor].text))) {
          cursor++;
          branches.push({ condition: expression(match[1]), body: nested() });
        }
        let otherwise = [];
        if (lines[cursor]?.indent === indent && lines[cursor].text === "else:") {
          cursor++;
          otherwise = nested();
        }
        result.push({ kind: "if", branches, otherwise });
        continue;
      }
      if (match = /^for\s+([\p{L}_][\p{L}\p{N}_]*)\s+in\s+(.+):$/u.exec(line.text)) {
        if (!validName2(match[1])) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0438\u043C\u044F \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0430.`);
        result.push({ kind: "for", name: match[1], iterable: expression(match[2]), body: nested() });
        continue;
      }
      if (match = /^while\s+(.+):$/.exec(line.text)) {
        result.push({ kind: "while", condition: expression(match[1]), body: nested() });
        continue;
      }
      if (match = /^def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(([^()]*)\):$/u.exec(line.text)) {
        const params = match[2].trim() ? match[2].split(",").map((item) => item.trim()) : [];
        if (!validName2(match[1]) || params.some((name) => !validName2(name)) || new Set(params).size !== params.length) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u0440\u043E\u0432\u0435\u0440\u044C \u0438\u043C\u044F \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B.`);
        result.push({ kind: "function", name: match[1], params, body: nested() });
        continue;
      }
      if (match = /^return\s+(.+)$/.exec(line.text)) {
        result.push({ kind: "return", value: expression(match[1]) });
        continue;
      }
      if (line.text === "pass") {
        result.push({ kind: "pass" });
        continue;
      }
      if (match = /^([\p{L}_][\p{L}\p{N}_]*)(?:\[(.+)\])?\s*=\s*(.+)$/u.exec(line.text)) {
        if (!validName2(match[1])) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0438\u043C\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439.`);
        result.push({ kind: "assign", name: match[1], index: match[2] ? expression(match[2]) : void 0, value: expression(match[3]) });
        continue;
      }
      if (/^(if|elif|else|while|for|def)\b/.test(line.text)) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u043E\u0441\u043B\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F, \u0446\u0438\u043A\u043B\u0430 \u0438\u043B\u0438 def \u043D\u0443\u0436\u043D\u044B \u0434\u0432\u043E\u0435\u0442\u043E\u0447\u0438\u0435 \u0438 \u0441\u0442\u0440\u043E\u043A\u0430 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C.`);
      const value = expression(line.text);
      if (value.kind !== "call") syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u0437\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0438\u043B\u0438 \u043F\u0440\u0438\u0441\u0432\u0430\u0438\u0432\u0430\u043D\u0438\u0435.`);
      result.push({ kind: "expression", value });
    }
    return result;
  };
  const program = block(0);
  if (cursor < lines.length) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${lines[cursor].number}: else \u0438\u043B\u0438 elif \u0434\u043E\u043B\u0436\u043D\u044B \u0438\u0434\u0442\u0438 \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u0441\u043B\u0435 if.`);
  return program;
}

// src/lessonObjectives.ts
var rows = [
  [23, "string", "", "print", "op:+"],
  [24, "arithmetic", "variable", "number", "assign:1 op:*"],
  [25, "arithmetic", "variable", "number", "assign:2 op:-"],
  [26, "variable", "string", "print,string", "assign:1 op:+"],
  [27, "arithmetic", "", "number", "sum_product"],
  [28, "arithmetic", "", "number", "op:+ op:/"],
  [29, "comparison", "arithmetic", "number", "op:% op:=="],
  [30, "sequence", "print", "print", "print:2"],
  [31, "assignment", "arithmetic", "variable", "reassign op:+"],
  [32, "comparison", "variable", "number", "assign:1 op:>="],
  [33, "arithmetic", "variable", "number", "assign:2 op:*"],
  [34, "if", "comparison", "variable", "kind:if branches:1 else op:<"],
  [35, "comparison", "if", "variable", "kind:if op:>="],
  [36, "if", "comparison", "variable", "kind:if else op:>="],
  [37, "if", "comparison", "string", "kind:if op:=="],
  [38, "if", "comparison", "comparison", "branches:2 else"],
  [39, "if", "arithmetic", "comparison", "kind:if else op:%"],
  [40, "if", "comparison", "comparison", "kind:if else op:>="],
  [41, "comparison", "if", "comparison", "kind:if op:and"],
  [42, "if", "comparison", "comparison", "branches:2 else"],
  [43, "if", "string", "comparison", "kind:if else op:=="],
  [44, "if", "arithmetic", "comparison", "kind:if else op:* op:-"],
  [45, "loop", "", "print", "kind:for"],
  [46, "loop", "", "number", "kind:for call:range"],
  [47, "loop", "", "number", "kind:for call:range"],
  [48, "loop", "arithmetic,assignment", "variable", "kind:for reassign op:+"],
  [49, "loop", "assignment", "variable", "kind:for reassign op:+"],
  [50, "loop", "comparison,assignment", "variable", "kind:while reassign"],
  [51, "loop", "comparison,assignment", "variable", "kind:while op:-"],
  [52, "loop", "arithmetic", "number", "kind:for op:*"],
  [53, "loop", "arithmetic", "loop", "nested_loop"],
  [54, "loop", "if,arithmetic", "if", "kind:for kind:if op:%"],
  [55, "loop", "arithmetic", "variable", "kind:for op:* op:+"],
  [56, "function", "", "sequence", "kind:function"],
  [57, "function", "string", "string", "params:1"],
  [58, "function", "arithmetic", "arithmetic", "params:1 kind:return"],
  [59, "function", "arithmetic", "arithmetic", "params:1 kind:return"],
  [60, "function", "comparison", "comparison", "params:1 kind:return op:>="],
  [61, "function", "arithmetic", "arithmetic", "params:2 kind:return"],
  [62, "function", "string", "string", "params:1 kind:return op:+"],
  [63, "function", "loop,arithmetic", "loop", "params:1 kind:return kind:for"],
  [64, "function", "comparison,arithmetic", "comparison", "params:1 kind:return op:%"],
  [65, "function", "if,arithmetic", "if", "params:2 kind:return kind:if"],
  [66, "function", "string", "string", "params:1"],
  [67, "list", "", "variable", "kind:list kind:index"],
  [68, "list", "", "variable", "kind:list kind:index"],
  [69, "list", "", "variable", "kind:list call:len"],
  [70, "list", "", "variable", "kind:list kind:index"],
  [71, "list", "loop", "loop", "kind:list kind:for"],
  [72, "list", "loop,arithmetic", "loop", "kind:list kind:for op:+"],
  [73, "list", "loop,comparison", "loop,if", "kind:list kind:for kind:if"],
  [74, "list", "assignment", "variable", "kind:list mutate_index"],
  [75, "list", "loop,if", "loop,if", "kind:list kind:for kind:if op:%"],
  [76, "list", "loop,if", "loop,if", "kind:list kind:for kind:if"],
  [77, "list", "loop,assignment", "loop", "kind:list kind:for reassign"],
  [78, "list", "loop,arithmetic", "loop", "kind:list kind:for call:len op:+"],
  [79, "input", "string", "variable", "call:input"],
  [80, "input", "arithmetic", "arithmetic", "call:input call:int op:+"],
  [81, "input", "arithmetic", "arithmetic", "input:2 call:int op:+"],
  [82, "input", "arithmetic", "arithmetic", "input:2 call:int op:*"],
  [83, "input", "if,comparison", "if", "call:input call:int kind:if"],
  [84, "input", "if,string", "if", "call:input kind:if"],
  [85, "input", "if,comparison", "if", "call:input call:int kind:if"],
  [86, "input", "loop", "loop", "call:input kind:for"],
  [87, "input", "loop", "loop", "call:input call:int kind:for"],
  [88, "input", "arithmetic", "arithmetic", "input:2 call:int op:-"],
  [89, "input", "arithmetic,sequence", "arithmetic", "input:3 call:int op:* print:2"],
  [90, "drawing", "", "number", "call:forward"],
  [91, "drawing", "sequence", "sequence", "call:forward call:right"],
  [92, "drawing", "loop", "loop", "call:forward kind:for"],
  [93, "drawing", "loop", "loop", "call:forward kind:for"],
  [94, "drawing", "loop", "loop", "call:forward kind:for"],
  [95, "drawing", "loop", "loop", "call:forward kind:for"],
  [96, "drawing", "variable,loop", "loop,variable", "call:forward kind:for assign:1"],
  [97, "drawing", "loop", "loop", "call:forward kind:for call:left"],
  [98, "drawing", "function,loop", "function,loop", "call:forward params:1 kind:for"],
  [99, "drawing", "function,loop", "function,loop", "call:forward kind:function nested_loop"],
  [100, "drawing", "function,loop", "function,loop", "call:forward params:1 kind:for"]
];
var ids = (text3) => text3 ? text3.split(",") : [];
var lessonObjectives = Object.fromEntries(rows.map(([id, primarySkill, practice, prerequisites, rules]) => [id, { skills: { primarySkill, teaches: [primarySkill], practices: ids(practice), requires: ids(prerequisites) }, rules: rules.split(" ") }]));

// src/courseMaterials.ts
var courseMaterials = {
  6: { explanation: "\u0421\u0442\u0440\u043E\u043A\u0438 \u0441\u043E\u0435\u0434\u0438\u043D\u044F\u044E\u0442\u0441\u044F \u0437\u043D\u0430\u043A\u043E\u043C +. \u0427\u0438\u0441\u043B\u0430 \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0438 \u0443\u043C\u043D\u043E\u0436\u0430\u044E\u0442\u0441\u044F. \u041F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u0445\u0440\u0430\u043D\u0438\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435, \u0430 print \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F.", code: "price = 6\nquantity = 2\nprint(price * quantity)", plan: "\u0417\u0430\u043F\u0438\u0448\u0438 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435, \u0432\u044B\u043F\u043E\u043B\u043D\u0438 \u043D\u0443\u0436\u043D\u043E\u0435 \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435 \u0438 \u043F\u0435\u0440\u0435\u0434\u0430\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0432 print." },
  7: { explanation: "if \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442 \u0443\u0441\u043B\u043E\u0432\u0438\u0435. elif \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0441\u043B\u0443\u0447\u0430\u0439, \u0435\u0441\u043B\u0438 \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u043D\u0435 \u043F\u043E\u0434\u043E\u0448\u0451\u043B. else \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u043D\u0438 \u043E\u0434\u043D\u043E \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043D\u0435 \u043F\u043E\u0434\u043E\u0448\u043B\u043E. and \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u043E\u0431\u0435\u0438\u0445 \u043F\u0440\u043E\u0432\u0435\u0440\u043E\u043A.", code: 'points = 7\nif points < 5:\n    print("\u041D\u0430\u0447\u0430\u043B\u043E")\nelif points < 10:\n    print("\u0412 \u043F\u0443\u0442\u0438")\nelse:\n    print("\u0426\u0435\u043B\u044C")', plan: "\u0417\u0430\u043F\u0438\u0448\u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u043E \u043F\u043E\u0440\u044F\u0434\u043A\u0443. \u041F\u043E\u0441\u043B\u0435 \u0434\u0432\u043E\u0435\u0442\u043E\u0447\u0438\u044F \u0441\u0434\u0435\u043B\u0430\u0439 \u043E\u0442\u0441\u0442\u0443\u043F \u0432 \u0447\u0435\u0442\u044B\u0440\u0435 \u043F\u0440\u043E\u0431\u0435\u043B\u0430 \u0434\u043B\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043A\u0430\u0436\u0434\u043E\u0439 \u0432\u0435\u0442\u043A\u0438." },
  8: { explanation: "range(\u043D\u0430\u0447\u0430\u043B\u043E, \u043A\u043E\u043D\u0435\u0446, \u0448\u0430\u0433) \u043D\u0435 \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u043A\u043E\u043D\u0435\u0446. while \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B, \u043F\u043E\u043A\u0430 \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u0432\u0435\u0440\u043D\u043E; \u0438\u0437\u043C\u0435\u043D\u044F\u0439 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432\u043D\u0443\u0442\u0440\u0438 \u0446\u0438\u043A\u043B\u0430, \u0447\u0442\u043E\u0431\u044B \u043E\u043D \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0441\u044F. \u0414\u043B\u044F \u0441\u0443\u043C\u043C\u044B \u0441\u043E\u0437\u0434\u0430\u0439 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u0434\u043E \u0446\u0438\u043A\u043B\u0430 \u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0439 \u0435\u0451 \u0432\u043D\u0443\u0442\u0440\u0438.", code: "n = 2\nwhile n > 0:\n    print(n)\n    n = n - 1", plan: "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438 \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435, \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0435\u043D\u0438\u044F \u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u043D\u0430 \u043A\u0430\u0436\u0434\u043E\u043C \u0448\u0430\u0433\u0435. \u0418\u0442\u043E\u0433\u043E\u0432\u0443\u044E \u0441\u0443\u043C\u043C\u0443 \u0432\u044B\u0432\u0435\u0434\u0438 \u043F\u043E\u0441\u043B\u0435 \u0446\u0438\u043A\u043B\u0430." },
  9: { explanation: "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \u0432 \u0441\u043A\u043E\u0431\u043A\u0430\u0445 def \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043F\u0440\u0438 \u0432\u044B\u0437\u043E\u0432\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u0438. return \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0432 \u043C\u0435\u0441\u0442\u043E \u0432\u044B\u0437\u043E\u0432\u0430. print \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435; return \u0441\u0430\u043C \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442.", code: "def triple(value):\n    return value * 3\nprint(triple(4))", plan: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044E \u0441 \u043D\u0443\u0436\u043D\u044B\u043C\u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0430\u043C\u0438. \u0417\u0430\u0442\u0435\u043C \u0432\u044B\u0437\u043E\u0432\u0438 \u0435\u0451 \u0441 \u0434\u0430\u043D\u043D\u044B\u043C\u0438 \u0437\u0430\u0434\u0430\u0447\u0438 \u0438 \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0451\u043D\u043D\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442." },
  10: { explanation: "\u0421\u043F\u0438\u0441\u043E\u043A \u0445\u0440\u0430\u043D\u0438\u0442 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439 \u0432 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u043D\u044B\u0445 \u0441\u043A\u043E\u0431\u043A\u0430\u0445. \u041F\u0435\u0440\u0432\u044B\u0439 \u0438\u043D\u0434\u0435\u043A\u0441 \u2014 0, \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043C\u043E\u0436\u043D\u043E \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0447\u0435\u0440\u0435\u0437 -1. len \u0434\u0430\u0451\u0442 \u0434\u043B\u0438\u043D\u0443. \u0426\u0438\u043A\u043B for \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u043A\u0430\u0436\u0434\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u043F\u043E \u043E\u0447\u0435\u0440\u0435\u0434\u0438.", code: "items = [6, 2]\nprint(items[0])\nprint(len(items))\nfor item in items:\n    print(item)", plan: "\u0421\u043E\u0437\u0434\u0430\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0441 \u0434\u0430\u043D\u043D\u044B\u043C\u0438 \u0437\u0430\u0434\u0430\u0447\u0438. \u0414\u043B\u044F \u043E\u0434\u043D\u043E\u0439 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0438\u043D\u0434\u0435\u043A\u0441, \u0434\u043B\u044F \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0432\u0441\u0435\u0445 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439 \u2014 \u0446\u0438\u043A\u043B." },
  11: { explanation: "input() \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u043E\u0434\u043D\u0443 \u0441\u0442\u0440\u043E\u043A\u0443. \u0414\u043B\u044F \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0439 \u043F\u0440\u0435\u043E\u0431\u0440\u0430\u0437\u0443\u0439 \u0435\u0451 \u0432 \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0447\u0435\u0440\u0435\u0437 int(input()). \u041A\u0430\u0436\u0434\u044B\u0439 \u043D\u043E\u0432\u044B\u0439 \u0432\u044B\u0437\u043E\u0432 input \u0431\u0435\u0440\u0451\u0442 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435. \u041F\u0440\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 Kodik \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043D\u0430\u0431\u043E\u0440\u043E\u0432 \u0434\u0430\u043D\u043D\u044B\u0445 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.", code: "name = input()\namount = int(input())\nprint(name)\nprint(amount + 2)", plan: "\u041F\u043E\u043B\u0443\u0447\u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0432 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u043C \u043F\u043E\u0440\u044F\u0434\u043A\u0435. \u0427\u0438\u0441\u043B\u0430 \u043F\u0440\u0435\u043E\u0431\u0440\u0430\u0437\u0443\u0439 \u0447\u0435\u0440\u0435\u0437 int. \u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0441 \u0440\u0430\u0437\u043D\u044B\u043C\u0438 \u0434\u0430\u043D\u043D\u044B\u043C\u0438, \u0430 \u043D\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u0441 \u043F\u0435\u0440\u0432\u044B\u043C \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u043C." },
  12: { explanation: "\u0427\u0435\u0440\u0435\u043F\u0430\u0448\u043A\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435 \u0432\u043F\u0440\u0430\u0432\u043E. forward(\u0434\u043B\u0438\u043D\u0430) \u0440\u0438\u0441\u0443\u0435\u0442 \u043E\u0442\u0440\u0435\u0437\u043E\u043A, right(\u0443\u0433\u043E\u043B) \u043F\u043E\u0432\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442 \u0432\u043F\u0440\u0430\u0432\u043E, left(\u0443\u0433\u043E\u043B) \u2014 \u0432\u043B\u0435\u0432\u043E. \u0412 Kodik \u044D\u0442\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0441\u0440\u0430\u0437\u0443. \u0414\u043B\u044F \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0433\u043E \u043C\u043D\u043E\u0433\u043E\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A\u0430 \u0432\u043D\u0435\u0448\u043D\u0438\u0439 \u0443\u0433\u043E\u043B \u0440\u0430\u0432\u0435\u043D 360, \u0434\u0435\u043B\u0451\u043D\u043D\u044B\u043C \u043D\u0430 \u0447\u0438\u0441\u043B\u043E \u0441\u0442\u043E\u0440\u043E\u043D.", code: "forward(20)\nleft(90)\nforward(30)", plan: "\u0420\u0430\u0437\u0434\u0435\u043B\u0438 \u0440\u0438\u0441\u0443\u043D\u043E\u043A \u043D\u0430 \u043E\u0442\u0440\u0435\u0437\u043A\u0438 \u0438 \u043F\u043E\u0432\u043E\u0440\u043E\u0442\u044B. \u041F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0435\u0441\u044F \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0438 \u0432 \u0446\u0438\u043A\u043B. \u0414\u043B\u0438\u043D\u044B \u0438 \u0443\u0433\u043B\u044B \u0434\u043E\u043B\u0436\u043D\u044B \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0443\u0441\u043B\u043E\u0432\u0438\u044E." }
};

// src/extendedCourse.ts
var extendedSeeds = [
  { id: 6, tasks: [
    [23, "data.club-sign", "\u0412\u044B\u0432\u0435\u0441\u043A\u0430 \u043A\u043B\u0443\u0431\u0430", "\u0421\u043E\u0431\u0435\u0440\u0438 \u0438\u0437 \u0434\u0432\u0443\u0445 \u0447\u0430\u0441\u0442\u0435\u0439 \u0438 \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \xAB\u041A\u043B\u0443\u0431 \u041A\u043E\u0434\u0438\u043A\xBB.", 'print("\u041A\u043B\u0443\u0431 " + "\u041A\u043E\u0434\u0438\u043A")', "\u0417\u043D\u0430\u043A + \u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0435\u0442 \u0434\u0432\u0435 \u0441\u0442\u0440\u043E\u043A\u0438."],
    [24, "data.ticket-price", "\u0422\u0440\u0438 \u0431\u0438\u043B\u0435\u0442\u0430", "\u041E\u0434\u0438\u043D \u0431\u0438\u043B\u0435\u0442 \u0441\u0442\u043E\u0438\u0442 7 \u043C\u043E\u043D\u0435\u0442. \u041F\u043E\u043A\u0430\u0436\u0438 \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0442\u0440\u0451\u0445 \u0431\u0438\u043B\u0435\u0442\u043E\u0432 \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435\u043C.", "ticket = 7\nprint(ticket * 3)", "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 \u0446\u0435\u043D\u0443 \u0438 \u0443\u043C\u043D\u043E\u0436\u044C \u0435\u0451 \u043D\u0430 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E."],
    [25, "data.remaining-tokens", "\u041E\u0441\u0442\u0430\u0442\u043E\u043A \u0436\u0435\u0442\u043E\u043D\u043E\u0432", "\u0411\u044B\u043B\u043E 20 \u0436\u0435\u0442\u043E\u043D\u043E\u0432, \u043F\u043E\u0442\u0440\u0430\u0442\u0438\u043B\u0438 6. \u0412\u044B\u0432\u0435\u0434\u0438 \u043E\u0441\u0442\u0430\u0442\u043E\u043A.", "total = 20\nused = 6\nprint(total - used)", "\u0412\u044B\u0447\u0442\u0438 \u043F\u043E\u0442\u0440\u0430\u0447\u0435\u043D\u043D\u043E\u0435 \u0438\u0437 \u043E\u0431\u0449\u0435\u0433\u043E \u0447\u0438\u0441\u043B\u0430."],
    [26, "data.name-greeting", "\u041F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u043F\u043E \u0438\u043C\u0435\u043D\u0438", "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 \u0438\u043C\u044F \u041B\u0435\u044F \u0438 \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \xAB\u041F\u0440\u0438\u0432\u0435\u0442, \u041B\u0435\u044F\xBB.", 'name = "\u041B\u0435\u044F"\nprint("\u041F\u0440\u0438\u0432\u0435\u0442, " + name)', "\u0421\u043E\u0435\u0434\u0438\u043D\u0438 \u043D\u0430\u0447\u0430\u043B\u043E \u0444\u0440\u0430\u0437\u044B \u0441\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439."],
    [27, "data.parentheses", "\u0421\u043A\u043E\u0431\u043A\u0438 \u043C\u0435\u043D\u044F\u044E\u0442 \u043E\u0442\u0432\u0435\u0442", "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043B\u043E\u0436\u0438 8 \u0438 4, \u0437\u0430\u0442\u0435\u043C \u0443\u043C\u043D\u043E\u0436\u044C \u0441\u0443\u043C\u043C\u0443 \u043D\u0430 3. \u0412\u044B\u0432\u0435\u0434\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442.", "print((8 + 4) * 3)", "\u0421\u0443\u043C\u043C\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u043E\u043A\u0430\u0437\u0430\u0442\u044C\u0441\u044F \u0432\u043E \u0432\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0445 \u0441\u043A\u043E\u0431\u043A\u0430\u0445."],
    [28, "data.average-score", "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0431\u0430\u043B\u043B", "\u0411\u0430\u043B\u043B\u044B \u0437\u0430 \u0434\u0432\u0430 \u0440\u0430\u0443\u043D\u0434\u0430: 7 \u0438 9. \u0412\u044B\u0447\u0438\u0441\u043B\u0438 \u0438 \u0432\u044B\u0432\u0435\u0434\u0438 \u0441\u0440\u0435\u0434\u043D\u0435\u0435.", "print((7 + 9) / 2)", "\u0421\u043B\u043E\u0436\u0438 \u0434\u0432\u0430 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430 \u0438 \u0440\u0430\u0437\u0434\u0435\u043B\u0438 \u043D\u0430 \u0434\u0432\u0430."],
    [29, "data.even-floor", "\u0427\u0451\u0442\u043D\u044B\u0439 \u044D\u0442\u0430\u0436", "\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435\u043C, \u0447\u0451\u0442\u043D\u044B\u0439 \u043B\u0438 \u044D\u0442\u0430\u0436 14. \u0412\u044B\u0432\u0435\u0434\u0438 True \u0438\u043B\u0438 False.", "print(14 % 2 == 0)", "\u041E\u0441\u0442\u0430\u0442\u043E\u043A \u043E\u0442 \u0434\u0435\u043B\u0435\u043D\u0438\u044F \u043D\u0430 2 \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0447\u0451\u0442\u043D\u043E\u0441\u0442\u044C."],
    [30, "data.poster-lines", "\u0414\u0432\u0435 \u0441\u0442\u0440\u043E\u043A\u0438 \u0430\u0444\u0438\u0448\u0438", "\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \u043D\u0430 \u0440\u0430\u0437\u043D\u044B\u0445 \u0441\u0442\u0440\u043E\u043A\u0430\u0445 \xAB\u041E\u0442\u043A\u0440\u044B\u0442\u043E\xBB \u0438 \xAB\u0414\u043E 18:00\xBB.", 'print("\u041E\u0442\u043A\u0440\u044B\u0442\u043E")\nprint("\u0414\u043E 18:00")', "\u041A\u0430\u0436\u0434\u0430\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0430 print \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0443\u044E \u0441\u0442\u0440\u043E\u043A\u0443."],
    [31, "data.update-points", "\u041F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0441\u0447\u0451\u0442\u0430", "\u041D\u0430 \u0441\u0447\u0451\u0442\u0435 \u0431\u044B\u043B\u043E 5 \u043E\u0447\u043A\u043E\u0432, \u0434\u043E\u0431\u0430\u0432\u0438\u043B\u0438 4. \u0418\u0437\u043C\u0435\u043D\u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u0438 \u043F\u043E\u043A\u0430\u0436\u0438 \u043D\u043E\u0432\u044B\u0439 \u0441\u0447\u0451\u0442.", "points = 5\npoints = points + 4\nprint(points)", "\u041F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u043C\u043E\u0436\u043D\u043E \u043F\u0440\u0438\u0441\u0432\u043E\u0438\u0442\u044C \u043D\u043E\u0432\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 \u0441\u0442\u0430\u0440\u043E\u0433\u043E."],
    [32, "data.enough-coins", "\u0414\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043C\u043E\u043D\u0435\u0442?", "\u041F\u0440\u043E\u0432\u0435\u0440\u044C, \u0445\u0432\u0430\u0442\u0438\u0442 \u043B\u0438 12 \u043C\u043E\u043D\u0435\u0442 \u043D\u0430 \u043F\u043E\u043A\u0443\u043F\u043A\u0443 \u0437\u0430 10. \u0412\u044B\u0432\u0435\u0434\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F.", "coins = 12\nprint(coins >= 10)", "\u0417\u043D\u0430\u043A >= \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \xAB\u0431\u043E\u043B\u044C\u0448\u0435 \u0438\u043B\u0438 \u0440\u0430\u0432\u043D\u043E\xBB."],
    [33, "data.purchase-total", "\u0427\u0435\u043A \u0437\u0430 \u043D\u0430\u0431\u043E\u0440", "\u0422\u0435\u0442\u0440\u0430\u0434\u044C \u0441\u0442\u043E\u0438\u0442 9 \u043C\u043E\u043D\u0435\u0442. \u041A\u0443\u043F\u0438\u043B\u0438 3. \u0421\u043E\u0445\u0440\u0430\u043D\u0438 \u0446\u0435\u043D\u0443 \u0438 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E, \u0432\u044B\u0432\u0435\u0434\u0438 \u0438\u0442\u043E\u0433.", "price = 9\ncount = 3\nprint(price * count)", "\u0418\u0442\u043E\u0433 \u2014 \u0446\u0435\u043D\u0430 \u043E\u0434\u043D\u043E\u0439 \u0432\u0435\u0449\u0438, \u0443\u043C\u043D\u043E\u0436\u0435\u043D\u043D\u0430\u044F \u043D\u0430 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E."]
  ] },
  { id: 7, tasks: [
    [34, "conditions.frost", "\u041C\u043E\u0440\u043E\u0437 \u0437\u0430 \u043E\u043A\u043D\u043E\u043C", "\u0422\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0430 \u22123. \u0415\u0441\u043B\u0438 \u043E\u043D\u0430 \u043D\u0438\u0436\u0435 \u043D\u0443\u043B\u044F, \u043F\u043E\u043A\u0430\u0436\u0438 \xAB\u041C\u043E\u0440\u043E\u0437\xBB, \u0438\u043D\u0430\u0447\u0435 \xAB\u0422\u0435\u043F\u043B\u043E\xBB.", 'temp = -3\nif temp < 0:\n    print("\u041C\u043E\u0440\u043E\u0437")\nelse:\n    print("\u0422\u0435\u043F\u043B\u043E")', "\u0423\u0441\u043B\u043E\u0432\u0438\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442 temp < 0."],
    [35, "conditions.concert-entry", "\u0412\u0445\u043E\u0434 \u043D\u0430 \u043A\u043E\u043D\u0446\u0435\u0440\u0442", "\u0412\u043E\u0437\u0440\u0430\u0441\u0442 19 \u043B\u0435\u0442. \u0415\u0441\u043B\u0438 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0443 \u0435\u0441\u0442\u044C 18, \u043F\u043E\u043A\u0430\u0436\u0438 \xAB\u041C\u043E\u0436\u043D\u043E \u0432\u043E\u0439\u0442\u0438\xBB.", 'age = 19\nif age >= 18:\n    print("\u041C\u043E\u0436\u043D\u043E \u0432\u043E\u0439\u0442\u0438")', "\u041F\u043E\u0440\u043E\u0433 \u0432\u043A\u043B\u044E\u0447\u0451\u043D: \u043D\u0443\u0436\u0435\u043D \u0437\u043D\u0430\u043A >=."],
    [36, "conditions.game-threshold", "\u041F\u043E\u0440\u043E\u0433 \u0438\u0433\u0440\u044B", "\u0418\u0433\u0440\u043E\u043A \u043D\u0430\u0431\u0440\u0430\u043B 8 \u043E\u0447\u043A\u043E\u0432. \u041F\u043E\u043A\u0430\u0436\u0438 \xAB\u041F\u043E\u0431\u0435\u0434\u0430\xBB \u043E\u0442 10 \u043E\u0447\u043A\u043E\u0432, \u0438\u043D\u0430\u0447\u0435 \xAB\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0435\u0449\u0451\xBB.", 'score = 8\nif score >= 10:\n    print("\u041F\u043E\u0431\u0435\u0434\u0430")\nelse:\n    print("\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0435\u0449\u0451")', "\u041D\u0443\u0436\u043D\u044B \u043E\u0431\u0435 \u0432\u0435\u0442\u043A\u0438: \u0435\u0441\u043B\u0438 \u0438 \u0438\u043D\u0430\u0447\u0435."],
    [37, "conditions.green-light", "\u0417\u0435\u043B\u0451\u043D\u044B\u0439 \u0441\u0432\u0435\u0442", "\u0426\u0432\u0435\u0442 \u0441\u0438\u0433\u043D\u0430\u043B\u0430 \u2014 \xAB\u0437\u0435\u043B\u0451\u043D\u044B\u0439\xBB. \u041F\u043E\u043A\u0430\u0436\u0438 \xAB\u0418\u0434\u0438\xBB \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0437\u0435\u043B\u0451\u043D\u043E\u0433\u043E \u0446\u0432\u0435\u0442\u0430.", 'color = "\u0437\u0435\u043B\u0451\u043D\u044B\u0439"\nif color == "\u0437\u0435\u043B\u0451\u043D\u044B\u0439":\n    print("\u0418\u0434\u0438")', "\u0421\u0442\u0440\u043E\u043A\u0438 \u0441\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u044E\u0442 \u0437\u043D\u0430\u043A\u043E\u043C ==."],
    [38, "conditions.box-size", "\u0420\u0430\u0437\u043C\u0435\u0440 \u043A\u043E\u0440\u043E\u0431\u043A\u0438", "\u0427\u0438\u0441\u043B\u043E 2 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u0441\u0440\u0435\u0434\u043D\u044E\u044E \u043A\u043E\u0440\u043E\u0431\u043A\u0443: 1 \u2014 \u043C\u0430\u043B\u0430\u044F, 2 \u2014 \u0441\u0440\u0435\u0434\u043D\u044F\u044F, \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u2014 \u0431\u043E\u043B\u044C\u0448\u0430\u044F. \u0412\u044B\u0432\u0435\u0434\u0438 \u0440\u0430\u0437\u043C\u0435\u0440.", 'size = 2\nif size == 1:\n    print("\u041C\u0430\u043B\u0430\u044F")\nelif size == 2:\n    print("\u0421\u0440\u0435\u0434\u043D\u044F\u044F")\nelse:\n    print("\u0411\u043E\u043B\u044C\u0448\u0430\u044F")', "\u041F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0432\u043E\u0433\u043E if \u043C\u043E\u0436\u043D\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0432\u0442\u043E\u0440\u043E\u0439 \u0441\u043B\u0443\u0447\u0430\u0439 \u0447\u0435\u0440\u0435\u0437 elif."],
    [39, "conditions.odd-ticket", "\u0427\u0451\u0442\u043D\u044B\u0439 \u0431\u0438\u043B\u0435\u0442", "\u041D\u043E\u043C\u0435\u0440 \u0431\u0438\u043B\u0435\u0442\u0430 17. \u0412\u044B\u0432\u0435\u0434\u0438 \xAB\u0427\u0451\u0442\u043D\u044B\u0439\xBB \u0438\u043B\u0438 \xAB\u041D\u0435\u0447\u0451\u0442\u043D\u044B\u0439\xBB.", 'number = 17\nif number % 2 == 0:\n    print("\u0427\u0451\u0442\u043D\u044B\u0439")\nelse:\n    print("\u041D\u0435\u0447\u0451\u0442\u043D\u044B\u0439")', "\u0427\u0451\u0442\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0434\u0435\u043B\u0438\u0442\u0441\u044F \u043D\u0430 2 \u0431\u0435\u0437 \u043E\u0441\u0442\u0430\u0442\u043A\u0430."],
    [40, "conditions.delivery", "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430 \u0437\u0430\u043A\u0430\u0437\u0430", "\u0417\u0430\u043A\u0430\u0437 \u043D\u0430 55 \u043C\u043E\u043D\u0435\u0442. \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u0430 \u043E\u0442 50, \u0438\u043D\u0430\u0447\u0435 \u0441\u0442\u043E\u0438\u0442 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u0412\u044B\u0432\u0435\u0434\u0438 \xAB\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E\xBB \u0438\u043B\u0438 \xAB\u041F\u043B\u0430\u0442\u043D\u043E\xBB.", 'price = 55\nif price >= 50:\n    print("\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E")\nelse:\n    print("\u041F\u043B\u0430\u0442\u043D\u043E")', "\u0421\u0440\u0430\u0432\u043D\u0438 \u0441\u0443\u043C\u043C\u0443 \u0437\u0430\u043A\u0430\u0437\u0430 \u0441 \u043F\u043E\u0440\u043E\u0433\u043E\u043C 50."],
    [41, "conditions.age-and-ticket", "\u0412\u043E\u0437\u0440\u0430\u0441\u0442 \u0438 \u0431\u0438\u043B\u0435\u0442", "\u0412\u043E\u0437\u0440\u0430\u0441\u0442 13, \u0431\u0438\u043B\u0435\u0442 \u043A\u0443\u043F\u043B\u0435\u043D (1). \u041F\u043E\u043A\u0430\u0436\u0438 \xAB\u041F\u0440\u043E\u0445\u043E\u0434\u0438\xBB, \u0442\u043E\u043B\u044C\u043A\u043E \u0435\u0441\u043B\u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u044B \u043E\u0431\u0430 \u0443\u0441\u043B\u043E\u0432\u0438\u044F.", 'age = 13\nticket = 1\nif age >= 12 and ticket == 1:\n    print("\u041F\u0440\u043E\u0445\u043E\u0434\u0438")', "and \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u044F\u0435\u0442 \u0434\u0432\u0435 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u044B\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438."],
    [42, "conditions.warm-day", "\u0422\u0451\u043F\u043B\u044B\u0439 \u0434\u0435\u043D\u044C", "\u0422\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0430 23. \u0414\u043E 0 \u2014 \u043C\u043E\u0440\u043E\u0437, \u0434\u043E 20 \u2014 \u043F\u0440\u043E\u0445\u043B\u0430\u0434\u043D\u043E, \u0438\u043D\u0430\u0447\u0435 \u0442\u0435\u043F\u043B\u043E. \u041F\u043E\u043A\u0430\u0436\u0438 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0435\u0435 \u0441\u043B\u043E\u0432\u043E.", 'temp = 23\nif temp < 0:\n    print("\u041C\u043E\u0440\u043E\u0437")\nelif temp < 20:\n    print("\u041F\u0440\u043E\u0445\u043B\u0430\u0434\u043D\u043E")\nelse:\n    print("\u0422\u0435\u043F\u043B\u043E")', "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0438\u0434\u0443\u0442 \u043E\u0442 \u043C\u0435\u043D\u044C\u0448\u0435\u0439 \u0442\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u044B \u043A \u0431\u043E\u043B\u044C\u0448\u0435\u0439."],
    [43, "conditions.access-code", "\u041A\u043E\u0434 \u0434\u043E\u0441\u0442\u0443\u043F\u0430", "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0439 \u043A\u043E\u0434 \u2014 \xAB\u043B\u0438\u0441\u0442\xBB. \u041F\u0440\u0438 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0438 \u043F\u043E\u043A\u0430\u0436\u0438 \xAB\u041E\u0442\u043A\u0440\u044B\u0442\u043E\xBB, \u0438\u043D\u0430\u0447\u0435 \xAB\u0417\u0430\u043A\u0440\u044B\u0442\u043E\xBB.", 'code = "\u043B\u0438\u0441\u0442"\nif code == "\u043B\u0438\u0441\u0442":\n    print("\u041E\u0442\u043A\u0440\u044B\u0442\u043E")\nelse:\n    print("\u0417\u0430\u043A\u0440\u044B\u0442\u043E")', "\u0421\u0440\u0430\u0432\u043D\u0438 \u0441\u0442\u0440\u043E\u043A\u0438 \u0447\u0435\u0440\u0435\u0437 ==."],
    [44, "conditions.book-discount", "\u0421\u043A\u0438\u0434\u043A\u0430 \u043D\u0430 \u0442\u0440\u0438 \u043A\u043D\u0438\u0433\u0438", "\u041A\u0443\u043F\u0438\u043B\u0438 3 \u043A\u043D\u0438\u0433\u0438 \u043F\u043E 8 \u043C\u043E\u043D\u0435\u0442. \u041E\u0442 \u0442\u0440\u0451\u0445 \u043A\u043D\u0438\u0433 \u0441\u043A\u0438\u0434\u043A\u0430 4 \u043C\u043E\u043D\u0435\u0442\u044B. \u0412\u044B\u0432\u0435\u0434\u0438 \u0438\u0442\u043E\u0433.", "count = 3\nprice = 8\nif count >= 3:\n    print(count * price - 4)\nelse:\n    print(count * price)", "\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0439 \u0446\u0435\u043D\u0443 \u0432 \u043E\u0431\u0435\u0438\u0445 \u0432\u0435\u0442\u043A\u0430\u0445 \u0443\u0441\u043B\u043E\u0432\u0438\u044F."]
  ] },
  { id: 8, tasks: [
    [45, "loops.three-signals", "\u0422\u0440\u0438 \u0441\u0438\u0433\u043D\u0430\u043B\u0430", "\u0412\u044B\u0432\u0435\u0434\u0438 \xAB\u0413\u043E\u0442\u043E\u0432\u043E\xBB \u0442\u0440\u0438 \u0440\u0430\u0437\u0430 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u043E\u0434\u043D\u043E\u0433\u043E \u0446\u0438\u043A\u043B\u0430.", 'for i in range(3):\n    print("\u0413\u043E\u0442\u043E\u0432\u043E")', "range(3) \u0437\u0430\u0434\u0430\u0451\u0442 \u0442\u0440\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F."],
    [46, "loops.countdown", "\u041E\u0431\u0440\u0430\u0442\u043D\u044B\u0439 \u043E\u0442\u0441\u0447\u0451\u0442", "\u041F\u043E\u043A\u0430\u0436\u0438 3, 2, 1 \u043D\u0430 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0445 \u0441\u0442\u0440\u043E\u043A\u0430\u0445, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044F \u0446\u0438\u043A\u043B.", "for i in range(3, 0, -1):\n    print(i)", "\u041E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0448\u0430\u0433 \u0432\u0435\u0434\u0451\u0442 \u0441\u0447\u0451\u0442 \u043D\u0430\u0437\u0430\u0434."],
    [47, "loops.even-numbers", "\u0427\u0451\u0442\u043D\u044B\u0435 \u043D\u043E\u043C\u0435\u0440\u0430", "\u041F\u043E\u043A\u0430\u0436\u0438 2, 4 \u0438 6 \u0447\u0435\u0440\u0435\u0437 range \u0441 \u0448\u0430\u0433\u043E\u043C 2.", "for i in range(2, 8, 2):\n    print(i)", "\u0422\u0440\u0435\u0442\u0438\u0439 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442 range \u2014 \u0448\u0430\u0433."],
    [48, "loops.sum-four-days", "\u0421\u0443\u043C\u043C\u0430 \u0447\u0435\u0442\u044B\u0440\u0451\u0445 \u0434\u043D\u0435\u0439", "\u0417\u0430 \u0434\u043D\u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u0438 1, 2, 3 \u0438 4 \u043C\u043E\u043D\u0435\u0442\u044B. \u041D\u0430\u043A\u043E\u043F\u0438 \u0441\u0443\u043C\u043C\u0443 \u0446\u0438\u043A\u043B\u043E\u043C \u0438 \u0432\u044B\u0432\u0435\u0434\u0438 \u0435\u0451.", "total = 0\nfor i in range(1, 5):\n    total = total + i\nprint(total)", "\u041D\u0430\u0447\u043D\u0438 \u0441 \u043D\u0443\u043B\u044F \u0438 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0439 \u043D\u043E\u043C\u0435\u0440 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0434\u043D\u044F."],
    [49, "loops.savings", "\u041A\u043E\u043F\u0438\u043B\u043A\u0430", "\u041A\u0430\u0436\u0434\u044B\u0439 \u0438\u0437 \u0442\u0440\u0451\u0445 \u0434\u043D\u0435\u0439 \u043E\u0442\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u043B\u0438 5 \u043C\u043E\u043D\u0435\u0442. \u041D\u0430\u043A\u043E\u043F\u0438 \u0438\u0442\u043E\u0433 \u0446\u0438\u043A\u043B\u043E\u043C.", "money = 0\nfor day in range(3):\n    money = money + 5\nprint(money)", "\u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0439 5 \u043A \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0441\u0443\u043C\u043C\u0435 \u043D\u0430 \u043A\u0430\u0436\u0434\u043E\u043C \u0448\u0430\u0433\u0435."],
    [50, "loops.while-count", "\u041F\u043E\u043A\u0430 \u043D\u0435 \u043F\u044F\u0442\u044C", "\u041D\u0430\u0447\u043D\u0438 \u0441 1 \u0438 \u0432\u044B\u0432\u043E\u0434\u0438 \u0447\u0438\u0441\u043B\u0430 \u0434\u043E 5 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E while.", "n = 1\nwhile n <= 5:\n    print(n)\n    n = n + 1", "\u0412\u043D\u0443\u0442\u0440\u0438 while \u0447\u0438\u0441\u043B\u043E \u0434\u043E\u043B\u0436\u043D\u043E \u043C\u0435\u043D\u044F\u0442\u044C\u0441\u044F."],
    [51, "loops.remaining-tickets", "\u041E\u0441\u0442\u0430\u043B\u0438\u0441\u044C \u0431\u0438\u043B\u0435\u0442\u044B", "\u0412 \u043A\u0430\u0441\u0441\u0435 3 \u0431\u0438\u043B\u0435\u0442\u0430. \u041F\u043E\u043A\u0430 \u0431\u0438\u043B\u0435\u0442\u044B \u0435\u0441\u0442\u044C, \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0439 \u043E\u0441\u0442\u0430\u0442\u043E\u043A \u0438 \u0443\u043C\u0435\u043D\u044C\u0448\u0430\u0439 \u0435\u0433\u043E.", "tickets = 3\nwhile tickets > 0:\n    print(tickets)\n    tickets = tickets - 1", "\u041F\u043E\u0441\u043B\u0435 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0432\u044B\u0432\u043E\u0434\u0430 \u0443\u0431\u0438\u0440\u0430\u0439 \u043E\u0434\u0438\u043D \u0431\u0438\u043B\u0435\u0442."],
    [52, "loops.times-two", "\u0422\u0430\u0431\u043B\u0438\u0446\u0430 \u0434\u0432\u043E\u0435\u043A", "\u0412\u044B\u0432\u0435\u0434\u0438 2, 4, 6, 8 \u0447\u0435\u0440\u0435\u0437 \u0446\u0438\u043A\u043B \u0438 \u0443\u043C\u043D\u043E\u0436\u0435\u043D\u0438\u0435.", "for i in range(1, 5):\n    print(i * 2)", "\u041D\u043E\u043C\u0435\u0440 \u0448\u0430\u0433\u0430 \u0443\u043C\u043D\u043E\u0436\u0430\u0439 \u043D\u0430 \u0434\u0432\u0430."],
    [53, "loops.nested-grid", "\u042F\u0447\u0435\u0439\u043A\u0438 \u0441\u0435\u0442\u043A\u0438", "\u0412\u044B\u0432\u0435\u0434\u0438 \u043D\u043E\u043C\u0435\u0440\u0430 \u044F\u0447\u0435\u0435\u043A 11, 12, 21, 22 \u0434\u0432\u0443\u043C\u044F \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u043C\u0438 \u0446\u0438\u043A\u043B\u0430\u043C\u0438.", "for row in range(1, 3):\n    for col in range(1, 3):\n        print(row * 10 + col)", "\u0412\u043D\u0435\u0448\u043D\u0438\u0439 \u0446\u0438\u043A\u043B \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u0437\u0430 \u0434\u0435\u0441\u044F\u0442\u043A\u0438, \u0432\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0439 \u2014 \u0437\u0430 \u0435\u0434\u0438\u043D\u0438\u0446\u044B."],
    [54, "loops.count-odd", "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043D\u0435\u0447\u0451\u0442\u043D\u044B\u0445", "\u041F\u043E\u0441\u0447\u0438\u0442\u0430\u0439 \u043D\u0435\u0447\u0451\u0442\u043D\u044B\u0435 \u0447\u0438\u0441\u043B\u0430 \u043E\u0442 1 \u0434\u043E 7 \u0438 \u0432\u044B\u0432\u0435\u0434\u0438 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E.", "count = 0\nfor i in range(1, 8):\n    if i % 2 != 0:\n        count = count + 1\nprint(count)", "\u0415\u0441\u043B\u0438 \u043E\u0441\u0442\u0430\u0442\u043E\u043A \u043E\u0442 \u0434\u0435\u043B\u0435\u043D\u0438\u044F \u043D\u0430 \u0434\u0432\u0430 \u043D\u0435 \u043D\u043E\u043B\u044C, \u0443\u0432\u0435\u043B\u0438\u0447\u044C \u0441\u0447\u0451\u0442\u0447\u0438\u043A."],
    [55, "loops.sum-squares", "\u0421\u0443\u043C\u043C\u0430 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u043E\u0432", "\u0412\u044B\u0447\u0438\u0441\u043B\u0438 \u0446\u0438\u043A\u043B\u043E\u043C 1\xB2 + 2\xB2 + 3\xB2 \u0438 \u0432\u044B\u0432\u0435\u0434\u0438 \u0441\u0443\u043C\u043C\u0443.", "total = 0\nfor i in range(1, 4):\n    total = total + i * i\nprint(total)", "\u041D\u0430 \u043A\u0430\u0436\u0434\u043E\u043C \u0448\u0430\u0433\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0439 i \xD7 i."]
  ] },
  { id: 9, tasks: [
    [56, "functions.hello-twice", "\u041F\u043E\u0437\u043E\u0432\u0438 \u0434\u0432\u0430\u0436\u0434\u044B", "\u0421\u043E\u0437\u0434\u0430\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u044E hello, \u043A\u043E\u0442\u043E\u0440\u0430\u044F \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442 \xAB\u041F\u0440\u0438\u0432\u0435\u0442\xBB, \u0438 \u0432\u044B\u0437\u043E\u0432\u0438 \u0435\u0451 \u0434\u0432\u0430\u0436\u0434\u044B.", 'def hello():\n    print("\u041F\u0440\u0438\u0432\u0435\u0442")\nhello()\nhello()', "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435; \u0435\u0433\u043E \u043D\u0443\u0436\u043D\u043E \u0432\u044B\u0437\u0432\u0430\u0442\u044C."],
    [57, "functions.greeting", "\u0418\u043C\u044F \u0434\u043B\u044F \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u044F", "\u0424\u0443\u043D\u043A\u0446\u0438\u044F greet \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0438\u043C\u044F. \u0412\u044B\u0437\u043E\u0432\u0438 \u0435\u0451 \u0441 \xAB\u041C\u0438\u0440\u0430\xBB \u0438 \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \xAB\u041F\u0440\u0438\u0432\u0435\u0442, \u041C\u0438\u0440\u0430\xBB.", 'def greet(name):\n    print("\u041F\u0440\u0438\u0432\u0435\u0442, " + name)\ngreet("\u041C\u0438\u0440\u0430")', "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 name \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043F\u0440\u0438 \u0432\u044B\u0437\u043E\u0432\u0435."],
    [58, "functions.square", "\u041A\u0432\u0430\u0434\u0440\u0430\u0442 \u0447\u0438\u0441\u043B\u0430", "\u0421\u043E\u0437\u0434\u0430\u0439 square \u0441 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u043C n; \u043E\u043D\u0430 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 n \xD7 n. \u041F\u043E\u043A\u0430\u0436\u0438 square(4).", "def square(n):\n    return n * n\nprint(square(4))", "return \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442 \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0430\u0440\u0443\u0436\u0443."],
    [59, "functions.double", "\u0423\u0434\u0432\u043E\u0439 \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430", "\u0424\u0443\u043D\u043A\u0446\u0438\u044F double \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0443\u0434\u0432\u043E\u0435\u043D\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E. \u041F\u043E\u043A\u0430\u0436\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0434\u043B\u044F 3 \u0438 5.", "def double(n):\n    return n * 2\nprint(double(3))\nprint(double(5))", "\u041E\u0434\u043D\u0443 \u0444\u0443\u043D\u043A\u0446\u0438\u044E \u043C\u043E\u0436\u043D\u043E \u0432\u044B\u0437\u0432\u0430\u0442\u044C \u0441 \u0440\u0430\u0437\u043D\u044B\u043C\u0438 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438."],
    [60, "functions.entry", "\u041C\u043E\u0436\u043D\u043E \u0432\u043E\u0439\u0442\u0438?", "\u0424\u0443\u043D\u043A\u0446\u0438\u044F can_enter \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u0432\u043E\u0437\u0440\u0430\u0441\u0442 \u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 18+. \u041F\u043E\u043A\u0430\u0436\u0438 \u043E\u0442\u0432\u0435\u0442 \u0434\u043B\u044F 16.", "def can_enter(age):\n    return age >= 18\nprint(can_enter(16))", "\u0412\u0435\u0440\u043D\u0438 True \u0438\u043B\u0438 False \u0438\u0437 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F."],
    [61, "functions.perimeter", "\u041F\u0435\u0440\u0438\u043C\u0435\u0442\u0440 \u043A\u043E\u043C\u043D\u0430\u0442\u044B", "\u0424\u0443\u043D\u043A\u0446\u0438\u044F perimeter \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0434\u043B\u0438\u043D\u0443 5 \u0438 \u0448\u0438\u0440\u0438\u043D\u0443 3. \u0412\u0435\u0440\u043D\u0438 \u0438 \u043F\u043E\u043A\u0430\u0436\u0438 \u043F\u0435\u0440\u0438\u043C\u0435\u0442\u0440.", "def perimeter(a, b):\n    return 2 * (a + b)\nprint(perimeter(5, 3))", "\u041F\u0435\u0440\u0438\u043C\u0435\u0442\u0440 \u043F\u0440\u044F\u043C\u043E\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A\u0430 \u2014 \u0434\u0432\u0435 \u0434\u043B\u0438\u043D\u044B \u0438 \u0434\u0432\u0435 \u0448\u0438\u0440\u0438\u043D\u044B."],
    [62, "functions.label", "\u042F\u0440\u043B\u044B\u043A \u0434\u043B\u044F \u0442\u0435\u043A\u0441\u0442\u0430", "\u0424\u0443\u043D\u043A\u0446\u0438\u044F label \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u0442 \u043F\u0435\u0440\u0435\u0434 \u0442\u0435\u043A\u0441\u0442\u043E\u043C \xAB>> \xBB. \u041F\u043E\u043A\u0430\u0436\u0438 \u044F\u0440\u043B\u044B\u043A \u0434\u043B\u044F \xAB\u041F\u043B\u0430\u043D\xBB.", 'def label(text):\n    return ">> " + text\nprint(label("\u041F\u043B\u0430\u043D"))', "\u0421\u0442\u0440\u043E\u043A\u0438 \u043C\u043E\u0436\u043D\u043E \u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0442\u044C \u0432\u043D\u0443\u0442\u0440\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u0438."],
    [63, "functions.sum-to", "\u0421\u0443\u043C\u043C\u0430 \u0434\u043E \u0447\u0438\u0441\u043B\u0430", "\u0424\u0443\u043D\u043A\u0446\u0438\u044F sum_to(n) \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0435\u0442 \u0447\u0438\u0441\u043B\u0430 \u043E\u0442 1 \u0434\u043E n. \u041F\u043E\u043A\u0430\u0436\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0434\u043B\u044F 4.", "def sum_to(n):\n    total = 0\n    for i in range(1, n + 1):\n        total = total + i\n    return total\nprint(sum_to(4))", "\u041D\u0430\u043A\u043E\u043F\u0438 \u0441\u0443\u043C\u043C\u0443 \u0432\u043D\u0443\u0442\u0440\u0438 \u0446\u0438\u043A\u043B\u0430 \u0438 \u0432\u0435\u0440\u043D\u0438 \u043F\u043E\u0441\u043B\u0435 \u043D\u0435\u0433\u043E."],
    [64, "functions.is-even", "\u0427\u0451\u0442\u043D\u043E\u0435 \u0438\u043B\u0438 \u043D\u0435\u0442", "\u0424\u0443\u043D\u043A\u0446\u0438\u044F is_even \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 True \u0434\u043B\u044F \u0447\u0451\u0442\u043D\u043E\u0433\u043E \u0447\u0438\u0441\u043B\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044C 9.", "def is_even(n):\n    return n % 2 == 0\nprint(is_even(9))", "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043E\u0441\u0442\u0430\u0442\u043E\u043A \u043E\u0442 \u0434\u0435\u043B\u0435\u043D\u0438\u044F \u043D\u0430 \u0434\u0432\u0430."],
    [65, "functions.discount", "\u0421\u043A\u0438\u0434\u043A\u0430 \u0432 \u0444\u0443\u043D\u043A\u0446\u0438\u0438", "\u0424\u0443\u043D\u043A\u0446\u0438\u044F final_price \u0443\u043C\u0435\u043D\u044C\u0448\u0430\u0435\u0442 \u0446\u0435\u043D\u0443 \u043D\u0430 3, \u0435\u0441\u043B\u0438 \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u0445\u043E\u0442\u044F \u0431\u044B \u0434\u0432\u0430. \u041F\u043E\u043A\u0430\u0436\u0438 \u0446\u0435\u043D\u0443 \u0434\u043B\u044F 2 \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u043F\u043E 8.", "def final_price(count, price):\n    total = count * price\n    if count >= 2:\n        return total - 3\n    return total\nprint(final_price(2, 8))", "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0447\u0438\u0441\u043B\u0438 \u0438\u0442\u043E\u0433, \u0437\u0430\u0442\u0435\u043C \u0440\u0435\u0448\u0438, \u043D\u0443\u0436\u043D\u0430 \u043B\u0438 \u0441\u043A\u0438\u0434\u043A\u0430."],
    [66, "functions.two-greetings", "\u041E\u0434\u0438\u043D \u0448\u0430\u0431\u043B\u043E\u043D, \u0434\u0432\u0430 \u0432\u044B\u0437\u043E\u0432\u0430", "\u0424\u0443\u043D\u043A\u0446\u0438\u044F message(name) \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442 \xAB\u041F\u0440\u0438\u0432\u0435\u0442, \u0438\u043C\u044F\xBB. \u041F\u043E\u0437\u0434\u043E\u0440\u043E\u0432\u0430\u0439\u0441\u044F \u0441 \u041B\u0435\u0435\u0439 \u0438 \u041C\u0438\u0440\u043E\u0439.", 'def message(name):\n    print("\u041F\u0440\u0438\u0432\u0435\u0442, " + name)\nmessage("\u041B\u0435\u044F")\nmessage("\u041C\u0438\u0440\u0430")', "\u0412\u044B\u0437\u043E\u0432\u0438 \u043E\u0434\u043D\u0443 \u0444\u0443\u043D\u043A\u0446\u0438\u044E \u0434\u0432\u0430 \u0440\u0430\u0437\u0430 \u0441 \u0440\u0430\u0437\u043D\u044B\u043C\u0438 \u0438\u043C\u0435\u043D\u0430\u043C\u0438."]
  ] },
  { id: 10, tasks: [
    [67, "lists.first-index", "\u041F\u0435\u0440\u0432\u043E\u0435 \u0438\u043C\u044F", "\u0412 \u0441\u043F\u0438\u0441\u043A\u0435 \u041B\u0435\u044F \u0438 \u041C\u0438\u0440\u0430. \u041F\u043E\u043A\u0430\u0436\u0438 \u043F\u0435\u0440\u0432\u043E\u0435 \u0438\u043C\u044F \u043F\u043E \u0438\u043D\u0434\u0435\u043A\u0441\u0443.", 'names = ["\u041B\u0435\u044F", "\u041C\u0438\u0440\u0430"]\nprint(names[0])', "\u041E\u0442\u0441\u0447\u0451\u0442 \u0438\u043D\u0434\u0435\u043A\u0441\u043E\u0432 \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0441 \u043D\u0443\u043B\u044F."],
    [68, "lists.last-score", "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0431\u0430\u043B\u043B", "\u0412 \u0441\u043F\u0438\u0441\u043A\u0435 3, 5, 8. \u041F\u043E\u043A\u0430\u0436\u0438 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0431\u0430\u043B\u043B.", "scores = [3, 5, 8]\nprint(scores[2])", "\u0423 \u0442\u0440\u0451\u0445 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 \u0438\u043D\u0434\u0435\u043A\u0441\u044B 0, 1, 2."],
    [69, "lists.length", "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043A\u043D\u0438\u0433", "\u0412 \u0441\u043F\u0438\u0441\u043A\u0435 \u0442\u0440\u0438 \u043A\u043D\u0438\u0433\u0438. \u0412\u044B\u0432\u0435\u0434\u0438 \u0435\u0433\u043E \u0434\u043B\u0438\u043D\u0443 \u0447\u0435\u0440\u0435\u0437 len.", 'books = ["\u041A\u043E\u0434", "\u0418\u0433\u0440\u0430", "\u041C\u0438\u0440"]\nprint(len(books))', "len \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0447\u0438\u0441\u043B\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 \u0441\u043F\u0438\u0441\u043A\u0430."],
    [70, "lists.negative-index", "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430", "\u041F\u043E\u043A\u0430\u0436\u0438 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044E\u044E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0441\u043F\u0438\u0441\u043A\u0430 4, 7, 9 \u0447\u0435\u0440\u0435\u0437 \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0438\u043D\u0434\u0435\u043A\u0441.", "cards = [4, 7, 9]\nprint(cards[-1])", "\u0418\u043D\u0434\u0435\u043A\u0441 \u22121 \u0431\u0435\u0440\u0451\u0442 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441 \u043A\u043E\u043D\u0446\u0430."],
    [71, "lists.iterate-names", "\u0418\u043C\u0435\u043D\u0430 \u043F\u043E \u043E\u0447\u0435\u0440\u0435\u0434\u0438", "\u0412\u044B\u0432\u0435\u0434\u0438 \u041B\u0435\u044F, \u041C\u0438\u0440\u0430 \u0438 \u041E\u043B\u0435\u0433 \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0438\u043C\u0435\u043D\u0438 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435 \u0447\u0435\u0440\u0435\u0437 \u0446\u0438\u043A\u043B \u043F\u043E \u0441\u043F\u0438\u0441\u043A\u0443.", 'names = ["\u041B\u0435\u044F", "\u041C\u0438\u0440\u0430", "\u041E\u043B\u0435\u0433"]\nfor name in names:\n    print(name)', "\u0426\u0438\u043A\u043B \u043C\u043E\u0436\u0435\u0442 \u0431\u0440\u0430\u0442\u044C \u0441\u0440\u0430\u0437\u0443 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0441\u043F\u0438\u0441\u043A\u0430."],
    [72, "lists.sum-prices", "\u0421\u0443\u043C\u043C\u0430 \u043F\u043E\u043A\u0443\u043F\u043E\u043A", "\u0426\u0435\u043D\u044B 4, 6, 3. \u0421\u043B\u043E\u0436\u0438 \u0438\u0445 \u0446\u0438\u043A\u043B\u043E\u043C \u0438 \u043F\u043E\u043A\u0430\u0436\u0438 \u0441\u0443\u043C\u043C\u0443.", "prices = [4, 6, 3]\ntotal = 0\nfor price in prices:\n    total = total + price\nprint(total)", "\u041D\u0430\u0447\u043D\u0438 \u0441 \u043D\u0443\u043B\u044F \u0438 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0439 \u043A\u0430\u0436\u0434\u0443\u044E \u0446\u0435\u043D\u0443."],
    [73, "lists.maximum", "\u041B\u0443\u0447\u0448\u0438\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442", "\u0411\u0430\u043B\u043B\u044B 4, 9, 6. \u041D\u0430\u0439\u0434\u0438 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0446\u0438\u043A\u043B\u043E\u043C \u0431\u0435\u0437 \u0433\u043E\u0442\u043E\u0432\u043E\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 max.", "scores = [4, 9, 6]\nbest = scores[0]\nfor score in scores:\n    if score > best:\n        best = score\nprint(best)", "\u0421\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u0439 \u043A\u0430\u0436\u0434\u044B\u0439 \u0431\u0430\u043B\u043B \u0441 \u043B\u0443\u0447\u0448\u0438\u043C \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u043C."],
    [74, "lists.replace-item", "\u0418\u0441\u043F\u0440\u0430\u0432\u044C \u043E\u0446\u0435\u043D\u043A\u0443", "\u041E\u0446\u0435\u043D\u043A\u0438 3, 2, 5. \u0417\u0430\u043C\u0435\u043D\u0438 \u0432\u0442\u043E\u0440\u0443\u044E \u043D\u0430 4 \u0438 \u043F\u043E\u043A\u0430\u0436\u0438 \u0441\u043F\u0438\u0441\u043E\u043A.", "grades = [3, 2, 5]\ngrades[1] = 4\nprint(grades)", "\u0418\u043D\u0434\u0435\u043A\u0441 \u0432\u0442\u043E\u0440\u043E\u0439 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0440\u0430\u0432\u0435\u043D 1."],
    [75, "lists.count-even", "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0447\u0451\u0442\u043D\u044B\u0445", "\u0412 \u0441\u043F\u0438\u0441\u043A\u0435 1, 2, 4, 7, 8 \u043F\u043E\u0441\u0447\u0438\u0442\u0430\u0439 \u0447\u0451\u0442\u043D\u044B\u0435 \u0447\u0438\u0441\u043B\u0430.", "numbers = [1, 2, 4, 7, 8]\ncount = 0\nfor number in numbers:\n    if number % 2 == 0:\n        count = count + 1\nprint(count)", "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0439 \u043A\u0430\u0436\u0434\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0438 \u0443\u0432\u0435\u043B\u0438\u0447\u0438\u0432\u0430\u0439 \u0441\u0447\u0451\u0442\u0447\u0438\u043A."],
    [76, "lists.filter-prices", "\u0426\u0435\u043D\u044B \u0432\u044B\u0448\u0435 \u043F\u043E\u0440\u043E\u0433\u0430", "\u0412 \u0441\u043F\u0438\u0441\u043A\u0435 4, 11, 7, 15 \u043F\u043E\u043A\u0430\u0436\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u0446\u0435\u043D\u044B \u0432\u044B\u0448\u0435 10.", "prices = [4, 11, 7, 15]\nfor price in prices:\n    if price > 10:\n        print(price)", "\u0423\u0441\u043B\u043E\u0432\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u0432\u043D\u0443\u0442\u0440\u0438 \u0446\u0438\u043A\u043B\u0430."],
    [77, "lists.running-total", "\u0421\u0447\u0451\u0442 \u043F\u043E \u0434\u043D\u044F\u043C", "\u0417\u0430 \u0442\u0440\u0438 \u0434\u043D\u044F \u0441\u043E\u0431\u0440\u0430\u043B\u0438 2, 3, 4 \u0436\u0435\u0442\u043E\u043D\u0430. \u041F\u043E\u043A\u0430\u0436\u0438 \u043D\u0430\u043A\u043E\u043F\u043B\u0435\u043D\u043D\u0443\u044E \u0441\u0443\u043C\u043C\u0443 \u043F\u043E\u0441\u043B\u0435 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0434\u043D\u044F.", "days = [2, 3, 4]\ntotal = 0\nfor amount in days:\n    total = total + amount\n    print(total)", "\u0412\u044B\u0432\u043E\u0434\u0438 \u0441\u0443\u043C\u043C\u0443 \u0432\u043D\u0443\u0442\u0440\u0438 \u0446\u0438\u043A\u043B\u0430 \u043F\u043E\u0441\u043B\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F."],
    [78, "lists.basket-total", "\u041A\u043E\u0440\u0437\u0438\u043D\u0430 \u043F\u043E\u043A\u0443\u043F\u043E\u043A", "\u0412 \u043A\u043E\u0440\u0437\u0438\u043D\u0435 \u0446\u0435\u043D\u044B 5, 8, 2. \u041F\u043E\u043A\u0430\u0436\u0438 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u0438 \u043E\u0431\u0449\u0443\u044E \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C.", "prices = [5, 8, 2]\ntotal = 0\nfor price in prices:\n    total = total + price\nprint(len(prices))\nprint(total)", "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u0430\u0451\u0442 len, \u0438\u0442\u043E\u0433 \u043D\u0430\u043A\u043E\u043F\u0438 \u0446\u0438\u043A\u043B\u043E\u043C."]
  ] },
  { id: 11, tasks: [
    [79, "input.greeting", "\u041F\u043E\u0437\u0434\u043E\u0440\u043E\u0432\u0430\u0439\u0441\u044F \u0441 \u0433\u043E\u0441\u0442\u0435\u043C", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0438\u043C\u044F \u0447\u0435\u0440\u0435\u0437 input \u0438 \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \xAB\u041F\u0440\u0438\u0432\u0435\u0442, \u0438\u043C\u044F\xBB.", 'name = input()\nprint("\u041F\u0440\u0438\u0432\u0435\u0442, " + name)', "input \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0442\u0435\u043A\u0441\u0442; \u0441\u043E\u0445\u0440\u0430\u043D\u0438 \u0435\u0433\u043E \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439.", [["\u041C\u0438\u0440\u0430"], ["\u041E\u043B\u0435\u0433"]]],
    [80, "input.next-year", "\u0427\u0435\u0440\u0435\u0437 \u0433\u043E\u0434", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0432\u043E\u0437\u0440\u0430\u0441\u0442 \u0447\u0438\u0441\u043B\u043E\u043C \u0438 \u043F\u043E\u043A\u0430\u0436\u0438, \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043B\u0435\u0442 \u0431\u0443\u0434\u0435\u0442 \u0447\u0435\u0440\u0435\u0437 \u0433\u043E\u0434.", "age = int(input())\nprint(age + 1)", "input \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0441\u0442\u0440\u043E\u043A\u0443, int \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0435\u0451 \u0432 \u0447\u0438\u0441\u043B\u043E.", [["12"], ["20"]]],
    [81, "input.add", "\u0421\u043B\u043E\u0436\u0438 \u0434\u0432\u0430 \u0432\u0432\u043E\u0434\u0430", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0434\u0432\u0430 \u0446\u0435\u043B\u044B\u0445 \u0447\u0438\u0441\u043B\u0430 \u0438 \u0432\u044B\u0432\u0435\u0434\u0438 \u0438\u0445 \u0441\u0443\u043C\u043C\u0443.", "a = int(input())\nb = int(input())\nprint(a + b)", "\u041F\u0440\u0435\u043E\u0431\u0440\u0430\u0437\u0443\u0439 \u043E\u0431\u0430 \u0432\u0432\u0435\u0434\u0451\u043D\u043D\u044B\u0445 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F.", [["3", "5"], ["10", "2"]]],
    [82, "input.order-price", "\u0426\u0435\u043D\u0430 \u0437\u0430\u043A\u0430\u0437\u0430", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0446\u0435\u043D\u0443 \u0438 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E, \u0437\u0430\u0442\u0435\u043C \u0432\u044B\u0432\u0435\u0434\u0438 \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C.", "price = int(input())\ncount = int(input())\nprint(price * count)", "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0440\u0430\u0432\u043D\u0430 \u0446\u0435\u043D\u0435, \u0443\u043C\u043D\u043E\u0436\u0435\u043D\u043D\u043E\u0439 \u043D\u0430 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E.", [["7", "3"], ["4", "5"]]],
    [83, "input.age-threshold", "\u0412\u043E\u0437\u0440\u0430\u0441\u0442\u043D\u043E\u0439 \u043F\u043E\u0440\u043E\u0433", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0432\u043E\u0437\u0440\u0430\u0441\u0442. \u041F\u043E\u043A\u0430\u0436\u0438 \xAB\u041C\u043E\u0436\u043D\u043E\xBB \u043E\u0442 18 \u043B\u0435\u0442, \u0438\u043D\u0430\u0447\u0435 \xAB\u0420\u0430\u043D\u043E\xBB.", 'age = int(input())\nif age >= 18:\n    print("\u041C\u043E\u0436\u043D\u043E")\nelse:\n    print("\u0420\u0430\u043D\u043E")', "\u0421\u0440\u0430\u0432\u043D\u0438 \u0447\u0438\u0441\u043B\u043E \u0441 18 \u0432 \u0443\u0441\u043B\u043E\u0432\u0438\u0438.", [["16"], ["21"]]],
    [84, "input.password", "\u0421\u0435\u043A\u0440\u0435\u0442\u043D\u043E\u0435 \u0441\u043B\u043E\u0432\u043E", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0441\u043B\u043E\u0432\u043E. \u0414\u043B\u044F \xAB\u043B\u0438\u0441\u0442\xBB \u043F\u043E\u043A\u0430\u0436\u0438 \xAB\u041E\u0442\u043A\u0440\u044B\u0442\u043E\xBB, \u0438\u043D\u0430\u0447\u0435 \xAB\u0417\u0430\u043A\u0440\u044B\u0442\u043E\xBB.", 'word = input()\nif word == "\u043B\u0438\u0441\u0442":\n    print("\u041E\u0442\u043A\u0440\u044B\u0442\u043E")\nelse:\n    print("\u0417\u0430\u043A\u0440\u044B\u0442\u043E")', "\u0421\u0440\u0430\u0432\u043D\u0438 \u0441\u0442\u0440\u043E\u043A\u0438 \u0447\u0435\u0440\u0435\u0437 ==.", [["\u043B\u0438\u0441\u0442"], ["\u043A\u0430\u043C\u0435\u043D\u044C"]]],
    [85, "input.weather", "\u0422\u0451\u043F\u043B\u0430\u044F \u043F\u043E\u0433\u043E\u0434\u0430", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0442\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0443. \u041E\u0442 20 \u043F\u043E\u043A\u0430\u0436\u0438 \xAB\u0422\u0435\u043F\u043B\u043E\xBB, \u0438\u043D\u0430\u0447\u0435 \xAB\u041F\u0440\u043E\u0445\u043B\u0430\u0434\u043D\u043E\xBB.", 'temp = int(input())\nif temp >= 20:\n    print("\u0422\u0435\u043F\u043B\u043E")\nelse:\n    print("\u041F\u0440\u043E\u0445\u043B\u0430\u0434\u043D\u043E")', "\u041F\u0440\u0435\u043E\u0431\u0440\u0430\u0437\u0443\u0439 \u0432\u0432\u043E\u0434 \u0432 \u0447\u0438\u0441\u043B\u043E \u043F\u0435\u0440\u0435\u0434 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435\u043C.", [["24"], ["12"]]],
    [86, "input.repeat-name", "\u041F\u043E\u0432\u0442\u043E\u0440\u0438 \u0438\u043C\u044F", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0438\u043C\u044F \u0438 \u0432\u044B\u0432\u0435\u0434\u0438 \u0435\u0433\u043E \u0442\u0440\u0438\u0436\u0434\u044B \u0447\u0435\u0440\u0435\u0437 \u0446\u0438\u043A\u043B.", "name = input()\nfor i in range(3):\n    print(name)", "\u0418\u043C\u044F \u0432\u0432\u043E\u0434\u044F\u0442 \u043E\u0434\u0438\u043D \u0440\u0430\u0437, \u0437\u0430\u0442\u0435\u043C \u0446\u0438\u043A\u043B \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442 \u0435\u0433\u043E \u0442\u0440\u0438\u0436\u0434\u044B.", [["\u041B\u0435\u044F"], ["\u041C\u0438\u0440\u0430"]]],
    [87, "input.signal-count", "\u0421\u0438\u0433\u043D\u0430\u043B \u043D\u0443\u0436\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0440\u0430\u0437", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0447\u0438\u0441\u043B\u043E n \u0438 \u0432\u044B\u0432\u0435\u0434\u0438 \xAB\u0421\u0438\u0433\u043D\u0430\u043B\xBB \u0440\u043E\u0432\u043D\u043E n \u0440\u0430\u0437.", 'n = int(input())\nfor i in range(n):\n    print("\u0421\u0438\u0433\u043D\u0430\u043B")', "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 n \u043A\u0430\u043A \u0433\u0440\u0430\u043D\u0438\u0446\u0443 range.", [["2"], ["4"]]],
    [88, "input.change", "\u0421\u0434\u0430\u0447\u0430 \u0432 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0435", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0441\u0443\u043C\u043C\u0443 \u043E\u043F\u043B\u0430\u0442\u044B \u0438 \u0446\u0435\u043D\u0443 \u043F\u043E\u043A\u0443\u043F\u043A\u0438. \u041F\u043E\u043A\u0430\u0436\u0438 \u0441\u0434\u0430\u0447\u0443.", "paid = int(input())\nprice = int(input())\nprint(paid - price)", "\u0412\u044B\u0447\u0442\u0438 \u0446\u0435\u043D\u0443 \u0438\u0437 \u043E\u043F\u043B\u0430\u0442\u044B.", [["20", "13"], ["50", "32"]]],
    [89, "input.receipt", "\u041C\u0438\u043D\u0438-\u0447\u0435\u043A", "\u041F\u043E\u043B\u0443\u0447\u0438 \u0438\u043C\u044F \u0442\u043E\u0432\u0430\u0440\u0430, \u0446\u0435\u043D\u0443 \u0438 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E. \u041F\u043E\u043A\u0430\u0436\u0438 \u0438\u043C\u044F \u0438 \u0437\u0430\u0442\u0435\u043C \u0438\u0442\u043E\u0433\u043E\u0432\u0443\u044E \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C.", "name = input()\nprice = int(input())\ncount = int(input())\nprint(name)\nprint(price * count)", "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0432\u0435\u0434\u0438 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0437\u0430\u0442\u0435\u043C \u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u0446\u0435\u043D\u044B \u043D\u0430 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E.", [["\u041A\u043D\u0438\u0433\u0430", "8", "2"], ["\u041C\u044F\u0447", "5", "3"]]]
  ] },
  { id: 12, tasks: [
    [90, "drawing.first-line", "\u041F\u0435\u0440\u0432\u0430\u044F \u043B\u0438\u043D\u0438\u044F", "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u043B\u0438\u043D\u0438\u044E \u0434\u043B\u0438\u043D\u043E\u0439 60 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 forward.", "forward(60)", "forward \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0434\u043B\u0438\u043D\u0443 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F."],
    [91, "drawing.corner", "\u041F\u043E\u0432\u0435\u0440\u043D\u0438 \u0437\u0430 \u0443\u0433\u043E\u043B", "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u0434\u0432\u0435 \u043B\u0438\u043D\u0438\u0438 \u043F\u043E 40 \u0441 \u043F\u043E\u0432\u043E\u0440\u043E\u0442\u043E\u043C \u0432\u043F\u0440\u0430\u0432\u043E \u043D\u0430 90 \u0433\u0440\u0430\u0434\u0443\u0441\u043E\u0432 \u043C\u0435\u0436\u0434\u0443 \u043D\u0438\u043C\u0438.", "forward(40)\nright(90)\nforward(40)", "\u041F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0432\u043E\u0439 \u043B\u0438\u043D\u0438\u0438 \u043F\u043E\u0432\u0435\u0440\u043D\u0438 \u043D\u0430 \u043F\u0440\u044F\u043C\u043E\u0439 \u0443\u0433\u043E\u043B."],
    [92, "drawing.square-loop", "\u041A\u0432\u0430\u0434\u0440\u0430\u0442 \u0446\u0438\u043A\u043B\u043E\u043C", "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u043A\u0432\u0430\u0434\u0440\u0430\u0442 \u0441\u043E \u0441\u0442\u043E\u0440\u043E\u043D\u043E\u0439 50 \u043E\u0434\u043D\u0438\u043C \u0446\u0438\u043A\u043B\u043E\u043C.", "for i in range(4):\n    forward(50)\n    right(90)", "\u0423 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u0430 \u0447\u0435\u0442\u044B\u0440\u0435 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u0438 \u043F\u043E\u0432\u043E\u0440\u043E\u0442\u0430."],
    [93, "drawing.triangle", "\u0422\u0440\u0435\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A", "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u0440\u0430\u0432\u043D\u043E\u0441\u0442\u043E\u0440\u043E\u043D\u043D\u0438\u0439 \u0442\u0440\u0435\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A \u0441\u043E \u0441\u0442\u043E\u0440\u043E\u043D\u043E\u0439 50 \u0447\u0435\u0440\u0435\u0437 \u0446\u0438\u043A\u043B.", "for i in range(3):\n    forward(50)\n    right(120)", "\u0412\u043D\u0435\u0448\u043D\u0438\u0439 \u043F\u043E\u0432\u043E\u0440\u043E\u0442 \u0442\u0440\u0435\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A\u0430 \u0440\u0430\u0432\u0435\u043D 120 \u0433\u0440\u0430\u0434\u0443\u0441\u0430\u043C."],
    [94, "drawing.rectangle", "\u041F\u0440\u044F\u043C\u043E\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A", "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u043F\u0440\u044F\u043C\u043E\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A \u0441\u043E \u0441\u0442\u043E\u0440\u043E\u043D\u0430\u043C\u0438 80 \u0438 40.", "for i in range(2):\n    forward(80)\n    right(90)\n    forward(40)\n    right(90)", "\u041F\u0430\u0440\u0430 \u0434\u043B\u0438\u043D\u043D\u043E\u0439 \u0438 \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0439 \u0441\u0442\u043E\u0440\u043E\u043D \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F \u0434\u0432\u0430\u0436\u0434\u044B."],
    [95, "drawing.hexagon", "\u0428\u0435\u0441\u0442\u0438\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A", "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u044B\u0439 \u0448\u0435\u0441\u0442\u0438\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A \u0441\u043E \u0441\u0442\u043E\u0440\u043E\u043D\u043E\u0439 30.", "for i in range(6):\n    forward(30)\n    right(60)", "\u0423\u0433\u043E\u043B \u0432\u043D\u0435\u0448\u043D\u0435\u0433\u043E \u043F\u043E\u0432\u043E\u0440\u043E\u0442\u0430 \u2014 360 / 6."],
    [96, "drawing.variable-size", "\u0420\u0430\u0437\u043C\u0435\u0440 \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439", "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 \u0440\u0430\u0437\u043C\u0435\u0440 70 \u0438 \u043D\u0430\u0440\u0438\u0441\u0443\u0439 \u043A\u0432\u0430\u0434\u0440\u0430\u0442, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044F \u044D\u0442\u0443 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E.", "size = 70\nfor i in range(4):\n    forward(size)\n    right(90)", "\u041F\u0435\u0440\u0435\u0434 \u0446\u0438\u043A\u043B\u043E\u043C \u0437\u0430\u043F\u043E\u043C\u043D\u0438 \u0434\u043B\u0438\u043D\u0443 \u0441\u0442\u043E\u0440\u043E\u043D\u044B."],
    [97, "drawing.stairs", "\u041B\u0435\u0441\u0442\u043D\u0438\u0446\u0430", "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u0442\u0440\u0438 \u0441\u0442\u0443\u043F\u0435\u043D\u0438: \u0432\u043F\u0440\u0430\u0432\u043E 30, \u043F\u043E\u0432\u043E\u0440\u043E\u0442, \u0432\u0432\u0435\u0440\u0445 30 \u2014 \u0438 \u0442\u0430\u043A \u0442\u0440\u0438 \u0440\u0430\u0437\u0430.", "for i in range(3):\n    forward(30)\n    left(90)\n    forward(30)\n    right(90)", "\u041E\u0434\u043D\u0430 \u0441\u0442\u0443\u043F\u0435\u043D\u044C \u0441\u043E\u0441\u0442\u043E\u0438\u0442 \u0438\u0437 \u0434\u0432\u0443\u0445 \u043E\u0442\u0440\u0435\u0437\u043A\u043E\u0432."],
    [98, "drawing.square-function", "\u0424\u0443\u043D\u043A\u0446\u0438\u044F \u0440\u0438\u0441\u0443\u0435\u0442 \u043A\u0432\u0430\u0434\u0440\u0430\u0442", "\u0421\u043E\u0437\u0434\u0430\u0439 \u0444\u0443\u043D\u043A\u0446\u0438\u044E square(size), \u043A\u043E\u0442\u043E\u0440\u0430\u044F \u0440\u0438\u0441\u0443\u0435\u0442 \u043A\u0432\u0430\u0434\u0440\u0430\u0442. \u0412\u044B\u0437\u043E\u0432\u0438 \u0435\u0451 \u0434\u043B\u044F \u0441\u0442\u043E\u0440\u043E\u043D\u044B 40.", "def square(size):\n    for i in range(4):\n        forward(size)\n        right(90)\nsquare(40)", "\u0412\u043D\u0443\u0442\u0440\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438 \u0447\u0435\u0442\u044B\u0440\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B."],
    [99, "drawing.flower", "\u0426\u0432\u0435\u0442\u043E\u043A \u0438\u0437 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u043E\u0432", "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u0447\u0435\u0442\u044B\u0440\u0435 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u0430 \u0441\u043E \u0441\u0442\u043E\u0440\u043E\u043D\u043E\u0439 30, \u043F\u043E\u0432\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u044F \u043D\u0430\u0447\u0430\u043B\u043E \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u043D\u0430 90 \u0433\u0440\u0430\u0434\u0443\u0441\u043E\u0432.", "def square():\n    for i in range(4):\n        forward(30)\n        right(90)\nfor j in range(4):\n    square()\n    right(90)", "\u041A\u0432\u0430\u0434\u0440\u0430\u0442 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0447\u0435\u0440\u0435\u043F\u0430\u0448\u043A\u0443 \u043A \u043D\u0430\u0447\u0430\u043B\u0443; \u0437\u0430\u0442\u0435\u043C \u043F\u043E\u0432\u0435\u0440\u043D\u0438 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435."],
    [100, "drawing.star-project", "\u0417\u0432\u0435\u0437\u0434\u0430 \u041A\u043E\u0434\u0438\u043A\u0430", "\u0418\u0442\u043E\u0433\u043E\u0432\u044B\u0439 \u043F\u0440\u043E\u0435\u043A\u0442: \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u0440\u0438\u0441\u0443\u0435\u0442 \u043F\u044F\u0442\u0438\u043A\u043E\u043D\u0435\u0447\u043D\u0443\u044E \u0437\u0432\u0435\u0437\u0434\u0443 \u0438\u0437 \u043B\u0438\u043D\u0438\u0439 \u043F\u043E 80. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0446\u0438\u043A\u043B \u0438 \u0432\u044B\u0437\u043E\u0432\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044E.", "def star(size):\n    for i in range(5):\n        forward(size)\n        right(144)\nstar(80)", "\u0414\u043B\u044F \u0437\u0432\u0435\u0437\u0434\u044B \u043F\u043E\u0441\u043B\u0435 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u043B\u0443\u0447\u0430 \u043F\u043E\u0432\u0435\u0440\u043D\u0438 \u043D\u0430 144 \u0433\u0440\u0430\u0434\u0443\u0441\u0430."]
  ] }
];
var chapterNames = {
  6: { title: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0432 \u0434\u0435\u043B\u0435", description: "\u0421\u0442\u0440\u043E\u043A\u0438, \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F \u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435 \u0432 \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u0445 \u0437\u0430\u0434\u0430\u0447\u0430\u0445." },
  7: { title: "\u0420\u0435\u0448\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B", description: "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0441 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u043C\u0438 \u0438\u0441\u0445\u043E\u0434\u0430\u043C\u0438." },
  8: { title: "\u0426\u0438\u043A\u043B\u044B \u0438 \u043D\u0430\u043A\u043E\u043F\u043B\u0435\u043D\u0438\u0435", description: "\u041F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F, \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0438 \u0438 \u0441\u0443\u043C\u043C\u044B." },
  9: { title: "\u0424\u0443\u043D\u043A\u0446\u0438\u0438 \u0441 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438", description: "\u041E\u0434\u0438\u043D \u0448\u0430\u0431\u043B\u043E\u043D \u0434\u043B\u044F \u0440\u0430\u0437\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445." },
  10: { title: "\u0421\u043F\u0438\u0441\u043A\u0438", description: "\u0425\u0440\u0430\u043D\u0438 \u0438 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0439 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439." },
  11: { title: "\u0412\u0432\u043E\u0434 \u0438 \u043C\u0438\u043D\u0438-\u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B", description: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u043D\u0430 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F." },
  12: { title: "\u0420\u0438\u0441\u043E\u0432\u0430\u043D\u0438\u0435 \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u044B", description: "\u0421\u043E\u0431\u0435\u0440\u0438 \u0440\u0438\u0441\u0443\u043D\u043E\u043A \u0438\u0437 \u043A\u043E\u043C\u0430\u043D\u0434, \u0446\u0438\u043A\u043B\u043E\u0432 \u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u0439." }
};
var extendedChapters = extendedSeeds.map(({ id }) => ({ id, ...chapterNames[id], required: 0 }));
var scaffolds = {
  57: { prefix: 'def greet(name):\n    print("\u041F\u0440\u0438\u0432\u0435\u0442, " + name)\n', suffix: "", answer: 'greet("\u041C\u0438\u0440\u0430")', choices: ['greet("\u041C\u0438\u0440\u0430")', "greet(name)", 'print("name")'] },
  67: { prefix: 'names = ["\u041B\u0435\u044F", "\u041C\u0438\u0440\u0430"]\nprint(names[', suffix: "])", answer: "0", choices: ["0", "1", "2"] },
  79: { prefix: "name = ", suffix: '\nprint("\u041F\u0440\u0438\u0432\u0435\u0442, " + name)', answer: "input()", choices: ["input()", "print()", "int()"] },
  90: { prefix: "", suffix: "(60)", answer: "forward", choices: ["forward", "right", "left"] }
};
function buildExtendedLessons(seeds) {
  const result = seeds.flatMap(({ id: chapter, tasks }) => tasks.map(([id, key, title, goal, code, hint, scenarios]) => {
    if (!lessonObjectives[id]) throw new Error(`Missing objectives for stable lesson ${id}`);
    const inputs = scenarios || [[]];
    const reference = runCourseProgram(code, inputs[0]);
    if (reference.error || !reference.output.length && !reference.segments.length) throw new Error(`\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0435 ${id}: ${reference.error || "\u043D\u0435\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430"}`);
    const scaffold = scaffolds[id];
    const material = courseMaterials[chapter];
    return {
      id,
      key,
      chapter,
      title,
      goal,
      instruction: `${goal}

${material.explanation}`,
      kicker: chapterNames[chapter].title,
      mode: scaffold ? "completion" : "text",
      supportLevel: scaffold ? "guided_code" : "free_code",
      difficulty: Math.min(5, Math.max(1, chapter - 5)),
      hint,
      starterHint: hint,
      progressiveHints: [material.plan, hint, `${hint} \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442${reference.output.length ? `: ${reference.output.join(" \u2192 ")}` : " \u043D\u0430 \u0440\u0438\u0441\u0443\u043D\u043A\u0435"}.`],
      codeNote: "\u041D\u0430\u043F\u0438\u0448\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443 \u0441\u0430\u043C. \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442 \u0435\u0451 \u0438 \u0441\u0440\u0430\u0432\u043D\u0438\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441 \u0437\u0430\u0434\u0430\u043D\u0438\u0435\u043C.",
      expectedOutput: reference.output,
      answer: scaffold?.answer || code,
      codeAnswer: code,
      ...scaffold ? { prefix: scaffold.prefix, suffix: scaffold.suffix, choices: scaffold.choices } : {},
      starter: {},
      solution: {},
      allowed: [],
      validate: () => null,
      skills: lessonObjectives[id].skills,
      extended: { inputs, rules: lessonObjectives[id].rules, drawing: chapter === 12 },
      success: chapter === 12 ? "\u0420\u0438\u0441\u0443\u043D\u043E\u043A \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u0441\u044F. \u0422\u044B \u0441\u043E\u0431\u0440\u0430\u043B \u0435\u0433\u043E \u0438\u0437 \u043A\u043E\u043C\u0430\u043D\u0434 Python." : "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0434\u0430\u043B\u0430 \u043D\u0443\u0436\u043D\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u043E\u0431\u044A\u044F\u0441\u043D\u0438\u0442\u044C, \u043F\u043E\u0447\u0435\u043C\u0443 \u043E\u043D\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442."
    };
  }));
  if (new Set(result.map((item) => item.id)).size !== result.length || new Set(result.map((item) => item.key)).size !== result.length) throw new Error("Duplicate lesson identity");
  return result;
}
var extendedLessons = buildExtendedLessons(extendedSeeds);

// src/course.ts
var original = (id) => lessons2.find((l) => l.id === id);
var emptyWorkspace = { blocks: { languageVersion: 0, blocks: [] } };
var text2 = (value) => ({ type: "text", fields: { TEXT: value } });
var print2 = (value) => ({ type: "text_print", inputs: { TEXT: { block: text2(value) } } });
var state2 = (block) => ({ blocks: { languageVersion: 0, blocks: [{ ...block, x: 24, y: 28 }] } });
var greeting = (id, title, phrase) => ({ ...original(1), id, title, goal: `\u0421\u0434\u0435\u043B\u0430\u0439 \u0442\u0430\u043A, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u043D\u0430\u043F\u0438\u0441\u0430\u043B\u0430: ${phrase}`, instruction: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \xAB\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C\xBB \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0442\u043E, \u0447\u0442\u043E \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0432\u043D\u0443\u0442\u0440\u0438 \u043D\u0435\u0451.", starter: emptyWorkspace, solution: state2(print2(phrase)), expectedOutput: [phrase], hint: "\u0414\u043E\u0431\u0430\u0432\u044C \xAB\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C\xBB, \u0430 \u0432\u043D\u0443\u0442\u0440\u044C \u2014 \xAB\u0422\u0435\u043A\u0441\u0442\xBB. \u0412\u043F\u0438\u0448\u0438 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0431\u0435\u0437 \u043A\u0430\u0432\u044B\u0447\u0435\u043A: \u0431\u043B\u043E\u043A \u0434\u043E\u0431\u0430\u0432\u0438\u0442 \u0438\u0445 \u0432 Python \u0441\u0430\u043C.", starterHint: "\u0421\u043E\u0431\u0435\u0440\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u0438 \u0441\u043A\u0430\u0436\u0438 \u0435\u0439, \u0447\u0442\u043E \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C.", success: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430 print \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0442\u0435\u043A\u0441\u0442 \u0432 \u0441\u043A\u043E\u0431\u043A\u0430\u0445. \u041A\u0430\u0432\u044B\u0447\u043A\u0438 \u043E\u0442\u043C\u0435\u0447\u0430\u044E\u0442 \u043D\u0430\u0447\u0430\u043B\u043E \u0438 \u043A\u043E\u043D\u0435\u0446 \u0442\u0435\u043A\u0441\u0442\u0430.", allowed: ["text_print", "text"], codeNote: "\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C \u2192 print. \u0422\u0435\u043A\u0441\u0442 \u2192 \u0441\u043B\u043E\u0432\u0430 \u0432 \u043A\u0430\u0432\u044B\u0447\u043A\u0430\u0445. \u0421\u043A\u043E\u0431\u043A\u0438 \u0441\u043E\u0435\u0434\u0438\u043D\u044F\u044E\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435." });
var chapters = [
  { id: 1, title: "\u041A\u043E\u043C\u0430\u043D\u0434\u044B \u0438 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F", description: "\u041F\u043E\u043F\u0440\u043E\u0441\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443 \u0447\u0442\u043E-\u043D\u0438\u0431\u0443\u0434\u044C \u0441\u043A\u0430\u0437\u0430\u0442\u044C.", required: 6 },
  { id: 2, title: "\u0417\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0442\u044C \u0438 \u0441\u0447\u0438\u0442\u0430\u0442\u044C", description: "\u0414\u0430\u0439 \u0434\u0430\u043D\u043D\u044B\u043C \u0438\u043C\u044F \u0438 \u043D\u0430\u0443\u0447\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443 \u0441\u0447\u0438\u0442\u0430\u0442\u044C.", required: 4 },
  { id: 3, title: "\u041F\u0440\u0438\u043D\u0438\u043C\u0430\u0442\u044C \u0440\u0435\u0448\u0435\u043D\u0438\u044F", description: "\u0420\u0430\u0437\u043D\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0434\u043B\u044F \u0440\u0430\u0437\u043D\u044B\u0445 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0439.", required: 4 },
  { id: 4, title: "\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u0442\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F", description: "\u041E\u0434\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0432\u043C\u0435\u0441\u0442\u043E \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0445.", required: 4 },
  { id: 5, title: "\u041E\u0442 \u0431\u043B\u043E\u043A\u043E\u0432 \u043A Python", description: "\u041D\u0430\u0437\u043E\u0432\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0438 \u043D\u0430\u043F\u0438\u0448\u0438 \u0441\u0432\u043E\u0438 \u0441\u0442\u0440\u043E\u043A\u0438 \u043A\u043E\u0434\u0430.", required: 0 },
  ...extendedChapters
];
var newLessons = [
  { ...greeting(1, "\u041D\u0430\u0443\u0447\u0438\u043C \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443 \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u044C", "\u041F\u0440\u0438\u0432\u0435\u0442!"), chapter: 1, tutorial: ["print", "text_value"] },
  { ...greeting(13, "\u0422\u0435\u043F\u0435\u0440\u044C \u2014 \u0442\u0432\u043E\u0451 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435", "\u041C\u043D\u0435 \u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F Python"), chapter: 1, instruction: "\u041F\u043E\u0437\u0434\u043E\u0440\u043E\u0432\u0430\u043B\u0438\u0441\u044C! \u0422\u0435\u043F\u0435\u0440\u044C \u0440\u0430\u0441\u0441\u043A\u0430\u0436\u0435\u043C, \u0447\u0442\u043E \u043D\u0430\u043C \u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F. \u0421\u043E\u0431\u0435\u0440\u0438 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0441\u0430\u043C\u043E\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u043D\u043E." },
  { ...greeting(14, "\u0423\u0437\u043D\u0430\u0439 \u0441\u0432\u043E\u044E \u0441\u0442\u0440\u043E\u043A\u0443", "\u041F\u0440\u0438\u0432\u0435\u0442!"), chapter: 1, mode: "recognition", goal: "\u041A\u0430\u043A \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u044D\u0442\u0443 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u043D\u0430 Python?", instruction: "\u0411\u043B\u043E\u043A \xAB\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C\xBB \u0441 \u0442\u0435\u043A\u0441\u0442\u043E\u043C \xAB\u041F\u0440\u0438\u0432\u0435\u0442!\xBB \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0435\u0442\u0441\u044F \u0432 \u043E\u0434\u043D\u0443 \u0441\u0442\u0440\u043E\u043A\u0443. \u0412\u044B\u0431\u0435\u0440\u0438 \u0435\u0451.", choices: ['say("\u041F\u0440\u0438\u0432\u0435\u0442!")', 'print("\u041F\u0440\u0438\u0432\u0435\u0442!")', "print(\u041F\u0440\u0438\u0432\u0435\u0442!)"], answer: 'print("\u041F\u0440\u0438\u0432\u0435\u0442!")', hint: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u0432\u044B\u0432\u043E\u0434\u0430 \u043D\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F print. \u0422\u0435\u043A\u0441\u0442 \u0432\u043D\u0443\u0442\u0440\u0438 \u043A\u0440\u0443\u0433\u043B\u044B\u0445 \u0441\u043A\u043E\u0431\u043E\u043A \u043E\u043A\u0440\u0443\u0436\u0451\u043D \u043A\u0430\u0432\u044B\u0447\u043A\u0430\u043C\u0438." },
  { ...original(7), chapter: 1, tutorial: ["sequence"], starter: state2(print2("\u0421\u0442\u0430\u0440\u0442")), codeNote: "\u0421\u043E\u0435\u0434\u0438\u043D\u0451\u043D\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E\u0442\u0441\u044F \u0441\u0432\u0435\u0440\u0445\u0443 \u0432\u043D\u0438\u0437. \u041A\u0430\u0436\u0434\u0430\u044F print \u0437\u0430\u043D\u0438\u043C\u0430\u0435\u0442 \u0441\u0432\u043E\u044E \u0441\u0442\u0440\u043E\u043A\u0443." },
  { ...original(7), id: 22, chapter: 1, title: "\u0414\u0432\u0430 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u043F\u043E \u043F\u043E\u0440\u044F\u0434\u043A\u0443", review: true, instruction: "\u041E\u0431\u044A\u044F\u0432\u0438\u043C \u043D\u0430\u0447\u0430\u043B\u043E \u0438 \u043A\u043E\u043D\u0435\u0446 \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0439 \u0433\u043E\u043D\u043A\u0438. \u0421\u043E\u0431\u0435\u0440\u0438 \u0434\u0432\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \xAB\u0421\u0442\u0430\u0440\u0442\xBB, \u0437\u0430\u0442\u0435\u043C \xAB\u0424\u0438\u043D\u0438\u0448\xBB.", codeNote: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0431\u043B\u043E\u043A\u043E\u0432 = \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0441\u0442\u0440\u043E\u043A Python." },
  { ...original(6), chapter: 2, tutorial: ["number"], starter: state2({ type: "text_print" }), goal: "\u041D\u0430 \u0442\u0430\u0431\u043B\u043E \u043D\u0443\u0436\u043D\u043E \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0447\u0438\u0441\u043B\u043E 7. \u0414\u043E\u0431\u0430\u0432\u044C \u0447\u0438\u0441\u043B\u043E \u0432 \u043F\u0443\u0441\u0442\u0443\u044E \u043A\u043E\u043C\u0430\u043D\u0434\u0443.", expectedOutput: ["7"], solution: state2({ type: "text_print", inputs: { TEXT: { block: { type: "math_number", fields: { NUM: 7 } } } } }), validate: (p) => p.statements.some((s) => s.kind === "print" && s.value.kind === "number") ? null : "\u0412\u0441\u0442\u0430\u0432\u044C \u0438\u043C\u0435\u043D\u043D\u043E \u0447\u0438\u0441\u043B\u043E, \u0447\u0442\u043E\u0431\u044B \u0441 \u043D\u0438\u043C \u043C\u043E\u0436\u043D\u043E \u0431\u044B\u043B\u043E \u0441\u0447\u0438\u0442\u0430\u0442\u044C.", codeNote: "\u0427\u0438\u0441\u043B\u0430 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0431\u0435\u0437 \u043A\u0430\u0432\u044B\u0447\u0435\u043A: print(7). \u0422\u0435\u043A\u0441\u0442 \u2014 \u0441 \u043A\u0430\u0432\u044B\u0447\u043A\u0430\u043C\u0438.", success: "7 \u0431\u0435\u0437 \u043A\u0430\u0432\u044B\u0447\u0435\u043A \u2014 \u0447\u0438\u0441\u043B\u043E. \u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u043C\u043E\u0436\u0435\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0435\u0433\u043E \u0432 \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F\u0445." },
  { ...original(2), chapter: 2, tutorial: ["variable"], starter: emptyWorkspace, instruction: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0435 \u043D\u0443\u0436\u043D\u043E \u0437\u0430\u043F\u043E\u043C\u043D\u0438\u0442\u044C \u0438\u043C\u044F \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u0446\u044B \u2014 \u041C\u0438\u0440\u0430. \u0421\u043E\u0437\u0434\u0430\u0434\u0438\u043C \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u043D\u0443\u044E \xAB\u043A\u043E\u0440\u043E\u0431\u043A\u0443\xBB, \u043F\u043E\u043B\u043E\u0436\u0438\u043C \u0442\u0443\u0434\u0430 \u0438\u043C\u044F \u0438 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0435\u043C \u0435\u0433\u043E.", starterHint: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0437\u0434\u0430\u0439 \u043A\u043E\u0440\u043E\u0431\u043A\u0443 \u0441 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\u043C \xAB\u0438\u043C\u044F\xBB.", codeNote: '\u0438\u043C\u044F = "\u041C\u0438\u0440\u0430" \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0442\u0435\u043A\u0441\u0442. print(\u0438\u043C\u044F) \u0447\u0438\u0442\u0430\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435. \u0422\u0430\u043A\u0430\u044F \u043A\u043E\u0440\u043E\u0431\u043A\u0430 \u043D\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439.' },
  { ...original(3), chapter: 2, tutorial: ["arithmetic"], instruction: "\u0417\u0430 \u043F\u0435\u0440\u0432\u044B\u0439 \u0440\u0430\u0443\u043D\u0434 \u0434\u0430\u043B\u0438 2 \u0431\u0430\u043B\u043B\u0430, \u0437\u0430 \u0432\u0442\u043E\u0440\u043E\u0439 \u2014 3. \u041F\u043E\u0441\u0447\u0438\u0442\u0430\u0435\u043C, \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C \u0432\u043C\u0435\u0441\u0442\u0435.", codeNote: "\u0417\u043D\u0430\u043A + \u0432\u043D\u0443\u0442\u0440\u0438 print \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0435\u0442 \u0447\u0438\u0441\u043B\u0430, \u0437\u0430\u0442\u0435\u043C print \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0441\u0443\u043C\u043C\u0443." },
  { ...original(8), chapter: 2, review: true, instruction: "\u0412 \u043A\u0430\u0436\u0434\u043E\u0439 \u0438\u0437 \u0447\u0435\u0442\u044B\u0440\u0451\u0445 \u043A\u043E\u0440\u043E\u0431\u043E\u043A \u043B\u0435\u0436\u0430\u0442 2 \u043A\u0440\u0430\u0441\u043D\u044B\u0445 \u0438 3 \u0437\u0435\u043B\u0451\u043D\u044B\u0445 \u043A\u0430\u0440\u0430\u043D\u0434\u0430\u0448\u0430. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0441\u0447\u0438\u0442\u0430\u0439 \u043A\u0430\u0440\u0430\u043D\u0434\u0430\u0448\u0438 \u0432 \u043E\u0434\u043D\u043E\u0439 \u043A\u043E\u0440\u043E\u0431\u043A\u0435, \u0437\u0430\u0442\u0435\u043C \u0432\u043E \u0432\u0441\u0435\u0445.", codeNote: "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0439 \u0431\u043B\u043E\u043A \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0435\u0442\u0441\u044F \u0432 \u0441\u043A\u043E\u0431\u043A\u0438: (2 + 3) * 4." },
  { ...original(2), id: 15, chapter: 2, mode: "recognition", title: "\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u0439 \u0438\u0437 \u043A\u043E\u0440\u043E\u0431\u043A\u0438", instruction: "\u0418\u043C\u044F \xAB\u041C\u0438\u0440\u0430\xBB \u0443\u0436\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u0438\u043C\u044F. \u0412\u044B\u0431\u0435\u0440\u0438 \u0441\u0442\u0440\u043E\u043A\u0443, \u043A\u043E\u0442\u043E\u0440\u0430\u044F \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0435\u0442 \u0435\u0451 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435.", goal: "\u041F\u043E\u043A\u0430\u0436\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u0438\u043C\u044F, \u0430 \u043D\u0435 \u0441\u043B\u043E\u0432\u043E \xAB\u0438\u043C\u044F\xBB.", choices: ['print("\u0438\u043C\u044F")', "print(\u0438\u043C\u044F)", '\u0438\u043C\u044F("\u041C\u0438\u0440\u0430")'], answer: "print(\u0438\u043C\u044F)", hint: "\u041A\u0430\u0432\u044B\u0447\u043A\u0438 \u043E\u0431\u043E\u0437\u043D\u0430\u0447\u0430\u044E\u0442 \u043E\u0431\u044B\u0447\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442. \u0427\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E, \u043D\u0430\u043F\u0438\u0448\u0438 \u0435\u0451 \u0438\u043C\u044F \u0431\u0435\u0437 \u043A\u0430\u0432\u044B\u0447\u0435\u043A.", codeNote: 'print(\u0438\u043C\u044F) \u0447\u0438\u0442\u0430\u0435\u0442 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E. print("\u0438\u043C\u044F") \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442 \u0441\u0430\u043C\u043E \u0441\u043B\u043E\u0432\u043E.' },
  { ...original(9), chapter: 3, tutorial: ["comparison"], instruction: "\u0414\u043B\u044F \u043F\u0440\u043E\u0445\u043E\u0434\u0430 \u043D\u0443\u0436\u043D\u043E \u0445\u043E\u0442\u044F \u0431\u044B 10 \u0431\u0430\u043B\u043B\u043E\u0432, \u0430 \u0443 \u0438\u0433\u0440\u043E\u043A\u0430 \u0438\u0445 12. \u0423\u0437\u043D\u0430\u0435\u043C, \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043B\u0438 \u044D\u0442\u043E\u0433\u043E.", codeNote: "\u0421\u043B\u0435\u0432\u0430 \u2014 \u0431\u0430\u043B\u043B\u044B \u0438\u0433\u0440\u043E\u043A\u0430, \u0441\u043F\u0440\u0430\u0432\u0430 \u2014 \u043F\u043E\u0440\u043E\u0433. >= \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \xAB\u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435\xBB. True \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \xAB\u0434\u0430\xBB." },
  { ...original(5), chapter: 3, tutorial: ["if"], starter: { variables: [{ name: "\u0431\u0430\u043B\u043B\u044B", id: "score" }], blocks: { languageVersion: 0, blocks: [{ type: "variables_set", x: 24, y: 28, fields: { VAR: { id: "score" } }, inputs: { VALUE: { block: { type: "math_number", fields: { NUM: 12 } } } } }] } }, instruction: "\u0423 \u0438\u0433\u0440\u043E\u043A\u0430 12 \u0431\u0430\u043B\u043B\u043E\u0432. \u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F, \u0435\u0441\u043B\u0438 \u0431\u0430\u043B\u043B\u043E\u0432 \u0445\u043E\u0442\u044F \u0431\u044B 10. \u041A\u043E\u043C\u0430\u043D\u0434\u0430 \xAB\u0415\u0441\u043B\u0438\xBB \u0440\u0435\u0448\u0438\u0442, \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043B\u0438 \u043F\u043E\u0437\u0434\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435.", codeNote: "if \u2014 \xAB\u0435\u0441\u043B\u0438\xBB. \u041F\u043E\u0441\u043B\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0441\u0442\u0430\u0432\u0438\u0442\u0441\u044F \u0434\u0432\u043E\u0435\u0442\u043E\u0447\u0438\u0435. \u041E\u0442\u0441\u0442\u0443\u043F \u043F\u0435\u0440\u0435\u0434 print \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442, \u0447\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0432\u043D\u0443\u0442\u0440\u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F." },
  { ...original(10), chapter: 3, tutorial: ["else"], codeNote: "else: \u2014 \xAB\u0438\u043D\u0430\u0447\u0435\xBB. \u0415\u0451 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0442\u043E\u0436\u0435 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C." },
  { ...original(9), id: 16, chapter: 3, mode: "completion", title: "\u0414\u043E\u043F\u0438\u0448\u0438 \u0437\u043D\u0430\u043A \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F", instruction: "\u0412 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u0431\u0430\u043B\u043B\u044B \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E 12. \u041F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u043C \u0438\u0433\u0440\u043E\u043A\u0430 \u0441 10 \u0431\u0430\u043B\u043B\u0430\u043C\u0438 \u0438 \u0431\u043E\u043B\u044C\u0448\u0435. \u0412\u0441\u0442\u0430\u0432\u044C \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043D\u044B\u0439 \u0437\u043D\u0430\u043A.", goal: "\u0412\u044B\u0431\u0435\u0440\u0438 \u0437\u043D\u0430\u043A, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \xAB\u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435\xBB.", prefix: "\u0431\u0430\u043B\u043B\u044B = 12\nif \u0431\u0430\u043B\u043B\u044B ", suffix: ' 10:\n    print("\u041C\u043E\u0436\u043D\u043E \u043F\u0440\u043E\u0439\u0442\u0438")', choices: ["==", ">=", "<"], answer: ">=", hint: "\u0420\u0430\u0432\u0435\u043D\u0441\u0442\u0432\u043E \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F 10. \u0417\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u043D\u043E \xAB\u0431\u043E\u043B\u044C\u0448\u0435 \u0438\u043B\u0438 \u0440\u0430\u0432\u043D\u043E\xBB.", codeNote: "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 >= \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u0438 10, \u0438 11, \u0438 12." },
  { ...original(5), id: 17, chapter: 3, review: true, title: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043F\u0440\u043E\u043F\u0443\u0441\u043A", instruction: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u0441\u0451 \u0432\u043C\u0435\u0441\u0442\u0435: \u0437\u0430\u043F\u043E\u043C\u043D\u0438\u0442\u044C 12 \u0431\u0430\u043B\u043B\u043E\u0432, \u0441\u0440\u0430\u0432\u043D\u0438\u0442\u044C \u0441 \u043F\u043E\u0440\u043E\u0433\u043E\u043C 10, \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u043E\u0437\u0434\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F.", codeNote: "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u2192 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u2192 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0432\u043D\u0443\u0442\u0440\u0438 if." },
  { ...original(4), chapter: 4, tutorial: ["loop"], codeNote: "for \u2026 in range(3): \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0442\u0440\u0438 \u0440\u0430\u0437\u0430. \u041E\u0442\u0441\u0442\u0443\u043F \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442, \u0447\u0442\u043E \u0438\u043C\u0435\u043D\u043D\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F." },
  { ...original(4), id: 18, chapter: 4, title: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438 \u0441\u0430\u043C\u043E\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u043D\u043E", starter: emptyWorkspace, instruction: "\u041D\u0430 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0435 \u043D\u0443\u0436\u043D\u043E \u0442\u0440\u0438 \u0440\u0430\u0437\u0430 \u0441\u043A\u0430\u0437\u0430\u0442\u044C \xAB\u0423\u0447\u0443\u0441\u044C!\xBB. \u0421\u043E\u0431\u0435\u0440\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435 \u0441\u0430\u043C\u043E\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u043D\u043E.", codeNote: "\u041E\u0434\u0438\u043D print \u0432\u043D\u0443\u0442\u0440\u0438 \u0446\u0438\u043A\u043B\u0430 \u0437\u0430\u043C\u0435\u043D\u044F\u0435\u0442 \u0442\u0440\u0438 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0435 \u0441\u0442\u0440\u043E\u043A\u0438." },
  { ...original(4), id: 19, chapter: 4, review: true, mode: "tokens", title: "\u0421\u043E\u0431\u0435\u0440\u0438 \u0446\u0438\u043A\u043B \u043D\u0430 Python", instruction: "\u0411\u043B\u043E\u043A \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0435\u0442\u0441\u044F \u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A for. \u0421\u043E\u0431\u0435\u0440\u0438 \u0435\u0433\u043E \u0438\u0437 \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0438\u0445 \u0447\u0430\u0441\u0442\u0435\u0439 Python.", goal: "\u0421\u043E\u0441\u0442\u0430\u0432\u044C \u0441\u0442\u0440\u043E\u043A\u0443, \u043A\u043E\u0442\u043E\u0440\u0430\u044F \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442 \u0446\u0438\u043A\u043B \u0438\u0437 \u0442\u0440\u0451\u0445 \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439.", tokens: ["range(3)", ":", "for ", "i ", "in "], answer: "for i in range(3):", prefix: "", suffix: '\n    print("\u0423\u0447\u0443\u0441\u044C!")', hint: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0442\u0430\u043A\u043E\u0439: for, \u0438\u043C\u044F \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0430, in, range \u0441 \u0447\u0438\u0441\u043B\u043E\u043C \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439, \u0434\u0432\u043E\u0435\u0442\u043E\u0447\u0438\u0435.", expectedOutput: ["\u0423\u0447\u0443\u0441\u044C!", "\u0423\u0447\u0443\u0441\u044C!", "\u0423\u0447\u0443\u0441\u044C!"], validate: (p) => p.statements.some((s) => s.kind === "repeat") ? null : "\u0421\u043E\u0431\u0435\u0440\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0446\u0438\u043A\u043B\u0430 for \u0441 range(3).", codeNote: "for i in range(3): \u2014 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0446\u0438\u043A\u043B\u0430. \u041E\u0442\u0441\u0442\u0443\u043F \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u043C\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435." },
  { ...original(11), chapter: 5, tutorial: ["function"], codeNote: "def \u0434\u0430\u0451\u0442 \u0433\u0440\u0443\u043F\u043F\u0435 \u043A\u043E\u043C\u0430\u043D\u0434 \u0438\u043C\u044F. \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435() \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u0438\u0445. \u0411\u0435\u0437 \u0432\u044B\u0437\u043E\u0432\u0430 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442." },
  { ...original(12), chapter: 5, review: true, codeNote: "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0445\u0440\u0430\u043D\u0438\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435, \u0446\u0438\u043A\u043B \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442 \u0432\u044B\u0437\u043E\u0432. \u041D\u0430\u0436\u043C\u0438 \u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0444\u0443\u043D\u043A\u0446\u0438\u0438, \u0447\u0442\u043E\u0431\u044B \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0446\u0438\u043A\u043B \u043F\u043E\u0441\u043B\u0435 \u043D\u0435\u0451." },
  { ...original(2), id: 20, chapter: 5, mode: "text", title: "\u041F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u0431\u0435\u0437 \u0431\u043B\u043E\u043A\u043E\u0432", instruction: "\u0422\u044B \u0443\u0436\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u043B \u0438\u043C\u044F \u0432 \u0431\u043B\u043E\u043A\u0430\u0445 \u0438 \u0443\u0437\u043D\u0430\u0432\u0430\u043B \u0435\u0433\u043E \u0441\u0442\u0440\u043E\u043A\u0443. \u0422\u0435\u043F\u0435\u0440\u044C \u043D\u0430\u043F\u0438\u0448\u0438 \u043E\u0431\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0441\u0430\u043C.", goal: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 \xAB\u041C\u0438\u0440\u0430\xBB \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u0438\u043C\u044F \u0438 \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0439 \u0435\u0451 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.", expectedOutput: ["\u041C\u0438\u0440\u0430"], answer: '\u0438\u043C\u044F = "\u041C\u0438\u0440\u0430"\nprint(\u0438\u043C\u044F)', validate: (p) => p.statements.some((s) => s.kind === "assign" && s.name === "\u0438\u043C\u044F") && p.statements.some((s) => s.kind === "print" && s.value.kind === "variable" && s.value.name === "\u0438\u043C\u044F") ? null : "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438 \u0442\u0435\u043A\u0441\u0442 \u0432 \u0438\u043C\u044F, \u0437\u0430\u0442\u0435\u043C \u043F\u0435\u0440\u0435\u0434\u0430\u0439 \u0438\u043C\u044F \u0432 print \u0431\u0435\u0437 \u043A\u0430\u0432\u044B\u0447\u0435\u043A.", codeNote: "\u042D\u0442\u043E \u0442\u0435 \u0436\u0435 \u043F\u0440\u0438\u0441\u0432\u0430\u0438\u0432\u0430\u043D\u0438\u0435 \u0438 \u0447\u0442\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439, \u043D\u043E \u0442\u0435\u043F\u0435\u0440\u044C \u0431\u043B\u043E\u043A\u0438 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u043D\u0443\u0436\u043D\u044B." },
  { ...original(12), id: 21, chapter: 5, mode: "text", review: true, title: "\u0424\u0443\u043D\u043A\u0446\u0438\u044F \u0438 \u0446\u0438\u043A\u043B \u2014 \u0442\u0432\u043E\u0439 \u043A\u043E\u0434", instruction: "\u0421\u043E\u0431\u0435\u0440\u0438 \u0437\u043D\u0430\u043A\u043E\u043C\u044B\u0435 \u0438\u0434\u0435\u0438 \u0443\u0436\u0435 \u0432 \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0435\u043C Python: \u043E\u043F\u0438\u0448\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044E \u0438 \u0432\u044B\u0437\u043E\u0432\u0438 \u0435\u0451 \u0442\u0440\u0438 \u0440\u0430\u0437\u0430 \u0432 \u0446\u0438\u043A\u043B\u0435.", goal: "\u0424\u0443\u043D\u043A\u0446\u0438\u044F \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442 \xAB\u041F\u0440\u0438\u0432\u0435\u0442!\xBB, \u0430 \u0446\u0438\u043A\u043B \u0432\u044B\u0437\u044B\u0432\u0430\u0435\u0442 \u0435\u0451 3 \u0440\u0430\u0437\u0430.", expectedOutput: ["\u041F\u0440\u0438\u0432\u0435\u0442!", "\u041F\u0440\u0438\u0432\u0435\u0442!", "\u041F\u0440\u0438\u0432\u0435\u0442!"], answer: 'def \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435():\n    print("\u041F\u0440\u0438\u0432\u0435\u0442!")\n\nfor i in range(3):\n    \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435()', validate: (p) => {
    const hasFunction = p.statements.some((s) => s.kind === "define" && s.name === "\u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435");
    const hasLoop = p.statements.some((s) => s.kind === "repeat" && s.body.some((c) => c.kind === "call" && c.name === "\u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435"));
    return hasFunction && hasLoop ? null : "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044E \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435, \u0437\u0430\u0442\u0435\u043C \u0432\u044B\u0437\u043E\u0432\u0438 \u0435\u0451 \u0432\u043D\u0443\u0442\u0440\u0438 \u0446\u0438\u043A\u043B\u0430 for.";
  }, codeNote: "Blockly \u0438\u0441\u0447\u0435\u0437: \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043E\u0441\u0442\u0430\u043B\u0430\u0441\u044C \u0442\u043E\u0439 \u0436\u0435 \u2014 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435, \u0446\u0438\u043A\u043B \u0438 \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0439 \u0432\u044B\u0437\u043E\u0432 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C." }
];
var metadata = {
  1: { teaches: ["print", "string"], practices: [], requires: [] },
  13: { teaches: [], practices: ["print", "string"], requires: ["print", "string"] },
  14: { teaches: ["text_syntax"], practices: ["print", "string"], requires: ["print", "string"] },
  7: { teaches: ["sequence"], practices: ["print", "string"], requires: ["print"] },
  22: { teaches: [], practices: ["sequence", "print", "string"], requires: ["print", "sequence"] },
  6: { teaches: ["number"], practices: ["print"], requires: ["print"] },
  2: { teaches: ["variable", "assignment"], practices: ["print", "string"], requires: ["print", "string"] },
  3: { teaches: ["arithmetic"], practices: ["number", "print"], requires: ["number", "print"] },
  8: { teaches: [], practices: ["arithmetic", "number", "sequence", "print"], requires: ["arithmetic", "number"] },
  15: { teaches: [], practices: ["variable", "assignment", "print", "text_syntax"], requires: ["variable", "assignment", "print"] },
  9: { teaches: ["comparison"], practices: ["number", "print"], requires: ["number", "print"] },
  5: { teaches: ["if", "indentation"], practices: ["comparison", "assignment", "variable", "print"], requires: ["comparison", "assignment"] },
  10: { teaches: [], practices: ["if", "comparison", "indentation", "print"], requires: ["if", "comparison"] },
  16: { teaches: [], practices: ["comparison", "if", "text_syntax"], requires: ["comparison", "if"] },
  17: { teaches: [], practices: ["variable", "assignment", "comparison", "if", "indentation", "print"], requires: ["assignment", "comparison", "if"] },
  4: { teaches: ["loop", "indentation"], practices: ["sequence", "number", "print"], requires: ["sequence", "number"] },
  18: { teaches: [], practices: ["loop", "indentation", "sequence", "number", "print"], requires: ["loop", "sequence"] },
  19: { teaches: ["text_syntax"], practices: ["loop", "indentation", "number", "print"], requires: ["loop", "print"] },
  11: { teaches: ["function", "indentation"], practices: ["print", "sequence"], requires: ["print", "sequence"] },
  12: { teaches: [], practices: ["function", "loop", "indentation", "print", "sequence"], requires: ["function", "loop"] },
  20: { teaches: [], practices: ["variable", "assignment", "print", "string", "text_syntax"], requires: ["variable", "assignment", "print"] },
  21: { teaches: [], practices: ["function", "loop", "indentation", "sequence", "print", "text_syntax"], requires: ["function", "loop", "print"] }
};
var codeAnswers = {
  1: 'print("\u041F\u0440\u0438\u0432\u0435\u0442!")',
  13: 'print("\u041C\u043D\u0435 \u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F Python")',
  14: 'print("\u041F\u0440\u0438\u0432\u0435\u0442!")',
  7: 'print("\u0421\u0442\u0430\u0440\u0442")\nprint("\u0424\u0438\u043D\u0438\u0448")',
  22: 'print("\u0421\u0442\u0430\u0440\u0442")\nprint("\u0424\u0438\u043D\u0438\u0448")',
  6: "print(7)",
  2: '\u0438\u043C\u044F = "\u041C\u0438\u0440\u0430"\nprint(\u0438\u043C\u044F)',
  3: "print(2 + 3)",
  8: "print((2 + 3) * 4)",
  15: '\u0438\u043C\u044F = "\u041C\u0438\u0440\u0430"\nprint(\u0438\u043C\u044F)',
  9: "print(12 >= 10)",
  5: '\u0431\u0430\u043B\u043B\u044B = 12\nif \u0431\u0430\u043B\u043B\u044B >= 10:\n    print("\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043F\u0440\u043E\u0439\u0434\u0435\u043D!")',
  10: 'if 3 >= 10:\n    print("\u041C\u043E\u0436\u043D\u043E")\nelse:\n    print("\u041F\u043E\u043A\u0430 \u0440\u0430\u043D\u043E")',
  16: '\u0431\u0430\u043B\u043B\u044B = 12\nif \u0431\u0430\u043B\u043B\u044B >= 10:\n    print("\u041C\u043E\u0436\u043D\u043E \u043F\u0440\u043E\u0439\u0442\u0438")',
  17: '\u0431\u0430\u043B\u043B\u044B = 12\nif \u0431\u0430\u043B\u043B\u044B >= 10:\n    print("\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043F\u0440\u043E\u0439\u0434\u0435\u043D!")',
  4: 'for i in range(3):\n    print("\u0423\u0447\u0443\u0441\u044C!")',
  18: 'for i in range(3):\n    print("\u0423\u0447\u0443\u0441\u044C!")',
  19: 'for i in range(3):\n    print("\u0423\u0447\u0443\u0441\u044C!")',
  11: 'def \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435():\n    print("\u041F\u0440\u0438\u0432\u0435\u0442!")\n\u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435()',
  12: 'def \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435():\n    print("\u041F\u0440\u0438\u0432\u0435\u0442!")\nfor i in range(3):\n    \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435()',
  20: '\u0438\u043C\u044F = "\u041C\u0438\u0440\u0430"\nprint(\u0438\u043C\u044F)',
  21: 'def \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435():\n    print("\u041F\u0440\u0438\u0432\u0435\u0442!")\nfor i in range(3):\n    \u043F\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435()'
};
var hintsFor = (lesson) => {
  const concept = lesson.skills?.teaches[0] || lesson.skills?.practices[0];
  const first = {
    print: "\u041F\u043E\u0434\u0443\u043C\u0430\u0439, \u043A\u0430\u043A\u0430\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435.",
    variable: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0440\u0435\u0448\u0438, \u0433\u0434\u0435 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0435 \u043D\u0443\u0436\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435, \u0430 \u0433\u0434\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0435\u0433\u043E.",
    comparison: "\u0421\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u0443\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0441\u043B\u043E\u0432\u0430\u043C\u0438: \u043A\u0430\u043A\u043E\u0435 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u0435 \u043C\u0435\u0436\u0434\u0443 \u043B\u0435\u0432\u044B\u043C \u0438 \u043F\u0440\u0430\u0432\u044B\u043C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C?",
    if: "\u041D\u0430\u0439\u0434\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435, \u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0442\u044C\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0438 \u0432\u0435\u0440\u043D\u043E\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435.",
    loop: "\u041D\u0430\u0439\u0434\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435, \u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F, \u0438 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439.",
    function: "\u041E\u0442\u0434\u0435\u043B\u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043E\u0442 \u043C\u0435\u0441\u0442\u0430, \u0433\u0434\u0435 \u0435\u0433\u043E \u043D\u0443\u0436\u043D\u043E \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C."
  };
  return [first[concept] || lesson.starterHint, lesson.starterHint, lesson.hint];
};
var lessonKeys = { "1": "intro.first-print", "13": "intro.your-message", "14": "intro.python-print", "7": "intro.sequence", "22": "intro.sequence-review", "6": "data.first-number", "2": "data.first-variable", "3": "data.first-sum", "8": "data.expression-order", "15": "data.read-variable", "9": "conditions.first-comparison", "5": "conditions.first-if", "10": "conditions.first-else", "16": "conditions.operator-choice", "17": "conditions.check-pass", "4": "loops.first-repeat", "18": "loops.independent-repeat", "19": "loops.python-header", "11": "functions.first-definition", "12": "functions.repeat-call", "20": "data.independent-variable", "21": "functions.independent-loop" };
var lessons3 = [...newLessons.map((source) => {
  const mode = source.mode || "blocks";
  const lesson = { ...source, key: lessonKeys[source.id], mode, codeAnswer: codeAnswers[source.id], skills: metadata[source.id], difficulty: Math.min(5, Math.max(1, source.chapter || 1)), supportLevel: source.tutorial?.length ? "blocks" : supportForMode(mode) };
  return { ...lesson, progressiveHints: hintsFor(lesson) };
}), ...extendedLessons];

// src/pythonStructure.ts
var children = (node) => {
  switch (node.kind) {
    case "assign":
      return [node.value, ...node.index ? [node.index] : []];
    case "expression":
    case "return":
    case "unary":
      return [node.value];
    case "if":
      return [...node.branches.flatMap((branch) => [branch.condition, ...branch.body]), ...node.otherwise];
    case "for":
      return [node.iterable, ...node.body];
    case "while":
      return [node.condition, ...node.body];
    case "function":
      return node.body;
    case "list":
      return node.items;
    case "binary":
      return [node.left, node.right];
    case "call":
      return node.args;
    case "index":
      return [node.target, node.index];
    default:
      return [];
  }
};
function walkPython(program) {
  return program.flatMap((node) => [node, ...walkPython(children(node))]);
}
function structureError(program, run, rules) {
  const relevant = [...run.observed];
  for (const rule of rules) {
    const [type, value] = rule.split(":");
    let valid = false;
    if (type === "kind") valid = relevant.some((node) => node.kind === value);
    if (type === "op") valid = relevant.some((node) => node.kind === "binary" && node.operator === value);
    if (type === "call") valid = relevant.some((node) => node.kind === "call" && node.name === value);
    if (type === "assign") valid = relevant.filter((node) => node.kind === "assign").length >= Number(value);
    if (type === "print" || type === "input") valid = relevant.filter((node) => node.kind === "call" && node.name === type).length >= Number(value);
    if (type === "params") valid = relevant.some((node) => node.kind === "function" && node.params.length === Number(value));
    if (type === "branches") valid = relevant.some((node) => node.kind === "if" && node.branches.length >= Number(value));
    if (type === "else") valid = relevant.some((node) => node.kind === "if" && node.otherwise.length > 0);
    if (type === "mutate_index") valid = relevant.some((node) => node.kind === "assign" && node.index);
    if (type === "reassign") valid = [...run.reassigned].some((node) => run.observed.has(node));
    if (type === "sum_product") valid = relevant.some((node) => node.kind === "binary" && node.operator === "*" && [node.left, node.right].some((part) => part.kind === "binary" && part.operator === "+"));
    if (type === "nested_loop") {
      valid = relevant.some((node) => (node.kind === "for" || node.kind === "while") && walkPython(node.body).some((child) => (child.kind === "for" || child.kind === "while") && run.observed.has(child)));
      if (!valid) valid = relevant.some((node) => (node.kind === "for" || node.kind === "while") && walkPython(node.body).some((child) => {
        if (child.kind !== "call" || !run.observed.has(child)) return false;
        const fn = program.find((item) => item.kind === "function" && item.name === child.name);
        return fn?.kind === "function" && walkPython(fn.body).some((item) => (item.kind === "for" || item.kind === "while") && run.observed.has(item));
      }));
    }
    if (!valid) {
      const messages = { op: `\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 ${value} \u0432 \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0438, \u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442.`, assign: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 \u0434\u0430\u043D\u043D\u044B\u0435 \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 \u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0438\u0445 \u0432 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0435.", reassign: "\u0418\u0437\u043C\u0435\u043D\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u0443\u044E \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043D\u043E\u0432\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.", else: "\u0414\u043E\u0431\u0430\u0432\u044C \u0432\u0435\u0442\u043A\u0443 else \u0434\u043B\u044F \u0432\u0442\u043E\u0440\u043E\u0433\u043E \u0441\u043B\u0443\u0447\u0430\u044F.", branches: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u043B\u0443\u0447\u0430\u0435\u0432 \u0447\u0435\u0440\u0435\u0437 if \u0438 elif.", params: `\u0412 \u044D\u0442\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 ${value} \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0441\u0442\u0440\u043E\u043A\u0443 def \u0438 \u0432\u044B\u0437\u043E\u0432.`, mutate_index: "\u0418\u0437\u043C\u0435\u043D\u0438 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441\u043F\u0438\u0441\u043A\u0430 \u043F\u043E \u0438\u043D\u0434\u0435\u043A\u0441\u0443.", nested_loop: "\u041E\u0434\u043D\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0442\u044C\u0441\u044F \u0432\u043D\u0443\u0442\u0440\u0438 \u0434\u0440\u0443\u0433\u043E\u0433\u043E.", sum_product: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u043B\u0443\u0447\u0438 \u0441\u0443\u043C\u043C\u0443, \u0437\u0430\u0442\u0435\u043C \u0443\u043C\u043D\u043E\u0436\u044C \u0435\u0451. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0441\u043A\u043E\u0431\u043A\u0438.", print: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B print \u0432 \u043D\u0443\u0436\u043D\u043E\u043C \u043F\u043E\u0440\u044F\u0434\u043A\u0435.", input: "\u041F\u043E\u043B\u0443\u0447\u0438 \u043A\u0430\u0436\u0434\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439 input." };
      return messages[type] || `\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 ${value || type} \u0442\u0430\u043A, \u0447\u0442\u043E\u0431\u044B \u044D\u0442\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0443\u0447\u0430\u0441\u0442\u0432\u043E\u0432\u0430\u043B\u0430 \u0432 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0435 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B.`;
    }
  }
  void program;
}
function summarizePython(program) {
  let budget = 48;
  const describe = (node) => {
    if (--budget < 0) return "more";
    if (node.kind === "literal") return Array.isArray(node.value) ? "list" : typeof node.value === "string" ? "string" : typeof node.value === "boolean" ? "boolean" : "number";
    if (node.kind === "name") return "variable";
    if (node.kind === "function") return `function(params_${node.params.length},${node.body.map(describe).join(",")})`;
    if (node.kind === "call") return `${["print", "input", "int", "str", "len", "range", "forward", "right", "left"].includes(node.name) ? node.name : "call"}(${node.args.map(describe).join(",")})`;
    if (node.kind === "binary") return `binary(${describe(node.left)},${describe(node.right)})`;
    return `${node.kind}(${children(node).map(describe).join(",")})`;
  };
  return program.slice(0, 16).map(describe).join(",").slice(0, 512) || "empty";
}

// src/extendedChecker.ts
var equal = (actual, reference, drawing) => !actual.error && !reference.error && actual.output.length === reference.output.length && actual.output.every((value, i) => value === reference.output[i]) && (!drawing || actual.segments.length === reference.segments.length && actual.segments.every((part, i) => ["x1", "y1", "x2", "y2"].every((key) => Math.abs(part[key] - reference.segments[i][key]) < 0.02)));
var clone = (value) => JSON.parse(JSON.stringify(value));
var dataValue = (node) => {
  if (node.kind !== "assign" || node.index) return void 0;
  if (node.value.kind === "literal") return node.value.value;
  if (node.value.kind === "unary" && node.value.operator === "-" && node.value.value.kind === "literal" && typeof node.value.value.value === "number") return -node.value.value.value;
  if (node.value.kind === "list" && node.value.items.every((item) => item.kind === "literal")) return node.value.items.map((item) => item.kind === "literal" ? item.value : null);
};
var changed = (value) => Array.isArray(value) ? value.map((part, i) => typeof part === "number" ? part + i + 2 : typeof part === "string" ? `${part}!` : part) : typeof value === "number" ? value > 10 ? value - 7 : value + 2 : typeof value === "string" ? `${value}!` : value;
function generalizes(actual, reference, inputs, drawing) {
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < reference.length; i++) {
    const value = dataValue(reference[i]);
    if (value === void 0 || seen.has(JSON.stringify(value))) continue;
    seen.add(JSON.stringify(value));
    const primary = runPythonAst(actual, inputs);
    const candidateIndex = actual.findIndex((node) => dataValue(node) !== void 0 && JSON.stringify(dataValue(node)) === JSON.stringify(value) && primary.observed.has(node));
    if (candidateIndex < 0) continue;
    const expected = clone(reference), candidate = clone(actual), replacement = changed(value);
    expected[i].value = { kind: "literal", value: replacement };
    candidate[candidateIndex].value = { kind: "literal", value: replacement };
    if (!equal(runPythonAst(candidate, inputs), runPythonAst(expected, inputs), drawing)) return false;
    if (seen.size >= 3) break;
  }
  const refRun = runPythonAst(reference, inputs), actualRun = runPythonAst(actual, inputs);
  const refFunctions = reference.filter((node) => node.kind === "function" && refRun.observed.has(node));
  const actualFunctions = actual.filter((node) => node.kind === "function" && actualRun.observed.has(node));
  for (let i = 0; i < refFunctions.length; i++) {
    const fn = refFunctions[i], candidate = actualFunctions[i];
    if (!candidate || candidate.params.length !== fn.params.length) return false;
    for (const n of [1, 3, 7]) {
      const args = fn.params.map((_, index) => ({ kind: "literal", value: n + index }));
      const calls = [...refRun.observed].filter((node) => node.kind === "call" && node.name === fn.name);
      const stringArgs = calls.some((node) => node.kind === "call" && node.args.some((arg) => arg.kind === "literal" && typeof arg.value === "string"));
      const probeArgs = stringArgs ? args.map((_, index) => ({ kind: "literal", value: `\u0413\u043E\u0441\u0442\u044C${n + index}` })) : args;
      const returns = [...refRun.observed].some((node) => node.kind === "return");
      const call2 = (name) => ({ kind: "expression", value: returns ? { kind: "call", name: "print", args: [{ kind: "call", name, args: probeArgs }] } : { kind: "call", name, args: probeArgs } });
      if (!equal(runPythonAst([...actual, call2(candidate.name)], inputs), runPythonAst([...reference, call2(fn.name)], inputs), drawing)) return false;
    }
  }
  return true;
}
function checkExtendedLesson(lesson, answer) {
  const source = lesson.mode === "completion" || lesson.mode === "tokens" ? `${lesson.prefix || ""}${answer}${lesson.suffix || ""}` : answer;
  let ast = [];
  try {
    ast = parseCourseProgram(source);
  } catch {
  }
  const primary = ast.length ? runPythonAst(ast, lesson.extended.inputs[0] || []) : runCourseProgram(source, lesson.extended.inputs[0] || []);
  const program = { statements: [], normalizedStructure: ast.length ? summarizePython(ast) : "syntax_error" };
  const failed = (message) => {
    const details = issue(message, [...lesson.skills?.teaches || [], ...lesson.skills?.practices || []]);
    return { passed: false, message, result: { output: primary.output, segments: primary.segments, error: primary.error, systemError: false, errorType: details.errorType, affectedSkills: details.affectedSkills }, program };
  };
  if (primary.error) return failed(primary.error);
  const structural = structureError(ast, primary, lesson.extended.rules);
  if (structural) return failed(structural);
  for (const inputs of lesson.extended.inputs) {
    if (!equal(runCourseProgram(source, inputs), runCourseProgram(lesson.codeAnswer, inputs), !!lesson.extended.drawing)) return failed(lesson.extended.drawing ? "\u0420\u0438\u0441\u0443\u043D\u043E\u043A \u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0434\u043B\u0438\u043D\u044B, \u043F\u043E\u0432\u043E\u0440\u043E\u0442\u044B \u0438 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u043B\u0438\u043D\u0438\u0439." : "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0434\u0430\u0451\u0442 \u0434\u0440\u0443\u0433\u043E\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439.");
  }
  if (!generalizes(ast, parseCourseProgram(lesson.codeAnswer), lesson.extended.inputs[0], !!lesson.extended.drawing)) return failed("\u0421 \u0434\u0440\u0443\u0433\u0438\u043C\u0438 \u0434\u0430\u043D\u043D\u044B\u043C\u0438 \u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u0451\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 \u0438 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u044B \u0444\u0443\u043D\u043A\u0446\u0438\u0438, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u0447\u0438\u0441\u043B\u044F\u0442\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442.");
  return { passed: true, message: lesson.success || "\u041F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C!", result: { output: primary.output, segments: primary.segments, systemError: false }, program };
}

// src/textLearning.ts
function tokenize2(source) {
  const tokens = [];
  let rest = source.trim();
  while (rest) {
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      rest = rest.slice(whitespace[0].length);
      continue;
    }
    const string = /^(["'])(?:\\.|(?!\1).)*\1/.exec(rest);
    if (string) {
      tokens.push({ kind: "string", value: string[0] });
      rest = rest.slice(string[0].length);
      continue;
    }
    const number3 = /^\d+(?:\.\d+)?/.exec(rest);
    if (number3) {
      tokens.push({ kind: "number", value: number3[0] });
      rest = rest.slice(number3[0].length);
      continue;
    }
    const name = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(rest);
    if (name) {
      tokens.push({ kind: "name", value: name[0] });
      rest = rest.slice(name[0].length);
      continue;
    }
    const operator = /^(==|!=|>=|<=|\*\*|[+\-*/><()])/.exec(rest);
    if (operator) {
      tokens.push({ kind: operator[1] === "(" || operator[1] === ")" ? "paren" : "operator", value: operator[1] });
      rest = rest.slice(operator[1].length);
      continue;
    }
    throw new Error(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \xAB${rest.slice(0, 12)}\xBB. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0441\u0438\u043D\u0442\u0430\u043A\u0441\u0438\u0441.`);
  }
  return tokens;
}
function decodeString2(token) {
  const body = token.slice(1, -1);
  let result = "";
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== "\\") {
      result += body[i];
      continue;
    }
    const next = body[++i];
    const escapes = { n: "\n", t: "	", "\\": "\\", '"': '"', "'": "'" };
    if (!(next in escapes)) throw new Error("\u041F\u043E\u0441\u043B\u0435 \u043E\u0431\u0440\u0430\u0442\u043D\u043E\u0439 \u043A\u043E\u0441\u043E\u0439 \u0447\u0435\u0440\u0442\u044B \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B n, t, \u043A\u0430\u0432\u044B\u0447\u043A\u0430 \u0438\u043B\u0438 \u0435\u0449\u0451 \u043E\u0434\u043D\u0430 \u043A\u043E\u0441\u0430\u044F \u0447\u0435\u0440\u0442\u0430.");
    result += escapes[next];
  }
  return result;
}
function parseExpression(source) {
  const tokens = tokenize2(source);
  let index = 0;
  const primary = () => {
    const token = tokens[index++];
    if (!token) throw new Error("\u041F\u043E\u0441\u043B\u0435 \u0437\u043D\u0430\u043A\u0430 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F.");
    if (token.kind === "string") return { kind: "string", value: decodeString2(token.value) };
    if (token.kind === "number") return { kind: "number", value: Number(token.value) };
    if (token.kind === "name") return { kind: "variable", name: token.value };
    if (token.value === "(") {
      const value = comparison();
      if (tokens[index++]?.value !== ")") throw new Error("\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u044E\u0449\u0435\u0439 \u043A\u0440\u0443\u0433\u043B\u043E\u0439 \u0441\u043A\u043E\u0431\u043A\u0438.");
      return value;
    }
    if (token.value === "-") {
      const value = primary();
      if (value.kind !== "number") throw new Error("\u0412 \u0443\u0447\u0435\u0431\u043D\u044B\u0445 \u0437\u0430\u0434\u0430\u043D\u0438\u044F\u0445 \u043C\u0438\u043D\u0443\u0441 \u043F\u0435\u0440\u0435\u0434 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0441 \u0447\u0438\u0441\u043B\u0430\u043C\u0438.");
      return { kind: "number", value: -value.value };
    }
    throw new Error(`\u041D\u0435\u043E\u0436\u0438\u0434\u0430\u043D\u043D\u044B\u0439 \u0437\u043D\u0430\u043A \xAB${token.value}\xBB.`);
  };
  const power = () => {
    let left = primary();
    while (tokens[index]?.value === "**") {
      index++;
      left = { kind: "binary", operator: "**", left, right: primary() };
    }
    return left;
  };
  const multiply = () => {
    let left = power();
    while (["*", "/"].includes(tokens[index]?.value)) {
      const operator = tokens[index++].value;
      left = { kind: "binary", operator, left, right: power() };
    }
    return left;
  };
  const add = () => {
    let left = multiply();
    while (["+", "-"].includes(tokens[index]?.value)) {
      const operator = tokens[index++].value;
      left = { kind: "binary", operator, left, right: multiply() };
    }
    return left;
  };
  const comparison = () => {
    const left = add(), token = tokens[index];
    if (!token || !["==", "!=", ">", ">=", "<", "<="].includes(token.value)) return left;
    index++;
    return { kind: "comparison", operator: token.value, left, right: add() };
  };
  const expression2 = comparison();
  if (index !== tokens.length) throw new Error(`\u041B\u0438\u0448\u043D\u0438\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \xAB${tokens[index].value}\xBB \u0432 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0438.`);
  return expression2;
}
function parsePythonProgram(source) {
  if (source.length > 1e4) throw new Error("\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u0430\u044F \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u044F.");
  const lines = source.replace(/\t/g, "    ").split(/\r?\n/).map((raw, index) => ({ number: index + 1, indent: /^ */.exec(raw)[0].length, text: raw.trim() })).filter((line) => line.text && !line.text.startsWith("#"));
  if (!lines.length) throw new Error("\u041D\u0430\u043F\u0438\u0448\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0443, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438 \xAB\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C\xBB.");
  if (lines.some((line) => line.indent % 4 !== 0)) throw new Error("\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043E\u0442\u0441\u0442\u0443\u043F \u0432 4 \u043F\u0440\u043E\u0431\u0435\u043B\u0430 \u0432\u043D\u0443\u0442\u0440\u0438 if, for \u0438 def.");
  let cursor = 0;
  const block = (indent) => {
    const statements2 = [];
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line.indent < indent) break;
      if (line.indent > indent) throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u043E\u0436\u0438\u0434\u0430\u043D\u043D\u044B\u0439 \u043E\u0442\u0441\u0442\u0443\u043F. \u0412\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0438\u0434\u0443\u0442 \u043F\u043E\u0441\u043B\u0435 \u0441\u0442\u0440\u043E\u043A\u0438 \u0441 \u0434\u0432\u043E\u0435\u0442\u043E\u0447\u0438\u0435\u043C.`);
      if (line.text === "else:") break;
      cursor++;
      let match;
      if (match = /^print\s*\((.*)\)$/.exec(line.text)) {
        statements2.push({ kind: "print", value: parseExpression(match[1]) });
        continue;
      }
      if (match = /^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(.+)$/u.exec(line.text)) {
        if (!validName(match[1])) throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0438\u043C\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439.`);
        statements2.push({ kind: "assign", name: match[1], value: parseExpression(match[2]) });
        continue;
      }
      if (match = /^if\s+(.+):$/.exec(line.text)) {
        const then = block(indent + 4);
        let otherwise = [];
        if (lines[cursor]?.indent === indent && lines[cursor]?.text === "else:") {
          cursor++;
          otherwise = block(indent + 4);
        }
        if (!then.length) throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u043E\u0441\u043B\u0435 if \u043D\u0443\u0436\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C.`);
        statements2.push({ kind: "if", condition: parseExpression(match[1]), then, otherwise });
        continue;
      }
      if (match = /^for\s+([\p{L}_][\p{L}\p{N}_]*)\s+in\s+range\s*\((.+)\):$/u.exec(line.text)) {
        if (!validName(match[1])) throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0438\u043C\u044F \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0430 \u0446\u0438\u043A\u043B\u0430.`);
        const body = block(indent + 4);
        if (!body.length) throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u043E\u0441\u043B\u0435 for \u043D\u0443\u0436\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C.`);
        statements2.push({ kind: "repeat", times: parseExpression(match[2]), body });
        continue;
      }
      if (match = /^def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(\s*\)\s*:$/u.exec(line.text)) {
        if (!validName(match[1])) throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0438\u043C\u044F \u0444\u0443\u043D\u043A\u0446\u0438\u0438.`);
        const body = block(indent + 4);
        if (!body.length) throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u043E\u0441\u043B\u0435 def \u043D\u0443\u0436\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C.`);
        statements2.push({ kind: "define", name: match[1], body });
        continue;
      }
      if (match = /^([\p{L}_][\p{L}\p{N}_]*)\s*\(\s*\)$/u.exec(line.text)) {
        statements2.push({ kind: "call", name: match[1] });
        continue;
      }
      throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u0440\u043E\u0432\u0435\u0440\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0443, \u0441\u043A\u043E\u0431\u043A\u0438 \u0438 \u0434\u0432\u043E\u0435\u0442\u043E\u0447\u0438\u0435. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438 \u0438\u0437 \u043F\u0440\u0438\u043C\u0435\u0440\u0430 \u044D\u0442\u043E\u0433\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u044F.`);
    }
    return statements2;
  };
  const statements = block(0);
  if (cursor !== lines.length) throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${lines[cursor].number}: else \u0434\u043E\u043B\u0436\u0435\u043D \u0438\u0434\u0442\u0438 \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u0441\u043B\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0433\u043E if.`);
  return { statements };
}

// src/skillScaffolds.ts
function callGap(code, name, whole, skill) {
  const match = new RegExp(`\\b${name}\\s*\\(`).exec(code);
  if (!match) return;
  const open = match.index + match[0].lastIndexOf("(");
  let depth = 1, quote = "", escaped = false;
  for (let i = open + 1; i < code.length; i++) {
    const ch = code[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) {
      const index = whole ? match.index : open + 1;
      const answer = code.slice(index, whole ? i + 1 : i);
      return answer ? { index, answer, skill } : void 0;
    }
  }
}
function capture(code, pattern, skill) {
  const match = new RegExp(pattern.source, pattern.flags + "d").exec(code);
  if (!match?.[1]) return;
  return { index: match.indices[1][0], answer: match[1], skill };
}
function scaffoldForSkill(code, skill) {
  switch (skill) {
    case "input":
      return callGap(code, "int", true, skill)?.answer.includes("input(") ? callGap(code, "int", true, skill) : callGap(code, "input", true, skill);
    case "assignment": {
      const assignments = [...code.matchAll(/^[ \t]*[\p{L}_][\p{L}\p{N}_]*\s*=\s*(?![=])([^\n]+)/gmu)];
      const match = assignments.find((item) => /[\p{L}_]/u.test(item[1]) && !/^["']/.test(item[1])) || assignments[0];
      return match ? { index: match.index + match[0].length - match[1].length, answer: match[1], skill } : void 0;
    }
    case "if":
    case "comparison":
      return capture(code, /(?:if|elif)\s+([^\n:]+):/u, skill) || callGap(code, "print", false, skill);
    case "loop":
      return callGap(code, "range", false, skill) || capture(code, /while\s+([^\n:]+):/u, skill) || capture(code, /for\s+[\p{L}_][\p{L}\p{N}_]*\s+in\s+([^\n:]+):/u, skill);
    case "function": {
      const returned = capture(code, /return\s+([^\n]+)/u, skill);
      if (returned) return returned;
      const name = /def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(/u.exec(code)?.[1];
      if (!name) return;
      const after = code.indexOf("\n", code.indexOf("def ")) + 1;
      const gap = callGap(code.slice(after), name, true, skill);
      return gap ? { ...gap, index: gap.index + after } : void 0;
    }
    case "list":
      return capture(code, /[\p{L}_][\p{L}\p{N}_]*\[([^\]\n]+)\]/u, skill) || capture(code, /for\s+[\p{L}_][\p{L}\p{N}_]*\s+in\s+([^\n:]+):/u, skill) || callGap(code, "len", true, skill);
    case "drawing":
      return callGap(code, "forward", false, skill) || callGap(code, "right", false, skill) || callGap(code, "left", false, skill);
    case "variable":
    case "string":
    case "arithmetic":
    case "number":
    case "print":
    case "sequence":
    case "indentation":
    case "text_syntax":
      return callGap(code, "print", false, skill) || callGap(code, "forward", false, skill);
  }
}

// src/supportVariants.ts
function codeFirstVariant(source, level, focus) {
  if (level === "blocks" || level === "blocks_with_code" || !source.codeAnswer) return null;
  const code = source.codeAnswer;
  const base2 = { ...source, scaffoldSkill: focus || source.scaffoldSkill, supportLevel: level, tutorial: void 0, choices: void 0, tokens: void 0, prefix: void 0, suffix: void 0 };
  if (level === "free_code") return { ...base2, mode: "text", answer: code };
  if (level === "code_tokens") {
    const tokens = code.split(/(?<=\n)/).filter(Boolean);
    if (tokens.length === 1) {
      const parts = code.match(/\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\p{L}_][\p{L}\p{N}_]*|\d+|[^\s])\s*/gu);
      if (!parts || parts.join("") !== code) return null;
      return { ...base2, mode: "tokens", answer: code, tokens: [...parts].reverse() };
    }
    return { ...base2, mode: "tokens", answer: code, tokens: [...tokens].reverse() };
  }
  const skill = focus || source.skills?.primarySkill || "print";
  const gap = scaffoldForSkill(code, skill) || (source.skills?.primarySkill ? scaffoldForSkill(code, source.skills.primarySkill) : void 0);
  if (!gap) return null;
  const { answer, index } = gap;
  const choices = [.../* @__PURE__ */ new Set([answer, "0", '"\u0434\u0440\u0443\u0433\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"'])];
  const variant = { ...base2, scaffoldSkill: gap.skill, mode: "completion", answer, choices, prefix: code.slice(0, index), suffix: code.slice(index + answer.length) };
  return checkExtendedLesson(variant, answer).passed ? variant : null;
}
function createSupportVariant(source, level, focus) {
  if (source.extended && source.mode === "completion" && source.supportLevel === level && !focus) return source;
  if (source.extended) return codeFirstVariant(source, level, focus);
  if (level === source.supportLevel) return source;
  if (level === "blocks" || level === "blocks_with_code") {
    if (source.mode !== "blocks" && source.mode !== "text") return null;
    return { ...source, mode: "blocks", supportLevel: level };
  }
  const code = source.codeAnswer;
  if (!code) return null;
  try {
    const canonical = parsePythonProgram(code);
    const validate = source.mode === "recognition" || source.mode === "completion" ? (program) => renderPython(program) === renderPython(canonical) ? null : "\u0421\u0440\u0430\u0432\u043D\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u044B, \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0441 \u0437\u0430\u0434\u0430\u043D\u0438\u0435\u043C." : source.validate;
    const base2 = {
      ...source,
      validate,
      expectedOutput: source.mode === "recognition" || source.mode === "completion" ? runProgram(canonical).output : source.expectedOutput,
      tutorial: void 0,
      supportLevel: level,
      prefix: void 0,
      suffix: void 0,
      choices: void 0,
      tokens: void 0,
      progressiveHints: ["\u0421\u0440\u0430\u0432\u043D\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0441 \u0446\u0435\u043B\u044C\u044E \u0437\u0430\u0434\u0430\u043D\u0438\u044F. \u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0439 \u0438\u0445 \u0441\u0432\u0435\u0440\u0445\u0443 \u0432\u043D\u0438\u0437.", source.codeNote || "\u0421\u043A\u043E\u0431\u043A\u0438 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u044E\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u0441 \u0435\u0451 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435\u043C. \u0422\u0435\u043A\u0441\u0442 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0432 \u043A\u0430\u0432\u044B\u0447\u043A\u0430\u0445.", source.goal]
    };
    if (!checkLesson(base2, canonical).passed) return null;
    if (level === "free_code") return { ...base2, mode: "text", answer: code };
    if (level === "code_tokens") {
      const tokens = code.match(/\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\p{L}_][\p{L}\p{N}_]*|\d+(?:\.\d+)?|>=|<=|==|!=|\*\*|[^\s])\s*/gu);
      if (!tokens || tokens.length > 32 || tokens.join("") !== code) return null;
      return { ...base2, mode: "tokens", answer: code, tokens: [...tokens].reverse() };
    }
    const gap = /print\(([^\n]+)\)/.exec(code) || /range\(([^\n]+)\)/.exec(code);
    if (!gap) return null;
    const answer = gap[1], index = gap.index + gap[0].indexOf(answer);
    const wrong = answer.startsWith('"') ? '"\u0414\u0440\u0443\u0433\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435"' : answer.includes(">=") ? answer.replace(">=", "==") : "0";
    const other = answer.startsWith('"') ? answer.slice(1, -1) : answer.includes("+") ? answer.replace("+", "-") : '"\u0442\u0435\u043A\u0441\u0442"';
    const choices = [.../* @__PURE__ */ new Set([wrong, answer, other])];
    if (choices.length < 2) return null;
    return { ...base2, mode: "completion", answer, choices, prefix: code.slice(0, index), suffix: code.slice(index + answer.length) };
  } catch {
    return null;
  }
}
function materializeSupport(source, level, focus) {
  return level ? createSupportVariant(source, level, focus) || source : source;
}

// src/practicePool.ts
var practicePool = [
  { id: "print-review-1", kind: "review", title: "\u0411\u044B\u0441\u0442\u0440\u043E \u0432\u0441\u043F\u043E\u043C\u043D\u0438\u043C \u0432\u044B\u0432\u043E\u0434", prompt: "\u041F\u043E\u043A\u0430\u0436\u0438 \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435.", skills: ["print", "string"], requires: [], supportLevel: "guided_code", durationSeconds: 25, sourceLessonId: 14 },
  { id: "string-corrective-1", kind: "corrective", title: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0438 \u043A\u0430\u0432\u044B\u0447\u043A\u0438", prompt: "\u041F\u043E\u043A\u0430\u0436\u0438 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C, \u0433\u0434\u0435 \u0443 \u0442\u0435\u043A\u0441\u0442\u0430 \u043A\u0430\u0432\u044B\u0447\u043A\u0438.", skills: ["print", "string"], requires: ["print"], supportLevel: "blocks_with_code", durationSeconds: 30, sourceLessonId: 13 },
  { id: "number-review-1", kind: "review", title: "\u0427\u0438\u0441\u043B\u043E \u0431\u0435\u0437 \u043A\u0430\u0432\u044B\u0447\u0435\u043A", prompt: "\u0412\u044B\u0432\u0435\u0434\u0438 \u0447\u0438\u0441\u043B\u043E \u043A\u0430\u043A \u0447\u0438\u0441\u043B\u043E, \u0430 \u043D\u0435 \u043A\u0430\u043A \u0442\u0435\u043A\u0441\u0442.", skills: ["number", "print"], requires: ["print"], supportLevel: "blocks_with_code", durationSeconds: 25, sourceLessonId: 6 },
  { id: "sequence-review-1", kind: "review", title: "\u0427\u0442\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0441\u044F \u0441\u043D\u0430\u0447\u0430\u043B\u0430?", prompt: "\u0420\u0430\u0441\u043F\u043E\u043B\u043E\u0436\u0438 \u0434\u0432\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0432 \u043D\u0443\u0436\u043D\u043E\u043C \u043F\u043E\u0440\u044F\u0434\u043A\u0435.", skills: ["sequence", "print"], requires: ["print"], supportLevel: "blocks_with_code", durationSeconds: 35, sourceLessonId: 22 },
  { id: "variable-review-1", kind: "review", title: "\u0414\u043E\u0441\u0442\u0430\u043D\u044C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0438\u0437 \u043A\u043E\u0440\u043E\u0431\u043A\u0438", prompt: "\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u0439 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043F\u043E \u0438\u043C\u0435\u043D\u0438.", skills: ["variable", "print"], requires: ["print", "string"], supportLevel: "guided_code", durationSeconds: 30, sourceLessonId: 15 },
  { id: "assignment-corrective-1", kind: "corrective", title: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438", prompt: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435, \u0430 \u0437\u0430\u0442\u0435\u043C \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0435\u0433\u043E.", skills: ["assignment", "variable"], requires: ["variable"], supportLevel: "blocks_with_code", durationSeconds: 45, sourceLessonId: 2 },
  { id: "arithmetic-review-1", kind: "review", title: "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0441\u0447\u0451\u0442", prompt: "\u0421\u043E\u0431\u0435\u0440\u0438 \u043E\u0434\u043D\u043E \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435 \u0438 \u043F\u043E\u043A\u0430\u0436\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442.", skills: ["arithmetic", "number"], requires: ["number"], supportLevel: "blocks_with_code", durationSeconds: 35, sourceLessonId: 3 },
  { id: "comparison-review-1", kind: "review", title: "\u0421\u0440\u0430\u0432\u043D\u0438\u043C \u0435\u0449\u0451 \u0440\u0430\u0437", prompt: "\u0412\u044B\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \xAB\u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435\xBB.", skills: ["comparison"], requires: ["number"], supportLevel: "guided_code", durationSeconds: 25, sourceLessonId: 16 },
  { id: "if-corrective-1", kind: "corrective", title: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043F\u043E \u0443\u0441\u043B\u043E\u0432\u0438\u044E", prompt: "\u041F\u043E\u043C\u0435\u0441\u0442\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0432\u043D\u0443\u0442\u0440\u044C \u0432\u0435\u0440\u043D\u043E\u0439 \u0432\u0435\u0442\u043A\u0438.", skills: ["if", "comparison", "indentation"], requires: ["comparison", "assignment"], supportLevel: "blocks_with_code", durationSeconds: 50, sourceLessonId: 5 },
  { id: "loop-review-1", kind: "review", title: "\u0411\u044B\u0441\u0442\u0440\u043E \u0432\u0441\u043F\u043E\u043C\u043D\u0438\u043C \u0446\u0438\u043A\u043B\u044B", prompt: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438 \u043E\u0434\u043D\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0442\u0440\u0438 \u0440\u0430\u0437\u0430.", skills: ["loop", "indentation", "print"], requires: ["print", "number"], supportLevel: "guided_code", durationSeconds: 40, sourceLessonId: 18 },
  { id: "comparison-if-review", kind: "review", title: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435", prompt: "\u0412\u0441\u043F\u043E\u043C\u043D\u0438, \u043A\u0430\u043A \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435\u043C.", skills: ["comparison", "if"], requires: ["assignment", "comparison", "if"], supportLevel: "guided_code", durationSeconds: 55, sourceLessonId: 17 },
  { id: "function-review-1", kind: "review", title: "\u041E\u043F\u0438\u0448\u0438 \u0438 \u0432\u044B\u0437\u043E\u0432\u0438", prompt: "\u041E\u0442\u043B\u0438\u0447\u0438 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u043E\u0442 \u0435\u0451 \u0437\u0430\u043F\u0443\u0441\u043A\u0430.", skills: ["function", "indentation"], requires: ["sequence"], supportLevel: "blocks_with_code", durationSeconds: 45, sourceLessonId: 11 },
  { id: "text-syntax-review-1", kind: "review", title: "\u041E\u0434\u043D\u0430 \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430", prompt: "\u0421\u043E\u0431\u0435\u0440\u0438 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0443\u044E \u0441\u0442\u0440\u043E\u043A\u0443 Python.", skills: ["text_syntax", "print"], requires: ["print"], supportLevel: "code_tokens", durationSeconds: 30, sourceLessonId: 19 },
  { id: "code-string-fix", kind: "corrective", title: "\u0421\u043E\u0435\u0434\u0438\u043D\u0438 \u0434\u0432\u0435 \u0447\u0430\u0441\u0442\u0438", prompt: "\u0412\u044B\u0432\u0435\u0434\u0438 \xAB\u041F\u0440\u0438\u0432\u0435\u0442, \u043C\u0438\u0440\xBB \u0438\u0437 \u0434\u0432\u0443\u0445 \u0441\u0442\u0440\u043E\u043A.", skills: ["string"], requires: ["print"], supportLevel: "guided_code", durationSeconds: 30, sourceLessonId: 23, code: 'print("\u041F\u0440\u0438\u0432\u0435\u0442, " + "\u043C\u0438\u0440")' },
  { id: "code-arithmetic-fix", kind: "corrective", title: "\u0426\u0435\u043D\u0430 \u0434\u0432\u0443\u0445 \u0432\u0435\u0449\u0435\u0439", prompt: "\u0426\u0435\u043D\u0430 \u0432\u0435\u0449\u0438 \u2014 4. \u0412\u044B\u0447\u0438\u0441\u043B\u0438 \u0446\u0435\u043D\u0443 \u0434\u0432\u0443\u0445 \u0432\u0435\u0449\u0435\u0439.", skills: ["arithmetic", "variable"], requires: ["number"], supportLevel: "guided_code", durationSeconds: 35, sourceLessonId: 24, code: "price = 4\nprint(price * 2)" },
  { id: "code-variable-fix", kind: "corrective", title: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435 \u0438\u043C\u044F", prompt: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438 \u0438\u043C\u044F \u041C\u0438\u0440\u0430, \u0437\u0430\u0442\u0435\u043C \u0432\u044B\u0432\u0435\u0434\u0438 \xAB\u041F\u0440\u0438\u0432\u0435\u0442, \u041C\u0438\u0440\u0430\xBB.", skills: ["variable", "string"], requires: ["print", "string"], supportLevel: "guided_code", durationSeconds: 35, sourceLessonId: 26, code: 'name = "\u041C\u0438\u0440\u0430"\nprint("\u041F\u0440\u0438\u0432\u0435\u0442, " + name)' },
  { id: "code-assignment-fix", kind: "corrective", title: "\u041E\u0431\u043D\u043E\u0432\u0438 \u0441\u0447\u0451\u0442", prompt: "\u0411\u044B\u043B\u043E 2 \u043E\u0447\u043A\u0430. \u0414\u043E\u0431\u0430\u0432\u044C 3 \u0432 \u0442\u0443 \u0436\u0435 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0443\u044E \u0438 \u0432\u044B\u0432\u0435\u0434\u0438 \u0441\u0447\u0451\u0442.", skills: ["assignment", "arithmetic"], requires: ["variable"], supportLevel: "guided_code", durationSeconds: 40, sourceLessonId: 31, code: "score = 2\nscore = score + 3\nprint(score)" },
  { id: "code-if-fix", kind: "corrective", title: "\u0414\u0432\u0435 \u0442\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u044B", prompt: "\u041F\u0440\u0438 \u0442\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0435 \u22121 \u0432\u044B\u0432\u0435\u0434\u0438 \xAB\u0425\u043E\u043B\u043E\u0434\u043D\u043E\xBB, \u0438\u043D\u0430\u0447\u0435 \xAB\u0422\u0435\u043F\u043B\u043E\xBB.", skills: ["if", "comparison"], requires: ["comparison"], supportLevel: "guided_code", durationSeconds: 40, sourceLessonId: 34, code: 'temp = -1\nif temp < 0:\n    print("\u0425\u043E\u043B\u043E\u0434\u043D\u043E")\nelse:\n    print("\u0422\u0435\u043F\u043B\u043E")' },
  { id: "code-comparison-fix", kind: "corrective", title: "\u0425\u0432\u0430\u0442\u0438\u0442 \u043B\u0438 \u043E\u0447\u043A\u043E\u0432?", prompt: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C, \u043D\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 \u043B\u0438 8 \u043E\u0447\u043A\u043E\u0432 \u043F\u043E\u0440\u043E\u0433\u0430 6.", skills: ["comparison"], requires: ["number"], supportLevel: "guided_code", durationSeconds: 25, sourceLessonId: 32, code: "score = 8\nprint(score >= 6)" },
  { id: "code-loop-fix", kind: "corrective", title: "\u0421\u0438\u0433\u043D\u0430\u043B \u0442\u0440\u0438 \u0440\u0430\u0437\u0430", prompt: "\u0412\u044B\u0432\u0435\u0434\u0438 \xAB\u0421\u0438\u0433\u043D\u0430\u043B\xBB \u0442\u0440\u0438 \u0440\u0430\u0437\u0430 \u0446\u0438\u043A\u043B\u043E\u043C.", skills: ["loop"], requires: ["print"], supportLevel: "guided_code", durationSeconds: 30, sourceLessonId: 45, code: 'for i in range(3):\n    print("\u0421\u0438\u0433\u043D\u0430\u043B")' },
  { id: "code-function-fix", kind: "corrective", title: "\u0412\u0435\u0440\u043D\u0438 \u0443\u0442\u0440\u043E\u0435\u043D\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E", prompt: "\u0424\u0443\u043D\u043A\u0446\u0438\u044F \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0447\u0438\u0441\u043B\u043E \u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0435\u0433\u043E, \u0443\u043C\u043D\u043E\u0436\u0435\u043D\u043D\u043E\u0435 \u043D\u0430 3. \u041F\u043E\u043A\u0430\u0436\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0434\u043B\u044F 2.", skills: ["function"], requires: ["arithmetic"], supportLevel: "guided_code", durationSeconds: 40, sourceLessonId: 58, code: "def triple(n):\n    return n * 3\nprint(triple(2))" },
  { id: "list-index-fix", kind: "corrective", title: "\u041F\u0435\u0440\u0432\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442", prompt: "\u0412\u044B\u0432\u0435\u0434\u0438 \u043F\u0435\u0440\u0432\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0441\u043F\u0438\u0441\u043A\u0430 [4, 7].", skills: ["list"], requires: ["variable"], supportLevel: "guided_code", durationSeconds: 30, sourceLessonId: 67, code: "values = [4, 7]\nprint(values[0])" },
  { id: "list-loop-fix", kind: "corrective", title: "\u041A\u0430\u0436\u0434\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442", prompt: "\u0412\u044B\u0432\u0435\u0434\u0438 \u0447\u0438\u0441\u043B\u0430 2 \u0438 5 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u0446\u0438\u043A\u043B\u043E\u043C.", skills: ["list", "loop"], requires: ["loop"], supportLevel: "code_tokens", durationSeconds: 40, sourceLessonId: 71, code: "values = [2, 5]\nfor value in values:\n    print(value)" },
  { id: "list-review", kind: "review", title: "\u0420\u0430\u0437\u043C\u0435\u0440 \u0441\u043F\u0438\u0441\u043A\u0430", prompt: "\u041F\u043E\u043A\u0430\u0436\u0438 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 [1, 3, 5].", skills: ["list"], requires: ["variable"], supportLevel: "guided_code", durationSeconds: 25, sourceLessonId: 69, code: "values = [1, 3, 5]\nprint(len(values))" },
  { id: "input-fix", kind: "corrective", title: "\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u0439 \u0438 \u043E\u0442\u0432\u0435\u0442\u044C", prompt: "\u041F\u043E\u043B\u0443\u0447\u0438 \u0438\u043C\u044F \u0447\u0435\u0440\u0435\u0437 input \u0438 \u043F\u043E\u0437\u0434\u043E\u0440\u043E\u0432\u0430\u0439\u0441\u044F \u0441 \u043D\u0438\u043C.", skills: ["input", "string"], requires: ["variable"], supportLevel: "guided_code", durationSeconds: 30, sourceLessonId: 79 },
  { id: "input-number-fix", kind: "corrective", title: "\u0412\u0432\u043E\u0434 \u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0441\u044F \u0447\u0438\u0441\u043B\u043E\u043C", prompt: "\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u0439 \u0432\u043E\u0437\u0440\u0430\u0441\u0442 \u0438 \u043F\u043E\u043A\u0430\u0436\u0438, \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0431\u0443\u0434\u0435\u0442 \u0447\u0435\u0440\u0435\u0437 \u0433\u043E\u0434.", skills: ["input", "arithmetic"], requires: ["arithmetic"], supportLevel: "guided_code", durationSeconds: 35, sourceLessonId: 80 },
  { id: "input-review", kind: "review", title: "\u0414\u0432\u0430 \u0447\u0438\u0441\u043B\u0430 \u0441 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u044B", prompt: "\u041F\u043E\u043B\u0443\u0447\u0438 \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430, \u0441\u043B\u043E\u0436\u0438 \u0438 \u043F\u043E\u043A\u0430\u0436\u0438 \u0441\u0443\u043C\u043C\u0443.", skills: ["input", "arithmetic"], requires: ["arithmetic"], supportLevel: "code_tokens", durationSeconds: 40, sourceLessonId: 81 },
  { id: "drawing-fix", kind: "corrective", title: "\u041E\u0434\u043D\u0430 \u043B\u0438\u043D\u0438\u044F", prompt: "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u043B\u0438\u043D\u0438\u044E \u0434\u043B\u0438\u043D\u043E\u0439 25.", skills: ["drawing"], requires: ["number"], supportLevel: "guided_code", durationSeconds: 20, sourceLessonId: 90, code: "forward(25)" },
  { id: "drawing-loop-fix", kind: "corrective", title: "\u0421\u0442\u043E\u0440\u043E\u043D\u044B \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u0430", prompt: "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u043A\u0432\u0430\u0434\u0440\u0430\u0442 \u0441\u043E \u0441\u0442\u043E\u0440\u043E\u043D\u043E\u0439 20 \u043E\u0434\u043D\u0438\u043C \u0446\u0438\u043A\u043B\u043E\u043C.", skills: ["drawing", "loop"], requires: ["loop"], supportLevel: "code_tokens", durationSeconds: 40, sourceLessonId: 92, code: "for i in range(4):\n    forward(20)\n    right(90)" },
  { id: "drawing-review", kind: "review", title: "\u0414\u0432\u0435 \u043B\u0438\u043D\u0438\u0438 \u0438 \u043F\u043E\u0432\u043E\u0440\u043E\u0442", prompt: "\u041D\u0430\u0440\u0438\u0441\u0443\u0439 \u0434\u0432\u0435 \u043B\u0438\u043D\u0438\u0438 \u043F\u043E 40 \u0441 \u043F\u043E\u0432\u043E\u0440\u043E\u0442\u043E\u043C \u043D\u0430 90 \u043C\u0435\u0436\u0434\u0443 \u043D\u0438\u043C\u0438.", skills: ["drawing", "sequence"], requires: ["sequence"], supportLevel: "code_tokens", durationSeconds: 35, sourceLessonId: 91 },
  ...[["arithmetic", 24], ["variable", 26], ["if", 34], ["comparison", 32], ["loop", 45], ["function", 58], ["string", 23], ["assignment", 31]].map(([skill, sourceLessonId]) => ({ id: `code-${skill}-review`, kind: "review", title: "\u041A\u043E\u0440\u043E\u0442\u043A\u043E \u0432\u0441\u043F\u043E\u043C\u043D\u0438\u043C \u0442\u0435\u043C\u0443", prompt: "\u0412\u044B\u043F\u043E\u043B\u043D\u0438 \u043A\u043E\u0440\u043E\u0442\u043A\u0443\u044E \u0437\u0430\u0434\u0430\u0447\u0443, \u0447\u0442\u043E\u0431\u044B \u043E\u0441\u0432\u0435\u0436\u0438\u0442\u044C \u043D\u0430\u0432\u044B\u043A.", skills: [skill], requires: [], supportLevel: "guided_code", durationSeconds: 35, sourceLessonId }))
];
var practiceNumericIds = {
  "print-review-1": -100,
  "string-corrective-1": -101,
  "number-review-1": -102,
  "sequence-review-1": -103,
  "variable-review-1": -104,
  "assignment-corrective-1": -105,
  "arithmetic-review-1": -106,
  "comparison-review-1": -107,
  "if-corrective-1": -108,
  "loop-review-1": -109,
  "comparison-if-review": -110,
  "function-review-1": -111,
  "text-syntax-review-1": -112,
  "code-string-fix": -113,
  "code-arithmetic-fix": -114,
  "code-variable-fix": -115,
  "code-assignment-fix": -116,
  "code-if-fix": -117,
  "code-comparison-fix": -118,
  "code-loop-fix": -119,
  "code-function-fix": -120,
  "list-index-fix": -121,
  "list-loop-fix": -122,
  "list-review": -123,
  "input-fix": -124,
  "input-number-fix": -125,
  "input-review": -126,
  "drawing-fix": -127,
  "drawing-loop-fix": -128,
  "drawing-review": -129,
  "code-arithmetic-review": -130,
  "code-variable-review": -131,
  "code-if-review": -132,
  "code-comparison-review": -133,
  "code-loop-review": -134,
  "code-function-review": -135,
  "code-string-review": -136,
  "code-assignment-review": -137
};
function practiceLessonId(id) {
  return practiceNumericIds[id];
}
function getPracticeLesson(id, support) {
  const item = practicePool.find((candidate) => candidate.id === id);
  const source = lessons3.find((lesson) => lesson.id === item?.sourceLessonId);
  if (!item || !source) return void 0;
  const prepared = item.code && source.extended ? { ...source, goal: item.prompt, hint: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0443, \u0435\u0451 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439.", progressiveHints: ["\u041D\u0430\u0439\u0434\u0438 \u0432 \u0437\u0430\u0434\u0430\u043D\u0438\u0438 \u0434\u0430\u043D\u043D\u044B\u0435, \u0441 \u043A\u043E\u0442\u043E\u0440\u044B\u043C\u0438 \u0434\u043E\u043B\u0436\u043D\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0430.", "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044E \u0438\u0437 \u0440\u0430\u0437\u0431\u043E\u0440\u0430 \u0442\u0435\u043C\u044B \u0438 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438.", "\u0421\u0440\u0430\u0432\u043D\u0438 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u043A\u043E\u043C\u0430\u043D\u0434 \u0441 \u0446\u0435\u043B\u044C\u044E \u0437\u0430\u0434\u0430\u043D\u0438\u044F."], success: "\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u043B\u0438 \u0442\u0435\u043C\u0443!", codeAnswer: item.code, answer: item.code, mode: "text", supportLevel: "free_code", expectedOutput: runCourseProgram(item.code, source.extended.inputs[0]).output, prefix: void 0, suffix: void 0, choices: void 0, extended: { ...source.extended, rules: item.rules || source.extended.rules } } : source;
  const variant = materializeSupport({ ...prepared, skills: { primarySkill: item.skills[0], teaches: [], practices: item.skills, requires: item.requires } }, support || item.supportLevel);
  return {
    ...variant,
    id: practiceLessonId(id),
    key: `practice.${id}`,
    title: item.title,
    instruction: item.code ? item.prompt : `${item.prompt} ${source.instruction}`,
    tutorial: void 0,
    review: true,
    skills: { primarySkill: item.skills[0], teaches: [], practices: item.skills, requires: item.requires }
  };
}
var practiceLessons = practicePool.map((item) => getPracticeLesson(item.id));

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
  const text3 = await response.text();
  return text3 ? JSON.parse(text3) : null;
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
  const now = Date.now(), rows2 = [];
  for (const event of body.events) {
    if (!event || !uuid.test(event.id || "") || !uuid.test(event.sessionId || "") || !eventNames.includes(event.name) || !Number.isInteger(event.lesson) || event.lesson < -1e3 || event.lesson > 100 || typeof event.at !== "number" || event.at < now - 90 * 864e5 || event.at > now + 6e4) return res.status(400).json({ error: "invalid_event" });
    const release = eventRelease(event);
    if (!release) return res.status(400).json({ error: "invalid_release" });
    const key = [...lessons3, ...practiceLessons].find((item) => item.id === event.lesson)?.key;
    rows2.push({ id: event.id, learner_id: digest(body.learnerId), session_id: event.sessionId, name: event.name, lesson: event.lesson, curriculum_version: release.curriculumVersion, app_version: release.appVersion, lesson_key: release.curriculumVersion === "legacy" ? `legacy:${event.lesson}` : key || "navigation", occurred_at: new Date(event.at).toISOString(), data: cleanEventData(event.data) });
  }
  try {
    const user = identity(req, res);
    if (!await claim([bucket(`events:ip:${user.address}`, 120, 6e4)])) return res.status(429).json({ error: "rate_limit" });
    await database("learning_events?on_conflict=id", rows2, "resolution=ignore-duplicates,return=minimal");
    return res.status(200).json({ accepted: rows2.map((row) => row.id) });
  } catch {
    return res.status(503).json({ error: "storage_unavailable" });
  }
}
export {
  handler as default
};
