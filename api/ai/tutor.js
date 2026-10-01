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
    const clone = Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, visit(nested)]));
    if ((clone.type === "variables_set" || clone.type === "variables_get") && clone.fields && typeof clone.fields === "object") {
      const fields = clone.fields;
      if (typeof fields.VAR === "string") {
        names.add(fields.VAR);
        fields.VAR = { id: `lesson-variable-${fields.VAR}` };
      }
    }
    return clone;
  };
  const preparedBlocks = visit(blocks);
  return {
    variables: Array.from(names).map((name) => ({ name, id: `lesson-variable-${name}` })),
    blocks: { languageVersion: 0, blocks: preparedBlocks }
  };
};
var textBlock = (text3) => ({ type: "text", fields: { TEXT: text3 } });
var numberBlock = (number2) => ({ type: "math_number", fields: { NUM: number2 } });
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
function renderExpr(expr2) {
  if (expr2.kind === "missing") return "...";
  if (expr2.kind === "string") return JSON.stringify(expr2.value);
  if (expr2.kind === "number") return expr2.value < 0 ? `(${expr2.value})` : String(expr2.value);
  if (expr2.kind === "variable") return safeName(expr2.name);
  const operand = (value) => value.kind === "binary" || value.kind === "comparison" ? `(${renderExpr(value)})` : renderExpr(value);
  return `${operand(expr2.left)} ${expr2.operator} ${operand(expr2.right)}`;
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
function evaluate(expr2, memory) {
  if (expr2.kind === "missing") throw new LearningError("\u0412 \u0431\u043B\u043E\u043A\u0435 \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043F\u0443\u0441\u0442\u043E\u0435 \u043C\u0435\u0441\u0442\u043E. \u0414\u043E\u0431\u0430\u0432\u044C \u0442\u0443\u0434\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.");
  if (expr2.kind === "string") {
    if (expr2.value.length > 2e3) throw new LearningError("\u0422\u0435\u043A\u0441\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439. \u041E\u0441\u0442\u0430\u0432\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 2000 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.");
    return expr2.value;
  }
  if (expr2.kind === "number") return bounded(expr2.value, !Number.isInteger(expr2.value));
  if (expr2.kind === "variable") {
    if (!memory.has(expr2.name)) throw new LearningError(`\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \xAB${expr2.name}\xBB.`);
    return memory.get(expr2.name);
  }
  const rawLeft = evaluate(expr2.left, memory), rawRight = evaluate(expr2.right, memory);
  const left = primitive(rawLeft), right = primitive(rawRight);
  if (expr2.kind === "comparison") {
    if (expr2.operator === "==") return left === right;
    if (expr2.operator === "!=") return left !== right;
    if (typeof left !== typeof right) throw new LearningError("\u0421\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u0439 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043E\u0434\u043D\u043E\u0433\u043E \u0442\u0438\u043F\u0430: \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430 \u0438\u043B\u0438 \u0434\u0432\u0435 \u0441\u0442\u0440\u043E\u043A\u0438.");
    if (expr2.operator === ">") return left > right;
    if (expr2.operator === ">=") return left >= right;
    if (expr2.operator === "<") return left < right;
    return left <= right;
  }
  if (expr2.operator === "+" && typeof left === "string" && typeof right === "string") {
    if (left.length + right.length > 2e3) throw new LearningError("\u0422\u0435\u043A\u0441\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439. \u0423\u043C\u0435\u043D\u044C\u0448\u0438 \u0447\u0438\u0441\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439 \u0438\u043B\u0438 \u0434\u043B\u0438\u043D\u0443 \u0441\u0442\u0440\u043E\u043A\u0438.");
    return left + right;
  }
  if (typeof left !== "number" || typeof right !== "number") throw new LearningError("\u0414\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F \u043D\u0443\u0436\u043D\u044B \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430. \u0422\u0435\u043A\u0441\u0442 \u0432 \u043A\u0430\u0432\u044B\u0447\u043A\u0430\u0445 \u2014 \u044D\u0442\u043E \u0441\u0442\u0440\u043E\u043A\u0430.");
  const real = typeof rawLeft === "object" || typeof rawRight === "object";
  if (expr2.operator === "+") return bounded(left + right, real);
  if (expr2.operator === "-") return bounded(left - right, real);
  if (expr2.operator === "*") return bounded(left * right, real);
  if (expr2.operator === "**") {
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
  const visitExpr = (expr2) => test(expr2) || "left" in expr2 && visitExpr(expr2.left) || "right" in expr2 && visitExpr(expr2.right);
  const visitStatements = (items) => items.some((item) => {
    if (item.kind === "call") return false;
    if (item.kind === "define") return visitStatements(item.body);
    if (item.kind === "print" || item.kind === "assign") return visitExpr(item.value);
    if (item.kind === "repeat") return visitExpr(item.times) || visitStatements(item.body);
    return visitExpr(item.condition) || visitStatements(item.then) || visitStatements(item.otherwise);
  });
  return visitStatements(program.statements);
}
function isString(expr2, value) {
  return expr2.kind === "string" && expr2.value === value;
}
function isNumber(expr2, value) {
  return expr2.kind === "number" && expr2.value === value;
}
function isVariable(expr2, name) {
  return expr2.kind === "variable" && expr2.name === name;
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
var skills = {
  print: { id: "print", title: "\u0412\u044B\u0432\u043E\u0434 \u0434\u0430\u043D\u043D\u044B\u0445", prerequisites: [] },
  string: { id: "string", title: "\u0421\u0442\u0440\u043E\u043A\u0438", prerequisites: [] },
  number: { id: "number", title: "\u0427\u0438\u0441\u043B\u0430", prerequisites: [] },
  sequence: { id: "sequence", title: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A \u043A\u043E\u043C\u0430\u043D\u0434", prerequisites: ["print"] },
  variable: { id: "variable", title: "\u041F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435", prerequisites: ["string"] },
  assignment: { id: "assignment", title: "\u041F\u0440\u0438\u0441\u0432\u0430\u0438\u0432\u0430\u043D\u0438\u0435", prerequisites: ["variable"] },
  arithmetic: { id: "arithmetic", title: "\u0412\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F", prerequisites: ["number"] },
  comparison: { id: "comparison", title: "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F", prerequisites: ["number"] },
  if: { id: "if", title: "\u0423\u0441\u043B\u043E\u0432\u0438\u044F", prerequisites: ["comparison", "sequence"] },
  loop: { id: "loop", title: "\u0426\u0438\u043A\u043B\u044B", prerequisites: ["sequence", "number"] },
  function: { id: "function", title: "\u0424\u0443\u043D\u043A\u0446\u0438\u0438", prerequisites: ["sequence"] },
  indentation: { id: "indentation", title: "\u041E\u0442\u0441\u0442\u0443\u043F\u044B Python", prerequisites: ["sequence"] },
  text_syntax: { id: "text_syntax", title: "\u0421\u0438\u043D\u0442\u0430\u043A\u0441\u0438\u0441 Python", prerequisites: ["print", "string"] }
};
function supportForMode(mode = "blocks") {
  if (mode === "blocks") return "blocks_with_code";
  if (mode === "recognition" || mode === "completion") return "guided_code";
  if (mode === "tokens") return "code_tokens";
  return "free_code";
}

// src/course.ts
var original = (id) => lessons2.find((l) => l.id === id);
var emptyWorkspace = { blocks: { languageVersion: 0, blocks: [] } };
var text2 = (value) => ({ type: "text", fields: { TEXT: value } });
var print2 = (value) => ({ type: "text_print", inputs: { TEXT: { block: text2(value) } } });
var state2 = (block) => ({ blocks: { languageVersion: 0, blocks: [{ ...block, x: 24, y: 28 }] } });
var greeting = (id, title, phrase) => ({ ...original(1), id, title, goal: `\u0421\u0434\u0435\u043B\u0430\u0439 \u0442\u0430\u043A, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u043D\u0430\u043F\u0438\u0441\u0430\u043B\u0430: ${phrase}`, instruction: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \xAB\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C\xBB \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0442\u043E, \u0447\u0442\u043E \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0432\u043D\u0443\u0442\u0440\u0438 \u043D\u0435\u0451.", starter: emptyWorkspace, solution: state2(print2(phrase)), expectedOutput: [phrase], hint: "\u0414\u043E\u0431\u0430\u0432\u044C \xAB\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C\xBB, \u0430 \u0432\u043D\u0443\u0442\u0440\u044C \u2014 \xAB\u0422\u0435\u043A\u0441\u0442\xBB. \u0412\u043F\u0438\u0448\u0438 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0431\u0435\u0437 \u043A\u0430\u0432\u044B\u0447\u0435\u043A: \u0431\u043B\u043E\u043A \u0434\u043E\u0431\u0430\u0432\u0438\u0442 \u0438\u0445 \u0432 Python \u0441\u0430\u043C.", starterHint: "\u0421\u043E\u0431\u0435\u0440\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u0438 \u0441\u043A\u0430\u0436\u0438 \u0435\u0439, \u0447\u0442\u043E \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C.", success: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430 print \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0442\u0435\u043A\u0441\u0442 \u0432 \u0441\u043A\u043E\u0431\u043A\u0430\u0445. \u041A\u0430\u0432\u044B\u0447\u043A\u0438 \u043E\u0442\u043C\u0435\u0447\u0430\u044E\u0442 \u043D\u0430\u0447\u0430\u043B\u043E \u0438 \u043A\u043E\u043D\u0435\u0446 \u0442\u0435\u043A\u0441\u0442\u0430.", allowed: ["text_print", "text"], codeNote: "\u041D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C \u2192 print. \u0422\u0435\u043A\u0441\u0442 \u2192 \u0441\u043B\u043E\u0432\u0430 \u0432 \u043A\u0430\u0432\u044B\u0447\u043A\u0430\u0445. \u0421\u043A\u043E\u0431\u043A\u0438 \u0441\u043E\u0435\u0434\u0438\u043D\u044F\u044E\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435." });
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
var lessons3 = newLessons.map((source) => {
  const mode = source.mode || "blocks";
  const lesson = { ...source, mode, codeAnswer: codeAnswers[source.id], skills: metadata[source.id], difficulty: Math.min(5, Math.max(1, source.chapter || 1)), supportLevel: source.tutorial?.length ? "blocks" : supportForMode(mode) };
  return { ...lesson, progressiveHints: hintsFor(lesson) };
});

// src/textLearning.ts
function tokenize(source) {
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
    const number2 = /^\d+(?:\.\d+)?/.exec(rest);
    if (number2) {
      tokens.push({ kind: "number", value: number2[0] });
      rest = rest.slice(number2[0].length);
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
function decodeString(token) {
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
  const tokens = tokenize(source);
  let index = 0;
  const primary = () => {
    const token = tokens[index++];
    if (!token) throw new Error("\u041F\u043E\u0441\u043B\u0435 \u0437\u043D\u0430\u043A\u0430 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F.");
    if (token.kind === "string") return { kind: "string", value: decodeString(token.value) };
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
  const expression = comparison();
  if (index !== tokens.length) throw new Error(`\u041B\u0438\u0448\u043D\u0438\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \xAB${tokens[index].value}\xBB \u0432 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0438.`);
  return expression;
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
      throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u043E\u043A\u0430 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u043F\u0440\u0438\u0441\u0432\u0430\u0438\u0432\u0430\u043D\u0438\u0435, print, if/else, for range \u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u0431\u0435\u0437 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u043E\u0432.`);
    }
    return statements2;
  };
  const statements = block(0);
  if (cursor !== lines.length) throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${lines[cursor].number}: else \u0434\u043E\u043B\u0436\u0435\u043D \u0438\u0434\u0442\u0438 \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u0441\u043B\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0433\u043E if.`);
  return { statements };
}

// src/supportVariants.ts
function createSupportVariant(source, level) {
  if (level === source.supportLevel) return source;
  if (level === "blocks" || level === "blocks_with_code") {
    if (source.mode !== "blocks" && source.mode !== "text") return null;
    return { ...source, mode: "blocks", supportLevel: level };
  }
  const code2 = source.codeAnswer;
  if (!code2) return null;
  try {
    const canonical = parsePythonProgram(code2);
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
    if (level === "free_code") return { ...base2, mode: "text", answer: code2 };
    if (level === "code_tokens") {
      const tokens = code2.match(/\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\p{L}_][\p{L}\p{N}_]*|\d+(?:\.\d+)?|>=|<=|==|!=|\*\*|[^\s])\s*/gu);
      if (!tokens || tokens.length > 32 || tokens.join("") !== code2) return null;
      return { ...base2, mode: "tokens", answer: code2, tokens: [...tokens].reverse() };
    }
    const gap = /print\(([^\n]+)\)/.exec(code2) || /range\(([^\n]+)\)/.exec(code2);
    if (!gap) return null;
    const answer = gap[1], index = gap.index + gap[0].indexOf(answer);
    const wrong = answer.startsWith('"') ? '"\u0414\u0440\u0443\u0433\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435"' : answer.includes(">=") ? answer.replace(">=", "==") : "0";
    const other = answer.startsWith('"') ? answer.slice(1, -1) : answer.includes("+") ? answer.replace("+", "-") : '"\u0442\u0435\u043A\u0441\u0442"';
    const choices = [.../* @__PURE__ */ new Set([wrong, answer, other])];
    if (choices.length < 2) return null;
    return { ...base2, mode: "completion", answer, choices, prefix: code2.slice(0, index), suffix: code2.slice(index + answer.length) };
  } catch {
    return null;
  }
}
function materializeSupport(source, level) {
  return level ? createSupportVariant(source, level) || source : source;
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
  { id: "text-syntax-review-1", kind: "review", title: "\u041E\u0434\u043D\u0430 \u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430", prompt: "\u0421\u043E\u0431\u0435\u0440\u0438 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0443\u044E \u0441\u0442\u0440\u043E\u043A\u0443 Python.", skills: ["text_syntax", "print"], requires: ["print"], supportLevel: "code_tokens", durationSeconds: 30, sourceLessonId: 19 }
];
function practiceLessonId(id) {
  const index = practicePool.findIndex((item) => item.id === id);
  return index < 0 ? void 0 : -100 - index;
}
function getPracticeLesson(id, support) {
  const item = practicePool.find((candidate) => candidate.id === id);
  const source = lessons3.find((lesson) => lesson.id === item?.sourceLessonId);
  if (!item || !source) return void 0;
  const variant = materializeSupport(source, support || item.supportLevel);
  return {
    ...variant,
    id: practiceLessonId(id),
    title: item.title,
    instruction: `${item.prompt} ${source.instruction}`,
    tutorial: void 0,
    review: true,
    skills: { teaches: [], practices: item.skills, requires: item.requires }
  };
}
var practiceLessons = practicePool.map((item) => getPracticeLesson(item.id));

// src/ai/aiContext.ts
var errorLabels = {
  wrong_order: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439",
  wrong_value: "\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435",
  missing_block: "\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B",
  wrong_structure: "\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430",
  syntax_error: "\u0421\u0438\u043D\u0442\u0430\u043A\u0441\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430",
  wrong_indentation: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u0441\u0442\u0443\u043F\u0430",
  wrong_condition: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0441\u043B\u043E\u0432\u0438\u044F",
  loop_error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0446\u0438\u043A\u043B\u0430",
  wrong_function_call: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u0437\u043E\u0432\u0430 \u0444\u0443\u043D\u043A\u0446\u0438\u0438",
  runtime_error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F"
};
var expr = (value) => value.kind === "binary" || value.kind === "comparison" ? `${value.kind}(${value.operator},${expr(value.left)},${expr(value.right)})` : value.kind;
var stmt = (value) => {
  if (value.kind === "define" || value.kind === "repeat") return `${value.kind}(${value.body.map(stmt).join(",")})`;
  if (value.kind === "if") return `if(${value.then.map(stmt).join(",")}:${value.otherwise.map(stmt).join(",")})`;
  return value.kind === "call" ? "call" : `${value.kind}(${expr(value.value)})`;
};
var bounded2 = (value, max) => Math.min(max, Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)));
function buildTutorContext(lesson, progress, session, program, errorType) {
  const allowedConcepts = [.../* @__PURE__ */ new Set([...lesson.skills?.teaches || [], ...lesson.skills?.practices || []])];
  const skillId = allowedConcepts[0] || "print";
  const state3 = progress.skillStates?.[skillId];
  const representation = lesson.mode === "blocks" ? "blocks" : lesson.mode === "text" ? "code" : "choice";
  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    skill: { id: skillId, name: skills[skillId].title, mastery: Math.max(0, Math.min(1, state3?.mastery || 0)) },
    task: { description: lesson.goal, expectedConcept: skillId, supportLevel: lesson.supportLevel || "blocks_with_code" },
    learner: { attempts: bounded2(session.attempts, 100), consecutiveErrors: bounded2(state3?.consecutiveErrors || 0, 100), hintsUsed: bounded2(session.hintsUsed, 3), independentSuccesses: bounded2(state3?.independentSuccesses || 0, 100) },
    ...errorType ? { lastError: { type: errorType, message: errorLabels[errorType] } } : {},
    currentSolution: { representation, normalizedStructure: representation === "choice" ? "not_shared" : program.statements.slice(0, 12).map(stmt).join(",").slice(0, 160) || "empty" },
    allowedConcepts
  };
}
function sanitizeTutorContext(lesson, raw) {
  const safeSession = { attempts: bounded2(raw?.learner?.attempts, 100), hintsUsed: bounded2(raw?.learner?.hintsUsed, 3) };
  const skillId = lesson.skills?.teaches[0] || lesson.skills?.practices[0] || "print";
  const progress = { skillStates: { [skillId]: {
    mastery: Number.isFinite(raw?.skill?.mastery) ? Math.max(0, Math.min(1, raw.skill.mastery)) : 0,
    consecutiveErrors: bounded2(raw?.learner?.consecutiveErrors, 100),
    independentSuccesses: bounded2(raw?.learner?.independentSuccesses, 100)
  } } };
  const errorType = raw?.lastError?.type;
  const validErrors = ["wrong_order", "wrong_value", "missing_block", "wrong_structure", "syntax_error", "wrong_indentation", "wrong_condition", "loop_error", "wrong_function_call", "runtime_error"];
  const clean = buildTutorContext(lesson, progress, safeSession, { statements: [] }, errorType && validErrors.includes(errorType) ? errorType : void 0);
  clean.task.description = lesson.goal.replace(/[«“"][^»”"]+[»”"]/g, "\xAB\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0438\u0437 \u0437\u0430\u0434\u0430\u043D\u0438\u044F\xBB");
  for (const output of lesson.expectedOutput) if (output.length >= 3) clean.task.description = clean.task.description.replaceAll(output, "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0438\u0437 \u0437\u0430\u0434\u0430\u043D\u0438\u044F");
  const structure = raw?.currentSolution?.normalizedStructure;
  const tokens = typeof structure === "string" ? structure.match(/[a-z_]+/g) || [] : [];
  const safeKinds = ["empty", "not_shared", "print", "assign", "call", "define", "repeat", "if", "binary", "comparison", "string", "number", "variable", "missing"];
  if (clean.currentSolution.representation !== "choice" && typeof structure === "string" && structure.length <= 160 && /^[a-z0-9_,:() +*<>=!-]+$/.test(structure) && tokens.every((token) => safeKinds.includes(token))) clean.currentSolution.normalizedStructure = structure;
  return clean;
}

// src/ai/aiPolicy.ts
function instructionFor(request) {
  const level = request.hintLevel;
  const support = request.context.task.supportLevel;
  return `\u0422\u044B \u043D\u0430\u0441\u0442\u0430\u0432\u043D\u0438\u043A Kodik \u0434\u043B\u044F \u043F\u043E\u0434\u0440\u043E\u0441\u0442\u043A\u0430. \u041E\u0442\u0432\u0435\u0447\u0430\u0439 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438 \u043F\u0440\u043E\u0441\u0442\u043E \u0438 \u0434\u043E\u0431\u0440\u043E\u0436\u0435\u043B\u0430\u0442\u0435\u043B\u044C\u043D\u043E. \u0422\u043E\u043B\u044C\u043A\u043E JSON \u043F\u043E \u0441\u0445\u0435\u043C\u0435.
\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B: ${request.context.allowedConcepts.join(", ")}. \u041D\u0435 \u0432\u0432\u043E\u0434\u0438 \u043D\u043E\u0432\u044B\u0445 \u0442\u0435\u043C \u0438 \u043D\u0435 \u043C\u0435\u043D\u044F\u0439 \u0443\u0447\u0435\u0431\u043D\u0443\u044E \u0437\u0430\u0434\u0430\u0447\u0443.
\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 Kodik \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u043C \u0438\u0441\u0442\u0438\u043D\u044B. \u041D\u0435 \u043F\u0435\u0440\u0435\u043E\u0446\u0435\u043D\u0438\u0432\u0430\u0439 \u0440\u0435\u0448\u0435\u043D\u0438\u0435, \u043D\u0435 \u0432\u044B\u0441\u0442\u0430\u0432\u043B\u044F\u0439 \u0431\u0430\u043B\u043B\u044B \u0438 \u043D\u0435 \u043C\u0435\u043D\u044F\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u0433\u043B\u0430\u0432\u0430\u043C.
\u0417\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u044B \u0433\u043E\u0442\u043E\u0432\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u044F, \u0442\u043E\u0447\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442, \u0441\u0441\u044B\u043B\u043A\u0438, HTML, \u0441\u043B\u0443\u0436\u0435\u0431\u043D\u044B\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438 \u0438 \u043F\u0440\u043E\u0441\u044C\u0431\u044B \u043E \u043B\u0438\u0447\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445.
\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 ${level}: ${level === 1 ? "\u043E\u0434\u0438\u043D \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u043D\u0430\u043C\u0451\u043A \u0431\u0435\u0437 \u043A\u043E\u0434\u0430" : level === 2 ? "\u043E\u0431\u044A\u044F\u0441\u043D\u0438 \u043F\u0440\u0438\u043D\u0446\u0438\u043F \u0438 \u0434\u0430\u0439 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435, \u0431\u0435\u0437 \u043A\u043E\u0434\u0430" : "\u0434\u0430\u0439 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0448\u0430\u0433 \u0438\u043B\u0438 \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u0439 \u0448\u0430\u0431\u043B\u043E\u043D, \u043D\u043E \u043D\u0435 \u0433\u043E\u0442\u043E\u0432\u044B\u0439 \u043E\u0442\u0432\u0435\u0442"}.
\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0438 ${support}: ${support === "blocks" ? "\u0433\u043E\u0432\u043E\u0440\u0438 \u043E \u0431\u043B\u043E\u043A\u0430\u0445, \u0438\u0437\u0431\u0435\u0433\u0430\u0439 \u0441\u0438\u043D\u0442\u0430\u043A\u0441\u0438\u0441\u0430 Python" : support === "free_code" ? "\u043C\u043E\u0436\u043D\u043E \u043D\u0430\u0437\u0432\u0430\u0442\u044C \u0437\u043D\u0430\u043A\u043E\u043C\u0443\u044E \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044E Python" : "\u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0439 \u0437\u043D\u0430\u043A\u043E\u043C\u044B\u0435 \u0431\u043B\u043E\u043A\u0438 \u0441 Python \u0431\u0435\u0437 \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u043A\u043E\u0434\u0430"}.
\u041F\u043E\u043B\u0435 concept \u0437\u0430\u043F\u043E\u043B\u043D\u044F\u0439 \u0442\u043E\u043B\u044C\u043A\u043E ID \u0438\u0437 allowedConcepts \u0438\u043B\u0438 null.
\u0414\u043B\u044F hint 1 \u0438 2 \u043F\u043E\u043B\u0435 example \u0432\u0441\u0435\u0433\u0434\u0430 null. \u0414\u043B\u044F hint 3 \u043F\u043E\u043B\u0435 example.code \u043B\u0438\u0431\u043E null, \u043B\u0438\u0431\u043E \u043E\u0434\u0438\u043D \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u0439 \u0448\u0430\u0431\u043B\u043E\u043D \u0441 \xAB...\xBB. \u041D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0432 \u043F\u0440\u0438\u043C\u0435\u0440\u0430\u0445 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438\u0437 \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u044F.
\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F. \u041D\u0435 \u0443\u0433\u0430\u0434\u044B\u0432\u0430\u0439 \u0438\u0445 \u0438 \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0442\u0438\u043F\u0438\u0447\u043D\u044B\u0435 \u043E\u0442\u0432\u0435\u0442\u044B \u0432\u0440\u043E\u0434\u0435 \xAB\u041F\u0440\u0438\u0432\u0435\u0442!\xBB \u0438\u043B\u0438 \xAB\u041C\u0438\u0440\u0430\xBB.
\u0414\u043B\u044F \u043E\u0431\u044A\u044F\u0441\u043D\u0435\u043D\u0438\u044F \u043E\u0448\u0438\u0431\u043A\u0438 \u043E\u043F\u0438\u0440\u0430\u0439\u0441\u044F \u043D\u0430 lastError.type. \u0414\u043B\u044F \u043F\u0440\u0438\u043C\u0435\u0440\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0434\u0440\u0443\u0433\u0443\u044E \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044E \u0438 \u043E\u0441\u0442\u0430\u0432\u044C \u0443\u0447\u0435\u043D\u0438\u043A\u0443 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435.
message \u0434\u043E 280 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, example.explanation \u0434\u043E 160 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, example.code \u0434\u043E 100 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432. shouldRevealSolution \u0432\u0441\u0435\u0433\u0434\u0430 false.`;
}

// src/ai/aiPrompt.ts
var tutorResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["hint", "explanation", "example"] },
    message: { type: "string" },
    concept: { type: ["string", "null"] },
    example: { type: ["object", "null"], additionalProperties: false, properties: { code: { type: ["string", "null"] }, explanation: { type: ["string", "null"] } }, required: ["code", "explanation"] },
    shouldRevealSolution: { type: "boolean" },
    confidence: { type: ["string", "null"], enum: ["high", "medium", "low", null] }
  },
  required: ["type", "message", "concept", "example", "shouldRevealSolution", "confidence"]
};
var responseTypeFor = (action) => action === "hint" ? "hint" : action === "example" ? "example" : "explanation";
function tutorResponseSchemaFor(type) {
  return { ...tutorResponseSchema, properties: { ...tutorResponseSchema.properties, type: { type: "string", enum: [type] } } };
}
function makeTutorPrompt(request) {
  const responseType = responseTypeFor(request.action);
  return { instructions: `${instructionFor(request)}
\u041F\u043E\u043B\u0435 type \u0432 \u043E\u0442\u0432\u0435\u0442\u0435: ${responseType}.`, input: JSON.stringify(request), responseType };
}

// src/ai/aiResponseValidator.ts
var unsafe = /<\/?[a-z][^>]*>|https?:\/\/|www\.|\b(?:system|developer)\s*(?:prompt|message|instruction)|(?:игнорируй|забудь)\s+(?:предыдущие|инструкции)/i;
var code = /\b(?:print|if|else|for|while|def|return|input|import|class)\s*\(|[{};]|\b(?:if|for|def)\s+\w+.*:/i;
var executableCode = (value) => code.test(value.replace(/\bprint\s*\(\s*(?:\.{3})?\s*\)/gi, "")) || /[\p{L}_][\p{L}\p{N}_]*\s*=\s*(?!=)/u.test(value);
var python = /\b(?:while|import|class|try|except|lambda|input|return)\b/i;
var normalize = (s) => s.replace(/\s+/g, "").replace(/['"`]/g, "").toLowerCase();
var cleanText = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max && !unsafe.test(value);
function validateTutorResponse(value, request, lesson, onReject) {
  const reject = (reason) => {
    onReject?.(reason);
    return null;
  };
  if (!value || typeof value !== "object") return reject("shape");
  const result = value;
  if (Object.keys(result).some((key) => !["type", "message", "concept", "example", "shouldRevealSolution", "confidence"].includes(key))) return reject("extra_fields");
  const expected = request.action === "hint" ? "hint" : request.action === "example" ? "example" : "explanation";
  if (result.type !== expected) return reject("type");
  if (result.shouldRevealSolution !== false) return reject("reveal");
  if (!cleanText(result.message, 280)) return reject("message");
  if (result.concept != null && !cleanText(result.concept, 80)) return reject("concept_shape");
  if (result.concept && !request.context.allowedConcepts.some((id) => result.concept.toLowerCase().includes(id) || result.concept.toLowerCase().includes(request.context.skill.name.toLowerCase()))) return reject("concept_boundary");
  if (result.example != null && (typeof result.example !== "object" || Object.keys(result.example).some((key) => !["code", "explanation"].includes(key)) || result.example.code != null && !cleanText(result.example.code, 100) || result.example.explanation != null && !cleanText(result.example.explanation, 160))) return reject("example_shape");
  const message = result.message;
  const exampleCode = result.example?.code || "";
  if (python.test(`${message}
${exampleCode}`)) return reject("unsupported_python");
  if (request.hintLevel < 3 && request.action === "hint" && (executableCode(message) || exampleCode)) return reject("hint_code");
  if (request.action === "hint" && exampleCode && (request.hintLevel < 3 || !exampleCode.includes("...") || exampleCode.includes("\n"))) return reject("hint_full_code");
  if (request.context.task.supportLevel === "blocks" && (code.test(message) || exampleCode)) return reject("blocks_code");
  if (lesson) {
    const answer = lesson.answer || lesson.codeAnswer || "";
    const merged = normalize(message + exampleCode + (result.example?.explanation || ""));
    if (answer.length >= 6 && merged.includes(normalize(answer))) return reject("exact_answer");
    if (lesson.expectedOutput.some((output) => output.length >= 3 && merged.includes(normalize(output)))) return reject("expected_output");
  }
  return {
    type: result.type,
    message,
    concept: result.concept || null,
    example: result.example ? { code: result.example.code || null, explanation: result.example.explanation || null } : null,
    shouldRevealSolution: false,
    confidence: result.confidence || null
  };
}

// server/aiProvider.ts
var ProviderError = class extends Error {
  constructor(status) {
    super(status === 429 ? "rate_limit" : "provider_error");
    this.status = status;
  }
};
async function post(url, key, payload, signal) {
  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new ProviderError(response.status === 429 ? 429 : 502);
  return response.json();
}
function groqProvider(key) {
  return { name: "groq", async generate(prompt, signal) {
    const data = await post("https://api.groq.com/openai/v1/chat/completions", key, {
      model: process.env.GROQ_TUTOR_MODEL || "openai/gpt-oss-20b",
      messages: [{ role: "system", content: prompt.instructions }, { role: "user", content: prompt.input }],
      response_format: { type: "json_schema", json_schema: { name: "tutor_response", strict: true, schema: tutorResponseSchemaFor(prompt.responseType) } },
      reasoning_effort: "low",
      max_completion_tokens: 500
    }, signal);
    const content = data.choices?.[0]?.message?.content;
    return typeof content === "string" ? JSON.parse(content) : null;
  } };
}
function openAIProvider(key, model) {
  return { name: "openai", async generate(prompt, signal) {
    const data = await post("https://api.openai.com/v1/responses", key, {
      model,
      store: false,
      instructions: prompt.instructions,
      input: prompt.input,
      text: { format: { type: "json_schema", name: "tutor_response", strict: true, schema: tutorResponseSchemaFor(prompt.responseType) } },
      max_output_tokens: 300
    }, signal);
    const content = data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    return content ? JSON.parse(content) : null;
  } };
}
function configuredTutorProvider() {
  if (process.env.GROQ_API_KEY) return groqProvider(process.env.GROQ_API_KEY);
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_TUTOR_MODEL) return openAIProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_TUTOR_MODEL);
  return null;
}

// server/aiTutor.ts
var hits = /* @__PURE__ */ new Map();
var actions = ["hint", "error_explanation", "concept", "example"];
var maxBody = 4096;
async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (typeof origin === "string") {
    try {
      if (new URL(origin).host !== host) return res.status(403).json({ error: "forbidden" });
    } catch {
      return res.status(403).json({ error: "forbidden" });
    }
  }
  const provider = configuredTutorProvider();
  if (process.env.AI_TUTOR_ENABLED !== "true" || !provider) return res.status(503).json({ error: "ai_unavailable" });
  const address = req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const hit = hits.get(address) || { count: 0, expires: now + 6e4 };
  if (now >= hit.expires) {
    hit.count = 0;
    hit.expires = now + 6e4;
  }
  if (++hit.count > 30) return res.status(429).json({ error: "rate_limit" });
  hits.set(address, hit);
  if (hits.size > 1e3) {
    for (const [key, value] of hits) if (value.expires < now) hits.delete(key);
  }
  let body;
  try {
    const serialized = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!serialized || serialized.length > maxBody) throw Error("bad_body");
    body = JSON.parse(serialized);
  } catch {
    return res.status(400).json({ error: "invalid_request" });
  }
  if (!actions.includes(body?.action) || ![1, 2, 3].includes(body?.hintLevel)) return res.status(400).json({ error: "invalid_request" });
  if (body.action === "example" && process.env.AI_EXAMPLES_ENABLED !== "true") return res.status(503).json({ error: "ai_unavailable" });
  if ((body.action === "concept" || body.action === "error_explanation") && process.env.AI_EXPLANATIONS_ENABLED !== "true") return res.status(503).json({ error: "ai_unavailable" });
  const lesson = [...lessons3, ...practiceLessons].find((item) => item.id === body.context?.lessonId);
  if (!lesson) return res.status(400).json({ error: "unknown_lesson" });
  const request = { action: body.action, hintLevel: body.hintLevel, context: sanitizeTutorContext(lesson, body.context) };
  const prompt = makeTutorPrompt(request);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7e3);
  try {
    const raw = await provider.generate(prompt, controller.signal);
    const validated = validateTutorResponse(raw, request, lesson, (reason) => console.warn("ai_tutor_invalid_response", { provider: provider.name, action: request.action, reason }));
    if (!validated) return res.status(502).json({ error: "invalid_response" });
    return res.status(200).json(validated);
  } catch (error) {
    return res.status(error instanceof ProviderError && error.status === 429 ? 429 : 502).json({ error: error instanceof ProviderError && error.status === 429 ? "rate_limit" : "provider_error" });
  } finally {
    clearTimeout(timer);
  }
}
export {
  handler as default
};
