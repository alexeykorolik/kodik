// src/validation.ts
function issue(message, fallbackSkills = []) {
  const text4 = message.toLowerCase();
  if (/отступ/.test(text4)) return { message, errorType: "wrong_indentation", affectedSkills: ["indentation"] };
  if (/функц|вызов/.test(text4)) return { message, errorType: "wrong_function_call", affectedSkills: ["function"] };
  if (/цикл|повтор|range/.test(text4)) return { message, errorType: "loop_error", affectedSkills: ["loop"] };
  if (/сравнен|услов|равенств|≥|>=/.test(text4)) return { message, errorType: "wrong_condition", affectedSkills: text4.includes("\u0443\u0441\u043B\u043E\u0432") ? ["if", "comparison"] : ["comparison"] };
  if (/порядок|сначала|затем/.test(text4)) return { message, errorType: "wrong_order", affectedSkills: ["sequence"] };
  if (/пуст|добав|нужен блок|встав/.test(text4)) return { message, errorType: "missing_block", affectedSkills: fallbackSkills };
  if (/синтакс|скоб|кавыч|команд/.test(text4)) return { message, errorType: "syntax_error", affectedSkills: ["text_syntax"] };
  if (/значен|числ|текст/.test(text4)) return { message, errorType: "wrong_value", affectedSkills: fallbackSkills };
  return { message, errorType: "wrong_structure", affectedSkills: fallbackSkills };
}

// src/learningEngine.ts
var solution = (blocks) => {
  const names = /* @__PURE__ */ new Set();
  const visit = (value) => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const clone2 = Object.fromEntries(Object.entries(value).map(([key2, nested]) => [key2, visit(nested)]));
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
var textBlock = (text4) => ({ type: "text", fields: { TEXT: text4 } });
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
  text_syntax: { id: "text_syntax", title: "\u0421\u0438\u043D\u0442\u0430\u043A\u0441\u0438\u0441 Python", prerequisites: ["print", "string"] },
  list: { id: "list", title: "\u0421\u043F\u0438\u0441\u043A\u0438", prerequisites: ["variable", "loop"] },
  input: { id: "input", title: "\u0412\u0432\u043E\u0434 \u0434\u0430\u043D\u043D\u044B\u0445", prerequisites: ["variable", "print"] },
  drawing: { id: "drawing", title: "\u0420\u0438\u0441\u043E\u0432\u0430\u043D\u0438\u0435", prerequisites: ["loop", "function"] }
};
function supportForMode(mode = "blocks") {
  if (mode === "blocks") return "blocks_with_code";
  if (mode === "recognition" || mode === "completion") return "guided_code";
  if (mode === "tokens") return "code_tokens";
  return "free_code";
}

// src/python/values.ts
var PyObject = class {
  /** Attribute lookup; undefined means "no such attribute". */
  getattr(_name, _ctx) {
    return void 0;
  }
  repr(_ctx) {
    return `<${this.typeName} object>`;
  }
  str(ctx) {
    return this.repr(ctx);
  }
  callable() {
    return false;
  }
  call(_args, _kw, ctx) {
    ctx.fail(`\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0442\u0438\u043F\u0430 ${this.typeName} \u043D\u0435\u043B\u044C\u0437\u044F \u0432\u044B\u0437\u0432\u0430\u0442\u044C \u043A\u0430\u043A \u0444\u0443\u043D\u043A\u0446\u0438\u044E.`);
  }
  /** Items of a `for` loop, unpacking, list(...)-like use; undefined: not iterable. */
  iterate(_ctx) {
    return void 0;
  }
  size() {
    return void 0;
  }
  truth(_ctx) {
    return true;
  }
};
var PyNative = class extends PyObject {
  constructor(name, fn, effect = false, decorate) {
    super();
    this.name = name;
    this.fn = fn;
    this.effect = effect;
    this.decorate = decorate;
  }
  typeName = "builtin_function_or_method";
  callable() {
    return true;
  }
  call(args, kw, ctx) {
    return this.fn(args, kw, ctx);
  }
  repr() {
    return `<built-in function ${this.name}>`;
  }
};
var PyModule = class extends PyObject {
  constructor(name, attrs, exports = [...attrs.keys()].filter((key2) => !key2.startsWith("_"))) {
    super();
    this.name = name;
    this.attrs = attrs;
    this.exports = exports;
  }
  typeName = "module";
  getattr(name) {
    return this.attrs.get(name);
  }
  repr() {
    return `<module '${this.name}'>`;
  }
};
var PyTuple = class extends PyObject {
  constructor(items) {
    super();
    this.items = items;
  }
  typeName = "tuple";
  iterate(ctx) {
    return ctx.items(this.items);
  }
  size() {
    return this.items.length;
  }
  truth() {
    return this.items.length > 0;
  }
};
var Vec2D = class extends PyTuple {
  constructor(x, y, xFloat = true, yFloat = true) {
    super([x, y]);
    this.x = x;
    this.y = y;
    this.xFloat = xFloat;
    this.yFloat = yFloat;
  }
  typeName = "Vec2D";
  repr() {
    return `(${fixed2(this.x)},${fixed2(this.y)})`;
  }
  iterate() {
    return [arg(this.x, this.xFloat), arg(this.y, this.yFloat)];
  }
};
function fixed2(value) {
  const rounded = pyRound(value, 2);
  return (Object.is(rounded, -0) || rounded === 0) && value < 0 ? "-0.00" : rounded.toFixed(2);
}
var PySlice = class extends PyObject {
  constructor(start, stop, step) {
    super();
    this.start = start;
    this.stop = stop;
    this.step = step;
  }
  typeName = "slice";
  /** Python's slice.indices(length). */
  indices(length, ctx) {
    const step = this.step ?? 1;
    if (step === 0) ctx.fail("\u0428\u0430\u0433 \u0441\u0440\u0435\u0437\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0443\u043B\u0451\u043C.");
    const lower = step > 0 ? 0 : -1, upper = step > 0 ? length : length - 1;
    const clamp = (value, fallback) => {
      if (value === null) return fallback;
      if (value < 0) {
        value += length;
        return value < lower ? lower : value;
      }
      return value > upper ? upper : value;
    };
    const start = clamp(this.start, step > 0 ? lower : upper), stop = clamp(this.stop, step > 0 ? upper : lower), result = [];
    for (let i = start; step > 0 ? i < stop : i > stop; i += step) result.push(i);
    return result;
  }
};
var arg = (value, float = false) => float && typeof value === "number" ? { value, float: true } : { value };
var floatArg = (value) => ({ value, float: true });
var none = { value: null };
function num(a, ctx, what = "\u0447\u0438\u0441\u043B\u043E") {
  if (!a) return ctx.fail(`\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F: \u043D\u0443\u0436\u043D\u043E ${what}.`);
  if (typeof a.value === "boolean") return Number(a.value);
  if (typeof a.value === "number") return a.value;
  return ctx.fail(`\u0417\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u043D\u043E ${what}, \u0430 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u043E ${typeLabel(a.value)}.`);
}
function int(a, ctx, what = "\u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E") {
  const value = num(a, ctx, what);
  if (a.float || !Number.isInteger(value)) ctx.fail(`\u0417\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u043D\u043E ${what}, \u0430 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u043E \u0434\u0440\u043E\u0431\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E.`);
  return value;
}
function text2(a, ctx, what = "\u0441\u0442\u0440\u043E\u043A\u0430") {
  if (!a || typeof a.value !== "string") return ctx.fail(`\u0417\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u043D\u0430 ${what} \u0432 \u043A\u0430\u0432\u044B\u0447\u043A\u0430\u0445.`);
  return a.value;
}
function typeLabel(value) {
  if (value === null) return "None";
  if (typeof value === "string") return "\u0441\u0442\u0440\u043E\u043A\u0430";
  if (typeof value === "boolean") return "\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435";
  if (typeof value === "number") return "\u0447\u0438\u0441\u043B\u043E";
  if (Array.isArray(value)) return "\u0441\u043F\u0438\u0441\u043E\u043A";
  return value.typeName;
}
function bind(fn, args, kw, names, required = names.length, ctx) {
  if (args.length > names.length) ctx.fail(`${fn}() \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${names.length} \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432.`);
  const result = {};
  names.forEach((name, i) => {
    if (i < args.length) result[name] = args[i];
  });
  for (const [name, value] of kw) {
    if (!names.includes(name)) ctx.fail(`\u0423 ${fn}() \u043D\u0435\u0442 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430 \xAB${name}\xBB.`);
    if (result[name]) ctx.fail(`\u0410\u0440\u0433\u0443\u043C\u0435\u043D\u0442 \xAB${name}\xBB \u0432 ${fn}() \u0443\u043A\u0430\u0437\u0430\u043D \u0434\u0432\u0430\u0436\u0434\u044B.`);
    result[name] = value;
  }
  const missing = names.slice(0, required).find((name) => !result[name]);
  if (missing) ctx.fail(`${fn}() \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430 \xAB${missing}\xBB.`);
  return result;
}
var noKeywords = (fn, kw, ctx) => {
  if (kw.size) ctx.fail(`\u0423 ${fn}() \u043D\u0435\u0442 \u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432.`);
};
function pyRound(x, digits = 0) {
  if (!Number.isFinite(x)) return x;
  if (digits > 22 || Math.abs(x) >= 2 ** 52 && digits >= 0) return x;
  if (digits < 0) {
    const scale = 10 ** -digits;
    return roundHalfEven(x / scale) * scale;
  }
  const exact = Math.abs(x).toFixed(Math.min(100, digits + 25)), cut = exact.indexOf(".") + 1 + digits;
  const tail = exact.slice(cut);
  let result = Number(Math.abs(x).toFixed(digits));
  if (/^50*$/.test(tail)) {
    const kept = exact.slice(0, cut).replace(/\.$/, ""), last = Number(kept.replace(".", "").slice(-1));
    if (last % 2 === 0) result = Number(kept);
  }
  return x < 0 ? -result : result;
}
function roundHalfEven(x) {
  const floor = Math.floor(x), diff = x - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

// src/python/scene.ts
var SceneBuilder = class {
  turtle;
  robot;
  plots;
  finishers = [];
  onFinish(fn) {
    this.finishers.push(fn);
  }
  finish(duration) {
    for (const fn of this.finishers.splice(0)) {
      try {
        fn();
      } catch {
      }
    }
    if (!this.turtle && !this.robot && !this.plots) return void 0;
    return { ...this.turtle ? { turtle: this.turtle } : {}, ...this.robot ? { robot: this.robot } : {}, ...this.plots ? { plots: this.plots } : {}, duration: Math.round(duration) };
  }
};

// src/python/libNumpy.ts
var MAX_SIZE = 1e4;
var dtypeName = { int: "int64", float: "float64", bool: "bool" };
var PyDType = class extends PyObject {
  constructor(dtype) {
    super();
    this.dtype = dtype;
  }
  typeName = "numpy.dtype";
  repr() {
    return `dtype('${dtypeName[this.dtype]}')`;
  }
  str() {
    return dtypeName[this.dtype];
  }
};
var PyScalarType = class extends PyObject {
  constructor(dtype) {
    super();
    this.dtype = dtype;
  }
  typeName = "type";
  repr() {
    return `<class 'numpy.${dtypeName[this.dtype]}'>`;
  }
  callable() {
    return true;
  }
  call(args, kw, ctx) {
    noKeywords(dtypeName[this.dtype], kw, ctx);
    const v = num(args[0] ?? arg(0), ctx);
    return this.dtype === "float" ? floatArg(v) : this.dtype === "bool" ? arg(v !== 0) : arg(Math.trunc(v));
  }
};
var NdArray = class _NdArray extends PyObject {
  constructor(data, shape, dtype) {
    super();
    this.data = data;
    this.shape = shape;
    this.dtype = dtype;
  }
  typeName = "numpy.ndarray";
  get count() {
    return this.data.length;
  }
  element(i) {
    const v = this.data[i];
    return this.dtype === "bool" ? arg(v !== 0) : this.dtype === "float" ? floatArg(v) : arg(v);
  }
  strides() {
    const s = [];
    let k = 1;
    for (let i = this.shape.length - 1; i >= 0; i--) {
      s[i] = k;
      k *= this.shape[i];
    }
    return s;
  }
  /** Sub-array along the first axis (or an element of a 1-D array). */
  row(i) {
    if (this.shape.length === 1) return this.element(i);
    const inner = this.shape.slice(1), size = inner.reduce((a, b) => a * b, 1);
    return { value: new _NdArray(this.data.slice(i * size, (i + 1) * size), inner, this.dtype) };
  }
  iterate(ctx) {
    if (!this.shape.length) ctx.fail("\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0435\u0440\u0435\u0431\u0440\u0430\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432 \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0439.");
    ctx.tick(Math.ceil(this.shape[0] / 10));
    return Array.from({ length: this.shape[0] }, (_, i) => this.row(i));
  }
  size() {
    return this.shape[0] ?? 0;
  }
  truth(ctx) {
    if (this.count === 1) return this.data[0] !== 0;
    if (this.count === 0) return false;
    return ctx.fail("\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432 \u0438\u0437 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 \u043A\u0430\u043A \u043E\u0434\u043D\u043E \u0443\u0441\u043B\u043E\u0432\u0438\u0435. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 a.any() \u0438\u043B\u0438 a.all().");
  }
  str(ctx) {
    return formatArray(this, " ", "", ctx);
  }
  repr(ctx) {
    return this.count === 0 ? `array([], dtype=${dtypeName[this.dtype]})` : `array(${formatArray(this, ", ", "array(", ctx)})`;
  }
  abs(ctx) {
    return unary(this, Math.abs, ctx, this.dtype === "bool" ? "bool" : this.dtype);
  }
  getattr(name, ctx) {
    if (name === "shape") return { value: ctx.tuple(this.shape.map((n) => arg(n))) };
    if (name === "size") return arg(this.count);
    if (name === "ndim") return arg(this.shape.length);
    if (name === "dtype") return { value: new PyDType(this.dtype) };
    if (name === "T") return { value: transpose(this, ctx) };
    const method = arrayMethods[name];
    return method ? { value: new PyNative(name, (args, kw, c) => method(this, args, kw, c)) } : void 0;
  }
};
var scalarDType = (a) => typeof a.value === "boolean" ? "bool" : a.float ? "float" : "int";
function promote(a, b) {
  return a === "float" || b === "float" ? "float" : a === "int" || b === "int" ? "int" : "bool";
}
function cast(data, dtype) {
  return dtype === "int" ? data.map(Math.trunc) : dtype === "bool" ? data.map((v) => v !== 0 ? 1 : 0) : data;
}
function parseDType(a, ctx) {
  if (!a || a.value === null) return void 0;
  const v = a.value;
  if (v instanceof PyScalarType || v instanceof PyDType) return v.dtype;
  if (v instanceof PyObject && "pythonType" in v) {
    const t = v.pythonType;
    if (t === "int" || t === "float" || t === "bool") return t;
  }
  if (typeof v === "string") {
    const map = { int: "int", int64: "int", int32: "int", float: "float", float64: "float", float32: "float", bool: "bool" };
    if (map[v]) return map[v];
  }
  return ctx.fail("\u0422\u0438\u043F \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432: int, float \u0438\u043B\u0438 bool (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, dtype=float).");
}
function toArray(a, ctx, dtype) {
  if (a.value instanceof NdArray) return dtype && dtype !== a.value.dtype ? new NdArray(cast(a.value.data, dtype), a.value.shape, dtype) : a.value;
  const data = [];
  let shape, found = "bool", empty = true;
  const walk2 = (item, depth, dims) => {
    ctx.tick();
    const v = item.value;
    if (Array.isArray(v) || v instanceof PyTuple || v instanceof NdArray) {
      const items = v instanceof NdArray ? v.iterate(ctx) : ctx.items(v);
      dims = [...dims, items.length];
      if (!items.length) {
        if (!shape) shape = dims;
        else if (shape.length !== dims.length) ragged();
        return;
      }
      for (const child of items) walk2(child, depth + 1, dims);
      return;
    }
    if (typeof v !== "number" && typeof v !== "boolean") ctx.fail(`\u041C\u0430\u0441\u0441\u0438\u0432 numpy \u0432 Kodik \u0445\u0440\u0430\u043D\u0438\u0442 \u0447\u0438\u0441\u043B\u0430 \u0438 \u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F, \u0430 \u0437\u0434\u0435\u0441\u044C ${typeLabel(v)}.`);
    if (!shape) shape = dims;
    else if (shape.length !== dims.length || shape.some((n, i) => n !== dims[i])) ragged();
    empty = false;
    found = promote(found, scalarDType(item));
    data.push(Number(v));
    if (data.length > MAX_SIZE) ctx.fail(`\u041C\u0430\u0441\u0441\u0438\u0432 \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_SIZE} \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432.`);
  };
  const ragged = () => ctx.fail("\u0412\u0441\u0435 \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0435 \u0441\u043F\u0438\u0441\u043A\u0438 \u043C\u0430\u0441\u0441\u0438\u0432\u0430 \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043E\u0434\u043D\u043E\u0439 \u0434\u043B\u0438\u043D\u044B.");
  walk2(a, 0, []);
  const type = dtype ?? (empty ? "float" : found);
  return new NdArray(cast(data, type), shape ?? [], type);
}
var isArrayLike = (v) => v instanceof NdArray || Array.isArray(v) || v instanceof PyTuple;
var shapeOf = (a, ctx) => {
  if (!a) return ctx.fail("\u0423\u043A\u0430\u0436\u0438 \u0440\u0430\u0437\u043C\u0435\u0440 \u043C\u0430\u0441\u0441\u0438\u0432\u0430.");
  const dims = a.value instanceof PyTuple || Array.isArray(a.value) ? ctx.items(a.value).map((item) => int(item, ctx, "\u0440\u0430\u0437\u043C\u0435\u0440")) : [int(a, ctx, "\u0440\u0430\u0437\u043C\u0435\u0440")];
  if (dims.some((n) => n < 0)) ctx.fail("\u0420\u0430\u0437\u043C\u0435\u0440 \u043C\u0430\u0441\u0441\u0438\u0432\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C.");
  if (dims.reduce((x, y) => x * y, 1) > MAX_SIZE) ctx.fail(`\u041C\u0430\u0441\u0441\u0438\u0432 \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_SIZE} \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432.`);
  return dims;
};
function broadcast(a, b, ctx) {
  const n = Math.max(a.shape.length, b.shape.length), sa = [...Array(n - a.shape.length).fill(1), ...a.shape], sb = [...Array(n - b.shape.length).fill(1), ...b.shape];
  const shape = sa.map((x, i) => x === sb[i] ? x : x === 1 ? sb[i] : sb[i] === 1 ? x : ctx.fail(`\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u0432 \u043D\u0435 \u0441\u043E\u0433\u043B\u0430\u0441\u0443\u044E\u0442\u0441\u044F: (${a.shape.join(", ")}) \u0438 (${b.shape.join(", ")}).`));
  const size = shape.reduce((x, y) => x * y, 1);
  if (size > MAX_SIZE) ctx.fail(`\u041C\u0430\u0441\u0441\u0438\u0432 \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_SIZE} \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432.`);
  ctx.tick(Math.ceil(size / 20));
  const stride = (s) => {
    const r = [];
    let k = 1;
    for (let i = s.length - 1; i >= 0; i--) {
      r[i] = s[i] === 1 ? 0 : k;
      k *= s[i];
    }
    return r;
  };
  const ta = stride(sa), tb = stride(sb), ia = [], ib = [];
  for (let flat = 0; flat < size; flat++) {
    let rest = flat, pa = 0, pb = 0;
    for (let d = n - 1; d >= 0; d--) {
      const coord = rest % shape[d];
      rest = Math.floor(rest / shape[d]);
      pa += coord * ta[d];
      pb += coord * tb[d];
    }
    ia.push(pa);
    ib.push(pb);
  }
  return { shape, ia, ib };
}
var floorDiv = (x, y) => Math.floor(x / y);
var pyMod = (x, y) => {
  const r = x % y;
  return r !== 0 && r < 0 !== y < 0 ? r + y : r;
};
function arrayBinary(op, left, right, ctx) {
  const a = toArray(left, ctx), b = toArray(right, ctx), { shape, ia, ib } = broadcast(a, b, ctx);
  const compare2 = { "==": (x, y) => x === y, "!=": (x, y) => x !== y, "<": (x, y) => x < y, "<=": (x, y) => x <= y, ">": (x, y) => x > y, ">=": (x, y) => x >= y };
  if (compare2[op]) return { value: new NdArray(ia.map((p, i) => compare2[op](a.data[p], b.data[ib[i]]) ? 1 : 0), shape, "bool") };
  let type = promote(a.dtype, b.dtype);
  if (type === "bool" && (op === "+" || op === "*")) return { value: new NdArray(ia.map((p, i) => op === "+" ? a.data[p] || b.data[ib[i]] ? 1 : 0 : a.data[p] && b.data[ib[i]] ? 1 : 0), shape, "bool") };
  if (type === "bool") type = "int";
  if (op === "/") type = "float";
  const f = {
    "+": (x, y) => x + y,
    "-": (x, y) => x - y,
    "*": (x, y) => x * y,
    "/": (x, y) => x / y,
    "//": (x, y) => type === "int" ? y === 0 ? 0 : floorDiv(x, y) : floorDiv(x, y),
    "%": (x, y) => type === "int" ? y === 0 ? 0 : pyMod(x, y) : y === 0 ? NaN : pyMod(x, y),
    "**": (x, y) => {
      if (type === "int" && y < 0) ctx.fail("\u0426\u0435\u043B\u044B\u0435 \u0447\u0438\u0441\u043B\u0430 \u043C\u0430\u0441\u0441\u0438\u0432\u0430 \u043D\u0435\u043B\u044C\u0437\u044F \u0432\u043E\u0437\u0432\u043E\u0434\u0438\u0442\u044C \u0432 \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u0443\u044E \u0441\u0442\u0435\u043F\u0435\u043D\u044C. \u0421\u0434\u0435\u043B\u0430\u0439 \u043C\u0430\u0441\u0441\u0438\u0432 \u0434\u0440\u043E\u0431\u043D\u044B\u043C: a.astype(float).");
      return x ** y;
    }
  };
  if (!f[op]) return ctx.fail(`\u041E\u043F\u0435\u0440\u0430\u0446\u0438\u044F ${op} \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0434\u043B\u044F \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u0432.`);
  const data = ia.map((p, i) => f[op](a.data[p], b.data[ib[i]]));
  if (type === "int" && data.some((v) => !Number.isSafeInteger(v))) ctx.fail("\u0426\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0432 \u043C\u0430\u0441\u0441\u0438\u0432\u0435 \u0432\u044B\u0448\u043B\u043E \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u0443\u0447\u0435\u0431\u043D\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430.");
  return { value: new NdArray(data, shape, type) };
}
function unary(a, fn, ctx, type = "float") {
  ctx.tick(Math.ceil(a.count / 20));
  return { value: new NdArray(a.data.map(fn), a.shape, type) };
}
function arrayNegate(a, ctx) {
  if (a.dtype === "bool") ctx.fail("\u041C\u0438\u043D\u0443\u0441 \u043F\u0435\u0440\u0435\u0434 \u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u043C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F.");
  return unary(a, (x) => -x, ctx, a.dtype);
}
function ufunc(name, fn, keepInt = false) {
  return new PyNative(name, (args, kw, ctx) => {
    noKeywords(`numpy.${name}`, kw, ctx);
    if (args.length !== 1) ctx.fail(`numpy.${name}() \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u043E\u0434\u043D\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.`);
    const a = args[0];
    if (!isArrayLike(a.value)) {
      const x = num(a, ctx);
      return keepInt && !a.float ? arg(fn(x)) : floatArg(fn(x));
    }
    const array = toArray(a, ctx);
    return unary(array, fn, ctx, keepInt && array.dtype !== "float" ? array.dtype === "bool" ? "int" : array.dtype : "float");
  });
}
function positions(a, index, ctx) {
  const v = index.value;
  if (v instanceof NdArray && v.dtype === "bool" || Array.isArray(v) && v.length && v.every((x) => typeof x === "boolean")) {
    const mask = toArray(index, ctx);
    if (mask.shape.length !== a.shape.length || mask.shape.some((n, i) => n !== a.shape[i])) ctx.fail("\u041C\u0430\u0441\u043A\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0442\u043E\u0433\u043E \u0436\u0435 \u0440\u0430\u0437\u043C\u0435\u0440\u0430, \u0447\u0442\u043E \u0438 \u043C\u0430\u0441\u0441\u0438\u0432.");
    const flat2 = mask.data.flatMap((m, i) => m ? [i] : []);
    return { flat: flat2, shape: [flat2.length] };
  }
  if (v instanceof NdArray || Array.isArray(v)) {
    const picks = toArray(index, ctx);
    if (picks.dtype === "float") ctx.fail("\u0418\u043D\u0434\u0435\u043A\u0441\u044B \u043C\u0430\u0441\u0441\u0438\u0432\u0430 \u2014 \u0446\u0435\u043B\u044B\u0435 \u0447\u0438\u0441\u043B\u0430.");
    const rows2 = picks.data.map((i) => normalize(i, a.shape[0], ctx)), inner = a.shape.slice(1), size = inner.reduce((x, y) => x * y, 1);
    return { flat: rows2.flatMap((r) => Array.from({ length: size }, (_, k) => r * size + k)), shape: [...picks.shape, ...inner] };
  }
  const parts = v instanceof PyTuple ? ctx.items(v) : [index];
  if (parts.length > a.shape.length) ctx.fail(`\u0423 \u043C\u0430\u0441\u0441\u0438\u0432\u0430 ${a.shape.length} \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0438\u0439, \u0430 \u0438\u043D\u0434\u0435\u043A\u0441\u043E\u0432 ${parts.length}.`);
  const axes = a.shape.map((length, d) => {
    const part = parts[d];
    if (!part) return { kind: "range", indices: Array.from({ length }, (_, i) => i) };
    if (part.value instanceof PySlice) return { kind: "range", indices: part.value.indices(length, ctx) };
    if (typeof part.value === "number" || typeof part.value === "boolean") return { kind: "int", index: normalize(int(part, ctx, "\u0446\u0435\u043B\u044B\u0439 \u0438\u043D\u0434\u0435\u043A\u0441"), length, ctx) };
    return ctx.fail("\u0418\u043D\u0434\u0435\u043A\u0441 \u043C\u0430\u0441\u0441\u0438\u0432\u0430 \u2014 \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E, \u0441\u0440\u0435\u0437 start:stop:step \u0438\u043B\u0438 \u043C\u0430\u0441\u043A\u0430.");
  });
  const strides = a.strides();
  let flat = [0];
  axes.forEach((axis, d) => {
    const picks = axis.kind === "int" ? [axis.index] : axis.indices;
    flat = flat.flatMap((base2) => picks.map((i) => base2 + i * strides[d]));
  });
  return { flat, shape: axes.flatMap((axis) => axis.kind === "range" ? [axis.indices.length] : []) };
}
function normalize(i, length, ctx) {
  if (i < -length || i >= length) ctx.fail(`\u0418\u043D\u0434\u0435\u043A\u0441 ${i} \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u0433\u0440\u0430\u043D\u0438\u0446\u044B \u043C\u0430\u0441\u0441\u0438\u0432\u0430 \u0434\u043B\u0438\u043D\u044B ${length}.`);
  return i < 0 ? i + length : i;
}
function arrayGet(a, index, ctx) {
  const { flat, shape } = positions(a, index, ctx);
  ctx.tick(Math.ceil(flat.length / 20));
  if (!shape.length) return a.element(flat[0]);
  return { value: new NdArray(flat.map((i) => a.data[i]), shape, a.dtype) };
}
function arraySet(a, index, value, ctx) {
  const { flat } = positions(a, index, ctx);
  const source = isArrayLike(value.value) ? toArray(value, ctx).data : [num(value, ctx)];
  if (source.length !== 1 && source.length !== flat.length) ctx.fail(`\u041D\u0435\u043B\u044C\u0437\u044F \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C ${source.length} \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439 \u0432 ${flat.length} \u043C\u0435\u0441\u0442 \u043C\u0430\u0441\u0441\u0438\u0432\u0430.`);
  const converted = cast(source, a.dtype);
  flat.forEach((p, i) => {
    a.data[p] = converted[source.length === 1 ? 0 : i];
  });
  ctx.tick(Math.ceil(flat.length / 20));
}
function reduce(a, axisArg, ctx, fn, type) {
  if (!a.count && ["min", "max"].includes(fn.name)) ctx.fail("\u041C\u0438\u043D\u0438\u043C\u0443\u043C \u0438 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u043F\u0443\u0441\u0442\u043E\u0433\u043E \u043C\u0430\u0441\u0441\u0438\u0432\u0430 \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u044B.");
  ctx.tick(Math.ceil(a.count / 20));
  if (!axisArg || axisArg.value === null) {
    const r = fn(a.data);
    return type === "float" ? floatArg(r) : type === "bool" ? arg(r !== 0) : arg(r);
  }
  let axis = int(axisArg, ctx, "\u043D\u043E\u043C\u0435\u0440 \u043E\u0441\u0438");
  if (axis < 0) axis += a.shape.length;
  if (axis < 0 || axis >= a.shape.length) ctx.fail(`\u0423 \u043C\u0430\u0441\u0441\u0438\u0432\u0430 \u043D\u0435\u0442 \u043E\u0441\u0438 ${axis}.`);
  const strides = a.strides(), outShape = a.shape.filter((_, d) => d !== axis), out = [];
  const outSize = outShape.reduce((x, y) => x * y, 1);
  for (let k = 0; k < outSize; k++) {
    let rest = k, base2 = 0;
    for (let d = a.shape.length - 1; d >= 0; d--) {
      if (d === axis) continue;
      const n = a.shape[d], coord = rest % n;
      rest = Math.floor(rest / n);
      base2 += coord * strides[d];
    }
    out.push(fn(Array.from({ length: a.shape[axis] }, (_, i) => a.data[base2 + i * strides[axis]])));
  }
  return { value: new NdArray(out, outShape, type) };
}
var sum = (v) => v.reduce((x, y) => x + y, 0);
var mean = (v) => v.length ? sum(v) / v.length : NaN;
var reducers = {
  sum: { fn: sum, type: (d) => d === "float" ? "float" : "int" },
  prod: { fn: (v) => v.reduce((x, y) => x * y, 1), type: (d) => d === "float" ? "float" : "int" },
  mean: { fn: mean, type: () => "float" },
  min: { fn: function min(v) {
    return Math.min(...v);
  }, type: (d) => d },
  max: { fn: function max(v) {
    return Math.max(...v);
  }, type: (d) => d },
  std: { fn: (v) => {
    const m = mean(v);
    return Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
  }, type: () => "float" },
  median: { fn: (v) => {
    const s = [...v].sort((x, y) => x - y), n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }, type: () => "float" },
  argmin: { fn: (v) => v.indexOf(Math.min(...v)), type: () => "int" },
  argmax: { fn: (v) => v.indexOf(Math.max(...v)), type: () => "int" },
  any: { fn: (v) => v.some((x) => x !== 0) ? 1 : 0, type: () => "bool" },
  all: { fn: (v) => v.every((x) => x !== 0) ? 1 : 0, type: () => "bool" }
};
var dimsOf = (a, ctx) => a.value instanceof PyTuple || Array.isArray(a.value) ? ctx.items(a.value).map((x) => int(x, ctx, "\u0440\u0430\u0437\u043C\u0435\u0440")) : [int(a, ctx, "\u0440\u0430\u0437\u043C\u0435\u0440")];
function reshape(a, dims, ctx) {
  const unknown = dims.indexOf(-1), known = dims.filter((n) => n !== -1).reduce((x, y) => x * y, 1);
  if (unknown >= 0) dims = dims.map((n) => n === -1 ? known ? a.count / known : 0 : n);
  if (dims.some((n) => !Number.isInteger(n) || n < 0) || dims.reduce((x, y) => x * y, 1) !== a.count) ctx.fail(`\u041D\u0435\u043B\u044C\u0437\u044F \u0440\u0430\u0437\u043B\u043E\u0436\u0438\u0442\u044C ${a.count} \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 \u0432 \u0444\u043E\u0440\u043C\u0443 (${dims.join(", ")}).`);
  return new NdArray([...a.data], dims, a.dtype);
}
function transpose(a, ctx) {
  if (a.shape.length < 2) return a;
  if (a.shape.length > 2) ctx.fail("\u0422\u0440\u0430\u043D\u0441\u043F\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0432 Kodik \u2014 \u0434\u043B\u044F \u0434\u0432\u0443\u043C\u0435\u0440\u043D\u044B\u0445 \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u0432.");
  const [r, c] = a.shape, data = [];
  for (let j = 0; j < c; j++) for (let i = 0; i < r; i++) data.push(a.data[i * c + j]);
  return new NdArray(data, [c, r], a.dtype);
}
function toList(a, ctx) {
  return ctx.list(a.iterate(ctx).map((item) => item.value instanceof NdArray ? { value: toList(item.value, ctx) } : item));
}
var reducerMethod = (name) => (a, args, kw, ctx) => {
  const { axis } = bind(`${name}`, args, kw, ["axis"], 0, ctx);
  const r = reducers[name];
  return reduce(a, axis, ctx, r.fn, r.type(a.dtype));
};
var arrayMethods = {
  ...Object.fromEntries(Object.keys(reducers).filter((name) => name !== "median").map((name) => [name, reducerMethod(name)])),
  reshape: (a, args, kw, ctx) => {
    noKeywords("reshape", kw, ctx);
    return { value: reshape(a, args.length === 1 ? dimsOf(args[0], ctx) : args.map((x) => int(x, ctx)), ctx) };
  },
  tolist: (a, args, kw, ctx) => {
    noKeywords("tolist", kw, ctx);
    return a.shape.length ? { value: toList(a, ctx) } : a.element(0);
  },
  copy: (a) => ({ value: new NdArray([...a.data], [...a.shape], a.dtype) }),
  flatten: (a) => ({ value: new NdArray([...a.data], [a.count], a.dtype) }),
  astype: (a, args, kw, ctx) => {
    const { dtype } = bind("astype", args, kw, ["dtype"], 1, ctx);
    const t = parseDType(dtype, ctx);
    return { value: new NdArray(cast(a.data, t), [...a.shape], t) };
  },
  round: (a, args, kw, ctx) => {
    const { decimals } = bind("round", args, kw, ["decimals"], 0, ctx);
    return roundArray(a, decimals ? int(decimals, ctx) : 0, ctx);
  },
  sort: (a, args, kw, ctx) => {
    noKeywords("sort", kw, ctx);
    if (a.shape.length !== 1) ctx.fail("sort() \u0432 Kodik \u0441\u043E\u0440\u0442\u0438\u0440\u0443\u0435\u0442 \u043E\u0434\u043D\u043E\u043C\u0435\u0440\u043D\u044B\u0439 \u043C\u0430\u0441\u0441\u0438\u0432.");
    a.data.sort((x, y) => x - y);
    ctx.tick(Math.ceil(a.count / 10));
  },
  cumsum: (a, args, kw, ctx) => {
    noKeywords("cumsum", kw, ctx);
    let s = 0;
    return { value: new NdArray(a.data.map((v) => s += v), [a.count], a.dtype === "float" ? "float" : "int") };
  },
  fill: (a, args, kw, ctx) => {
    noKeywords("fill", kw, ctx);
    const v = cast([num(args[0], ctx)], a.dtype)[0];
    a.data.fill(v);
  }
};
function roundArray(a, decimals, ctx) {
  if (a.dtype !== "float") return { value: decimals >= 0 ? a : new NdArray(a.data.map((v) => roundHalfEven(v / 10 ** -decimals) * 10 ** -decimals), a.shape, a.dtype) };
  return unary(a, (x) => decimals === 0 ? roundHalfEven(x) : pyRound(x, decimals), ctx, "float");
}
function positional(x, precision) {
  if (Object.is(x, -0)) return "-0.";
  const [whole, frac = ""] = String(x).split(".");
  if (frac.length <= precision) return `${whole}.${frac}`;
  const [w, f = ""] = x.toFixed(precision).replace(/0+$/, "").split(".");
  return `${w}.${f}`;
}
function scientific(x, precision) {
  let s = x.toExponential();
  let [m, e] = s.split("e");
  if ((m.split(".")[1] ?? "").length > precision) {
    s = x.toExponential(precision);
    [m, e] = s.split("e");
    m = m.replace(/0+$/, "");
  }
  if (!m.includes(".")) m += ".";
  return { mantissa: m, exp: e };
}
function floatFormatter(values) {
  const finite2 = values.filter(Number.isFinite), nonzero = finite2.filter((v) => v !== 0).map(Math.abs);
  let exp = false;
  if (nonzero.length) {
    const max2 = Math.max(...nonzero), min2 = Math.min(...nonzero);
    exp = max2 >= 1e8 || min2 < 1e-4 || max2 / min2 > 1e3;
  }
  let padLeft = 0, padRight = 0, precision = 8, expSize = -1;
  if (finite2.length && exp) {
    const parts = finite2.map((v) => scientific(v, 8));
    precision = Math.max(...parts.map((p) => p.mantissa.split(".")[1].length));
    expSize = Math.max(...parts.map((p) => p.exp.replace(/^[+-]/, "").length), 2);
    padLeft = Math.max(...parts.map((p) => p.mantissa.split(".")[0].length));
    padRight = expSize + 2 + precision;
  } else if (finite2.length) {
    const parts = finite2.map((v) => positional(v, 8).split("."));
    padLeft = Math.max(...parts.map((p) => p[0].length));
    padRight = Math.max(...parts.map((p) => p[1].length));
  }
  if (finite2.length !== values.length) {
    const neg = values.some((v) => v === -Infinity) ? 1 : 0;
    padLeft = Math.max(padLeft, 3 - (padRight + 1), 3 + neg - (padRight + 1));
  }
  return (x) => {
    if (!Number.isFinite(x)) {
      const s = Number.isNaN(x) ? "nan" : x > 0 ? "inf" : "-inf";
      return " ".repeat(Math.max(0, padLeft + padRight + 1 - s.length)) + s;
    }
    if (exp) {
      const { mantissa, exp: e } = scientific(x, precision), [whole2, frac2] = mantissa.split("."), sign = e.startsWith("-") ? "-" : "+";
      return whole2.padStart(padLeft) + "." + frac2.padEnd(precision, "0") + "e" + sign + e.replace(/^[+-]/, "").padStart(expSize, "0");
    }
    const [whole, frac] = positional(x, 8).split(".");
    return whole.padStart(padLeft) + "." + frac.padEnd(padRight);
  };
}
function formatArray(a, separator, prefix, ctx) {
  ctx.tick(Math.ceil(a.count / 10));
  if (!a.shape.length) return a.count ? elementFormatter(a)(a.data[0]) : "[]";
  if (!a.count) return "[]";
  const format = elementFormatter(a), lineWidth = prefix ? 74 : 75, nextPrefix = " " + " ".repeat(prefix.length);
  const recurse = (offset, axis, hanging, width) => {
    const length = a.shape[axis], inner = a.shape.slice(axis + 1).reduce((x, y) => x * y, 1), nextHanging = hanging + " ", nextWidth = width - 1;
    let s = "";
    if (axis === a.shape.length - 1) {
      const elemWidth = width - Math.max(separator.trimEnd().length, 1);
      let line = hanging;
      const extend = (word) => {
        if (line.length + word.length > elemWidth && line.length > hanging.length) {
          s += line.trimEnd() + "\n";
          line = hanging;
        }
        line += word;
      };
      for (let i = 0; i < length; i++) {
        extend(format(a.data[offset + i]));
        if (i < length - 1) line += separator;
      }
      s += line;
    } else {
      const lineSep = separator.trimEnd() + "\n".repeat(a.shape.length - axis - 1);
      for (let i = 0; i < length; i++) s += hanging + recurse(offset + i * inner, axis + 1, nextHanging, nextWidth) + (i < length - 1 ? lineSep : "");
    }
    return "[" + s.slice(hanging.length) + "]";
  };
  return recurse(0, 0, nextPrefix, lineWidth);
}
function elementFormatter(a) {
  if (a.dtype === "bool") return (x) => x ? " True" : "False";
  if (a.dtype === "int") {
    const width = Math.max(...a.data.map((v) => String(v).length));
    return (x) => String(x).padStart(width);
  }
  return floatFormatter(a.data);
}
function numpyModule() {
  const attrs = /* @__PURE__ */ new Map();
  const def = (name, fn) => attrs.set(name, { value: new PyNative(name, fn) });
  def("array", (args, kw, ctx) => {
    const { object, dtype } = bind("numpy.array", args, kw, ["object", "dtype"], 1, ctx);
    return { value: toArray(object, ctx, parseDType(dtype, ctx)) };
  });
  def("asarray", (args, kw, ctx) => {
    const { a, dtype } = bind("numpy.asarray", args, kw, ["a", "dtype"], 1, ctx);
    return { value: toArray(a, ctx, parseDType(dtype, ctx)) };
  });
  const filled = (name, value) => def(name, (args, kw, ctx) => {
    const names = value === null ? ["shape", "fill_value", "dtype"] : ["shape", "dtype"], p = bind(`numpy.${name}`, args, kw, names, value === null ? 2 : 1, ctx);
    const dims = shapeOf(p.shape, ctx), fill = value === null ? p.fill_value : floatArg(value), type = parseDType(p.dtype, ctx) ?? (value === null ? scalarDType(fill) : "float");
    return { value: new NdArray(cast(Array(dims.reduce((x, y) => x * y, 1)).fill(num(fill, ctx)), type), dims, type) };
  });
  filled("zeros", 0);
  filled("ones", 1);
  filled("full", null);
  def("arange", (args, kw, ctx) => {
    const p = bind("numpy.arange", args, kw, ["start", "stop", "step", "dtype"], 1, ctx);
    const hasStop = p.stop && p.stop.value !== null, start = hasStop ? num(p.start, ctx) : 0, stop = hasStop ? num(p.stop, ctx) : num(p.start, ctx), step = p.step ? num(p.step, ctx) : 1;
    if (step === 0) ctx.fail("numpy.arange: \u0448\u0430\u0433 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0443\u043B\u0451\u043C.");
    const length = Math.max(0, Math.ceil((stop - start) / step));
    if (length > MAX_SIZE) ctx.fail(`\u041C\u0430\u0441\u0441\u0438\u0432 \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_SIZE} \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432.`);
    const type = parseDType(p.dtype, ctx) ?? ([p.start, p.stop, p.step].some((x) => x?.float) ? "float" : "int");
    ctx.tick(Math.ceil(length / 20));
    return { value: new NdArray(cast(Array.from({ length }, (_, i) => start + i * step), type), [length], type) };
  });
  def("linspace", (args, kw, ctx) => {
    const p = bind("numpy.linspace", args, kw, ["start", "stop", "num", "endpoint"], 2, ctx);
    const start = num(p.start, ctx), stop = num(p.stop, ctx), count = p.num ? int(p.num, ctx, "\u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0442\u043E\u0447\u0435\u043A") : 50, endpoint = p.endpoint ? ctx.truth(p.endpoint.value) : true;
    if (count < 0) ctx.fail("numpy.linspace: \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0442\u043E\u0447\u0435\u043A \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C.");
    if (count > MAX_SIZE) ctx.fail(`\u041C\u0430\u0441\u0441\u0438\u0432 \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_SIZE} \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432.`);
    const div = endpoint ? count - 1 : count, step = div > 0 ? (stop - start) / div : 0;
    const data = Array.from({ length: count }, (_, i) => i * step + start);
    if (endpoint && count > 1) data[count - 1] = stop;
    ctx.tick(Math.ceil(count / 20));
    return { value: new NdArray(data, [count], "float") };
  });
  def("reshape", (args, kw, ctx) => {
    const { a, newshape } = bind("numpy.reshape", args, kw, ["a", "newshape"], 2, ctx);
    return { value: reshape(toArray(a, ctx), dimsOf(newshape, ctx), ctx) };
  });
  def("transpose", (args, kw, ctx) => {
    noKeywords("numpy.transpose", kw, ctx);
    return { value: transpose(toArray(args[0], ctx), ctx) };
  });
  def("copy", (args, kw, ctx) => {
    noKeywords("numpy.copy", kw, ctx);
    const a = toArray(args[0], ctx);
    return { value: new NdArray([...a.data], [...a.shape], a.dtype) };
  });
  def("concatenate", (args, kw, ctx) => {
    noKeywords("numpy.concatenate", kw, ctx);
    const parts = ctx.items(args[0]?.value ?? null, "numpy.concatenate").map((p) => toArray(p, ctx));
    if (parts.some((p) => p.shape.length !== 1)) ctx.fail("numpy.concatenate \u0432 Kodik \u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0435\u0442 \u043E\u0434\u043D\u043E\u043C\u0435\u0440\u043D\u044B\u0435 \u043C\u0430\u0441\u0441\u0438\u0432\u044B.");
    const type = parts.reduce((t, p) => promote(t, p.dtype), "bool"), data = cast(parts.flatMap((p) => p.data), type);
    if (data.length > MAX_SIZE) ctx.fail(`\u041C\u0430\u0441\u0441\u0438\u0432 \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_SIZE} \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432.`);
    return { value: new NdArray(data, [data.length], type) };
  });
  for (const name of Object.keys(reducers)) def(name, (args, kw, ctx) => {
    const { a, axis } = bind(`numpy.${name}`, args, kw, ["a", "axis"], 1, ctx);
    const array = toArray(a, ctx), r = reducers[name];
    return reduce(array, axis, ctx, r.fn, r.type(array.dtype));
  });
  attrs.set("amin", attrs.get("min"));
  attrs.set("amax", attrs.get("max"));
  def("cumsum", (args, kw, ctx) => arrayMethods.cumsum(toArray(args[0], ctx), [], kw, ctx));
  def("sort", (args, kw, ctx) => {
    noKeywords("numpy.sort", kw, ctx);
    const a = toArray(args[0], ctx), copy = new NdArray([...a.data], [...a.shape], a.dtype);
    arrayMethods.sort(copy, [], kw, ctx);
    return { value: copy };
  });
  def("round", (args, kw, ctx) => {
    const { a, decimals } = bind("numpy.round", args, kw, ["a", "decimals"], 1, ctx);
    if (!isArrayLike(a.value)) {
      const x = num(a, ctx), d = decimals ? int(decimals, ctx) : 0;
      return a.float ? floatArg(d ? pyRound(x, d) : roundHalfEven(x)) : arg(x);
    }
    return roundArray(toArray(a, ctx), decimals ? int(decimals, ctx) : 0, ctx);
  });
  attrs.set("around", attrs.get("round"));
  const ufuncs = [
    ["sqrt", Math.sqrt],
    ["sin", Math.sin],
    ["cos", Math.cos],
    ["tan", Math.tan],
    ["arcsin", Math.asin],
    ["arccos", Math.acos],
    ["arctan", Math.atan],
    ["exp", Math.exp],
    ["log", Math.log],
    ["log2", Math.log2],
    ["log10", Math.log10],
    ["abs", Math.abs, true],
    ["absolute", Math.abs, true],
    ["floor", Math.floor, true],
    ["ceil", Math.ceil, true],
    ["trunc", Math.trunc, true],
    ["sign", Math.sign, true],
    ["square", (x) => x * x, true],
    ["degrees", (x) => x * (180 / Math.PI)],
    ["radians", (x) => x * (Math.PI / 180)],
    ["rad2deg", (x) => x * (180 / Math.PI)],
    ["deg2rad", (x) => x * (Math.PI / 180)]
  ];
  for (const [name, fn, keep] of ufuncs) attrs.set(name, { value: ufunc(name, fn, keep) });
  const binaryFn = (name, op) => def(name, (args, kw, ctx) => {
    noKeywords(`numpy.${name}`, kw, ctx);
    if (args.length !== 2) ctx.fail(`numpy.${name}() \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0434\u0432\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F.`);
    return arrayBinary(op, args[0], args[1], ctx);
  });
  binaryFn("add", "+");
  binaryFn("subtract", "-");
  binaryFn("multiply", "*");
  binaryFn("divide", "/");
  binaryFn("power", "**");
  binaryFn("mod", "%");
  attrs.set("pow", attrs.get("power"));
  def("dot", (args, kw, ctx) => {
    noKeywords("numpy.dot", kw, ctx);
    const a = toArray(args[0], ctx), b = toArray(args[1], ctx);
    if (a.shape.length !== 1 || b.shape.length !== 1 || a.count !== b.count) ctx.fail("numpy.dot \u0432 Kodik \u2014 \u0441\u043A\u0430\u043B\u044F\u0440\u043D\u043E\u0435 \u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u0434\u0432\u0443\u0445 \u043E\u0434\u043D\u043E\u043C\u0435\u0440\u043D\u044B\u0445 \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u0432 \u043E\u0434\u043D\u043E\u0439 \u0434\u043B\u0438\u043D\u044B.");
    const r = a.data.reduce((s, v, i) => s + v * b.data[i], 0);
    return promote(a.dtype, b.dtype) === "float" ? floatArg(r) : arg(r);
  });
  attrs.set("pi", floatArg(Math.PI));
  attrs.set("e", floatArg(Math.E));
  attrs.set("inf", floatArg(Infinity));
  attrs.set("nan", floatArg(NaN));
  attrs.set("int64", { value: new PyScalarType("int") });
  attrs.set("float64", { value: new PyScalarType("float") });
  attrs.set("bool_", { value: new PyScalarType("bool") });
  attrs.set("ndarray", { value: new PyNative("ndarray", (args, kw, ctx) => ctx.fail("\u0421\u043E\u0437\u0434\u0430\u0432\u0430\u0439 \u043C\u0430\u0441\u0441\u0438\u0432\u044B \u0447\u0435\u0440\u0435\u0437 numpy.array(...), numpy.zeros(...) \u0438\u043B\u0438 numpy.arange(...).")) });
  attrs.set("random", { value: new PyModule("numpy.random", new Map(["rand", "randint", "random", "seed", "choice", "normal"].map((name) => [name, { value: new PyNative(name, (args, kw, ctx) => ctx.fail("numpy.random \u0432 Kodik \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F. \u0414\u043B\u044F \u0441\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u0445 \u0447\u0438\u0441\u0435\u043B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043C\u043E\u0434\u0443\u043B\u044C random.")) }]))) });
  const exports = [...attrs.keys()].filter((name) => !["random", "ndarray"].includes(name));
  return new PyModule("numpy", attrs, exports);
}

// src/python/libBasic.ts
var native = (name, fn, effect = false) => new PyNative(name, fn, effect);
var finite = (value, ctx, fn) => Number.isFinite(value) ? value : ctx.fail(`${fn}: \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 (math range error).`);
var safeInt = (value, ctx) => Number.isSafeInteger(value) ? value : ctx.fail("\u0426\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u0443\u0447\u0435\u0431\u043D\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430.");
var one = (fn, args, kw, ctx) => {
  noKeywords(fn, kw, ctx);
  if (args.length !== 1) ctx.fail(`${fn}() \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u043E\u0434\u043D\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.`);
  return args[0];
};
function parseFloat(source, ctx) {
  const s = source.trim().toLowerCase();
  if (/^[+-]?(inf|infinity)$/.test(s)) return s.startsWith("-") ? -Infinity : Infinity;
  if (/^[+-]?nan$/.test(s)) return NaN;
  if (!/^[+-]?(?:\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:e[+-]?\d(?:_?\d)*)?$/.test(s)) ctx.fail(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \xAB${source}\xBB \u0432 \u0447\u0438\u0441\u043B\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C float(...).`);
  return Number(s.replace(/_/g, ""));
}
function extremum(name, args, kw, ctx) {
  for (const key2 of kw.keys()) if (key2 !== "default") ctx.fail(`\u0423 ${name}() \u0432 Kodik \u0435\u0441\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442 default.`);
  const items = args.length === 1 ? ctx.items(args[0].value, `${name}() \u043E\u0442 \u043E\u0434\u043D\u043E\u0433\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F`) : args;
  if (args.length === 0) ctx.fail(`${name}() \u043D\u0443\u0436\u043D\u044B \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F.`);
  if (!items.length) return kw.get("default") ?? ctx.fail(`${name}() \u043F\u043E\u043B\u0443\u0447\u0438\u043B \u043F\u0443\u0441\u0442\u0443\u044E \u043F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C.`);
  if (args.length > 1 && kw.has("default")) ctx.fail(`default \u0432 ${name}() \u043F\u0438\u0448\u0443\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0441 \u043E\u0434\u043D\u043E\u0439 \u043F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C\u044E.`);
  let best = items[0];
  for (const item of items.slice(1)) {
    ctx.tick();
    if (ctx.compare(item.value, best.value, name === "min" ? "<" : ">")) best = item;
  }
  return best;
}
function builtinNatives() {
  const items = [
    ["float", (args, kw, ctx) => {
      noKeywords("float", kw, ctx);
      if (!args.length) return floatArg(0);
      if (args.length > 1) ctx.fail("float() \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u043E\u0434\u043D\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.");
      const v = args[0].value;
      if (typeof v === "string") return floatArg(parseFloat(v, ctx));
      if (typeof v === "number" || typeof v === "boolean") return floatArg(Number(v));
      return ctx.fail(`\u0412 float \u043F\u0435\u0440\u0435\u0434\u0430\u0439 \u0447\u0438\u0441\u043B\u043E \u0438\u043B\u0438 \u0441\u0442\u0440\u043E\u043A\u0443 \u0441 \u0447\u0438\u0441\u043B\u043E\u043C, \u0430 \u043D\u0435 ${typeLabel(v)}.`);
    }],
    ["abs", (args, kw, ctx) => {
      const a = one("abs", args, kw, ctx);
      if (a.value instanceof Object && "abs" in a.value) return a.value.abs(ctx);
      return arg(Math.abs(num(a, ctx)), a.float);
    }],
    ["round", (args, kw, ctx) => {
      const { number: number3, ndigits } = bind("round", args, kw, ["number", "ndigits"], 1, ctx);
      const x = num(number3, ctx), digits = ndigits && ndigits.value !== null ? int(ndigits, ctx, "\u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0437\u043D\u0430\u043A\u043E\u0432") : void 0;
      if (number3.float) {
        if (!Number.isFinite(x)) ctx.fail("round(): \u043D\u0435\u043B\u044C\u0437\u044F \u043E\u043A\u0440\u0443\u0433\u043B\u0438\u0442\u044C \u0431\u0435\u0441\u043A\u043E\u043D\u0435\u0447\u043D\u043E\u0441\u0442\u044C \u0438\u043B\u0438 nan.");
        return digits === void 0 ? arg(safeInt(roundHalfEven(x), ctx)) : floatArg(pyRound(x, digits));
      }
      if (digits === void 0 || digits >= 0) return arg(x);
      return arg(roundHalfEven(x / 10 ** -digits) * 10 ** -digits);
    }],
    ["pow", (args, kw, ctx) => {
      const { base: base2, exp, mod } = bind("pow", args, kw, ["base", "exp", "mod"], 2, ctx);
      const a = num(base2, ctx), b = num(exp, ctx);
      if (mod && mod.value !== null) {
        const m = int(mod, ctx);
        int(base2, ctx);
        if (b < 0 || !Number.isInteger(b) || exp.float) ctx.fail("pow \u0441 \u0442\u0440\u0435\u043C\u044F \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0441 \u043D\u0435\u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0439 \u0446\u0435\u043B\u043E\u0439 \u0441\u0442\u0435\u043F\u0435\u043D\u044C\u044E.");
        if (m === 0) ctx.fail("pow(): \u0442\u0440\u0435\u0442\u0438\u0439 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0443\u043B\u0451\u043C.");
        let result = 1n, square = (BigInt(a) % BigInt(m) + BigInt(m)) % BigInt(m), power = BigInt(b);
        while (power > 0n) {
          if (power & 1n) result = result * square % BigInt(m);
          square = square * square % BigInt(m);
          power >>= 1n;
          ctx.tick();
        }
        const r = Number(result);
        return arg(m < 0 && r > 0 ? r + m : r);
      }
      if (a === 0 && b < 0) ctx.fail("\u041D\u043E\u043B\u044C \u043D\u0435\u043B\u044C\u0437\u044F \u0432\u043E\u0437\u0432\u043E\u0434\u0438\u0442\u044C \u0432 \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u0443\u044E \u0441\u0442\u0435\u043F\u0435\u043D\u044C.");
      const value = a ** b, isFloat = !!base2.float || !!exp.float || b < 0;
      if (!Number.isFinite(value) || Math.abs(value) > 1e12 && !isFloat) ctx.fail("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435.");
      return arg(value, isFloat);
    }],
    ["min", (args, kw, ctx) => extremum("min", args, kw, ctx)],
    ["max", (args, kw, ctx) => extremum("max", args, kw, ctx)],
    ["sum", (args, kw, ctx) => {
      const { iterable, start } = bind("sum", args, kw, ["iterable", "start"], 1, ctx);
      if (typeof start?.value === "string") ctx.fail("\u0421\u0442\u0440\u043E\u043A\u0438 \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0439 \u0447\u0435\u0440\u0435\u0437 +, \u0430 \u043D\u0435 \u0447\u0435\u0440\u0435\u0437 sum().");
      let total = start ? num(start, ctx) : 0, floating = !!start?.float;
      for (const item of ctx.items(iterable.value, "sum() \u043E\u0442 \u043E\u0434\u043D\u043E\u0433\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F")) {
        ctx.tick();
        if (typeof item.value === "string") ctx.fail("sum() \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0435\u0442 \u0447\u0438\u0441\u043B\u0430, \u0430 \u0432 \u043F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u0438 \u0435\u0441\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u0430.");
        total += num(item, ctx);
        floating ||= !!item.float;
      }
      if (!Number.isFinite(total) && !floating) ctx.fail("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435.");
      return arg(total, floating);
    }]
  ];
  return new Map(items.map(([name, fn]) => [name, native(name, fn)]));
}
function mathModule() {
  const attrs = /* @__PURE__ */ new Map();
  const real = (name, fn) => attrs.set(name, { value: native(name, (args, kw, ctx) => floatArg(finite(fn(num(one(`math.${name}`, args, kw, ctx), ctx), ctx), ctx, `math.${name}`))) });
  const domain = (fn) => {
    throw new Error(`math.${fn}: \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432\u043D\u0435 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0439 \u043E\u0431\u043B\u0430\u0441\u0442\u0438 (math domain error).`);
  };
  real("sqrt", (x) => x < 0 ? domain("sqrt") : Math.sqrt(x));
  real("fabs", Math.abs);
  real("exp", Math.exp);
  real("sin", Math.sin);
  real("cos", Math.cos);
  real("tan", Math.tan);
  real("asin", (x) => Math.abs(x) > 1 ? domain("asin") : Math.asin(x));
  real("acos", (x) => Math.abs(x) > 1 ? domain("acos") : Math.acos(x));
  real("atan", Math.atan);
  real("degrees", (x) => x * (180 / Math.PI));
  real("radians", (x) => x * (Math.PI / 180));
  real("log2", (x) => x <= 0 ? domain("log2") : Math.log2(x));
  real("log10", (x) => x <= 0 ? domain("log10") : Math.log10(x));
  const integral = (name, fn) => attrs.set(name, { value: native(name, (args, kw, ctx) => {
    const a = one(`math.${name}`, args, kw, ctx), x = num(a, ctx);
    if (!a.float) return arg(x);
    if (!Number.isFinite(x)) ctx.fail(`math.${name}: \u043D\u0435\u043B\u044C\u0437\u044F \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0431\u0435\u0441\u043A\u043E\u043D\u0435\u0447\u043D\u043E\u0441\u0442\u044C \u0438\u043B\u0438 nan \u0432 \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E.`);
    return arg(safeInt(fn(x), ctx));
  }) });
  integral("ceil", Math.ceil);
  integral("floor", Math.floor);
  integral("trunc", Math.trunc);
  attrs.set("pow", { value: native("pow", (args, kw, ctx) => {
    noKeywords("math.pow", kw, ctx);
    if (args.length !== 2) ctx.fail("math.pow() \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430.");
    const a = num(args[0], ctx), b = num(args[1], ctx);
    if (a === 0 && b < 0) domain("pow");
    if (a < 0 && !Number.isInteger(b)) domain("pow");
    return floatArg(finite(a ** b, ctx, "math.pow"));
  }) });
  attrs.set("atan2", { value: native("atan2", (args, kw, ctx) => {
    noKeywords("math.atan2", kw, ctx);
    if (args.length !== 2) ctx.fail("math.atan2(y, x) \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430.");
    return floatArg(Math.atan2(num(args[0], ctx), num(args[1], ctx)));
  }) });
  attrs.set("hypot", { value: native("hypot", (args, kw, ctx) => {
    noKeywords("math.hypot", kw, ctx);
    return floatArg(Math.hypot(...args.map((a) => num(a, ctx))));
  }) });
  attrs.set("log", { value: native("log", (args, kw, ctx) => {
    noKeywords("math.log", kw, ctx);
    if (args.length < 1 || args.length > 2) ctx.fail("math.log(x) \u0438\u043B\u0438 math.log(x, \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435).");
    const x = num(args[0], ctx);
    if (x <= 0) domain("log");
    if (args.length === 1) return floatArg(Math.log(x));
    const base2 = num(args[1], ctx);
    if (base2 <= 0 || base2 === 1) domain("log");
    return floatArg(Math.log(x) / Math.log(base2));
  }) });
  attrs.set("isqrt", { value: native("isqrt", (args, kw, ctx) => {
    const n = int(one("math.isqrt", args, kw, ctx), ctx);
    if (n < 0) domain("isqrt");
    let r = Math.floor(Math.sqrt(n));
    while (r * r > n) r--;
    while ((r + 1) * (r + 1) <= n) r++;
    return arg(r);
  }) });
  attrs.set("factorial", { value: native("factorial", (args, kw, ctx) => {
    const n = int(one("math.factorial", args, kw, ctx), ctx);
    if (n < 0) ctx.fail("math.factorial: \u043D\u0443\u0436\u043D\u043E \u043D\u0435\u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E.");
    let r = 1;
    for (let i = 2; i <= n; i++) {
      r *= i;
      ctx.tick();
      if (r > Number.MAX_SAFE_INTEGER) ctx.fail("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435.");
    }
    return arg(r);
  }) });
  attrs.set("gcd", { value: native("gcd", (args, kw, ctx) => {
    noKeywords("math.gcd", kw, ctx);
    let g = 0;
    for (const a of args) {
      let b = Math.abs(int(a, ctx));
      while (b) {
        [g, b] = [b, g % b];
        ctx.tick();
      }
    }
    return arg(g);
  }) });
  attrs.set("isclose", { value: native("isclose", (args, kw, ctx) => {
    const { a, b, rel_tol, abs_tol } = bind("math.isclose", args, kw, ["a", "b", "rel_tol", "abs_tol"], 2, ctx);
    const x = num(a, ctx), y = num(b, ctx), rel = rel_tol ? num(rel_tol, ctx) : 1e-9, abs = abs_tol ? num(abs_tol, ctx) : 0;
    if (x === y) return arg(true);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return arg(false);
    const diff = Math.abs(y - x);
    return arg(diff <= Math.abs(rel * y) || diff <= Math.abs(rel * x) || diff <= abs);
  }) });
  attrs.set("pi", floatArg(Math.PI));
  attrs.set("e", floatArg(Math.E));
  attrs.set("tau", floatArg(2 * Math.PI));
  attrs.set("inf", floatArg(Infinity));
  attrs.set("nan", floatArg(NaN));
  return new PyModule("math", wrapDomain(attrs));
}
function wrapDomain(attrs) {
  for (const [key2, value] of attrs) if (value.value instanceof PyNative) {
    const inner = value.value;
    attrs.set(key2, { value: native(inner.name, (args, kw, ctx) => {
      try {
        return inner.fn(args, kw, ctx);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("math.")) ctx.fail(e.message);
        throw e;
      }
    }) });
  }
  return attrs;
}
var Twister = class {
  mt = new Uint32Array(624);
  index = 625;
  seedInt(n) {
    n = Math.abs(n);
    const key2 = n === 0 ? [0] : [n % 2 ** 32, Math.floor(n / 2 ** 32)].filter((word, i) => i === 0 || word > 0);
    this.seedArray(key2);
  }
  seedArray(key2) {
    const mt = this.mt;
    mt[0] = 19650218;
    for (let i2 = 1; i2 < 624; i2++) mt[i2] = Math.imul(1812433253, mt[i2 - 1] ^ mt[i2 - 1] >>> 30) + i2 >>> 0;
    let i = 1, j = 0;
    for (let k = Math.max(624, key2.length); k; k--) {
      mt[i] = (mt[i] ^ Math.imul(mt[i - 1] ^ mt[i - 1] >>> 30, 1664525)) + key2[j] + j >>> 0;
      i++;
      j++;
      if (i >= 624) {
        mt[0] = mt[623];
        i = 1;
      }
      if (j >= key2.length) j = 0;
    }
    for (let k = 623; k; k--) {
      mt[i] = (mt[i] ^ Math.imul(mt[i - 1] ^ mt[i - 1] >>> 30, 1566083941)) - i >>> 0;
      i++;
      if (i >= 624) {
        mt[0] = mt[623];
        i = 1;
      }
    }
    mt[0] = 2147483648;
    this.index = 624;
  }
  next() {
    const mt = this.mt;
    if (this.index >= 624) {
      if (this.index === 625) this.seedInt(5489);
      for (let k = 0; k < 624; k++) {
        const y2 = mt[k] & 2147483648 | mt[(k + 1) % 624] & 2147483647;
        mt[k] = mt[(k + 397) % 624] ^ y2 >>> 1 ^ (y2 & 1 ? 2567483615 : 0);
      }
      this.index = 0;
    }
    let y = mt[this.index++];
    y ^= y >>> 11;
    y ^= y << 7 & 2636928640;
    y ^= y << 15 & 4022730752;
    y ^= y >>> 18;
    return y >>> 0;
  }
  random() {
    const a = this.next() >>> 5, b = this.next() >>> 6;
    return (a * 67108864 + b) * (1 / 9007199254740992);
  }
  bits(k) {
    if (k <= 32) return k === 0 ? 0 : this.next() >>> 32 - k;
    let result = 0, factor = 1;
    for (; k > 0; k -= 32) {
      let r = this.next();
      if (k < 32) r >>>= 32 - k;
      result += r * factor;
      factor *= 2 ** 32;
    }
    return result;
  }
  below(n) {
    if (n <= 0) return 0;
    const k = n.toString(2).length;
    let r = this.bits(k);
    while (r >= n) r = this.bits(k);
    return r;
  }
};
function randomModule() {
  const twister = new Twister();
  const fresh = () => {
    const words = new Uint32Array(624);
    try {
      globalThis.crypto.getRandomValues(words);
    } catch {
      for (let i = 0; i < 624; i++) words[i] = Math.floor(Math.random() * 2 ** 32);
    }
    twister.seedArray([...words]);
  };
  fresh();
  const attrs = /* @__PURE__ */ new Map();
  const def = (name, fn) => attrs.set(name, { value: native(name, fn) });
  const range = (fn, start, stop, step, ctx) => {
    if (stop === void 0) {
      if (start > 0) return twister.below(start);
      return ctx.fail(`random.${fn}: \u043F\u0443\u0441\u0442\u043E\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D.`);
    }
    const width = stop - start;
    if (step === 1) {
      if (width > 0) return start + twister.below(width);
      return ctx.fail(`random.${fn}: \u043F\u0443\u0441\u0442\u043E\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D (${start}, ${stop}).`);
    }
    const n = step > 0 ? Math.floor((width + step - 1) / step) : step < 0 ? Math.floor((width + step + 1) / step) : ctx.fail("random.randrange: \u0448\u0430\u0433 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043D\u0443\u043B\u0451\u043C.");
    if (n <= 0) ctx.fail("random.randrange: \u043F\u0443\u0441\u0442\u043E\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D.");
    return start + step * twister.below(n);
  };
  def("seed", (args, kw, ctx) => {
    const { a } = bind("random.seed", args, kw, ["a", "version"], 0, ctx);
    if (!a || a.value === null) {
      fresh();
      return;
    }
    const v = a.value;
    if (typeof v === "number" || typeof v === "boolean") {
      const n = Number(v);
      if (a.float && !Number.isInteger(n)) ctx.fail("\u0412 random.seed \u0432 Kodik \u043F\u0435\u0440\u0435\u0434\u0430\u0439 \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E.");
      twister.seedInt(safeInt(n, ctx));
      return;
    }
    ctx.fail("\u0412 random.seed \u0432 Kodik \u043F\u0435\u0440\u0435\u0434\u0430\u0439 \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 random.seed(42).");
  });
  def("random", (args, kw, ctx) => {
    noKeywords("random.random", kw, ctx);
    if (args.length) ctx.fail("random.random() \u0432\u044B\u0437\u044B\u0432\u0430\u044E\u0442 \u0431\u0435\u0437 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432.");
    return floatArg(twister.random());
  });
  def("uniform", (args, kw, ctx) => {
    const { a, b } = bind("random.uniform", args, kw, ["a", "b"], 2, ctx);
    const x = num(a, ctx), y = num(b, ctx);
    return floatArg(x + (y - x) * twister.random());
  });
  def("randint", (args, kw, ctx) => {
    const { a, b } = bind("random.randint", args, kw, ["a", "b"], 2, ctx);
    return arg(range("randint", int(a, ctx), int(b, ctx) + 1, 1, ctx));
  });
  def("randrange", (args, kw, ctx) => {
    const { start, stop, step } = bind("random.randrange", args, kw, ["start", "stop", "step"], 1, ctx);
    if (stop?.value === null && step) ctx.fail("random.randrange: \u0431\u0435\u0437 stop \u0448\u0430\u0433 \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F.");
    return arg(range("randrange", int(start, ctx), stop && stop.value !== null ? int(stop, ctx) : void 0, step ? int(step, ctx) : 1, ctx));
  });
  def("choice", (args, kw, ctx) => {
    const seq = one("random.choice", args, kw, ctx), items = ctx.items(seq.value, "random.choice");
    if (!items.length) ctx.fail("random.choice: \u043F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043F\u0443\u0441\u0442\u0430.");
    return items[twister.below(items.length)];
  });
  def("shuffle", (args, kw, ctx) => {
    const seq = one("random.shuffle", args, kw, ctx);
    if (!Array.isArray(seq.value)) ctx.fail("random.shuffle \u043F\u0435\u0440\u0435\u043C\u0435\u0448\u0438\u0432\u0430\u0435\u0442 \u0441\u043F\u0438\u0441\u043E\u043A.");
    const items = ctx.items(seq.value);
    for (let i = items.length - 1; i > 0; i--) {
      const j = twister.below(i + 1);
      [items[i], items[j]] = [items[j], items[i]];
      ctx.tick();
    }
    ctx.replace(seq.value, items);
    return none;
  });
  return new PyModule("random", attrs);
}
var SLEEP_LIMIT_MS = 6e4;
function pause(ctx, ms, fn) {
  const total = (ctx.state.get("paused") ?? 0) + ms;
  if (total > SLEEP_LIMIT_MS) ctx.fail(`\u041F\u0430\u0443\u0437\u044B \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B \u0434\u043B\u044F\u0442\u0441\u044F \u0431\u043E\u043B\u044C\u0448\u0435 60 \u0441\u0435\u043A\u0443\u043D\u0434. \u0423\u043C\u0435\u043D\u044C\u0448\u0438 ${fn} \u0438\u043B\u0438 \u0447\u0438\u0441\u043B\u043E \u043A\u0430\u0434\u0440\u043E\u0432.`);
  ctx.state.set("paused", total);
  ctx.clock.sleep(ms);
}
function timeModule(ctx0) {
  const epoch = Date.now() / 1e3;
  const attrs = /* @__PURE__ */ new Map();
  attrs.set("sleep", { value: native("sleep", (args, kw, ctx) => {
    const seconds = num(one("time.sleep", args, kw, ctx), ctx, "\u0447\u0438\u0441\u043B\u043E \u0441\u0435\u043A\u0443\u043D\u0434");
    if (!Number.isFinite(seconds) || seconds < 0) ctx.fail("time.sleep: \u0432\u0440\u0435\u043C\u044F \u043F\u0430\u0443\u0437\u044B \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043D\u0435\u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C.");
    pause(ctx, seconds * 1e3, "time.sleep");
  }, true) });
  attrs.set("time", { value: native("time", (args, kw, ctx) => {
    noKeywords("time.time", kw, ctx);
    return floatArg(epoch + ctx.clock.now / 1e3);
  }) });
  attrs.set("monotonic", { value: native("monotonic", (args, kw, ctx) => floatArg(ctx.clock.now / 1e3)) });
  attrs.set("perf_counter", { value: native("perf_counter", (args, kw, ctx) => floatArg(ctx.clock.now / 1e3)) });
  void ctx0;
  return new PyModule("time", attrs);
}

// src/python/colors.ts
var namedColors = {
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  aqua: "#00ffff",
  aquamarine: "#7fffd4",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  black: "#000000",
  blanchedalmond: "#ffebcd",
  blue: "#0000ff",
  blueviolet: "#8a2be2",
  brown: "#a52a2a",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  chocolate: "#d2691e",
  coral: "#ff7f50",
  cornflowerblue: "#6495ed",
  cornsilk: "#fff8dc",
  crimson: "#dc143c",
  cyan: "#00ffff",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgreen: "#006400",
  darkgrey: "#a9a9a9",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f",
  darkturquoise: "#00ced1",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dimgray: "#696969",
  dimgrey: "#696969",
  dodgerblue: "#1e90ff",
  firebrick: "#b22222",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  fuchsia: "#ff00ff",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  gold: "#ffd700",
  goldenrod: "#daa520",
  gray: "#808080",
  green: "#008000",
  greenyellow: "#adff2f",
  grey: "#808080",
  honeydew: "#f0fff0",
  hotpink: "#ff69b4",
  indianred: "#cd5c5c",
  indigo: "#4b0082",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightgray: "#d3d3d3",
  lightgreen: "#90ee90",
  lightgrey: "#d3d3d3",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0",
  lime: "#00ff00",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  magenta: "#ff00ff",
  maroon: "#800000",
  mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd",
  mediumorchid: "#ba55d3",
  mediumpurple: "#9370db",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  navy: "#000080",
  oldlace: "#fdf5e6",
  olive: "#808000",
  olivedrab: "#6b8e23",
  orange: "#ffa500",
  orangered: "#ff4500",
  orchid: "#da70d6",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  pink: "#ffc0cb",
  plum: "#dda0dd",
  powderblue: "#b0e0e6",
  purple: "#800080",
  rebeccapurple: "#663399",
  red: "#ff0000",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  salmon: "#fa8072",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  silver: "#c0c0c0",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  slategrey: "#708090",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  tan: "#d2b48c",
  teal: "#008080",
  thistle: "#d8bfd8",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
  wheat: "#f5deb3",
  white: "#ffffff",
  whitesmoke: "#f5f5f5",
  yellow: "#ffff00",
  yellowgreen: "#9acd32"
};
function cssColor(name) {
  const key2 = name.toLowerCase().replace(/\s+/g, "");
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(key2)) return key2.length === 4 ? "#" + [...key2.slice(1)].map((c) => c + c).join("") : key2;
  if (namedColors[key2]) return namedColors[key2];
  const gray = /^gr[ae]y(\d{1,3})$/.exec(key2);
  if (gray && Number(gray[1]) <= 100) {
    const v = Math.round(Number(gray[1]) * 2.55).toString(16).padStart(2, "0");
    return `#${v}${v}${v}`;
  }
  return void 0;
}

// src/python/libPlot.ts
var cycle = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
var short = { b: "#0000ff", g: "#008000", r: "#ff0000", c: "#00bfbf", m: "#bf00bf", y: "#bfbf00", k: "#000000", w: "#ffffff" };
var markers = /* @__PURE__ */ new Set(["o", ".", ",", "v", "^", "<", ">", "s", "*", "+", "x", "D", "d", "p", "h", "H", "8", "|", "_"]);
var LIMIT_POINTS = 2e4;
var LIMIT_SHOTS = 300;
var Opaque = class extends PyObject {
  constructor(typeName, text4) {
    super();
    this.typeName = typeName;
    this.text = text4;
  }
  repr() {
    return this.text;
  }
};
var FigureState = class {
  constructor(id, number3) {
    this.id = id;
    this.number = number3;
  }
  title;
  xlabel;
  ylabel;
  grid = false;
  legend = false;
  labels;
  xlim;
  ylim;
  series = [];
  lines = 0;
  patches = 0;
  empty() {
    return !this.series.length && !this.title && !this.xlabel && !this.ylabel;
  }
  snapshot() {
    const series = this.series.map((s, i) => this.labels && this.labels[i] !== void 0 ? { ...s, label: this.labels[i] } : s);
    return JSON.parse(JSON.stringify({ id: this.id, title: this.title, xlabel: this.xlabel, ylabel: this.ylabel, grid: this.grid, legend: this.legend, xlim: this.xlim, ylim: this.ylim, series }));
  }
  clear() {
    Object.assign(this, { title: void 0, xlabel: void 0, ylabel: void 0, grid: false, legend: false, labels: void 0, xlim: void 0, ylim: void 0, series: [], lines: 0, patches: 0 });
  }
};
function color(v, ctx, fallback) {
  if (!v || v.value === null) return fallback;
  if (typeof v.value === "string") {
    const s = v.value.trim();
    if (/^C\d$/.test(s)) return cycle[Number(s[1])];
    const c = short[s] ?? cssColor(s) ?? (/^#[0-9a-f]{8}$/i.test(s) ? s.slice(0, 7) : void 0);
    if (c) return c;
    return ctx.fail(`\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0446\u0432\u0435\u0442 \xAB${s}\xBB. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, "red", "C1", "#ff8800" \u0438\u043B\u0438 \u0431\u0443\u043A\u0432\u0443 r, g, b, k.`);
  }
  const parts = ctx.items(v.value, "\u0446\u0432\u0435\u0442").map((p) => num(p, ctx));
  if (parts.length !== 3 && parts.length !== 4 || parts.some((p) => p < 0 || p > 1)) ctx.fail("\u0426\u0432\u0435\u0442 \u0438\u0437 \u0447\u0438\u0441\u0435\u043B \u2014 \u0442\u0440\u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043E\u0442 0 \u0434\u043E 1: (r, g, b).");
  return "#" + parts.slice(0, 3).map((p) => Math.round(p * 255).toString(16).padStart(2, "0")).join("");
}
function numbers(v, ctx, what) {
  if (typeof v.value === "number" || typeof v.value === "boolean") return [Number(v.value)];
  const a = toArray(v, ctx);
  if (a.shape.length > 1) ctx.fail(`${what}: \u043D\u0443\u0436\u0435\u043D \u043E\u0434\u043D\u043E\u043C\u0435\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0447\u0438\u0441\u0435\u043B.`);
  return a.data;
}
function categories(v, ctx) {
  const items = v.value instanceof NdArray ? v.value.data : typeof v.value === "number" || typeof v.value === "string" ? [v.value] : ctx.items(v.value, "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F").map((item) => typeof item.value === "string" ? item.value : num(item, ctx));
  return items;
}
function parseFormat(fmt, ctx) {
  const result = {};
  let rest = fmt;
  for (const style of ["--", "-.", "-", ":"]) if (rest.includes(style)) {
    result.linestyle = style;
    rest = rest.replace(style, "");
    break;
  }
  for (const ch of [...rest]) {
    if (short[ch] && !result.color) result.color = short[ch];
    else if (markers.has(ch) && !result.marker) result.marker = ch;
    else ctx.fail(`\u041D\u0435\u043F\u043E\u043D\u044F\u0442\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430 \u0444\u043E\u0440\u043C\u0430\u0442\u0430 \xAB${fmt}\xBB. \u041F\u0440\u0438\u043C\u0435\u0440: "r-", "bo", "g--".`);
  }
  return result;
}
function pyplotModule(ctx) {
  const shots = ctx.scene.plots ?? (ctx.scene.plots = []);
  let ids2 = 0, numbers_ = 0, points = 0;
  const open = [];
  let current;
  const fig = () => {
    if (!current) {
      current = new FigureState(++ids2, ++numbers_);
      open.push(current);
    }
    return current;
  };
  const shoot = (f, auto = false) => {
    if (shots.length >= LIMIT_SHOTS) ctx.fail("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043A\u0430\u0434\u0440\u043E\u0432 \u0433\u0440\u0430\u0444\u0438\u043A\u0430. \u0423\u043C\u0435\u043D\u044C\u0448\u0438 \u0447\u0438\u0441\u043B\u043E \u0432\u044B\u0437\u043E\u0432\u043E\u0432 plt.pause \u0438\u043B\u0438 plt.show.");
    shots.push({ t: ctx.clock.now, figure: f.snapshot(), ...auto ? { auto: true } : {} });
  };
  const close = (f) => {
    open.splice(open.indexOf(f), 1);
    if (current === f) current = open.at(-1);
  };
  ctx.scene.onFinish(() => {
    for (const f of [...open]) if (!f.empty()) shoot(f, true);
  });
  const add = (f, s) => {
    const count = "x" in s ? s.x.length : s.type === "hist" ? s.counts.length : 0;
    if ((points += count) > LIMIT_POINTS) ctx.fail(`\u041D\u0430 \u0433\u0440\u0430\u0444\u0438\u043A\u0430\u0445 \u0431\u043E\u043B\u044C\u0448\u0435 ${LIMIT_POINTS} \u0442\u043E\u0447\u0435\u043A.`);
    if (f.series.length >= 100) ctx.fail("\u041D\u0430 \u043E\u0434\u043D\u043E\u043C \u0433\u0440\u0430\u0444\u0438\u043A\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 100 \u043D\u0430\u0431\u043E\u0440\u043E\u0432 \u0434\u0430\u043D\u043D\u044B\u0445.");
    f.series.push(s);
  };
  const label = (v, c) => v && v.value !== null ? c.str(v).slice(0, 120) : void 0;
  const plot = (f, args, kw, c) => {
    for (const name of kw.keys()) if (!["color", "c", "label", "linestyle", "ls", "linewidth", "lw", "marker", "markersize", "ms", "alpha"].includes(name)) c.fail(`\u0423 plot() \u0432 Kodik \u043D\u0435\u0442 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430 \xAB${name}\xBB.`);
    if (!args.length) c.fail("plot(): \u043F\u0435\u0440\u0435\u0434\u0430\u0439 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F y \u0438\u043B\u0438 x \u0438 y.");
    const groups = [];
    let i = 0;
    while (i < args.length) {
      const a = args[i], b = args[i + 1], d = args[i + 2];
      if (typeof a.value === "string") c.fail('plot(): \u0441\u0442\u0440\u043E\u043A\u0443 \u0444\u043E\u0440\u043C\u0430\u0442\u0430 \u043F\u0438\u0448\u0443\u0442 \u043F\u043E\u0441\u043B\u0435 \u0434\u0430\u043D\u043D\u044B\u0445, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 plot(x, y, "r-").');
      if (b && typeof b.value !== "string") {
        groups.push({ x: a, y: b, fmt: d && typeof d.value === "string" ? d.value : void 0 });
        i += d && typeof d.value === "string" ? 3 : 2;
      } else {
        groups.push({ y: a, fmt: b ? b.value : void 0 });
        i += b ? 2 : 1;
      }
    }
    for (const g of groups) {
      const y = numbers(g.y, c, "plot"), x = g.x ? numbers(g.x, c, "plot") : y.map((_, k) => k);
      if (x.length !== y.length) c.fail(`plot(): \u0443 x ${x.length} \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439, \u0430 \u0443 y \u2014 ${y.length}. \u0414\u043B\u0438\u043D\u044B \u0434\u043E\u043B\u0436\u043D\u044B \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0442\u044C.`);
      const fmt = g.fmt ? parseFormat(g.fmt, c) : {};
      const marker = kw.get("marker")?.value ?? fmt.marker;
      if (marker !== void 0 && marker !== null && (typeof marker !== "string" || marker && !markers.has(marker))) c.fail('plot(): \u043C\u0430\u0440\u043A\u0435\u0440 \u2014 \u043E\u0434\u0438\u043D \u0438\u0437 "o", ".", "s", "^", "v", "*", "+", "x", "D".');
      const ls = (kw.get("linestyle") ?? kw.get("ls"))?.value ?? (fmt.linestyle ?? (fmt.marker ? "None" : "-"));
      const linestyle = { solid: "-", dashed: "--", dotted: ":", dashdot: "-.", "": "None", none: "None" }[String(ls)] ?? String(ls);
      if (!["-", "--", ":", "-.", "None"].includes(linestyle)) c.fail('plot(): \u0441\u0442\u0438\u043B\u044C \u043B\u0438\u043D\u0438\u0438 "-", "--", ":" \u0438\u043B\u0438 "-.".');
      const colour = color(kw.get("color") ?? kw.get("c"), c, fmt.color ?? cycle[f.lines % 10]);
      f.lines++;
      const lw = kw.get("linewidth") ?? kw.get("lw");
      add(f, { type: "line", x, y, color: colour, linestyle, linewidth: lw ? num(lw, c) : 1.5, ...marker ? { marker } : {}, ...label(kw.get("label"), c) !== void 0 ? { label: label(kw.get("label"), c) } : {} });
    }
    return { value: c.list(groups.map(() => ({ value: new Opaque("Line2D", "<Line2D>") }))) };
  };
  const scatter = (f, args, kw, c) => {
    const p = bind("scatter", args, kw, ["x", "y", "s", "c", "marker", "color", "label", "alpha", "edgecolors"], 2, c);
    const x = numbers(p.x, c, "scatter"), y = numbers(p.y, c, "scatter");
    if (x.length !== y.length) c.fail(`scatter(): \u0443 x ${x.length} \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439, \u0430 \u0443 y \u2014 ${y.length}.`);
    const marker = p.marker ? text2(p.marker, c, "\u043C\u0430\u0440\u043A\u0435\u0440") : "o";
    if (!markers.has(marker)) c.fail('scatter(): \u043C\u0430\u0440\u043A\u0435\u0440 \u2014 \u043E\u0434\u0438\u043D \u0438\u0437 "o", ".", "s", "^", "v", "*", "+", "x", "D".');
    if (p.c && typeof p.c.value !== "string" && !(p.c.value instanceof PyTuple)) c.fail("scatter(): \u0432 Kodik c= \u0437\u0430\u0434\u0430\u0451\u0442 \u043E\u0434\u0438\u043D \u0446\u0432\u0435\u0442 \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0442\u043E\u0447\u0435\u043A.");
    add(f, { type: "scatter", x, y, color: color(p.color ?? p.c, c, cycle[f.patches++ % 10]), marker, size: p.s ? num(p.s, c) : 36, ...label(p.label, c) !== void 0 ? { label: label(p.label, c) } : {} });
    return { value: new Opaque("PathCollection", "<matplotlib.collections.PathCollection>") };
  };
  const bar = (f, args, kw, c, horizontal = false) => {
    const names = horizontal ? ["y", "width", "height", "left", "color", "label", "edgecolor", "align", "alpha"] : ["x", "height", "width", "bottom", "color", "label", "edgecolor", "align", "alpha"];
    const p = bind(horizontal ? "barh" : "bar", args, kw, names, 2, c);
    const x = categories(p[names[0]], c), sizes = numbers(p[names[1]], c, "bar"), heights = sizes.length === 1 && x.length > 1 ? x.map(() => sizes[0]) : sizes;
    if (x.length !== heights.length) c.fail(`${horizontal ? "barh" : "bar"}(): \u0443 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0439 ${x.length} \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439, \u0430 \u0443 \u0432\u044B\u0441\u043E\u0442 \u2014 ${heights.length}.`);
    if (p[names[3]] && p[names[3]].value !== null) c.fail("bar(): bottom/left (\u0441\u043E\u0441\u0442\u0430\u0432\u043D\u044B\u0435 \u0441\u0442\u043E\u043B\u0431\u0438\u043A\u0438) \u0432 Kodik \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F.");
    add(f, { type: "bar", x, height: heights, color: color(p.color, c, cycle[f.patches++ % 10]), width: p[names[2]] ? num(p[names[2]], c) : 0.8, ...horizontal ? { horizontal: true } : {}, ...label(p.label, c) !== void 0 ? { label: label(p.label, c) } : {} });
    return { value: new Opaque("BarContainer", `<BarContainer object of ${x.length} artists>`) };
  };
  const hist = (f, args, kw, c) => {
    const p = bind("hist", args, kw, ["x", "bins", "range", "color", "edgecolor", "label", "alpha", "density"], 1, c);
    const data = numbers(p.x, c, "hist").filter((v) => !Number.isNaN(v));
    if (p.density && c.truth(p.density.value)) c.fail("hist(density=True) \u0432 Kodik \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F.");
    let edges, edgeType = "float";
    if (p.bins && (Array.isArray(p.bins.value) || p.bins.value instanceof NdArray || p.bins.value instanceof PyTuple)) {
      const given = toArray(p.bins, c);
      edgeType = given.dtype === "float" ? "float" : "int";
      edges = numbers(p.bins, c, "bins");
      if (edges.length < 2 || edges.some((e, i) => i && e <= edges[i - 1])) c.fail("hist(): \u0433\u0440\u0430\u043D\u0438\u0446\u044B bins \u0434\u043E\u043B\u0436\u043D\u044B \u0432\u043E\u0437\u0440\u0430\u0441\u0442\u0430\u0442\u044C.");
    } else {
      const count = p.bins ? int(p.bins, c, "\u0447\u0438\u0441\u043B\u043E \u0441\u0442\u043E\u043B\u0431\u0438\u043A\u043E\u0432") : 10;
      if (count < 1 || count > 500) c.fail("hist(): \u0447\u0438\u0441\u043B\u043E \u0441\u0442\u043E\u043B\u0431\u0438\u043A\u043E\u0432 \u043E\u0442 1 \u0434\u043E 500.");
      let lo, hi;
      if (p.range && p.range.value !== null) [lo, hi] = c.items(p.range.value).map((v) => num(v, c));
      else {
        lo = data.length ? Math.min(...data) : 0;
        hi = data.length ? Math.max(...data) : 1;
      }
      if (lo === hi) {
        lo -= 0.5;
        hi += 0.5;
      }
      edges = Array.from({ length: count + 1 }, (_, i) => lo + i * (hi - lo) / count);
      edges[count] = hi;
    }
    const n = edges.length - 1, counts = Array(n).fill(0), first = edges[0], last = edges[n];
    for (const v of data) {
      if (v < first || v > last) continue;
      let lo = 0, hi = n;
      while (lo < hi) {
        const mid = lo + hi >> 1;
        if (edges[mid + 1] <= v) lo = mid + 1;
        else hi = mid;
      }
      counts[Math.min(lo, n - 1)]++;
      c.tick();
    }
    add(f, { type: "hist", edges, counts, color: color(p.color, c, cycle[f.patches++ % 10]), ...p.edgecolor ? { edgecolor: color(p.edgecolor, c, "#000000") } : {}, ...label(p.label, c) !== void 0 ? { label: label(p.label, c) } : {} });
    return { value: c.tuple([{ value: new NdArray(counts, [n], "float") }, { value: new NdArray(edges, [edges.length], edgeType) }, { value: new Opaque("BarContainer", `<BarContainer object of ${n} artists>`) }]) };
  };
  const limits = (f, axis, args, kw, c) => {
    const names = axis === "xlim" ? ["left", "right"] : ["bottom", "top"];
    const p = bind(axis, args.length === 1 && (args[0].value instanceof PyTuple || Array.isArray(args[0].value)) ? c.items(args[0].value) : args, kw, names, 0, c);
    if (!p[names[0]] && !p[names[1]]) {
      const v = f[axis] ?? [0, 1];
      return { value: c.tuple(v.map((x) => ({ value: x, float: true }))) };
    }
    const old = f[axis] ?? [NaN, NaN], lo = p[names[0]] && p[names[0]].value !== null ? num(p[names[0]], c) : old[0], hi = p[names[1]] && p[names[1]].value !== null ? num(p[names[1]], c) : old[1];
    if (lo === hi) c.fail(`${axis}(): \u0433\u0440\u0430\u043D\u0438\u0446\u044B \u043E\u0441\u0438 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u044B \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0442\u044C.`);
    f[axis] = [lo, hi];
  };
  const textSetter = (key2) => (f, args, kw, c) => {
    for (const name of kw.keys()) if (!["fontsize", "size", "loc", "color", "fontweight", "pad", "labelpad"].includes(name)) c.fail(`\u0423 ${key2}() \u0432 Kodik \u043D\u0435\u0442 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430 \xAB${name}\xBB.`);
    if (args.length !== 1) c.fail(`${key2}() \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u043E\u0434\u043D\u0443 \u0441\u0442\u0440\u043E\u043A\u0443.`);
    f[key2] = c.str(args[0]).slice(0, 200);
  };
  const grid = (f, args, kw, c) => {
    const p = bind("grid", args, kw, ["visible", "which", "axis", "color", "linestyle", "linewidth", "alpha", "b"], 0, c);
    const v = p.visible ?? p.b;
    f.grid = v && v.value !== null ? c.truth(v.value) : kw.size ? true : !f.grid;
  };
  const legend = (f, args, kw, c) => {
    for (const name of kw.keys()) if (!["loc", "fontsize", "title", "frameon"].includes(name)) c.fail(`\u0423 legend() \u0432 Kodik \u043D\u0435\u0442 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430 \xAB${name}\xBB.`);
    if (args.length) f.labels = c.items(args[0].value, "\u043F\u043E\u0434\u043F\u0438\u0441\u0438 \u043B\u0435\u0433\u0435\u043D\u0434\u044B").map((item) => c.str(item));
    f.legend = true;
  };
  const drawing2 = {
    plot,
    scatter,
    bar,
    barh: (f, a, kw, c) => bar(f, a, kw, c, true),
    hist,
    grid,
    legend,
    title: textSetter("title"),
    xlabel: textSetter("xlabel"),
    ylabel: textSetter("ylabel"),
    xlim: (f, a, kw, c) => limits(f, "xlim", a, kw, c),
    ylim: (f, a, kw, c) => limits(f, "ylim", a, kw, c),
    xticks: () => void 0,
    yticks: () => void 0,
    tight_layout: () => void 0,
    axis: (f, a, kw, c) => {
      const v = a[0]?.value;
      if (typeof v === "string" && ["equal", "on", "auto", "tight", "scaled"].includes(v)) return;
      if (v instanceof PyTuple || Array.isArray(v)) {
        const [x0, x1, y0, y1] = c.items(v).map((x) => num(x, c));
        f.xlim = [x0, x1];
        f.ylim = [y0, y1];
        return;
      }
      c.fail('axis(): \u0432 Kodik \u2014 axis([xmin, xmax, ymin, ymax]) \u0438\u043B\u0438 axis("equal").');
    }
  };
  class Axes extends PyObject {
    constructor(figure) {
      super();
      this.figure = figure;
    }
    typeName = "Axes";
    repr() {
      return "<Axes>";
    }
    getattr(name) {
      const map = { set_title: "title", set_xlabel: "xlabel", set_ylabel: "ylabel", set_xlim: "xlim", set_ylim: "ylim", set_xticks: "xticks", set_yticks: "yticks" };
      const target = drawing2[map[name] ?? (["title", "xlabel", "ylabel", "xlim", "ylim"].includes(name) ? "" : name)];
      if (name === "cla" || name === "clear") return { value: new PyNative(name, () => {
        this.figure.clear();
      }, true) };
      return target ? { value: new PyNative(name, (a, kw, c) => target(this.figure, a, kw, c), true) } : void 0;
    }
  }
  class FigureObject extends PyObject {
    constructor(figure) {
      super();
      this.figure = figure;
    }
    typeName = "Figure";
    repr() {
      return `<Figure size 640x480 with ${this.figure.series.length ? 1 : 0} Axes>`;
    }
    getattr(name) {
      if (name === "suptitle") return { value: new PyNative(name, (a, kw, c) => textSetter("title")(this.figure, a, /* @__PURE__ */ new Map(), c), true) };
      if (name === "add_subplot" || name === "gca") return { value: new PyNative(name, () => ({ value: new Axes(this.figure) })) };
      if (name === "show") return { value: new PyNative(name, () => {
        shoot(this.figure);
      }, true) };
      if (name === "savefig") return { value: new PyNative(name, (a, kw, c) => c.fail("\u0412 Kodik \u0433\u0440\u0430\u0444\u0438\u043A\u0438 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u0432 \u0444\u0430\u0439\u043B\u044B \u2014 \u043E\u043D\u0438 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043F\u043E\u0434 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u043E\u0439.")) };
      return void 0;
    }
  }
  const attrs = /* @__PURE__ */ new Map();
  for (const [name, fn] of Object.entries(drawing2)) attrs.set(name, { value: new PyNative(name, (a, kw, c) => fn(fig(), a, kw, c), true) });
  const def = (name, fn, effect = true) => attrs.set(name, { value: new PyNative(name, fn, effect) });
  def("figure", (a, kw, c) => {
    for (const name of kw.keys()) if (!["figsize", "dpi", "num", "facecolor"].includes(name)) c.fail(`\u0423 figure() \u0432 Kodik \u043D\u0435\u0442 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430 \xAB${name}\xBB.`);
    if (open.length >= 20) c.fail("\u041E\u0442\u043A\u0440\u044B\u0442\u043E \u0431\u043E\u043B\u044C\u0448\u0435 20 \u0440\u0438\u0441\u0443\u043D\u043A\u043E\u0432. \u0417\u0430\u043A\u0440\u043E\u0439 \u043B\u0438\u0448\u043D\u0438\u0435 \u0447\u0435\u0440\u0435\u0437 plt.close().");
    current = new FigureState(++ids2, ++numbers_);
    open.push(current);
    return { value: new FigureObject(current) };
  });
  def("subplots", (a, kw, c) => {
    const p = bind("subplots", a, kw, ["nrows", "ncols", "figsize", "dpi"], 0, c);
    if (p.nrows && int(p.nrows, c) !== 1 || p.ncols && int(p.ncols, c) !== 1) c.fail("subplots() \u0432 Kodik \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u043E\u0434\u043D\u0443 \u043E\u0431\u043B\u0430\u0441\u0442\u044C \u0433\u0440\u0430\u0444\u0438\u043A\u0430: plt.subplots().");
    current = new FigureState(++ids2, ++numbers_);
    open.push(current);
    return { value: c.tuple([{ value: new FigureObject(current) }, { value: new Axes(current) }]) };
  });
  def("gca", () => ({ value: new Axes(fig()) }), false);
  def("gcf", () => ({ value: new FigureObject(fig()) }), false);
  def("show", (a, kw, c) => {
    for (const name of kw.keys()) if (name !== "block") c.fail(`\u0423 show() \u043D\u0435\u0442 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430 \xAB${name}\xBB.`);
    for (const f of [...open]) {
      if (!f.empty()) shoot(f);
      close(f);
    }
  });
  def("pause", (a, kw, c) => {
    const seconds = num(bind("pause", a, kw, ["interval"], 1, c).interval, c, "\u0447\u0438\u0441\u043B\u043E \u0441\u0435\u043A\u0443\u043D\u0434");
    if (seconds < 0) c.fail("pause: \u0432\u0440\u0435\u043C\u044F \u043F\u0430\u0443\u0437\u044B \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C.");
    for (const f of open) if (!f.empty()) shoot(f);
    pause(c, seconds * 1e3, "plt.pause");
  });
  def("clf", () => {
    current?.clear();
  });
  def("cla", () => {
    current?.clear();
  });
  def("close", (a, kw, c) => {
    const what = a[0]?.value;
    if (what === "all") {
      open.splice(0);
      current = void 0;
      return;
    }
    if (what instanceof FigureObject) {
      if (open.includes(what.figure)) close(what.figure);
      return;
    }
    if (what === void 0 || what === null) {
      if (current) close(current);
      return;
    }
    c.fail('close(): plt.close(), plt.close("all") \u0438\u043B\u0438 plt.close(fig).');
  });
  def("savefig", (a, kw, c) => c.fail("\u0412 Kodik \u0433\u0440\u0430\u0444\u0438\u043A\u0438 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u0432 \u0444\u0430\u0439\u043B\u044B \u2014 \u043E\u043D\u0438 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043F\u043E\u0434 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u043E\u0439."));
  for (const name of ["ion", "ioff", "draw"]) def(name, () => void 0);
  const pyplot = new PyModule("matplotlib.pyplot", attrs);
  void none;
  return { pyplot, package: new PyModule("matplotlib", /* @__PURE__ */ new Map()) };
}

// src/python/robotWorld.ts
var MAX_SIDE = 20;
var key = (r, c) => `${r}:${c}`;
var cellOf = (k) => k.split(":").map(Number);
function emptyWorld(rows2 = 6, cols = 8) {
  return { rows: rows2, cols, walls: /* @__PURE__ */ new Set(), targets: /* @__PURE__ */ new Set(), parking: /* @__PURE__ */ new Set(), filled: /* @__PURE__ */ new Set(), start: [0, 0] };
}
function parseWorld(source) {
  const lines = source.replace(/\r/g, "").split("\n").map((line) => line.replace(/\s+$/, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) throw new Error("\u041F\u043E\u043B\u0435 \u0420\u043E\u0431\u043E\u0442\u0430 \u043F\u0443\u0441\u0442\u043E\u0435.");
  const grid = lines[0].trimStart().startsWith("+");
  const cells = [], world = emptyWorld(0, 0);
  if (grid) {
    const indent = lines[0].length - lines[0].trimStart().length, rows2 = lines.map((line) => line.slice(indent));
    if (rows2.length < 3 || rows2.length % 2 === 0) throw new Error("\u041F\u043E\u043B\u0435 \u0441 \u0440\u0430\u043C\u043A\u043E\u0439: \u0441\u0442\u0440\u043E\u043A\u0438 \u0441 \u043A\u043B\u0435\u0442\u043A\u0430\u043C\u0438 \u0447\u0435\u0440\u0435\u0434\u0443\u044E\u0442\u0441\u044F \u0441\u043E \u0441\u0442\u0440\u043E\u043A\u0430\u043C\u0438 \u0441\u0442\u0435\u043D \xAB+-+-+\xBB, \u043F\u0435\u0440\u0432\u0430\u044F \u0438 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u2014 \u0440\u0430\u043C\u043A\u0430.");
    const width = Math.max(...rows2.map((line) => line.length));
    if (width < 3 || width % 2 === 0) throw new Error("\u041F\u043E\u043B\u0435 \u0441 \u0440\u0430\u043C\u043A\u043E\u0439: \u043A\u0430\u0436\u0434\u0430\u044F \u043A\u043B\u0435\u0442\u043A\u0430 \u0437\u0430\u043D\u0438\u043C\u0430\u0435\u0442 \u0434\u0432\u0430 \u0441\u0438\u043C\u0432\u043E\u043B\u0430, \u0441\u0442\u0440\u043E\u043A\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0438 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0437\u043D\u0430\u043A\u043E\u043C \xAB+\xBB \u0438\u043B\u0438 \xAB|\xBB.");
    world.rows = (rows2.length - 1) / 2;
    world.cols = (width - 1) / 2;
    for (let r = 0; r <= world.rows; r++) {
      const line = rows2[2 * r];
      for (let c = 0; c < world.cols; c++) {
        const ch = line[2 * c + 1] ?? " ";
        if (ch === "-") {
          if (r > 0 && r < world.rows) world.walls.add(`h:${r}:${c}`);
        } else if (ch !== " " && !(r === 0 || r === world.rows)) throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 \u0441\u0442\u0435\u043D ${2 * r + 1}: \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \xAB-\xBB \u0434\u043B\u044F \u0441\u0442\u0435\u043D\u044B \u0438\u043B\u0438 \u043F\u0440\u043E\u0431\u0435\u043B \u0434\u043B\u044F \u043F\u0440\u043E\u0445\u043E\u0434\u0430.`);
      }
      if (r === world.rows) break;
      const row = rows2[2 * r + 1];
      cells.push([]);
      for (let c = 0; c <= world.cols; c++) {
        const wall = row[2 * c] ?? " ";
        if (wall === "|") {
          if (c > 0 && c < world.cols) world.walls.add(`v:${r}:${c}`);
        } else if (wall !== " ") throw new Error(`\u0421\u0442\u0440\u043E\u043A\u0430 ${2 * r + 2}: \u043C\u0435\u0436\u0434\u0443 \u043A\u043B\u0435\u0442\u043A\u0430\u043C\u0438 \u0441\u0442\u0430\u0432\u044C \xAB|\xBB \u0434\u043B\u044F \u0441\u0442\u0435\u043D\u044B \u0438\u043B\u0438 \u043F\u0440\u043E\u0431\u0435\u043B.`);
        if (c < world.cols) cells[r].push(row[2 * c + 1] ?? ".");
      }
    }
  } else {
    for (const line of lines) cells.push(line.trim().split(/\s+/));
    world.rows = cells.length;
    world.cols = Math.max(...cells.map((row) => row.length));
    if (cells.some((row) => row.length !== world.cols)) throw new Error("\u0412\u043E \u0432\u0441\u0435\u0445 \u0441\u0442\u0440\u043E\u043A\u0430\u0445 \u043F\u043E\u043B\u044F \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u043A\u043B\u0435\u0442\u043E\u043A.");
    if (cells.some((row) => row.some((cell) => cell.length !== 1))) throw new Error("\u041A\u043B\u0435\u0442\u043A\u0438 \u043F\u043E\u043B\u044F \u043F\u0438\u0448\u0443\u0442\u0441\u044F \u043E\u0434\u043D\u0438\u043C \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u043C \u0447\u0435\u0440\u0435\u0437 \u043F\u0440\u043E\u0431\u0435\u043B: R . * # P.");
  }
  if (world.rows < 1 || world.cols < 1 || world.rows > MAX_SIDE || world.cols > MAX_SIDE) throw new Error(`\u041F\u043E\u043B\u0435 \u0420\u043E\u0431\u043E\u0442\u0430 \u2014 \u043E\u0442 1\xD71 \u0434\u043E ${MAX_SIDE}\xD7${MAX_SIDE} \u043A\u043B\u0435\u0442\u043E\u043A.`);
  let robots = 0;
  cells.forEach((row, r) => row.forEach((ch, c) => {
    const k = key(r, c);
    if (ch === " " || ch === ".") return;
    if ("RQX".includes(ch)) {
      robots++;
      world.start = [r, c];
    }
    if (ch === "*" || ch === "X") world.targets.add(k);
    else if (ch === "#") world.filled.add(k);
    else if (ch === "P" || ch === "Q") world.parking.add(k);
    else if (ch !== "R") throw new Error(`\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0437\u043D\u0430\u043A \xAB${ch}\xBB \u0432 \u043A\u043B\u0435\u0442\u043A\u0435 ${r + 1}, ${c + 1}. \u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B: R . * # P Q X.`);
  }));
  if (robots !== 1) throw new Error(robots ? "\u041D\u0430 \u043F\u043E\u043B\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0434\u0438\u043D \u0420\u043E\u0431\u043E\u0442 (R, Q \u0438\u043B\u0438 X)." : "\u041E\u0442\u043C\u0435\u0442\u044C \u0420\u043E\u0431\u043E\u0442\u0430 \u043D\u0430 \u043F\u043E\u043B\u0435 \u0431\u0443\u043A\u0432\u043E\u0439 R.");
  return world;
}

// src/python/libRobot.ts
var STEP_LIMIT = 5e3;
var delta = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] };
var sideName = { left: "\u0441\u043B\u0435\u0432\u0430", right: "\u0441\u043F\u0440\u0430\u0432\u0430", up: "\u0441\u0432\u0435\u0440\u0445\u0443", down: "\u0441\u043D\u0438\u0437\u0443" };
var Robot = class {
  constructor(ctx) {
    this.ctx = ctx;
    this.world = emptyWorld();
    if (ctx.world) {
      try {
        this.world = parseWorld(ctx.world);
      } catch (e) {
        ctx.fail(`\u041F\u043E\u043B\u0435 \u0420\u043E\u0431\u043E\u0442\u0430 \u0432 \u0437\u0430\u0434\u0430\u043D\u0438\u0438 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u0441 \u043E\u0448\u0438\u0431\u043A\u043E\u0439: ${e.message}`);
      }
    }
    ;
    [this.r, this.c] = this.world.start;
  }
  world;
  r;
  c;
  started = false;
  crashed = false;
  delay = 300;
  steps = [];
  tasks = [];
  blocked(dir, r = this.r, c = this.c) {
    const w = this.world;
    if (dir === "left") return c === 0 || w.walls.has(`v:${r}:${c}`);
    if (dir === "right") return c === w.cols - 1 || w.walls.has(`v:${r}:${c + 1}`);
    if (dir === "up") return r === 0 || w.walls.has(`h:${r}:${c}`);
    return r === w.rows - 1 || w.walls.has(`h:${r + 1}:${c}`);
  }
  step(kind, dir) {
    if (this.steps.length >= STEP_LIMIT) this.ctx.fail(`\u0420\u043E\u0431\u043E\u0442 \u0441\u0434\u0435\u043B\u0430\u043B \u0431\u043E\u043B\u044C\u0448\u0435 ${STEP_LIMIT} \u0448\u0430\u0433\u043E\u0432. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0446\u0438\u043A\u043B\u0430.`);
    this.ctx.tick();
    this.started = true;
    this.steps.push({ t: this.ctx.clock.now, kind, r: this.r, c: this.c, ...dir ? { dir } : {} });
  }
  move(dir, n) {
    if (n < 0) this.ctx.fail("\u0427\u0438\u0441\u043B\u043E \u0448\u0430\u0433\u043E\u0432 \u0420\u043E\u0431\u043E\u0442\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C.");
    for (let i = 0; i < n; i++) {
      if (this.blocked(dir)) {
        this.crashed = true;
        this.step("crash", dir);
        this.ctx.fail(`\u0420\u043E\u0431\u043E\u0442 \u0432\u0440\u0435\u0437\u0430\u043B\u0441\u044F \u0432 \u0441\u0442\u0435\u043D\u0443 ${sideName[dir]} (\u0441\u0442\u0440\u043E\u043A\u0430 ${this.r + 1}, \u0441\u0442\u043E\u043B\u0431\u0435\u0446 ${this.c + 1}). \u041F\u0435\u0440\u0435\u0434 \u0448\u0430\u0433\u043E\u043C \u043F\u0440\u043E\u0432\u0435\u0440\u044C \u0441\u0442\u0435\u043D\u0443: wall_is_${dir === "left" ? "on_the_left" : dir === "right" ? "on_the_right" : dir === "up" ? "above" : "beneath"}().`);
      }
      this.r += delta[dir][0];
      this.c += delta[dir][1];
      this.ctx.clock.sleep(this.delay);
      this.step("move", dir);
    }
  }
  setup(fn) {
    if (this.started) this.ctx.fail(`${fn}: \u043F\u043E\u043B\u0435 \u043D\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u044E\u0442 \u0434\u043E \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0448\u0430\u0433\u0430 \u0420\u043E\u0431\u043E\u0442\u0430.`);
  }
  inside(r, c, fn) {
    if (r < 0 || c < 0 || r >= this.world.rows || c >= this.world.cols) this.ctx.fail(`${fn}: \u043A\u043B\u0435\u0442\u043A\u0438 (${r}, ${c}) \u043D\u0435\u0442 \u043D\u0430 \u043F\u043E\u043B\u0435 ${this.world.rows}\xD7${this.world.cols}. \u0421\u0442\u0440\u043E\u043A\u0438 \u0438 \u0441\u0442\u043E\u043B\u0431\u0446\u044B \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u0441 \u043D\u0443\u043B\u044F.`);
  }
  scene() {
    const w = this.world, cells = (s) => [...s].map(cellOf);
    const filled = new Set(w.filled);
    for (const s of this.steps) if (s.kind === "fill") filled.add(key(s.r, s.c));
    const problems = [];
    if (this.crashed) problems.push("\u0420\u043E\u0431\u043E\u0442 \u0432\u0440\u0435\u0437\u0430\u043B\u0441\u044F \u0432 \u0441\u0442\u0435\u043D\u0443.");
    const missing = [...w.targets].filter((k) => !filled.has(k)).length, extra = [...filled].filter((k) => !w.targets.has(k) && !w.filled.has(k)).length;
    if (missing) problems.push(`\u041D\u0435 \u0437\u0430\u043A\u0440\u0430\u0448\u0435\u043D\u043E \u043D\u0443\u0436\u043D\u044B\u0445 \u043A\u043B\u0435\u0442\u043E\u043A: ${missing}.`);
    if (extra) problems.push(`\u0417\u0430\u043A\u0440\u0430\u0448\u0435\u043D\u044B \u043B\u0438\u0448\u043D\u0438\u0435 \u043A\u043B\u0435\u0442\u043A\u0438: ${extra}.`);
    if (w.parking.size && !w.parking.has(key(this.r, this.c))) problems.push("\u0420\u043E\u0431\u043E\u0442 \u0434\u043E\u043B\u0436\u0435\u043D \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u044C \u043F\u0443\u0442\u044C \u043D\u0430 \u043F\u0430\u0440\u043A\u043E\u0432\u043A\u0435 (P).");
    return { rows: w.rows, cols: w.cols, walls: [...w.walls], targets: cells(w.targets), parking: cells(w.parking), filled: cells(w.filled), start: [...w.start], steps: this.steps, final: { r: this.r, c: this.c, filled: cells(filled), crashed: this.crashed }, result: { solved: !problems.length, problems } };
  }
};
function pyrobModules(ctx) {
  const robot = new Robot(ctx);
  ctx.scene.onFinish(() => {
    ctx.scene.robot = robot.scene();
  });
  ctx.scene.robot = robot.scene();
  const attrs = /* @__PURE__ */ new Map();
  const def = (name, fn, effect = true) => attrs.set(name, { value: new PyNative(name, fn, effect) });
  for (const dir of ["left", "right", "up", "down"]) def(`move_${dir}`, (a, kw, c) => {
    const { n } = bind(`move_${dir}`, a, kw, ["n"], 0, c);
    robot.move(dir, n ? int(n, c, "\u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0448\u0430\u0433\u043E\u0432") : 1);
  });
  const sensor = (name, dir) => def(name, (a, kw, c) => {
    bind(name, a, kw, [], 0, c);
    return arg(robot.blocked(dir));
  }, false);
  sensor("wall_is_above", "up");
  sensor("wall_is_beneath", "down");
  sensor("wall_is_on_the_left", "left");
  sensor("wall_is_on_the_right", "right");
  def("fill_cell", (a, kw, c) => {
    bind("fill_cell", a, kw, [], 0, c);
    c.clock.sleep(robot.delay / 2);
    robot.step("fill");
  });
  def("cell_is_filled", (a, kw, c) => {
    bind("cell_is_filled", a, kw, [], 0, c);
    const k = key(robot.r, robot.c);
    return arg(robot.world.filled.has(k) || robot.steps.some((s) => s.kind === "fill" && key(s.r, s.c) === k));
  }, false);
  def("cell_should_be_filled", (a, kw, c) => {
    bind("cell_should_be_filled", a, kw, [], 0, c);
    return arg(robot.world.targets.has(key(robot.r, robot.c)));
  }, false);
  def("is_parking_point", (a, kw, c) => {
    bind("is_parking_point", a, kw, [], 0, c);
    return arg(robot.world.parking.has(key(robot.r, robot.c)));
  }, false);
  def("get_pos", (a, kw, c) => {
    bind("get_pos", a, kw, [], 0, c);
    return { value: c.tuple([arg(robot.r), arg(robot.c)]) };
  }, false);
  def("get_field_size", (a, kw, c) => {
    bind("get_field_size", a, kw, [], 0, c);
    return { value: c.tuple([arg(robot.world.rows), arg(robot.world.cols)]) };
  }, false);
  def("set_field_size", (a, kw, c) => {
    robot.setup("set_field_size");
    const p = bind("set_field_size", a, kw, ["rows", "cols"], 2, c), rows2 = int(p.rows, c), cols = int(p.cols, c);
    if (rows2 < 1 || cols < 1 || rows2 > MAX_SIDE || cols > MAX_SIDE) c.fail(`set_field_size: \u043F\u043E\u043B\u0435 \u043E\u0442 1\xD71 \u0434\u043E ${MAX_SIDE}\xD7${MAX_SIDE}.`);
    robot.world = emptyWorld(rows2, cols);
    robot.r = 0;
    robot.c = 0;
    ctx.scene.robot = robot.scene();
  });
  def("goto", (a, kw, c) => {
    robot.setup("goto");
    const p = bind("goto", a, kw, ["row", "col"], 2, c), r = int(p.row, c), col = int(p.col, c);
    robot.inside(r, col, "goto");
    robot.r = r;
    robot.c = col;
    robot.world.start = [r, col];
    ctx.scene.robot = robot.scene();
  });
  def("put_wall", (a, kw, c) => {
    robot.setup("put_wall");
    const p = bind("put_wall", a, kw, ["left", "right", "top", "bottom"], 0, c), w = robot.world, r = robot.r, col = robot.c;
    const on = (v) => !!v && c.truth(v.value);
    if (on(p.left) && col > 0) w.walls.add(`v:${r}:${col}`);
    if (on(p.right) && col < w.cols - 1) w.walls.add(`v:${r}:${col + 1}`);
    if (on(p.top) && r > 0) w.walls.add(`h:${r}:${col}`);
    if (on(p.bottom) && r < w.rows - 1) w.walls.add(`h:${r + 1}:${col}`);
    ctx.scene.robot = robot.scene();
  });
  def("set_cell_type", (a, kw, c) => {
    robot.setup("set_cell_type");
    const p = bind("set_cell_type", a, kw, ["row", "col", "cell_type"], 3, c), r = int(p.row, c), col = int(p.col, c), type = text2(p.cell_type, c, "\u0442\u0438\u043F \u043A\u043B\u0435\u0442\u043A\u0438");
    robot.inside(r, col, "set_cell_type");
    const k = key(r, col), w = robot.world;
    w.targets.delete(k);
    w.filled.delete(k);
    if (type === "to_be_filled") w.targets.add(k);
    else if (type === "filled") w.filled.add(k);
    else if (type !== "empty") c.fail("set_cell_type: \u0442\u0438\u043F CELL_EMPTY, CELL_TO_BE_FILLED \u0438\u043B\u0438 CELL_FILLED.");
    ctx.scene.robot = robot.scene();
  });
  def("set_parking_cell", (a, kw, c) => {
    robot.setup("set_parking_cell");
    const p = bind("set_parking_cell", a, kw, ["row", "col"], 2, c), r = int(p.row, c), col = int(p.col, c);
    robot.inside(r, col, "set_parking_cell");
    robot.world.parking.add(key(r, col));
    ctx.scene.robot = robot.scene();
  });
  attrs.set("CELL_EMPTY", arg("empty"));
  attrs.set("CELL_TO_BE_FILLED", arg("to_be_filled"));
  attrs.set("CELL_FILLED", arg("filled"));
  const register = (delay) => (fn) => {
    robot.tasks.push(fn);
    if (delay !== void 0) robot.delay = delay;
  };
  const task = new PyNative("task", (a, kw, c) => {
    const p = bind("task", a, kw, ["delay"], 0, c);
    const delay = p.delay ? num(p.delay, c, "\u0447\u0438\u0441\u043B\u043E \u0441\u0435\u043A\u0443\u043D\u0434") : void 0;
    if (delay !== void 0 && (delay < 0 || delay > 5)) c.fail("task(delay=...) \u2014 \u043F\u0430\u0443\u0437\u0430 \u043E\u0442 0 \u0434\u043E 5 \u0441\u0435\u043A\u0443\u043D\u0434.");
    return { value: new PyNative("task", (_a, _kw, c2) => c2.fail("\u041F\u0438\u0448\u0438 @task(...) \u0441\u0442\u0440\u043E\u043A\u043E\u0439 \u043D\u0430\u0434 def."), false, register(delay === void 0 ? void 0 : delay * 1e3)) };
  }, false, register());
  attrs.set("task", { value: task });
  def("run_tasks", (a, kw, c) => {
    for (const name of kw.keys()) if (!["verbose", "headless", "tasks"].includes(name)) c.fail(`\u0423 run_tasks() \u043D\u0435\u0442 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430 \xAB${name}\xBB.`);
    if (!robot.tasks.length) c.fail("run_tasks(): \u043E\u0442\u043C\u0435\u0442\u044C \u0444\u0443\u043D\u043A\u0446\u0438\u044E \u0441 \u0440\u0435\u0448\u0435\u043D\u0438\u0435\u043C \u0441\u0442\u0440\u043E\u043A\u043E\u0439 @task \u043D\u0430\u0434 def.");
    for (const name of robot.tasks) c.callUser(name);
  });
  void none;
  const api = new PyModule("pyrob.api", attrs);
  return { api, package: new PyModule("pyrob", /* @__PURE__ */ new Map()) };
}

// src/python/libTurtle.ts
var LIMIT_ITEMS = 8e3;
var LIMIT_FRAMES = 16e3;
var pyMod2 = (x, y) => {
  const r = x % y;
  if (r === 0) return y < 0 ? -0 : 0;
  return r < 0 !== y < 0 ? r + y : r;
};
var radians = (deg) => deg * (Math.PI / 180);
var degrees = (rad) => rad * (180 / Math.PI);
var speeds = { fastest: 0, fast: 10, normal: 6, slow: 3, slowest: 1 };
var shapes = ["classic", "arrow", "turtle", "circle", "square", "triangle", "blank"];
var Screen = class {
  constructor(scene, ctx) {
    this.scene = scene;
    this.ctx = ctx;
  }
  bg = "white";
  tracing = 1;
  delay = 10;
  colormode = 1;
  turtles = [];
  main;
  held = [];
  push(item) {
    if (this.scene.items.length >= LIMIT_ITEMS) this.ctx.fail("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043B\u0438\u043D\u0438\u0439 \u0438 \u0444\u0438\u0433\u0443\u0440 \u0447\u0435\u0440\u0435\u043F\u0430\u0445\u0438. \u0423\u043C\u0435\u043D\u044C\u0448\u0438 \u0447\u0438\u0441\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439.");
    this.scene.items.push(item);
    if (!this.tracing) this.held.push({ item });
    return item;
  }
  frame(id, from, to, duration) {
    if (this.scene.frames.length >= LIMIT_FRAMES) this.ctx.fail("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0448\u0430\u0433\u043E\u0432 \u0447\u0435\u0440\u0435\u043F\u0430\u0445\u0438. \u0423\u043C\u0435\u043D\u044C\u0448\u0438 \u0447\u0438\u0441\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439.");
    const t0 = this.ctx.clock.now, frame = { id, t0, t1: t0 + duration, from, to };
    this.scene.frames.push(frame);
    if (!this.tracing) this.held.push({ frame });
    return frame;
  }
  /** turtle.update(): everything drawn while tracer was off appears now. */
  flush() {
    const now = this.ctx.clock.now;
    for (const { item, frame } of this.held) {
      if (item) {
        const span = item.kind === "line" ? item.t1 - item.t0 : 0;
        item.t0 = now;
        if (item.kind === "line") item.t1 = now + span;
      }
      if (frame) {
        frame.t0 = now;
        frame.t1 = now;
      }
    }
    this.held = [];
  }
  color(args, ctx, fn) {
    const value = args.length === 1 ? args[0].value : args.length === 3 ? ctx.tuple(args) : ctx.fail(`${fn}: \u0443\u043A\u0430\u0436\u0438 \u0446\u0432\u0435\u0442 \u0441\u0442\u0440\u043E\u043A\u043E\u0439, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 "red", \u0438\u043B\u0438 \u0442\u0440\u0435\u043C\u044F \u0447\u0438\u0441\u043B\u0430\u043C\u0438.`);
    if (typeof value === "string") {
      if (value === "" || cssColor(value)) return value;
      return ctx.fail(`${fn}: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0446\u0432\u0435\u0442 \xAB${value}\xBB. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 "red", \u0438\u043B\u0438 \u043A\u043E\u0434 "#ff8800".`);
    }
    const parts = value instanceof PyTuple || Array.isArray(value) ? ctx.items(value) : [];
    if (parts.length !== 3) ctx.fail(`${fn}: \u0446\u0432\u0435\u0442 \u2014 \u0441\u0442\u0440\u043E\u043A\u0430 \u0438\u043B\u0438 \u0442\u0440\u0438 \u0447\u0438\u0441\u043B\u0430 (r, g, b).`);
    let rgb = parts.map((p) => num(p, ctx));
    if (this.colormode === 1) rgb = rgb.map((v) => roundHalfEven(255 * v));
    if (rgb.some((v) => v < 0 || v > 255 || !Number.isInteger(v))) ctx.fail(`${fn}: \u0447\u0438\u0441\u043B\u0430 \u0446\u0432\u0435\u0442\u0430 \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043E\u0442 0 \u0434\u043E ${this.colormode === 1 ? "1.0" : "255"} (\u0441\u0435\u0439\u0447\u0430\u0441 colormode ${this.colormode === 1 ? "1.0" : "255"}).`);
    return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  /** What pencolor()/fillcolor() return: names as given, codes as numbers in the current colormode. */
  colorValue(color2, ctx) {
    if (!color2.startsWith("#")) return arg(color2);
    const hex = cssColor(color2), parts = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) * this.colormode / 255);
    return { value: ctx.tuple(parts.map((v) => floatArg(v))) };
  }
};
var TurtleObject = class extends PyObject {
  constructor(id, screen) {
    super();
    this.id = id;
    this.screen = screen;
  }
  typeName = "Turtle";
  x = 0;
  y = 0;
  xFloat = true;
  yFloat = true;
  ox = 1;
  oy = 0;
  down = true;
  pen = "black";
  fill = "black";
  width = 1;
  speed = 3;
  visible = true;
  shape = "classic";
  stretch = 1;
  fillPath = null;
  fillSlot = -1;
  stamps = 0;
  repr() {
    return "<turtle.Turtle object>";
  }
  pose() {
    return { x: this.x, y: this.y, heading: this.headingValue(), visible: this.visible, shape: this.shape, pen: this.pen, fill: this.fill, stretch: this.stretch, width: this.width };
  }
  headingValue() {
    return pyMod2(pyRound(degrees(Math.atan2(this.oy, this.ox)), 10), 360);
  }
  animated() {
    return this.speed > 0 && this.screen.tracing === 1;
  }
  rotate(angle) {
    const from = this.pose(), a = radians(angle), c = Math.cos(a), s = Math.sin(a);
    const ox = this.ox * c + -this.oy * s, oy = this.oy * c + this.ox * s;
    this.ox = ox;
    this.oy = oy;
    const duration = this.animated() ? (1 + Math.floor(Math.abs(angle) / (3 * this.speed))) * this.screen.delay : 0;
    this.screen.frame(this.id, from, this.pose(), duration);
    this.screen.ctx.clock.sleep(duration);
  }
  goto(x, y, xFloat, yFloat) {
    const ctx = this.screen.ctx;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) ctx.fail("\u0427\u0435\u0440\u0435\u043F\u0430\u0445\u0430 \u0443\u0448\u043B\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u0430\u043B\u0435\u043A\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0440\u0430\u0441\u0441\u0442\u043E\u044F\u043D\u0438\u044F.");
    ctx.tick();
    const from = this.pose(), dx = x - this.x, dy = y - this.y, dist = Math.sqrt(dx * dx + dy * dy);
    const duration = this.animated() ? (1 + Math.floor(dist / (3 * 1.1 ** this.speed * this.speed))) * this.screen.delay : 0;
    const t0 = ctx.clock.now;
    if (this.down && dist > 0) this.screen.push({ kind: "line", id: this.id, t0, t1: t0 + duration, x1: this.x, y1: this.y, x2: x, y2: y, color: this.pen, width: this.width });
    this.x = x;
    this.y = y;
    this.xFloat = xFloat;
    this.yFloat = yFloat;
    if (this.fillPath) {
      this.fillPath.push(x, y);
      if (this.fillPath.length > 2e4) ctx.fail("\u0417\u0430\u043B\u0438\u0432\u043A\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0442\u043E\u0447\u0435\u043A.");
    }
    this.screen.frame(this.id, from, this.pose(), duration);
    ctx.clock.sleep(duration);
  }
  go(distance) {
    this.goto(this.x + this.ox * distance, this.y + this.oy * distance, true, true);
  }
  setheading(to) {
    const angle = pyMod2(to - this.headingValue() + 180, 360) - 180;
    this.rotate(angle);
  }
  reset() {
    this.screen.push({ kind: "clear", id: this.id, t0: this.screen.ctx.clock.now });
    const from = this.pose();
    Object.assign(this, { x: 0, y: 0, xFloat: true, yFloat: true, ox: 1, oy: 0, down: true, pen: "black", fill: "black", width: 1, speed: 3, visible: true, shape: "classic", stretch: 1, fillPath: null });
    this.screen.frame(this.id, from, this.pose(), 0);
  }
  /** Pose change that is not a move (colour, visibility, shape). */
  touch() {
    const p = this.pose();
    this.screen.frame(this.id, p, p, 0);
  }
  getattr(name, ctx) {
    const method = turtleMethods[name];
    void ctx;
    return method ? { value: new PyNative(name, (args, kw, c) => method(this, args, kw, c), drawing.has(name)) } : void 0;
  }
};
var point = (t, args, ctx, fn) => {
  if (args.length === 2) return [num(args[0], ctx), num(args[1], ctx), !!args[0].float, !!args[1].float];
  const v = args[0]?.value;
  if (v instanceof TurtleObject) return [v.x, v.y, v.xFloat, v.yFloat];
  if (args.length === 1 && (v instanceof PyTuple || Array.isArray(v))) {
    const p = ctx.items(v);
    if (p.length === 2) return [num(p[0], ctx), num(p[1], ctx), !!p[0].float, !!p[1].float];
  }
  return ctx.fail(`${fn}: \u0443\u043A\u0430\u0436\u0438 \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B x \u0438 y.`);
};
var angleOf = (degreesValue) => degreesValue;
var oneNumber = (fn, args, kw, ctx, name = "distance") => num(bind(fn, args, kw, [name], 1, ctx)[name], ctx);
var turtleMethods = {
  forward: (t, a, kw, ctx) => {
    t.go(oneNumber("forward", a, kw, ctx));
  },
  backward: (t, a, kw, ctx) => {
    t.go(-oneNumber("backward", a, kw, ctx));
  },
  left: (t, a, kw, ctx) => {
    t.rotate(angleOf(oneNumber("left", a, kw, ctx, "angle")));
  },
  right: (t, a, kw, ctx) => {
    t.rotate(-angleOf(oneNumber("right", a, kw, ctx, "angle")));
  },
  goto: (t, a, kw, ctx) => {
    if (kw.size) ctx.fail("goto(x, y): \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B \u0431\u0435\u0437 \u0438\u043C\u0451\u043D.");
    const [x, y, xf, yf] = point(t, a, ctx, "goto");
    t.goto(x, y, xf, yf);
  },
  setx: (t, a, kw, ctx) => {
    const v = bind("setx", a, kw, ["x"], 1, ctx).x;
    t.goto(num(v, ctx), t.y, !!v.float, t.yFloat);
  },
  sety: (t, a, kw, ctx) => {
    const v = bind("sety", a, kw, ["y"], 1, ctx).y;
    t.goto(t.x, num(v, ctx), t.xFloat, !!v.float);
  },
  setheading: (t, a, kw, ctx) => {
    t.setheading(oneNumber("setheading", a, kw, ctx, "to_angle"));
  },
  home: (t) => {
    t.goto(0, 0, false, false);
    t.setheading(0);
  },
  circle: (t, a, kw, ctx) => {
    const p = bind("circle", a, kw, ["radius", "extent", "steps"], 1, ctx), radius = num(p.radius, ctx);
    const extent = p.extent && p.extent.value !== null ? num(p.extent, ctx) : 360;
    let steps = p.steps && p.steps.value !== null ? int(p.steps, ctx, "\u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0448\u0430\u0433\u043E\u0432") : 1 + Math.trunc(Math.min(11 + Math.abs(radius) / 6, 59) * (Math.abs(extent) / 360));
    if (steps < 1) steps = 1;
    if (steps > 720) ctx.fail("circle: \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0448\u0430\u0433\u043E\u0432 (steps).");
    let w = extent / steps, w2 = 0.5 * w, l = 2 * radius * Math.sin(radians(w2));
    if (radius < 0) {
      l = -l;
      w = -w;
      w2 = -w2;
    }
    const speed = t.speed;
    t.speed = 0;
    t.rotate(w2);
    for (let i = 0; i < steps; i++) {
      t.speed = speed;
      t.go(l);
      t.speed = 0;
      t.rotate(w);
    }
    t.rotate(-w2);
    t.speed = speed;
  },
  dot: (t, a, kw, ctx) => {
    if (kw.size) ctx.fail("dot(\u0440\u0430\u0437\u043C\u0435\u0440, \u0446\u0432\u0435\u0442): \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u044B \u0431\u0435\u0437 \u0438\u043C\u0451\u043D.");
    let size, color2;
    const def = t.width + Math.max(t.width, 4);
    if (a.length === 0) {
      size = def;
      color2 = t.pen;
    } else if (typeof a[0].value === "string" || a[0].value instanceof PyTuple) {
      color2 = t.screen.color(a, ctx, "dot");
      size = def;
    } else {
      size = a[0].value === null ? def : num(a[0], ctx);
      color2 = a.length > 1 ? t.screen.color(a.slice(1), ctx, "dot") : t.pen;
    }
    t.screen.push({ kind: "dot", id: t.id, t0: ctx.clock.now, x: t.x, y: t.y, size, color: color2 });
  },
  write: (t, a, kw, ctx) => {
    const p = bind("write", a, kw, ["arg", "move", "align", "font"], 1, ctx), align = p.align ? text2(p.align, ctx, '\u0441\u0442\u0440\u043E\u043A\u0430 "left", "center" \u0438\u043B\u0438 "right"') : "left";
    if (!["left", "center", "right"].includes(align)) ctx.fail('write: align \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C "left", "center" \u0438\u043B\u0438 "right".');
    let size = 8, weight = "normal";
    if (p.font) {
      const parts = ctx.items(p.font.value, "font");
      if (parts[1]) size = num(parts[1], ctx);
      if (parts[2] && typeof parts[2].value === "string") weight = parts[2].value;
    }
    if (size <= 0 || size > 200) ctx.fail("write: \u0440\u0430\u0437\u043C\u0435\u0440 \u0448\u0440\u0438\u0444\u0442\u0430 \u043E\u0442 1 \u0434\u043E 200.");
    t.screen.push({ kind: "text", id: t.id, t0: ctx.clock.now, x: t.x, y: t.y, text: ctx.str(p.arg).slice(0, 500), align, size, color: t.pen, weight });
  },
  stamp: (t, a, kw, ctx) => {
    t.screen.push({ kind: "stamp", id: t.id, t0: ctx.clock.now, pose: t.pose() });
    return arg(++t.stamps);
  },
  penup: (t) => {
    t.down = false;
  },
  pendown: (t) => {
    t.down = true;
  },
  isdown: (t) => arg(t.down),
  pensize: (t, a, kw, ctx) => {
    const { width } = bind("pensize", a, kw, ["width"], 0, ctx);
    if (!width) return arg(t.width);
    const w = num(width, ctx);
    if (w <= 0 || w > 500) ctx.fail("pensize: \u0442\u043E\u043B\u0449\u0438\u043D\u0430 \u043E\u0442 1 \u0434\u043E 500.");
    t.width = w;
    t.touch();
  },
  pencolor: (t, a, kw, ctx) => {
    if (kw.size) ctx.fail("pencolor: \u0446\u0432\u0435\u0442 \u0431\u0435\u0437 \u0438\u043C\u0435\u043D\u0438 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430.");
    if (!a.length) return t.screen.colorValue(t.pen, ctx);
    t.pen = t.screen.color(a, ctx, "pencolor");
    t.touch();
  },
  fillcolor: (t, a, kw, ctx) => {
    if (kw.size) ctx.fail("fillcolor: \u0446\u0432\u0435\u0442 \u0431\u0435\u0437 \u0438\u043C\u0435\u043D\u0438 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430.");
    if (!a.length) return t.screen.colorValue(t.fill, ctx);
    t.fill = t.screen.color(a, ctx, "fillcolor");
    t.touch();
  },
  color: (t, a, kw, ctx) => {
    if (kw.size) ctx.fail("color: \u0446\u0432\u0435\u0442\u0430 \u0431\u0435\u0437 \u0438\u043C\u0451\u043D \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432.");
    if (!a.length) return { value: ctx.tuple([t.screen.colorValue(t.pen, ctx), t.screen.colorValue(t.fill, ctx)]) };
    if (a.length === 2) {
      t.pen = t.screen.color([a[0]], ctx, "color");
      t.fill = t.screen.color([a[1]], ctx, "color");
    } else {
      t.pen = t.fill = t.screen.color(a, ctx, "color");
    }
    t.touch();
  },
  begin_fill: (t, a, kw, ctx) => {
    t.fillPath = [t.x, t.y];
    t.fillSlot = t.screen.scene.items.length;
    t.screen.push({ kind: "fill", id: t.id, t0: Infinity, points: [], color: t.fill });
    void ctx;
  },
  end_fill: (t, a, kw, ctx) => {
    if (!t.fillPath) return;
    const slot = t.screen.scene.items[t.fillSlot];
    if (slot?.kind === "fill") {
      if (t.fillPath.length > 4) {
        slot.points = t.fillPath;
        slot.color = t.fill;
        slot.t0 = ctx.clock.now;
        if (!t.screen.tracing) t.screen.held.push({ item: slot });
      } else slot.t0 = Infinity;
    }
    t.fillPath = null;
  },
  filling: (t) => arg(!!t.fillPath),
  position: (t) => ({ value: new Vec2D(t.x, t.y, t.xFloat, t.yFloat) }),
  xcor: (t) => arg(t.x, t.xFloat),
  ycor: (t) => arg(t.y, t.yFloat),
  heading: (t) => floatArg(t.headingValue()),
  distance: (t, a, kw, ctx) => {
    if (kw.size) ctx.fail("distance(x, y): \u0431\u0435\u0437 \u0438\u043C\u0451\u043D.");
    const [x, y] = point(t, a, ctx, "distance");
    return floatArg(Math.hypot(x - t.x, y - t.y));
  },
  towards: (t, a, kw, ctx) => {
    if (kw.size) ctx.fail("towards(x, y): \u0431\u0435\u0437 \u0438\u043C\u0451\u043D.");
    const [x, y] = point(t, a, ctx, "towards");
    return floatArg(pyMod2(pyRound(degrees(Math.atan2(y - t.y, x - t.x)), 10), 360));
  },
  speed: (t, a, kw, ctx) => {
    const { speed } = bind("speed", a, kw, ["speed"], 0, ctx);
    if (!speed || speed.value === null) return arg(t.speed);
    if (typeof speed.value === "string") {
      if (!(speed.value in speeds)) ctx.fail('speed: "fastest", "fast", "normal", "slow", "slowest" \u0438\u043B\u0438 \u0447\u0438\u0441\u043B\u043E 0\u201310.');
      t.speed = speeds[speed.value];
      return;
    }
    const s = num(speed, ctx);
    t.speed = s > 0.5 && s < 10.5 ? roundHalfEven(s) : 0;
  },
  hideturtle: (t) => {
    t.visible = false;
    t.touch();
  },
  showturtle: (t) => {
    t.visible = true;
    t.touch();
  },
  isvisible: (t) => arg(t.visible),
  shape: (t, a, kw, ctx) => {
    const { name } = bind("shape", a, kw, ["name"], 0, ctx);
    if (!name) return arg(t.shape);
    const s = text2(name, ctx, "\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0444\u043E\u0440\u043C\u044B");
    if (!shapes.includes(s)) ctx.fail(`shape: \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0444\u043E\u0440\u043C\u044B ${shapes.map((x) => `"${x}"`).join(", ")}.`);
    t.shape = s;
    t.touch();
  },
  shapesize: (t, a, kw, ctx) => {
    const p = bind("shapesize", a, kw, ["stretch_wid", "stretch_len", "outline"], 0, ctx);
    if (!p.stretch_wid) return { value: ctx.tuple([arg(t.stretch), arg(t.stretch), arg(1)]) };
    const s = num(p.stretch_wid, ctx);
    if (s <= 0 || s > 50) ctx.fail("shapesize: \u0440\u0430\u0437\u043C\u0435\u0440 \u043E\u0442 0.1 \u0434\u043E 50.");
    t.stretch = s;
    t.touch();
  },
  clear: (t, a, kw, ctx) => {
    t.screen.push({ kind: "clear", id: t.id, t0: ctx.clock.now });
  },
  reset: (t) => {
    t.reset();
  },
  getscreen: (t) => ({ value: screenObject(t.screen) }),
  onclick: (t, a, kw, ctx) => ctx.fail("\u0421\u043E\u0431\u044B\u0442\u0438\u044F \u043C\u044B\u0448\u0438 \u0438 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u044B \u0432 Kodik \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F: \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u0446\u0435\u043B\u0438\u043A\u043E\u043C, \u0437\u0430\u0442\u0435\u043C \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0430\u043D\u0438\u043C\u0430\u0446\u0438\u044F.")
};
var aliases = { fd: "forward", bk: "backward", back: "backward", lt: "left", rt: "right", setpos: "goto", setposition: "goto", seth: "setheading", pu: "penup", up: "penup", pd: "pendown", down: "pendown", width: "pensize", pos: "position", ht: "hideturtle", st: "showturtle", turtlesize: "shapesize", ondrag: "onclick", onrelease: "onclick" };
for (const [alias, name] of Object.entries(aliases)) turtleMethods[alias] = turtleMethods[name];
var drawing = new Set(Object.keys(turtleMethods).filter((name) => !["isdown", "position", "pos", "xcor", "ycor", "heading", "distance", "towards", "isvisible", "filling", "getscreen"].includes(name)));
var noop = () => void 0;
var unsupportedEvents = (s, a, kw, ctx) => ctx.fail("\u0421\u043E\u0431\u044B\u0442\u0438\u044F \u043C\u044B\u0448\u0438, \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u044B \u0438 \u0442\u0430\u0439\u043C\u0435\u0440\u044B \u0432 Kodik \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F: \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u0446\u0435\u043B\u0438\u043A\u043E\u043C, \u0437\u0430\u0442\u0435\u043C \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0430\u043D\u0438\u043C\u0430\u0446\u0438\u044F. \u0414\u043B\u044F \u0430\u043D\u0438\u043C\u0430\u0446\u0438\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0446\u0438\u043A\u043B\u044B \u0438 time.sleep.");
var screenMethods = {
  bgcolor: (s, a, kw, ctx) => {
    if (!a.length) return s.colorValue(s.bg, ctx);
    s.bg = s.color(a, ctx, "bgcolor");
    s.push({ kind: "bg", t0: ctx.clock.now, color: s.bg });
  },
  title: (s, a, kw, ctx) => {
    s.scene.title = text2(bind("title", a, kw, ["titlestring"], 1, ctx).titlestring, ctx).slice(0, 120);
  },
  setup: (s, a, kw, ctx) => {
    const p = bind("setup", a, kw, ["width", "height", "startx", "starty"], 0, ctx);
    const size = (v, base2, fallback) => !v || v.value === null ? fallback : v.float && num(v, ctx) <= 1 ? num(v, ctx) * base2 : num(v, ctx);
    const w = size(p.width, 1600, 800), h = size(p.height, 900, 600);
    if (w < 50 || h < 50 || w > 4e3 || h > 4e3) ctx.fail("setup: \u0448\u0438\u0440\u0438\u043D\u0430 \u0438 \u0432\u044B\u0441\u043E\u0442\u0430 \u043E\u043A\u043D\u0430 \u043E\u0442 50 \u0434\u043E 4000.");
    s.scene.size = [Math.round(w), Math.round(h)];
    if (!s.scene.view) s.scene.view = void 0;
  },
  screensize: (s, a, kw, ctx) => {
    const p = bind("screensize", a, kw, ["canvwidth", "canvheight", "bg"], 0, ctx);
    if (!p.canvwidth) return { value: ctx.tuple([arg(400), arg(300)]) };
    s.scene.size = [num(p.canvwidth, ctx), p.canvheight ? num(p.canvheight, ctx) : 300];
    if (p.bg) screenMethods.bgcolor(s, [p.bg], /* @__PURE__ */ new Map(), ctx);
  },
  setworldcoordinates: (s, a, kw, ctx) => {
    if (a.length !== 4) ctx.fail("setworldcoordinates(llx, lly, urx, ury).");
    const [x0, y0, x1, y1] = a.map((v) => num(v, ctx));
    if (x1 <= x0 || y1 <= y0) ctx.fail("setworldcoordinates: \u043F\u0440\u0430\u0432\u044B\u0439 \u0432\u0435\u0440\u0445\u043D\u0438\u0439 \u0443\u0433\u043E\u043B \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043F\u0440\u0430\u0432\u0435\u0435 \u0438 \u0432\u044B\u0448\u0435 \u043B\u0435\u0432\u043E\u0433\u043E \u043D\u0438\u0436\u043D\u0435\u0433\u043E.");
    s.scene.view = [x0, y0, x1, y1];
  },
  tracer: (s, a, kw, ctx) => {
    const p = bind("tracer", a, kw, ["n", "delay"], 0, ctx);
    if (!p.n || p.n.value === null) return arg(s.tracing);
    s.tracing = int(p.n, ctx) ? 1 : 0;
    if (p.delay && p.delay.value !== null) s.delay = Math.max(0, num(p.delay, ctx));
    if (s.tracing) s.flush();
  },
  update: (s) => {
    s.flush();
  },
  delay: (s, a, kw, ctx) => {
    const { delay } = bind("delay", a, kw, ["delay"], 0, ctx);
    if (!delay || delay.value === null) return arg(s.delay);
    s.delay = Math.max(0, Math.min(1e3, num(delay, ctx)));
  },
  colormode: (s, a, kw, ctx) => {
    const { cmode } = bind("colormode", a, kw, ["cmode"], 0, ctx);
    if (!cmode || cmode.value === null) return s.colormode === 1 ? floatArg(1) : arg(255);
    const m = num(cmode, ctx);
    if (m !== 1 && m !== 255) ctx.fail("colormode: 1.0 \u0438\u043B\u0438 255.");
    s.colormode = m === 255 ? 255 : 1;
  },
  clearscreen: (s, a, kw, ctx) => {
    s.push({ kind: "clear", id: null, t0: ctx.clock.now });
    s.bg = "white";
    s.push({ kind: "bg", t0: ctx.clock.now, color: "white" });
    for (const t of s.turtles) {
      t.visible = false;
      t.touch();
    }
    s.turtles = [];
    s.main = void 0;
    s.tracing = 1;
  },
  resetscreen: (s) => {
    for (const t of s.turtles) t.reset();
  },
  turtles: (s, a, kw, ctx) => ({ value: ctx.list(s.turtles.map((t) => ({ value: t }))) }),
  window_width: (s) => arg(s.scene.size?.[0] ?? 800),
  window_height: (s) => arg(s.scene.size?.[1] ?? 600),
  mainloop: noop,
  done: noop,
  exitonclick: noop,
  bye: noop,
  listen: noop,
  onkey: unsupportedEvents,
  onkeypress: unsupportedEvents,
  onkeyrelease: unsupportedEvents,
  onscreenclick: unsupportedEvents,
  onclick: unsupportedEvents,
  ontimer: unsupportedEvents,
  textinput: (s, a, kw, ctx) => ctx.fail("textinput \u0438 numinput \u0432 Kodik \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F: \u0434\u043B\u044F \u0432\u0432\u043E\u0434\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 input()."),
  numinput: (s, a, kw, ctx) => ctx.fail("textinput \u0438 numinput \u0432 Kodik \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F: \u0434\u043B\u044F \u0432\u0432\u043E\u0434\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 input()."),
  mode: (s, a, kw, ctx) => {
    const { mode } = bind("mode", a, kw, ["mode"], 0, ctx);
    if (!mode || mode.value === null) return arg("standard");
    if (mode.value !== "standard") ctx.fail('\u0412 Kodik \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0440\u0435\u0436\u0438\u043C "standard": 0\xB0 \u2014 \u0432\u043F\u0440\u0430\u0432\u043E, \u0443\u0433\u043B\u044B \u043F\u0440\u043E\u0442\u0438\u0432 \u0447\u0430\u0441\u043E\u0432\u043E\u0439 \u0441\u0442\u0440\u0435\u043B\u043A\u0438.');
  }
};
screenMethods.clear = screenMethods.clearscreen;
screenMethods.reset = screenMethods.resetscreen;
var ScreenObject = class extends PyObject {
  constructor(screen) {
    super();
    this.screen = screen;
  }
  typeName = "_Screen";
  repr() {
    return "<turtle._Screen object>";
  }
  getattr(name) {
    const m = screenMethods[name];
    return m ? { value: new PyNative(name, (a, kw, ctx) => m(this.screen, a, kw, ctx), true) } : void 0;
  }
};
var screenObjects = /* @__PURE__ */ new WeakMap();
var screenObject = (s) => {
  let o = screenObjects.get(s);
  if (!o) {
    o = new ScreenObject(s);
    screenObjects.set(s, o);
  }
  return o;
};
function turtleModule(ctx) {
  const scene = ctx.scene.turtle ?? (ctx.scene.turtle = { items: [], frames: [] });
  const screen = new Screen(scene, ctx);
  ctx.scene.onFinish(() => {
    screen.flush();
    scene.items = scene.items.filter((item) => item.kind !== "fill" || item.t0 !== Infinity && item.points.length > 4);
  });
  let next = 0;
  const create = () => {
    if (screen.turtles.length >= 50) ctx.fail("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0447\u0435\u0440\u0435\u043F\u0430\u0445 (\u0431\u043E\u043B\u044C\u0448\u0435 50).");
    const t = new TurtleObject(++next, screen);
    screen.turtles.push(t);
    t.touch();
    return t;
  };
  const main = () => screen.main ?? (screen.main = create());
  const attrs = /* @__PURE__ */ new Map();
  for (const name of Object.keys(turtleMethods)) attrs.set(name, { value: new PyNative(name, (a, kw, c) => turtleMethods[name](main(), a, kw, c), drawing.has(name)) });
  for (const name of Object.keys(screenMethods)) if (!["clear", "reset", "onclick"].includes(name)) attrs.set(name, { value: new PyNative(name, (a, kw, c) => screenMethods[name](screen, a, kw, c), true) });
  const turtleClass = new PyNative("Turtle", (a, kw, c) => {
    if (a.length || kw.size) c.fail("Turtle() \u0441\u043E\u0437\u0434\u0430\u044E\u0442 \u0431\u0435\u0437 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432.");
    return { value: create() };
  }, true);
  attrs.set("Turtle", { value: turtleClass });
  attrs.set("Pen", { value: turtleClass });
  attrs.set("RawTurtle", { value: turtleClass });
  attrs.set("Screen", { value: new PyNative("Screen", () => ({ value: screenObject(screen) })) });
  attrs.set("getturtle", { value: new PyNative("getturtle", () => ({ value: main() })) });
  attrs.set("getpen", attrs.get("getturtle"));
  attrs.set("getscreen", attrs.get("Screen"));
  attrs.set("Vec2D", { value: new PyNative("Vec2D", (a, kw, c) => {
    if (a.length !== 2) c.fail("Vec2D(x, y) \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430.");
    return { value: new Vec2D(num(a[0], c), num(a[1], c), !!a[0].float, !!a[1].float) };
  }) });
  return new PyModule("turtle", attrs, [...attrs.keys()]);
}

// src/python/modules.ts
var SUPPORTED_MODULES = ["math", "random", "time", "turtle", "numpy", "matplotlib.pyplot", "pyrob.api"];
function moduleLoader(ctx) {
  const loaded = /* @__PURE__ */ new Map();
  const create = (name) => {
    switch (name) {
      case "math":
        return mathModule();
      case "random":
        return randomModule();
      case "time":
        return timeModule(ctx);
      case "turtle":
        return turtleModule(ctx);
      case "numpy":
        return numpyModule();
      case "matplotlib":
      case "pyrob":
        return new PyModule(name, /* @__PURE__ */ new Map(), []);
      case "matplotlib.pyplot":
        return pyplotModule(ctx).pyplot;
      case "pyrob.api":
        return pyrobModules(ctx).api;
    }
    return void 0;
  };
  return function load(path) {
    const parts = path.split(".");
    let parent, root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts.slice(0, i + 1).join(".");
      let mod = loaded.get(name);
      if (!mod) {
        mod = create(name);
        if (!mod) {
          const known = SUPPORTED_MODULES.join(", ");
          return ctx.fail(i === 0 ? `\u041C\u043E\u0434\u0443\u043B\u044C \xAB${name}\xBB \u0432 Kodik \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u041C\u043E\u0436\u043D\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C: ${known}.` : `\u0412 \u043F\u0430\u043A\u0435\u0442\u0435 \xAB${parts.slice(0, i).join(".")}\xBB \u043D\u0435\u0442 \u043C\u043E\u0434\u0443\u043B\u044F \xAB${parts[i]}\xBB. \u041C\u043E\u0436\u043D\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C: ${known}.`);
        }
        loaded.set(name, mod);
      }
      if (parent) parent.attrs.set(parts[i], { value: mod });
      if (!root) root = mod;
      parent = mod;
    }
    return { root, leaf: parent };
  };
}

// src/pythonExecution.ts
var fail = (message) => {
  throw new Error(message);
};
var number2 = (v) => typeof v === "boolean" ? Number(v) : typeof v === "number" && Number.isFinite(v) ? v : fail("\u0417\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u043D\u043E \u0447\u0438\u0441\u043B\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043A\u0430\u0432\u044B\u0447\u043A\u0438 \u0438 \u043F\u0440\u0435\u043E\u0431\u0440\u0430\u0437\u043E\u0432\u0430\u043D\u0438\u0435 \u0432\u0432\u043E\u0434\u0430 \u0447\u0435\u0440\u0435\u0437 int.");
var equal = (a, b) => {
  if (a === b) return true;
  if ((typeof a === "number" || typeof a === "boolean") && (typeof b === "number" || typeof b === "boolean")) return Number(a) === Number(b);
  if (a instanceof PyTuple && b instanceof PyTuple && !(a instanceof NdArray)) return a.items.length === b.items.length && a.items.every((v, i) => equal(v, b.items[i]));
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => equal(v, b[i]));
};
var list = (v) => Array.isArray(v) ? v : fail("\u0417\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u0435\u043D \u0441\u043F\u0438\u0441\u043E\u043A.");
var ReturnSignal = class {
  constructor(result) {
    this.result = result;
  }
};
var PyType = class extends PyNative {
  constructor(name, fn, pythonType = name) {
    super(name, fn);
    this.pythonType = pythonType;
  }
  repr() {
    return `<class '${this.pythonType}'>`;
  }
};
var legacyBuiltins = /* @__PURE__ */ new Set(["print", "input", "int", "str", "len", "range", "forward", "right", "left"]);
var listMethods = /* @__PURE__ */ new Set(["append", "extend", "insert", "pop", "remove", "index", "count", "reverse", "sort", "copy", "clear"]);
var mutating = /* @__PURE__ */ new Set(["append", "extend", "insert", "pop", "remove", "reverse", "sort", "clear"]);
function runPythonAst(program, inputs = [], options = {}) {
  const output = [], segments = [], observed = /* @__PURE__ */ new Set(), reassigned = /* @__PURE__ */ new Set();
  let operations = 0, inputCursor = 0, x = 0, y = 0, heading = 0;
  let operationLimit = 1e4;
  let pendingOutput = "";
  const clock = { now: 0, sleep(ms) {
    this.now += ms;
  } }, outputTimes = [];
  const write = (text4) => {
    pendingOutput += text4;
    if (pendingOutput.length + output.reduce((n, line) => n + line.length, 0) > 1e5) fail("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0432\u044B\u0432\u043E\u0434\u0430.");
    let newline;
    while ((newline = pendingOutput.indexOf("\n")) >= 0) {
      if (output.length >= 500) fail("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0441\u0442\u0440\u043E\u043A \u0432\u044B\u0432\u043E\u0434\u0430.");
      output.push(pendingOutput.slice(0, newline));
      outputTimes.push(clock.now);
      pendingOutput = pendingOutput.slice(newline + 1);
    }
  };
  const flushOutput = () => {
    if (pendingOutput) {
      output.push(pendingOutput);
      outputTimes.push(clock.now);
      pendingOutput = "";
    }
  };
  const drawingTrail = /* @__PURE__ */ new Set();
  const globals = /* @__PURE__ */ new Map(), functions = /* @__PURE__ */ new Map();
  const floats = /* @__PURE__ */ new WeakMap();
  const localNames = /* @__PURE__ */ new WeakMap();
  globals.set("__name__", { value: "__main__", trail: /* @__PURE__ */ new Set() });
  const display2 = (v, floating = false, seen = /* @__PURE__ */ new Set(), repr = false) => {
    tick();
    if (Array.isArray(v)) {
      if (seen.has(v)) return "[...]";
      const nested = /* @__PURE__ */ new Set([...seen, v]);
      return `[${v.map((item, i) => display2(item, floats.get(v)?.has(i), nested, true)).join(", ")}]`;
    }
    if (v instanceof PyTuple && v.constructor === PyTuple) {
      const parts = v.items.map((item, i) => display2(item, floats.get(v.items)?.has(i), seen, true));
      return parts.length === 1 ? `(${parts[0]},)` : `(${parts.join(", ")})`;
    }
    if (v instanceof PyObject) return repr ? v.repr(ctx) : v.str(ctx);
    if (typeof v === "string" && repr) {
      const quote = v.includes("'") && !v.includes('"') ? '"' : "'";
      return quote + Array.from(v).map((char) => {
        if (char === "\\" || char === quote) return "\\" + char;
        if (char === "\n") return "\\n";
        if (char === "\r") return "\\r";
        if (char === "	") return "\\t";
        if (char !== " " && /[\p{C}\p{Z}]/u.test(char)) {
          const point2 = char.codePointAt(0);
          return point2 <= 255 ? "\\x" + point2.toString(16).padStart(2, "0") : point2 <= 65535 ? "\\u" + point2.toString(16).padStart(4, "0") : "\\U" + point2.toString(16).padStart(8, "0");
        }
        return char;
      }).join("") + quote;
    }
    if (typeof v === "number" && floating) {
      if (Number.isNaN(v)) return "nan";
      if (!Number.isFinite(v)) return v > 0 ? "inf" : "-inf";
      if (Object.is(v, -0)) return "-0.0";
      if (v !== 0 && (Math.abs(v) < 1e-4 || Math.abs(v) >= 1e16)) return v.toExponential().replace(/e([+-])(\d)$/, "e$10$2");
      return Number.isInteger(v) ? `${v}.0` : String(v);
    }
    return typeof v === "boolean" ? v ? "True" : "False" : v === null ? "None" : String(v);
  };
  const truth = (v) => Array.isArray(v) ? v.length > 0 : v instanceof PyObject ? v.truth(ctx) : Boolean(v);
  const compare2 = (a, b, operator) => {
    if (a instanceof NdArray || b instanceof NdArray) fail("\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u0432 numpy \u0432 \u0446\u0435\u043F\u043E\u0447\u043A\u0435 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F. \u0421\u0440\u0430\u0432\u043D\u0438 \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443: a > 1.");
    if (operator === "==") return equal(a, b);
    if (operator === "!=") return !equal(a, b);
    let order2;
    if ((typeof a === "number" || typeof a === "boolean") && (typeof b === "number" || typeof b === "boolean")) order2 = Number(a) - Number(b);
    else if (typeof a === "string" && typeof b === "string") {
      const lhs = Array.from(a), rhs = Array.from(b), index = lhs.findIndex((char, i) => char !== rhs[i]);
      order2 = index < 0 ? lhs.length - rhs.length : index >= rhs.length ? 1 : lhs[index].codePointAt(0) - rhs[index].codePointAt(0);
    } else return fail("\u0421\u0440\u0430\u0432\u043D\u0438\u0432\u0430\u0439 \u0434\u0432\u0430 \u0447\u0438\u0441\u043B\u0430 \u0438\u043B\u0438 \u0434\u0432\u0435 \u0441\u0442\u0440\u043E\u043A\u0438.");
    return operator === "<" ? order2 < 0 : operator === "<=" ? order2 <= 0 : operator === ">" ? order2 > 0 : order2 >= 0;
  };
  const tick = (count = 1) => {
    operations += count;
    if (operations > operationLimit) fail("\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043E\u043B\u0433\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0446\u0438\u043A\u043B\u0430.");
  };
  const track = (value, node, values = [], control = /* @__PURE__ */ new Set()) => ({ value, trail: /* @__PURE__ */ new Set([node, ...control, ...values.flatMap((item) => [...item.trail])]) });
  const observe = (result) => {
    for (const node of result.trail) observed.add(node);
  };
  const lookup = (name, scope) => scope.get(name) || (!localNames.get(scope)?.has(name) ? globals.get(name) : void 0);
  const items = (v, what = "\u0417\u0434\u0435\u0441\u044C") => {
    if (typeof v === "string") return Array.from(v).map((value) => ({ value }));
    if (Array.isArray(v)) return v.map((value, i) => ({ value, float: floats.get(v)?.has(i) }));
    if (v instanceof PyTuple && v.constructor === PyTuple) return v.items.map((value, i) => ({ value, float: floats.get(v.items)?.has(i) }));
    const result = v instanceof PyObject ? v.iterate(ctx) : void 0;
    return result ?? fail(`${what} \u043D\u0443\u0436\u0435\u043D \u0441\u043F\u0438\u0441\u043E\u043A, \u043A\u043E\u0440\u0442\u0435\u0436, \u0441\u0442\u0440\u043E\u043A\u0430 \u0438\u043B\u0438 \u043C\u0430\u0441\u0441\u0438\u0432.`);
  };
  const makeList = (args) => {
    if (args.length > 1e4) fail("\u0421\u043F\u0438\u0441\u043E\u043A \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439.");
    const values = args.map((a) => a.value);
    floats.set(values, new Set(args.flatMap((a, i) => a.float ? [i] : [])));
    return values;
  };
  const makeTuple = (args) => new PyTuple(makeList(args));
  const scene = new SceneBuilder();
  let current = { depth: 0, control: /* @__PURE__ */ new Set() };
  const ctx = {
    fail,
    tick,
    truth,
    compare: compare2,
    str: (a) => display2(a.value, a.float),
    repr: (a) => display2(a.value, a.float, /* @__PURE__ */ new Set(), true),
    items: (v, what) => items(v, what),
    list: makeList,
    tuple: makeTuple,
    replace: (target, values) => {
      target.splice(0, target.length, ...values.map((a) => a.value));
      floats.set(target, new Set(values.flatMap((a, i) => a.float ? [i] : [])));
    },
    clock,
    scene,
    world: options.world,
    state: /* @__PURE__ */ new Map(),
    callUser: (name) => {
      const fn = functions.get(name) ?? fail(`\u0424\u0443\u043D\u043A\u0446\u0438\u044F \xAB${name}\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.`);
      callFunction(fn, [], { kind: "call", name, args: [] }, current.depth, current.control);
    }
  };
  const loadModule = moduleLoader(ctx);
  const natives = builtinNatives();
  const typeValue = (name) => {
    if (name === "float" || name === "bool") return new PyType(name, natives.get(name).fn);
    if (name === "int" || name === "str") return new PyType(name, (args, kw) => {
      if (kw.size) fail(`\u0423 ${name}() \u043D\u0435\u0442 \u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432.`);
      return callLegacy(name, args.map((a) => ({ ...a, trail: /* @__PURE__ */ new Set() })), /* @__PURE__ */ new Map(), { kind: "call", name, args: [] }, /* @__PURE__ */ new Set());
    });
    if (["print", "input", "len", "range"].includes(name)) return new PyNative(name, (args, kw) => callLegacy(name, args.map((a) => ({ ...a, trail: /* @__PURE__ */ new Set() })), new Map([...kw].map(([k, v]) => [k, { ...v, trail: /* @__PURE__ */ new Set() }])), { kind: "call", name, args: [] }, /* @__PURE__ */ new Set()));
    return natives.get(name);
  };
  natives.set("bool", new PyNative("bool", (args, kw) => {
    if (kw.size || args.length > 1) fail("bool() \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u043E\u0434\u043D\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.");
    return { value: args.length ? truth(args[0].value) : false };
  }));
  const loaded = (name) => {
    operationLimit = 1e5;
    return loadModule(name);
  };
  const sliceOf = (v, s) => {
    if (typeof v === "string") {
      const chars = Array.from(v);
      return { value: s.indices(chars.length, ctx).map((i) => chars[i]).join("") };
    }
    const source = v instanceof PyTuple ? items(v) : items(list(v));
    const picked = s.indices(source.length, ctx).map((i) => source[i]);
    tick(Math.ceil(picked.length / 20));
    return { value: v instanceof PyTuple ? makeTuple(picked) : makeList(picked) };
  };
  const listMethod = (target, name) => new PyNative(name, (args, kw) => {
    if (kw.size && !(name === "sort" && [...kw.keys()].every((k) => k === "reverse"))) fail(`\u0423 ${name}() \u043D\u0435\u0442 \u0442\u0430\u043A\u0438\u0445 \u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432.`);
    const meta = floats.get(target) || /* @__PURE__ */ new Set(), current2 = items(target);
    const arity = (min2, max2 = min2) => {
      if (args.length < min2 || args.length > max2) fail(`${name}() \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 ${min2 === max2 ? min2 : `\u043E\u0442 ${min2} \u0434\u043E ${max2}`} \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439.`);
    };
    const set = (next) => {
      if (next.length > 1e3) fail("\u0421\u043F\u0438\u0441\u043E\u043A \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439.");
      ctx.replace(target, next);
    };
    switch (name) {
      case "append":
        arity(1);
        set([...current2, args[0]]);
        return;
      case "extend":
        arity(1);
        set([...current2, ...items(args[0].value, "\u0412 extend")]);
        return;
      case "insert": {
        arity(2);
        const i = number2(args[0].value), at = i < 0 ? Math.max(0, current2.length + i) : Math.min(i, current2.length);
        current2.splice(at, 0, args[1]);
        set(current2);
        return;
      }
      case "pop": {
        arity(0, 1);
        if (!current2.length) fail("pop(): \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0441\u0442.");
        const i = args.length ? number2(args[0].value) : -1;
        if (i < -current2.length || i >= current2.length) fail("pop(): \u0442\u0430\u043A\u043E\u0433\u043E \u0438\u043D\u0434\u0435\u043A\u0441\u0430 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0435\u0442.");
        const [removed] = current2.splice(i < 0 ? current2.length + i : i, 1);
        set(current2);
        return removed;
      }
      case "remove": {
        arity(1);
        const i = current2.findIndex((a) => equal(a.value, args[0].value));
        if (i < 0) fail("remove(): \u0442\u0430\u043A\u043E\u0433\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0435\u0442.");
        current2.splice(i, 1);
        set(current2);
        return;
      }
      case "index": {
        arity(1);
        const i = current2.findIndex((a) => equal(a.value, args[0].value));
        if (i < 0) fail(`index(): \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F ${display2(args[0].value, args[0].float, /* @__PURE__ */ new Set(), true)} \u043D\u0435\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435.`);
        return { value: i };
      }
      case "count":
        arity(1);
        return { value: current2.filter((a) => equal(a.value, args[0].value)).length };
      case "reverse":
        arity(0);
        set(current2.reverse());
        return;
      case "sort": {
        arity(0);
        const reverse = kw.get("reverse");
        current2.sort((a, b) => {
          tick();
          return compare2(a.value, b.value, "<") ? -1 : compare2(b.value, a.value, "<") ? 1 : 0;
        });
        if (reverse && truth(reverse.value)) current2.reverse();
        set(current2);
        return;
      }
      case "copy":
        arity(0);
        return { value: makeList(current2) };
      case "clear":
        arity(0);
        set([]);
        return;
    }
    void meta;
  });
  const attribute = (v, name) => {
    const result = v instanceof PyObject ? v.getattr(name, ctx) : Array.isArray(v) && listMethods.has(name) ? { value: listMethod(v, name) } : void 0;
    if (result) return result;
    if (v instanceof PyModule) return fail(`\u0412 \u043C\u043E\u0434\u0443\u043B\u0435 \xAB${v.name}\xBB \u043D\u0435\u0442 \xAB${name}\xBB. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0432 \u0441\u043F\u0440\u0430\u0432\u043A\u0435 \u043F\u043E \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430\u043C.`);
    if (typeof v === "string") return fail(`\u041C\u0435\u0442\u043E\u0434\u044B \u0441\u0442\u0440\u043E\u043A (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, .${name}()) \u0432 Kodik \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F.`);
    if (Array.isArray(v)) return fail(`\u0423 \u0441\u043F\u0438\u0441\u043A\u0430 \u043D\u0435\u0442 \u043C\u0435\u0442\u043E\u0434\u0430 \xAB${name}\xBB. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B: ${[...listMethods].join(", ")}.`);
    return fail(`\u0423 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F ${v === null ? "None" : v instanceof PyObject ? `\u0442\u0438\u043F\u0430 ${v.typeName}` : typeof v === "number" ? "\u0447\u0438\u0441\u043B\u0430" : "\u044D\u0442\u043E\u0433\u043E \u0442\u0438\u043F\u0430"} \u043D\u0435\u0442 \xAB${name}\xBB.`);
  };
  const invoke = (callee, args, kw, node, depth, control) => {
    const target = callee.value;
    if (!(target instanceof PyObject) || !target.callable()) return fail(`\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \xAB${node.name}\xBB \u043D\u0435\u043B\u044C\u0437\u044F \u0432\u044B\u0437\u0432\u0430\u0442\u044C \u043A\u0430\u043A \u0444\u0443\u043D\u043A\u0446\u0438\u044E.`);
    const saved = current;
    current = { depth, control };
    let result;
    try {
      result = target.call(args, kw, ctx);
    } finally {
      current = saved;
    }
    const out = result ?? { value: null };
    const tracked = { ...track(out.value, node, [callee, ...args, ...kw.values()], control), float: typeof out.value === "number" && !!out.float };
    if (target instanceof PyNative && target.effect) {
      for (const part of tracked.trail) drawingTrail.add(part);
      observe({ value: null, trail: drawingTrail });
    }
    return tracked;
  };
  const callLegacy = (name, args, kw, node, control) => {
    const done = (value, children2 = [], floating = false) => ({ ...track(value, node, children2, control), float: typeof value === "number" && floating });
    const values = args.map((arg3) => arg3.value);
    if (name === "print") {
      for (const key2 of kw.keys()) if (!["sep", "end", "flush"].includes(key2)) fail(`\u0423 print() \u043D\u0435\u0442 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0430 \xAB${key2}\xBB${key2 === "file" ? ": \u0432\u044B\u0432\u043E\u0434 \u0432 \u0444\u0430\u0439\u043B\u044B \u0432 Kodik \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F" : ""}.`);
      const option = (key2, fallback) => {
        const v = kw.get(key2)?.value;
        if (v === void 0 || v === null) return fallback;
        return typeof v === "string" ? v : fail(`${key2} \u0432 print() \u2014 \u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u043A\u0430\u0432\u044B\u0447\u043A\u0430\u0445.`);
      };
      write(args.map((arg3) => display2(arg3.value, arg3.float)).join(option("sep", " ")) + option("end", "\n"));
      const all = [...args, ...kw.values()];
      observe(done(null, all));
      return done(null, all);
    }
    if (kw.size) fail(`\u0423 ${name}() \u043D\u0435\u0442 \u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432.`);
    if (name === "input") {
      if (args.length > 1) fail("\u0412 input \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043E\u0434\u043D\u043E\u0439 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438.");
      if (args.length) {
        write(display2(values[0], args[0].float));
        observe(done(null, args));
      }
      if (inputCursor >= inputs.length) fail("\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043A\u043E\u043C\u0430\u043D\u0434 input: \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0437\u0430\u0434\u0430\u043D\u0438\u044F \u0432\u0432\u043E\u0434 \u0443\u0436\u0435 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0441\u044F.");
      return done(inputs[inputCursor++], args);
    }
    if (["int", "str", "len"].includes(name)) {
      if (args.length === 0 && name !== "len") return done(name === "int" ? 0 : "", args);
      if (args.length !== 1) fail(`${name} \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u043E\u0434\u043D\u043E \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.`);
      if (name === "str") return done(display2(values[0], args[0].float), args);
      if (name === "len") {
        const v = values[0];
        if (v instanceof PyObject) {
          const size = v.size();
          if (size === void 0) fail(`\u0423 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0442\u0438\u043F\u0430 ${v.typeName} \u043D\u0435\u0442 \u0434\u043B\u0438\u043D\u044B.`);
          return done(size, args);
        }
        return done(typeof v === "string" ? Array.from(v).length : list(v).length, args);
      }
      const source = values[0];
      if (typeof source === "string" && !/^[+-]?\d(?:_?\d)*$/.test(source.trim())) fail("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u0435\u0432\u0440\u0430\u0442\u0438\u0442\u044C \u0432\u0432\u043E\u0434 \u0432 \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C int(input()).");
      if (typeof source !== "number" && typeof source !== "boolean" && typeof source !== "string") fail("\u0412 int \u043F\u0435\u0440\u0435\u0434\u0430\u0439 \u0447\u0438\u0441\u043B\u043E \u0438\u043B\u0438 \u0441\u0442\u0440\u043E\u043A\u0443 \u0441 \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C.");
      const value = Math.trunc(typeof source === "string" ? Number(source.trim().replace(/_/g, "")) : Number(source));
      if (!Number.isFinite(value) || !Number.isSafeInteger(value)) fail("\u0427\u0438\u0441\u043B\u043E \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u0443\u0447\u0435\u0431\u043D\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430.");
      return done(value, args);
    }
    if (name === "range") {
      if (args.length < 1 || args.length > 3) fail("\u0423 range \u043D\u0443\u0436\u043D\u044B \u0433\u0440\u0430\u043D\u0438\u0446\u044B \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430 \u0438, \u0435\u0441\u043B\u0438 \u043D\u0443\u0436\u043D\u043E, \u0448\u0430\u0433.");
      const numbers2 = values.map(number2), start = numbers2.length === 1 ? 0 : numbers2[0], end = numbers2.length === 1 ? numbers2[0] : numbers2[1], step = numbers2[2] ?? 1;
      if (args.some((arg3) => arg3.float) || ![start, end, step].every(Number.isInteger) || step === 0) fail("\u0412 range \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0446\u0435\u043B\u044B\u0435 \u0447\u0438\u0441\u043B\u0430 \u0438 \u043D\u0435\u043D\u0443\u043B\u0435\u0432\u043E\u0439 \u0448\u0430\u0433.");
      const result2 = [];
      for (let current2 = start; step > 0 ? current2 < end : current2 > end; current2 += step) {
        if (result2.length >= 1e3) fail("\u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0433\u0440\u0430\u043D\u0438\u0446\u044B range.");
        result2.push(current2);
      }
      return done(result2, args);
    }
    if (args.length !== 1) fail("\u0414\u043B\u044F \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043F\u043E\u0432\u043E\u0440\u043E\u0442\u0430 \u0443\u043A\u0430\u0436\u0438 \u043E\u0434\u043D\u043E \u0447\u0438\u0441\u043B\u043E.");
    const amount = number2(values[0]);
    if (Math.abs(amount) > 1e4) fail("\u0428\u0430\u0433 \u0438\u043B\u0438 \u043F\u043E\u0432\u043E\u0440\u043E\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0432\u0435\u043B\u0438\u043A. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0447\u0438\u0441\u043B\u043E.");
    if (name === "forward") {
      if (segments.length >= 500) fail("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043B\u0438\u043D\u0438\u0439. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0447\u0438\u0441\u043B\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0439.");
      const nextX = x + Math.cos(heading * Math.PI / 180) * amount, nextY = y + Math.sin(heading * Math.PI / 180) * amount;
      segments.push({ x1: x, y1: y, x2: nextX, y2: nextY });
      x = nextX;
      y = nextY;
    } else heading += name === "left" ? amount : -amount;
    const result = done(null, args);
    for (const part of result.trail) drawingTrail.add(part);
    if (name === "forward") observe({ value: null, trail: drawingTrail });
    return result;
  };
  const collectLocals = (fn) => {
    const names = new Set(fn.params);
    const collect = (body) => {
      for (const item of body) {
        if (item.kind === "assign" && !item.index || item.kind === "for") names.add(item.name);
        if (item.kind === "unpack") item.names.forEach((name) => names.add(name));
        if (item.kind === "import") item.modules.forEach((m) => names.add(m.alias ?? m.name.split(".")[0]));
        if (item.kind === "from" && !item.star) item.names.forEach((n) => names.add(n.alias ?? n.name));
        if (item.kind === "for" || item.kind === "while") collect(item.body);
        if (item.kind === "if") {
          item.branches.forEach((branch) => collect(branch.body));
          collect(item.otherwise);
        }
      }
    };
    collect(fn.body);
    return names;
  };
  const callFunction = (fn, args, node, depth, control) => {
    if (fn.params.length !== args.length) fail(`\u042D\u0442\u0430 \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 ${fn.params.length} \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u044B\u0437\u043E\u0432 \u0438 \u0441\u0442\u0440\u043E\u043A\u0443 def.`);
    if (depth >= 40) fail("\u0424\u0443\u043D\u043A\u0446\u0438\u044F \u0432\u044B\u0437\u044B\u0432\u0430\u0435\u0442 \u0441\u0435\u0431\u044F \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0440\u0430\u0437. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438.");
    const local = new Map(fn.params.map((name, index) => [name, args[index]])), inside = /* @__PURE__ */ new Set([...control, node, fn]);
    localNames.set(local, collectLocals(fn));
    try {
      execute(fn.body, local, depth + 1, inside);
    } catch (signal) {
      if (signal instanceof ReturnSignal) return { ...track(signal.result.value, node, [signal.result, ...args], control), float: typeof signal.result.value === "number" && !!signal.result.float };
      throw signal;
    }
    return track(null, fn, args, inside);
  };
  const evaluate2 = (node, scope, depth, control) => {
    tick();
    const done = (value, children2 = [], floating = false) => ({ ...track(value, node, children2, control), float: typeof value === "number" && floating });
    if (node.kind === "literal") return done(node.value, [], node.float);
    if (node.kind === "name") {
      const value = lookup(node.name, scope);
      if (value) return done(value.value, [value], value.float);
      const builtin = typeValue(node.name);
      if (builtin) return done(builtin);
      return fail(`\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0434\u0430\u0439 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \xAB${node.name}\xBB.`);
    }
    if (node.kind === "list") {
      if (node.items.length > 1e3) fail("\u0421\u043F\u0438\u0441\u043E\u043A \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439.");
      const items2 = node.items.map((item) => evaluate2(item, scope, depth, control)), values = items2.map((item) => item.value);
      floats.set(values, new Set(items2.flatMap((item, i) => item.float ? [i] : [])));
      return done(values, items2);
    }
    if (node.kind === "tuple") {
      const parts = node.items.map((item) => evaluate2(item, scope, depth, control));
      return done(makeTuple(parts), parts);
    }
    if (node.kind === "slice") {
      const parts = [node.start, node.stop, node.step].map((part) => part ? evaluate2(part, scope, depth, control) : void 0);
      const bound2 = (part) => {
        if (!part || part.value === null) return null;
        const v = number2(part.value);
        if (part.float || !Number.isInteger(v)) fail("\u0413\u0440\u0430\u043D\u0438\u0446\u044B \u0441\u0440\u0435\u0437\u0430 \u2014 \u0446\u0435\u043B\u044B\u0435 \u0447\u0438\u0441\u043B\u0430.");
        return v;
      };
      return done(new PySlice(bound2(parts[0]), bound2(parts[1]), bound2(parts[2])), parts.filter((p) => !!p));
    }
    if (node.kind === "attribute") {
      const target = evaluate2(node.target, scope, depth, control), result = attribute(target.value, node.name);
      return done(result.value, [target], result.float);
    }
    if (node.kind === "unary") {
      const child = evaluate2(node.value, scope, depth, control);
      if (child.value instanceof NdArray && node.operator !== "not") {
        const r = node.operator === "-" ? arrayNegate(child.value, ctx) : { value: child.value };
        return done(r.value, [child]);
      }
      return done(node.operator === "not" ? !truth(child.value) : node.operator === "+" ? number2(child.value) : -number2(child.value), [child], child.float);
    }
    if (node.kind === "compare") {
      const children2 = [evaluate2(node.operands[0], scope, depth, control)];
      for (let i = 0; i < node.operators.length; i++) {
        const right = evaluate2(node.operands[i + 1], scope, depth, control);
        children2.push(right);
        if (!compare2(children2[i].value, right.value, node.operators[i])) return done(false, children2);
      }
      return done(true, children2);
    }
    if (node.kind === "index") {
      const target = evaluate2(node.target, scope, depth, control), position = evaluate2(node.index, scope, depth, control);
      if (target.value instanceof NdArray) {
        const r = arrayGet(target.value, position, ctx);
        return done(r.value, [target, position], r.float);
      }
      if (position.value instanceof PySlice) {
        const r = sliceOf(target.value, position.value);
        return done(r.value, [target, position]);
      }
      if (position.value instanceof PyTuple) fail("\u041D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0438\u043D\u0434\u0435\u043A\u0441\u043E\u0432 \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0443 \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u0432 numpy.");
      if (target.value instanceof PyTuple) {
        const parts = items(target.value), index2 = number2(position.value);
        if (position.float || !Number.isInteger(index2) || index2 < -parts.length || index2 >= parts.length) fail("\u0422\u0430\u043A\u043E\u0433\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430 \u043D\u0435\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0438\u043D\u0434\u0435\u043A\u0441: \u043F\u0435\u0440\u0432\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0438\u043C\u0435\u0435\u0442 \u0438\u043D\u0434\u0435\u043A\u0441 0.");
        const item = parts[index2 < 0 ? parts.length + index2 : index2];
        return done(item.value, [target, position], item.float);
      }
      if (target.value instanceof PyObject) fail(`\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0442\u0438\u043F\u0430 ${target.value.typeName} \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u043D\u0434\u0435\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u0442\u044C.`);
      const values = typeof target.value === "string" ? Array.from(target.value) : list(target.value), index = number2(position.value);
      if (position.float || !Number.isInteger(index) || index < -values.length || index >= values.length) fail("\u0422\u0430\u043A\u043E\u0433\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0435\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0438\u043D\u0434\u0435\u043A\u0441: \u043F\u0435\u0440\u0432\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0438\u043C\u0435\u0435\u0442 \u0438\u043D\u0434\u0435\u043A\u0441 0.");
      const offset = index < 0 ? values.length + index : index;
      return done(values[offset], [target, position], floats.get(values)?.has(offset));
    }
    if (node.kind === "binary") {
      const left = evaluate2(node.left, scope, depth, control);
      if (node.operator === "and" && !truth(left.value) || node.operator === "or" && truth(left.value)) return done(left.value, [left], left.float);
      const right = evaluate2(node.right, scope, depth, control), a = left.value, b = right.value, children2 = [left, right];
      if (node.operator === "and" || node.operator === "or") return done(b, children2, right.float);
      if (a instanceof NdArray || b instanceof NdArray) {
        const r = arrayBinary(node.operator, left, right, ctx);
        return done(r.value, children2, r.float);
      }
      if (node.operator === "==") return done(equal(a, b), children2);
      if (node.operator === "!=") return done(!equal(a, b), children2);
      if (["<", "<=", ">", ">="].includes(node.operator)) {
        return done(compare2(a, b, node.operator), children2);
      }
      if (node.operator === "+" && typeof a === "string" && typeof b === "string") {
        if (a.length + b.length > 12e3) fail("\u0421\u0442\u0440\u043E\u043A\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u0430\u044F.");
        return done(a + b, children2);
      }
      if (node.operator === "+" && Array.isArray(a) && Array.isArray(b)) {
        if (a.length + b.length > 1e3) fail("\u0421\u043F\u0438\u0441\u043E\u043A \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439.");
        const result2 = [...a, ...b];
        floats.set(result2, /* @__PURE__ */ new Set([...floats.get(a) || [], ...[...floats.get(b) || []].map((i) => i + a.length)]));
        return done(result2, children2);
      }
      if (node.operator === "+" && a instanceof PyTuple && b instanceof PyTuple) return done(makeTuple([...items(a), ...items(b)]), children2);
      if (node.operator === "*" && (typeof a === "string" || Array.isArray(a) || typeof b === "string" || Array.isArray(b))) {
        const sequence = typeof a === "string" || Array.isArray(a) ? left : right, count = sequence === left ? right : left, n = number2(count.value);
        if (count.float || !Number.isInteger(n)) fail("\u0414\u043B\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F \u0441\u0442\u0440\u043E\u043A\u0438 \u0438\u043B\u0438 \u0441\u043F\u0438\u0441\u043A\u0430 \u043D\u0443\u0436\u043D\u043E \u0446\u0435\u043B\u043E\u0435 \u0447\u0438\u0441\u043B\u043E.");
        const value = sequence.value, times = Math.max(0, n);
        if (times * value.length > (typeof value === "string" ? 12e3 : 1e3)) fail("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439.");
        if (typeof value === "string") return done(value.repeat(times), children2);
        if (!value.length) return done([], children2);
        const result2 = [], metadata2 = /* @__PURE__ */ new Set();
        for (let i = 0; i < times; i++) for (let j = 0; j < value.length; j++) {
          if (floats.get(value)?.has(j)) metadata2.add(result2.length);
          result2.push(value[j]);
        }
        floats.set(result2, metadata2);
        return done(result2, children2);
      }
      const lhs = number2(a), rhs = number2(b);
      if (["/", "//", "%"].includes(node.operator) && rhs === 0) fail("\u0414\u0435\u043B\u0438\u0442\u044C \u043D\u0430 \u043D\u043E\u043B\u044C \u043D\u0435\u043B\u044C\u0437\u044F. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0434\u0435\u043B\u0438\u0442\u0435\u043B\u044C.");
      let remainder = 0, quotient = 0;
      if (node.operator === "//" || node.operator === "%") {
        remainder = lhs % rhs;
        quotient = (lhs - remainder) / rhs;
        if (remainder !== 0) {
          if (remainder < 0 !== rhs < 0) {
            remainder += rhs;
            quotient--;
          }
        } else remainder = rhs < 0 ? -0 : 0;
        if (quotient !== 0) {
          const floor = Math.floor(quotient);
          quotient = floor + (quotient - floor > 0.5 ? 1 : 0);
        } else quotient = lhs / rhs < 0 || Object.is(lhs / rhs, -0) ? -0 : 0;
      }
      const result = node.operator === "+" ? lhs + rhs : node.operator === "-" ? lhs - rhs : node.operator === "*" ? lhs * rhs : node.operator === "/" ? lhs / rhs : node.operator === "//" ? quotient : node.operator === "%" ? remainder : lhs ** rhs;
      if (!Number.isFinite(result) || Math.abs(result) > 1e12) fail("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435.");
      return done(result, children2, node.operator === "/" || left.float || right.float || node.operator === "**" && rhs < 0);
    }
    const callee = node.callee ? evaluate2(node.callee, scope, depth, control) : void 0;
    const args = node.args.map((arg3) => evaluate2(arg3, scope, depth, control));
    const kw = new Map((node.keywords || []).map((item) => [item.name, evaluate2(item.value, scope, depth, control)]));
    if (callee) {
      const result = invoke(callee, args, kw, node, depth, control);
      if (node.callee.kind === "attribute" && node.callee.target.kind === "name" && mutating.has(node.name)) {
        const owner = lookup(node.callee.target.name, scope);
        if (owner && Array.isArray(owner.value)) for (const part of result.trail) owner.trail.add(part);
      }
      return result;
    }
    const bound = lookup(node.name, scope);
    if (bound && bound.value instanceof PyObject && bound.value.callable()) return invoke(bound, args, kw, node, depth, control);
    if (legacyBuiltins.has(node.name) && !bound) return callLegacy(node.name, args, kw, node, control);
    const fn = functions.get(node.name);
    if (localNames.get(scope)?.has(node.name) || scope.has(node.name) || globals.has(node.name)) fail(`\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \xAB${node.name}\xBB \u043D\u0435\u043B\u044C\u0437\u044F \u0432\u044B\u0437\u0432\u0430\u0442\u044C \u043A\u0430\u043A \u0444\u0443\u043D\u043A\u0446\u0438\u044E.`);
    if (!fn) {
      const builtin = typeValue(node.name);
      if (builtin) return invoke(done(builtin), args, kw, node, depth, control);
    }
    if (!fn) return fail(`\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u043F\u0438\u0448\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044E \xAB${node.name}\xBB \u0447\u0435\u0440\u0435\u0437 def, \u0437\u0430\u0442\u0435\u043C \u0432\u044B\u0437\u043E\u0432\u0438 \u0435\u0451.`);
    if (kw.size) {
      const named = fn.params.map((name, i) => args[i]);
      if (args.length > fn.params.length) fail(`\u042D\u0442\u0430 \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 ${fn.params.length} \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u043E\u0432. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0432\u044B\u0437\u043E\u0432 \u0438 \u0441\u0442\u0440\u043E\u043A\u0443 def.`);
      for (const [name, value] of kw) {
        const at = fn.params.indexOf(name);
        if (at < 0) fail(`\u0423 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \xAB${node.name}\xBB \u043D\u0435\u0442 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0430 \xAB${name}\xBB.`);
        if (named[at]) fail(`\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \xAB${name}\xBB \u043F\u0435\u0440\u0435\u0434\u0430\u043D \u0434\u0432\u0430\u0436\u0434\u044B.`);
        named[at] = value;
      }
      const missing = fn.params.find((_, i) => !named[i]);
      if (missing) fail(`\u0412 \u0432\u044B\u0437\u043E\u0432\u0435 \xAB${node.name}\xBB \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0434\u043B\u044F \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0430 \xAB${missing}\xBB.`);
      return callFunction(fn, named, node, depth, control);
    }
    return callFunction(fn, args, node, depth, control);
  };
  const bindName = (scope, name, value, item, control) => {
    if (scope.has(name) && item.kind === "unpack") reassigned.add(item);
    scope.set(name, { ...track(value.value, item, [], control), float: typeof value.value === "number" && !!value.float });
  };
  const execute = (items_, scope, depth, control) => {
    for (const item of items_) {
      tick();
      if (item.kind === "pass") continue;
      if (item.kind === "import") {
        for (const m of item.modules) {
          const { root, leaf } = loaded(m.name);
          bindName(scope, m.alias ?? m.name.split(".")[0], { value: m.alias ? leaf : root }, item, control);
        }
        continue;
      }
      if (item.kind === "from") {
        const { leaf } = loaded(item.module);
        if (item.star) {
          for (const name of leaf.exports) bindName(scope, name, leaf.attrs.get(name), item, control);
          continue;
        }
        for (const n of item.names) {
          let value = leaf.getattr(n.name);
          if (!value) {
            try {
              value = { value: loaded(`${item.module}.${n.name}`).leaf };
            } catch {
            }
          }
          if (!value) fail(`\u0412 \u043C\u043E\u0434\u0443\u043B\u0435 \xAB${item.module}\xBB \u043D\u0435\u0442 \xAB${n.name}\xBB. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0432 \u0441\u043F\u0440\u0430\u0432\u043A\u0435 \u043F\u043E \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430\u043C.`);
          bindName(scope, n.alias ?? n.name, value, item, control);
        }
        continue;
      }
      if (item.kind === "function") {
        scope.delete(item.name);
        functions.set(item.name, item);
        for (const decorator of item.decorators || []) {
          const head = decorator.kind === "call" ? decorator.callee ?? { kind: "name", name: decorator.name } : decorator;
          if (head.kind === "name" && !lookup(head.name, scope)) fail("\u0414\u0435\u043A\u043E\u0440\u0430\u0442\u043E\u0440 @ \u0432 Kodik \u2014 \u0442\u043E\u043B\u044C\u043A\u043E @task \u0438\u0437 pyrob.api.");
          const value = evaluate2(decorator, scope, depth, control).value;
          if (!(value instanceof PyNative) || !value.decorate) fail("\u0414\u0435\u043A\u043E\u0440\u0430\u0442\u043E\u0440 @ \u0432 Kodik \u2014 \u0442\u043E\u043B\u044C\u043A\u043E @task \u0438\u0437 pyrob.api.");
          value.decorate(item.name, ctx);
        }
        continue;
      }
      if (item.kind === "return") {
        if (!depth) fail("\u041F\u043E\u043C\u0435\u0441\u0442\u0438 return \u0432\u043D\u0443\u0442\u0440\u044C \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C.");
        const result = evaluate2(item.value, scope, depth, control);
        throw new ReturnSignal({ ...track(result.value, item, [result], control), float: result.float });
      }
      if (item.kind === "expression") {
        evaluate2(item.value, scope, depth, /* @__PURE__ */ new Set([...control, item]));
        continue;
      }
      if (item.kind === "unpack") {
        const result = evaluate2(item.value, scope, depth, control), parts = items(result.value, "\u0421\u043F\u0440\u0430\u0432\u0430 \u043E\u0442 =");
        if (parts.length !== item.names.length) fail(`\u0421\u043B\u0435\u0432\u0430 ${item.names.length} \u0438\u043C\u0451\u043D, \u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439 ${parts.length}. \u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0442\u044C.`);
        item.names.forEach((name, i) => {
          if (scope.has(name)) reassigned.add(item);
          scope.set(name, { ...track(parts[i].value, item, [result], control), float: typeof parts[i].value === "number" && !!parts[i].float });
        });
        continue;
      }
      if (item.kind === "assign") {
        const result = evaluate2(item.value, scope, depth, control), assigned = { ...track(result.value, item, [result], control), float: result.float };
        if (item.index) {
          const owner = scope.get(item.name) || (!localNames.get(scope)?.has(item.name) ? globals.get(item.name) : void 0);
          if (!owner) fail("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0437\u0434\u0430\u0439 \u0441\u043F\u0438\u0441\u043E\u043A, \u0437\u0430\u0442\u0435\u043C \u043C\u0435\u043D\u044F\u0439 \u0435\u0433\u043E \u044D\u043B\u0435\u043C\u0435\u043D\u0442.");
          const position = evaluate2(item.index, scope, depth, control);
          if (owner.value instanceof NdArray) {
            arraySet(owner.value, position, result, ctx);
            for (const node of [...assigned.trail, ...position.trail]) owner.trail.add(node);
            continue;
          }
          if (owner.value instanceof PyTuple) fail("\u041A\u043E\u0440\u0442\u0435\u0436 \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0441\u043F\u0438\u0441\u043E\u043A [ ].");
          if (position.value instanceof PySlice) fail("\u0417\u0430\u043C\u0435\u043D\u0430 \u0447\u0430\u0441\u0442\u0438 \u0441\u043F\u0438\u0441\u043A\u0430 \u0447\u0435\u0440\u0435\u0437 \u0441\u0440\u0435\u0437 \u0432 Kodik \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F. \u041C\u0435\u043D\u044F\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443.");
          const values = list(owner.value), index = number2(position.value);
          if (position.float || !Number.isInteger(index) || index < -values.length || index >= values.length) fail("\u0422\u0430\u043A\u043E\u0433\u043E \u0438\u043D\u0434\u0435\u043A\u0441\u0430 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0435\u0442.");
          const offset = index < 0 ? values.length + index : index, metadata2 = floats.get(values) || /* @__PURE__ */ new Set();
          values[offset] = result.value;
          if (result.float) metadata2.add(offset);
          else metadata2.delete(offset);
          floats.set(values, metadata2);
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
          if (truth(condition.value)) {
            body = branch.body;
            break;
          }
        }
        execute(body, scope, depth, track(null, item, tests, control).trail);
        continue;
      }
      if (item.kind === "for") {
        const source = evaluate2(item.iterable, scope, depth, control), inside = track(null, item, [source], control).trail;
        if (Array.isArray(source.value) || typeof source.value === "string") {
          const values = typeof source.value === "string" ? Array.from(source.value) : list(source.value);
          for (const [index, value] of values.entries()) {
            tick();
            scope.set(item.name, { ...track(value, item, [source], control), float: floats.get(values)?.has(index) });
            execute(item.body, scope, depth, inside);
          }
          continue;
        }
        for (const part of items(source.value, "\u0412 \u0446\u0438\u043A\u043B\u0435 for")) {
          tick();
          scope.set(item.name, { ...track(part.value, item, [source], control), float: typeof part.value === "number" && !!part.float });
          execute(item.body, scope, depth, inside);
        }
        continue;
      }
      while (true) {
        const condition = evaluate2(item.condition, scope, depth, control);
        if (!truth(condition.value)) break;
        tick();
        execute(item.body, scope, depth, track(null, item, [condition], control).trail);
      }
    }
  };
  const finish = (error) => {
    flushOutput();
    const shown = scene.finish(clock.now);
    return { output, segments, operations, observed, reassigned, ...error !== void 0 ? { error } : {}, ...shown ? { scene: shown } : {}, ...clock.now > 0 ? { outputTimes } : {} };
  };
  try {
    execute(program, globals, 0, /* @__PURE__ */ new Set());
    return finish();
  } catch (error) {
    return finish(error instanceof Error ? error.message : "\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B.");
  }
}
function runCourseProgram(source, inputs = [], options = {}) {
  try {
    return runPythonAst(parseCourseProgram(source), inputs, options);
  } catch (error) {
    return { output: [], segments: [], operations: 0, observed: /* @__PURE__ */ new Set(), reassigned: /* @__PURE__ */ new Set(), error: error instanceof Error ? error.message : "\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0437\u0430\u043F\u0438\u0441\u044C Python." };
  }
}

// src/pythonRuntime.ts
var namePattern = /^[\p{L}_][\p{L}\p{N}_]*$/u;
var forbidden = new Set("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield exec eval open".split(" "));
var builtins = new Set("print input int str len range forward right left".split(" "));
function validName2(name) {
  return namePattern.test(name) && !forbidden.has(name) && !name.startsWith("__");
}
function variableName(name) {
  return validName2(name) && !builtins.has(name);
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
    const number3 = /^(?:\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?/.exec(rest);
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
    const operator = /^(==|!=|>=|<=|\*\*|\/\/|[+\-*/%><(),\[\].:=])/.exec(rest);
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
  const source = token.slice(1, -1), escapes = { a: "\x07", b: "\b", f: "\f", n: "\n", r: "\r", t: "	", v: "\v", "\\": "\\", '"': '"', "'": "'" };
  let result = "";
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== "\\") {
      result += source[i];
      continue;
    }
    const code2 = source[++i];
    if (code2 in escapes) {
      result += escapes[code2];
      continue;
    }
    if (/[0-7]/.test(code2)) {
      const digits = /^[0-7]{1,3}/.exec(source.slice(i))[0];
      result += String.fromCodePoint(parseInt(digits, 8));
      i += digits.length - 1;
      continue;
    }
    if (["x", "u", "U"].includes(code2)) {
      const length = code2 === "x" ? 2 : code2 === "u" ? 4 : 8, digits = source.slice(i + 1, i + 1 + length), point2 = parseInt(digits, 16);
      if (digits.length !== length || !/^[0-9a-f]+$/i.test(digits) || point2 > 1114111) syntax("\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043A\u043E\u0434 \u0441\u0438\u043C\u0432\u043E\u043B\u0430 \u043F\u043E\u0441\u043B\u0435 \u043E\u0431\u0440\u0430\u0442\u043D\u043E\u0439 \u043A\u043E\u0441\u043E\u0439 \u0447\u0435\u0440\u0442\u044B.");
      result += String.fromCodePoint(point2);
      i += length;
      continue;
    }
    if (code2 === "N") syntax("\u0418\u043C\u0435\u043D\u0430 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u0447\u0435\u0440\u0435\u0437 \\N \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F. \u0412\u0441\u0442\u0430\u0432\u044C \u0441\u0430\u043C \u0441\u0438\u043C\u0432\u043E\u043B.");
    result += "\\" + code2;
  }
  return result;
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
    const got = this.take();
    if (got === value) return;
    if (got === void 0) syntax(value === ")" || value === "]" ? `\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u044E\u0449\u0435\u0439 \u0441\u043A\u043E\u0431\u043A\u0438 \xAB${value}\xBB \u0432 \u043A\u043E\u043D\u0446\u0435.` : `\u0412 \u043A\u043E\u043D\u0446\u0435 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \xAB${value}\xBB.`);
    syntax(value === "," ? `\u041C\u0435\u0436\u0434\u0443 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F\u043C\u0438 \u043D\u0443\u0436\u043D\u0430 \u0437\u0430\u043F\u044F\u0442\u0430\u044F \u2014 \u043F\u0435\u0440\u0435\u0434 \xAB${got}\xBB.` : `\u041E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \xAB${value}\xBB, \u0430 \u043D\u0430\u043F\u0438\u0441\u0430\u043D\u043E \xAB${got}\xBB. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0441\u043A\u043E\u0431\u043A\u0438.`);
  }
  parse() {
    const value = this.expression(0);
    if (this.peek()) syntax(`\u041B\u0438\u0448\u043D\u0438\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \xAB${this.peek()}\xBB \u0432 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0438.`);
    return value;
  }
  /** A statement-level value: `a, b` without brackets is a tuple, as in Python. */
  parseTuple() {
    const first = this.expression(0);
    if (this.peek() !== ",") {
      if (this.peek()) syntax(`\u041B\u0438\u0448\u043D\u0438\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \xAB${this.peek()}\xBB \u0432 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0438.`);
      return first;
    }
    const items = [first];
    while (this.peek() === ",") {
      this.take();
      if (!this.peek()) break;
      items.push(this.expression(0));
    }
    if (this.peek()) syntax(`\u041B\u0438\u0448\u043D\u0438\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \xAB${this.peek()}\xBB \u0432 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0438.`);
    return { kind: "tuple", items };
  }
  expression(minPrecedence) {
    let left = this.primary();
    const precedence = { or: 1, and: 2, "==": 3, "!=": 3, ">": 3, ">=": 3, "<": 3, "<=": 3, "+": 4, "-": 4, "*": 5, "/": 5, "//": 5, "%": 5, "**": 6 };
    while (precedence[this.peek()] && precedence[this.peek()] >= minPrecedence) {
      const operator = this.take();
      const priority = precedence[operator];
      const right = this.expression(priority + (operator === "**" ? 0 : 1));
      if (priority === 3 && precedence[this.peek()] === 3) {
        const operands = [left, right], operators = [operator];
        while (precedence[this.peek()] === 3) {
          operators.push(this.take());
          operands.push(this.expression(4));
        }
        left = { kind: "compare", operands, operators };
        continue;
      }
      left = { kind: "binary", operator, left, right };
    }
    return left;
  }
  primary() {
    const token = this.take();
    if (!token) syntax("\u041F\u043E\u0441\u043B\u0435 \u0437\u043D\u0430\u043A\u0430 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F.");
    let value;
    if (token === "-" || token === "+" || token === "not") value = { kind: "unary", operator: token, value: this.expression(token === "not" ? 3 : 6) };
    else if (token === "(") {
      if (this.peek() === ")") {
        this.take();
        value = { kind: "tuple", items: [] };
      } else {
        value = this.expression(0);
        if (this.peek() === ",") {
          const items = [value];
          while (this.peek() === ",") {
            this.take();
            if (this.peek() === ")") break;
            if (!this.peek()) syntax("\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u044E\u0449\u0435\u0439 \u0441\u043A\u043E\u0431\u043A\u0438 \xAB)\xBB \u0432 \u043A\u043E\u043D\u0446\u0435.");
            items.push(this.expression(0));
          }
          value = { kind: "tuple", items };
        }
        this.expect(")");
      }
    } else if (token === "[") {
      const items = [];
      while (this.peek() !== "]") {
        if (!this.peek()) syntax("\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u044E\u0449\u0435\u0439 \u0441\u043A\u043E\u0431\u043A\u0438 \xAB]\xBB \u0443 \u0441\u043F\u0438\u0441\u043A\u0430.");
        items.push(this.expression(0));
        if (!this.peek()) syntax("\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u044E\u0449\u0435\u0439 \u0441\u043A\u043E\u0431\u043A\u0438 \xAB]\xBB \u0443 \u0441\u043F\u0438\u0441\u043A\u0430.");
        if (this.peek() !== "]") this.expect(",");
      }
      this.expect("]");
      value = { kind: "list", items };
    } else if (/^['"]/.test(token)) value = { kind: "literal", value: decodeString(token) };
    else if (/^[\d.]/.test(token)) {
      const floating = /[.eE]/.test(token), number3 = Number(token.replace(/_/g, ""));
      if (!floating && !/^(?:0(?:_?0)*|[1-9](?:_?\d)*)$/.test(token)) syntax("\u0412 \u0446\u0435\u043B\u043E\u043C \u0447\u0438\u0441\u043B\u0435 \u043D\u0435\u043B\u044C\u0437\u044F \u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043B\u0438\u0448\u043D\u0438\u0439 \u043D\u043E\u043B\u044C \u0432 \u043D\u0430\u0447\u0430\u043B\u0435.");
      if (!Number.isFinite(number3) || !floating && !Number.isSafeInteger(number3)) syntax("\u0427\u0438\u0441\u043B\u043E \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u044B \u0443\u0447\u0435\u0431\u043D\u043E\u0433\u043E \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430.");
      value = { kind: "literal", value: number3, ...floating ? { float: true } : {} };
    } else if (token === "True" || token === "False") value = { kind: "literal", value: token === "True" };
    else if (token === "None") value = { kind: "literal", value: null };
    else if (validName2(token) || token === "__name__") value = { kind: "name", name: token };
    else syntax(`\u041D\u0435\u043E\u0436\u0438\u0434\u0430\u043D\u043D\u044B\u0439 \u0437\u043D\u0430\u043A \xAB${token}\xBB.`);
    while (this.peek() === "(" || this.peek() === "[" || this.peek() === ".") {
      if (this.peek() === ".") {
        this.take();
        const name = this.take();
        if (!name || !validName2(name)) syntax("\u041F\u043E\u0441\u043B\u0435 \u0442\u043E\u0447\u043A\u0438 \u0437\u0430\u043F\u0438\u0448\u0438 \u0438\u043C\u044F \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u0438\u043B\u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0438\u0437 \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0438.");
        value = { kind: "attribute", target: value, name };
      } else if (this.peek() === "(") {
        this.take();
        if (value.kind !== "name" && value.kind !== "attribute") syntax("\u041F\u0435\u0440\u0435\u0434 \u0441\u043A\u043E\u0431\u043A\u0430\u043C\u0438 \u0432\u044B\u0437\u043E\u0432\u0430 \u0437\u0430\u043F\u0438\u0448\u0438 \u0438\u043C\u044F \u0444\u0443\u043D\u043A\u0446\u0438\u0438.");
        const args = [], keywords = [];
        while (this.peek() !== ")") {
          if (!this.peek()) syntax("\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u044E\u0449\u0435\u0439 \u0441\u043A\u043E\u0431\u043A\u0438 \xAB)\xBB \u0432 \u043A\u043E\u043D\u0446\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B.");
          if (validName2(this.peek()) && this.tokens[this.index + 1] === "=") {
            const name = this.take();
            this.take();
            if (keywords.some((item) => item.name === name)) syntax(`\u0410\u0440\u0433\u0443\u043C\u0435\u043D\u0442 \xAB${name}\xBB \u0443\u043A\u0430\u0437\u0430\u043D \u0434\u0432\u0430\u0436\u0434\u044B.`);
            keywords.push({ name, value: this.expression(0) });
          } else {
            if (keywords.length) syntax("\u041E\u0431\u044B\u0447\u043D\u044B\u0435 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u044B \u043F\u0438\u0448\u0443\u0442\u0441\u044F \u0434\u043E \u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0445 (\u0438\u043C\u044F=\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435).");
            args.push(this.expression(0));
          }
          if (!this.peek()) syntax("\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u044E\u0449\u0435\u0439 \u0441\u043A\u043E\u0431\u043A\u0438 \xAB)\xBB \u0432 \u043A\u043E\u043D\u0446\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B.");
          if (this.peek() !== ")") this.expect(",");
        }
        this.expect(")");
        value = value.kind === "name" ? { kind: "call", name: value.name, args } : { kind: "call", name: value.name, args, callee: value };
        if (keywords.length) value.keywords = keywords;
      } else {
        this.take();
        const items = [this.subscript()];
        let trailing = false;
        while (this.peek() === ",") {
          this.take();
          if (this.peek() === "]") {
            trailing = true;
            break;
          }
          items.push(this.subscript());
        }
        this.expect("]");
        value = { kind: "index", target: value, index: items.length === 1 && !trailing ? items[0] : { kind: "tuple", items } };
      }
    }
    return value;
  }
  /** One position inside [ ]: an index or a slice start:stop:step. */
  subscript() {
    let start;
    if (!this.peek()) syntax("\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u044E\u0449\u0435\u0439 \u0441\u043A\u043E\u0431\u043A\u0438 \xAB]\xBB.");
    if (this.peek() !== ":") {
      start = this.expression(0);
      if (this.peek() !== ":") return start;
    }
    this.take();
    let stop, step;
    if (this.peek() && ![":", "]", ","].includes(this.peek())) stop = this.expression(0);
    if (this.peek() === ":") {
      this.take();
      if (this.peek() && !["]", ","].includes(this.peek())) step = this.expression(0);
    }
    return { kind: "slice", ...start ? { start } : {}, ...stop ? { stop } : {}, ...step ? { step } : {} };
  }
};
function expression(source) {
  return new ExpressionParser(tokenize(source)).parse();
}
function tupleExpression(source, line) {
  try {
    return new ExpressionParser(tokenize(source)).parseTuple();
  } catch (e) {
    const message = e.message;
    throw new Error(message.startsWith("\u0421\u0442\u0440\u043E\u043A\u0430") ? message : `\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: ${message[0].toLowerCase()}${message.slice(1)}`);
  }
}
function lineExpression(source, line) {
  try {
    return expression(source);
  } catch (e) {
    const message = e.message;
    throw new Error(message.startsWith("\u0421\u0442\u0440\u043E\u043A\u0430") ? message : `\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: ${message[0].toLowerCase()}${message.slice(1)}`);
  }
}
function withoutComment(raw) {
  let quote = "", escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "#") return raw.slice(0, i);
  }
  return raw;
}
function parseCourseProgram(source) {
  if (source.length > 12e3) syntax("\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u0430\u044F \u0434\u043B\u044F \u0443\u0447\u0435\u0431\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430.");
  const lines = source.split(/\r?\n/).map((raw) => raw.replace(/^[ \t]+/, (lead) => lead.replace(/\t/g, "    "))).map((raw, index) => ({ number: index + 1, indent: /^ */.exec(raw)[0].length, text: withoutComment(raw).trim() })).filter((line) => line.text);
  if (!lines.length) syntax("\u041D\u0430\u043F\u0438\u0448\u0438 \u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u044B, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438 \xAB\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C\xBB.");
  if (lines.length > 250) syntax("\u041E\u0441\u0442\u0430\u0432\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 250 \u0441\u0442\u0440\u043E\u043A.");
  if (lines.some((line) => line.indent % 4 !== 0)) syntax("\u0414\u043B\u044F \u0432\u043B\u043E\u0436\u0435\u043D\u043D\u043E\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043E\u0442\u0441\u0442\u0443\u043F \u0432 4 \u043F\u0440\u043E\u0431\u0435\u043B\u0430.");
  let cursor = 0;
  const block = (indent, functionDepth = 0) => {
    const result = [];
    let decorators = [];
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line.indent < indent) break;
      if (line.indent > indent) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u043E\u0436\u0438\u0434\u0430\u043D\u043D\u044B\u0439 \u043E\u0442\u0441\u0442\u0443\u043F.`);
      if (line.text === "else:" || line.text.startsWith("elif ")) break;
      cursor++;
      if (decorators.length && !line.text.startsWith("def ") && !line.text.startsWith("@")) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u043E\u0441\u043B\u0435 \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u043E\u0440\u0430 @ \u043D\u0443\u0436\u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0430 def.`);
      const nested = (functionBody = false) => {
        const body = block(indent + 4, functionDepth + (functionBody ? 1 : 0));
        if (!body.length) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u043E\u0441\u043B\u0435 \u0434\u0432\u043E\u0435\u0442\u043E\u0447\u0438\u044F \u043D\u0443\u0436\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C.`);
        return body;
      };
      let match;
      if (match = /^@(.+)$/.exec(line.text)) {
        decorators.push(lineExpression(match[1], line));
        continue;
      }
      if (match = /^import\s+(.+)$/.exec(line.text)) {
        const modules = match[1].split(",").map((part) => {
          const item = /^\s*([\p{L}_][\p{L}\p{N}_]*(?:\s*\.\s*[\p{L}_][\p{L}\p{N}_]*)*)(?:\s+as\s+([\p{L}_][\p{L}\p{N}_]*))?\s*$/u.exec(part);
          if (!item || item[2] && !validName2(item[2])) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u0437\u0430\u043F\u0438\u0448\u0438 \u0438\u043C\u043F\u043E\u0440\u0442 \u043A\u0430\u043A import \u0438\u043C\u044F \u0438\u043B\u0438 import \u0438\u043C\u044F as \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0435_\u0438\u043C\u044F.`);
          return { name: item[1].replace(/\s+/g, ""), ...item[2] ? { alias: item[2] } : {} };
        });
        result.push({ kind: "import", modules });
        continue;
      }
      if (match = /^from\s+([\p{L}_][\p{L}\p{N}_]*(?:\s*\.\s*[\p{L}_][\p{L}\p{N}_]*)*)\s+import\s+(.+)$/u.exec(line.text)) {
        const module = match[1].replace(/\s+/g, ""), list2 = match[2].trim().replace(/^\((.*)\)$/, "$1").trim();
        if (list2 === "*") {
          result.push({ kind: "from", module, names: [], star: true });
          continue;
        }
        const names = list2.split(",").filter((part, i, all) => part.trim() || i < all.length - 1).map((part) => {
          const item = /^\s*([\p{L}_][\p{L}\p{N}_]*)(?:\s+as\s+([\p{L}_][\p{L}\p{N}_]*))?\s*$/u.exec(part);
          if (!item || !validName2(item[1]) || item[2] && !validName2(item[2])) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u0437\u0430\u043F\u0438\u0448\u0438 \u0438\u043C\u043F\u043E\u0440\u0442 \u043A\u0430\u043A from \u043C\u043E\u0434\u0443\u043B\u044C import \u0438\u043C\u044F, \u0438\u043C\u044F2 \u0438\u043B\u0438 from \u043C\u043E\u0434\u0443\u043B\u044C import *.`);
          return { name: item[1], ...item[2] ? { alias: item[2] } : {} };
        });
        result.push({ kind: "from", module, names });
        continue;
      }
      if (/^(import|from)/.test(line.text)) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u0437\u0430\u043F\u0438\u0448\u0438 \u0438\u043C\u043F\u043E\u0440\u0442 \u043A\u0430\u043A import \u043C\u043E\u0434\u0443\u043B\u044C \u0438\u043B\u0438 from \u043C\u043E\u0434\u0443\u043B\u044C import \u0438\u043C\u044F.`);
      if (match = /^if\s+(.+):$/.exec(line.text)) {
        const branches = [{ condition: lineExpression(match[1], line), body: nested() }];
        while (lines[cursor]?.indent === indent && (match = /^elif\s+(.+):$/.exec(lines[cursor].text))) {
          const elifLine = lines[cursor];
          cursor++;
          branches.push({ condition: lineExpression(match[1], elifLine), body: nested() });
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
        if (!variableName(match[1])) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0438\u043C\u044F \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0430.`);
        result.push({ kind: "for", name: match[1], iterable: lineExpression(match[2], line), body: nested() });
        continue;
      }
      if (match = /^while\s+(.+):$/.exec(line.text)) {
        result.push({ kind: "while", condition: lineExpression(match[1], line), body: nested() });
        continue;
      }
      if (match = /^def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(([^()]*)\):$/u.exec(line.text)) {
        if (functionDepth) syntax("\u0412\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F. \u041E\u043F\u0438\u0448\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E.");
        const params = match[2].trim() ? match[2].split(",").map((item) => item.trim()) : [];
        if (!variableName(match[1]) || params.some((name) => !variableName(name)) || new Set(params).size !== params.length) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u0440\u043E\u0432\u0435\u0440\u044C \u0438\u043C\u044F \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B; \u0438\u043C\u0435\u043D\u0430 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0445 \u043A\u043E\u043C\u0430\u043D\u0434 \u043D\u0435 \u043F\u0435\u0440\u0435\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0439.`);
        const fn = { kind: "function", name: match[1], params, body: nested(true) };
        if (decorators.length) {
          fn.decorators = decorators;
          decorators = [];
        }
        result.push(fn);
        continue;
      }
      if (match = /^return\s+(.+)$/.exec(line.text)) {
        result.push({ kind: "return", value: tupleExpression(match[1], line) });
        continue;
      }
      if (line.text === "return") {
        result.push({ kind: "return", value: { kind: "literal", value: null } });
        continue;
      }
      if (line.text === "pass") {
        result.push({ kind: "pass" });
        continue;
      }
      const indexOf = (name, inside) => {
        const target = lineExpression(`${name}[${inside}]`, line);
        if (target.kind !== "index" || target.target.kind !== "name") syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043C\u0435\u043D\u044F\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0442\u0430\u043A: \u0438\u043C\u044F[\u0438\u043D\u0434\u0435\u043A\u0441] = \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.`);
        return target.index;
      };
      if (match = /^([\p{L}_][\p{L}\p{N}_]*)(?:\[(.+)\])?\s*(\*\*|\/\/|[+\-*/%])=\s*(.+)$/u.exec(line.text)) {
        if (!variableName(match[1])) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0438\u043C\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439; \u0438\u043C\u0435\u043D\u0430 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0445 \u043A\u043E\u043C\u0430\u043D\u0434 \u043D\u0435 \u043F\u0435\u0440\u0435\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0439.`);
        const index = match[2] ? indexOf(match[1], match[2]) : void 0, current = index ? { kind: "index", target: { kind: "name", name: match[1] }, index } : { kind: "name", name: match[1] };
        result.push({ kind: "assign", name: match[1], index, value: { kind: "binary", operator: match[3], left: current, right: lineExpression(match[4], line) } });
        continue;
      }
      if (match = /^([\p{L}_][\p{L}\p{N}_]*(?:\s*,\s*[\p{L}_][\p{L}\p{N}_]*)+)\s*,?\s*=(?!=)\s*(.+)$/u.exec(line.text)) {
        const names = match[1].split(",").map((name) => name.trim());
        if (names.some((name) => !variableName(name)) || new Set(names).size !== names.length) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0438\u043C\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439; \u0438\u043C\u0435\u043D\u0430 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0445 \u043A\u043E\u043C\u0430\u043D\u0434 \u043D\u0435 \u043F\u0435\u0440\u0435\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0439.`);
        result.push({ kind: "unpack", names, value: tupleExpression(match[2], line) });
        continue;
      }
      if (match = /^([\p{L}_][\p{L}\p{N}_]*)(?:\[(.+)\])?\s*=\s*(.+)$/u.exec(line.text)) {
        if (!variableName(match[1])) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0438\u043C\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439; \u0438\u043C\u0435\u043D\u0430 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0445 \u043A\u043E\u043C\u0430\u043D\u0434 \u043D\u0435 \u043F\u0435\u0440\u0435\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0439.`);
        result.push({ kind: "assign", name: match[1], index: match[2] ? indexOf(match[1], match[2]) : void 0, value: tupleExpression(match[3], line) });
        continue;
      }
      if (/^[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)+\s*=(?!=)/u.test(line.text)) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043C\u0435\u043D\u044F\u0442\u044C \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u0447\u0435\u0440\u0435\u0437 \u0442\u043E\u0447\u043A\u0443 \u043D\u0435\u043B\u044C\u0437\u044F \u2014 \u0432\u044B\u0437\u043E\u0432\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044E, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 t.color("red").`);
      if (/^(if|elif|else|while|for|def)\b/.test(line.text)) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u043F\u043E\u0441\u043B\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F, \u0446\u0438\u043A\u043B\u0430 \u0438\u043B\u0438 def \u043D\u0443\u0436\u043D\u044B \u0434\u0432\u043E\u0435\u0442\u043E\u0447\u0438\u0435 \u0438 \u0441\u0442\u0440\u043E\u043A\u0430 \u0441 \u043E\u0442\u0441\u0442\u0443\u043F\u043E\u043C.`);
      const value = lineExpression(line.text, line);
      if (value.kind !== "call") syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${line.number}: \u0437\u0434\u0435\u0441\u044C \u043D\u0443\u0436\u043D\u0430 \u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0438\u043B\u0438 \u043F\u0440\u0438\u0441\u0432\u0430\u0438\u0432\u0430\u043D\u0438\u0435.`);
      result.push({ kind: "expression", value });
    }
    if (decorators.length) syntax("\u041F\u043E\u0441\u043B\u0435 \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u043E\u0440\u0430 @ \u043D\u0443\u0436\u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0430 def.");
    return result;
  };
  const program = block(0);
  if (cursor < lines.length && lines[cursor].text.startsWith("@")) syntax(`\u0421\u0442\u0440\u043E\u043A\u0430 ${lines[cursor].number}: \u043F\u043E\u0441\u043B\u0435 \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u043E\u0440\u0430 @ \u043D\u0443\u0436\u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0430 def.`);
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
var ids = (text4) => text4 ? text4.split(",") : [];
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
  const result = seeds.flatMap(({ id: chapter, tasks }) => tasks.map(([id, key2, title, goal, code2, hint, scenarios]) => {
    if (!lessonObjectives[id]) throw new Error(`Missing objectives for stable lesson ${id}`);
    const inputs = scenarios || [[]];
    const reference = runCourseProgram(code2, inputs[0]);
    if (reference.error || !reference.output.length && !reference.segments.length) throw new Error(`\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0435 ${id}: ${reference.error || "\u043D\u0435\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430"}`);
    const scaffold = scaffolds[id];
    const material = courseMaterials[chapter];
    return {
      id,
      key: key2,
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
      answer: scaffold?.answer || code2,
      codeAnswer: code2,
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
var text3 = (value) => ({ type: "text", fields: { TEXT: value } });
var print2 = (value) => ({ type: "text_print", inputs: { TEXT: { block: text3(value) } } });
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
      return [...node.decorators || [], ...node.body];
    case "list":
      return node.items;
    case "binary":
      return [node.left, node.right];
    case "compare":
      return node.operands;
    case "call":
      return [...node.callee ? [node.callee] : [], ...node.args, ...(node.keywords || []).map((item) => item.value)];
    case "index":
      return [node.target, node.index];
    case "attribute":
      return [node.target];
    case "tuple":
      return node.items;
    case "slice":
      return [node.start, node.stop, node.step].filter((part) => !!part);
    case "unpack":
      return [node.value];
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
    if (type === "op") valid = relevant.some((node) => node.kind === "binary" && node.operator === value || node.kind === "compare" && node.operators.includes(value));
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
var equal2 = (actual, reference, drawing2) => !actual.error && !reference.error && actual.output.length === reference.output.length && actual.output.every((value, i) => value === reference.output[i]) && (!drawing2 || actual.segments.length === reference.segments.length && actual.segments.every((part, i) => ["x1", "y1", "x2", "y2"].every((key2) => Math.abs(part[key2] - reference.segments[i][key2]) < 0.02)));
var clone = (value) => JSON.parse(JSON.stringify(value));
var dataValue = (node) => {
  if (node.kind !== "assign" || node.index) return void 0;
  if (node.value.kind === "literal") return node.value.value;
  if (node.value.kind === "unary" && node.value.operator === "-" && node.value.value.kind === "literal" && typeof node.value.value.value === "number") return -node.value.value.value;
  if (node.value.kind === "list" && node.value.items.every((item) => item.kind === "literal")) return node.value.items.map((item) => item.kind === "literal" ? item.value : null);
};
var changed = (value) => Array.isArray(value) ? value.map((part, i) => typeof part === "number" ? part + i + 2 : typeof part === "string" ? `${part}!` : part) : typeof value === "number" ? value > 10 ? value - 7 : value + 2 : typeof value === "string" ? `${value}!` : value;
function generalizes(actual, reference, inputs, drawing2) {
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
    if (!equal2(runPythonAst(candidate, inputs), runPythonAst(expected, inputs), drawing2)) return false;
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
      const stringArgs = calls.some((node) => node.kind === "call" && node.args.some((arg3) => arg3.kind === "literal" && typeof arg3.value === "string"));
      const probeArgs = stringArgs ? args.map((_, index) => ({ kind: "literal", value: `\u0413\u043E\u0441\u0442\u044C${n + index}` })) : args;
      const returns = [...refRun.observed].some((node) => node.kind === "return");
      const call2 = (name) => ({ kind: "expression", value: returns ? { kind: "call", name: "print", args: [{ kind: "call", name, args: probeArgs }] } : { kind: "call", name, args: probeArgs } });
      if (!equal2(runPythonAst([...actual, call2(candidate.name)], inputs), runPythonAst([...reference, call2(fn.name)], inputs), drawing2)) return false;
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
    if (!equal2(runCourseProgram(source, inputs), runCourseProgram(lesson.codeAnswer, inputs), !!lesson.extended.drawing)) return failed(lesson.extended.drawing ? "\u0420\u0438\u0441\u0443\u043D\u043E\u043A \u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0434\u043B\u0438\u043D\u044B, \u043F\u043E\u0432\u043E\u0440\u043E\u0442\u044B \u0438 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u043B\u0438\u043D\u0438\u0439." : "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0434\u0430\u0451\u0442 \u0434\u0440\u0443\u0433\u043E\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043F\u043E\u0440\u044F\u0434\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439.");
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
function callGap(code2, name, whole, skill) {
  const match = new RegExp(`\\b${name}\\s*\\(`).exec(code2);
  if (!match) return;
  const open = match.index + match[0].lastIndexOf("(");
  let depth = 1, quote = "", escaped = false;
  for (let i = open + 1; i < code2.length; i++) {
    const ch = code2[i];
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
      const answer = code2.slice(index, whole ? i + 1 : i);
      return answer ? { index, answer, skill } : void 0;
    }
  }
}
function capture(code2, pattern, skill) {
  const match = new RegExp(pattern.source, pattern.flags + "d").exec(code2);
  if (!match?.[1]) return;
  return { index: match.indices[1][0], answer: match[1], skill };
}
function scaffoldForSkill(code2, skill) {
  switch (skill) {
    case "input":
      return callGap(code2, "int", true, skill)?.answer.includes("input(") ? callGap(code2, "int", true, skill) : callGap(code2, "input", true, skill);
    case "assignment": {
      const assignments = [...code2.matchAll(/^[ \t]*[\p{L}_][\p{L}\p{N}_]*\s*=\s*(?![=])([^\n]+)/gmu)];
      const match = assignments.find((item) => /[\p{L}_]/u.test(item[1]) && !/^["']/.test(item[1])) || assignments[0];
      return match ? { index: match.index + match[0].length - match[1].length, answer: match[1], skill } : void 0;
    }
    case "if":
    case "comparison":
      return capture(code2, /(?:if|elif)\s+([^\n:]+):/u, skill) || callGap(code2, "print", false, skill);
    case "loop":
      return callGap(code2, "range", false, skill) || capture(code2, /while\s+([^\n:]+):/u, skill) || capture(code2, /for\s+[\p{L}_][\p{L}\p{N}_]*\s+in\s+([^\n:]+):/u, skill);
    case "function": {
      const returned = capture(code2, /return\s+([^\n]+)/u, skill);
      if (returned) return returned;
      const name = /def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(/u.exec(code2)?.[1];
      if (!name) return;
      const after = code2.indexOf("\n", code2.indexOf("def ")) + 1;
      const gap = callGap(code2.slice(after), name, true, skill);
      return gap ? { ...gap, index: gap.index + after } : void 0;
    }
    case "list":
      return capture(code2, /[\p{L}_][\p{L}\p{N}_]*\[([^\]\n]+)\]/u, skill) || capture(code2, /for\s+[\p{L}_][\p{L}\p{N}_]*\s+in\s+([^\n:]+):/u, skill) || callGap(code2, "len", true, skill);
    case "drawing":
      return callGap(code2, "forward", false, skill) || callGap(code2, "right", false, skill) || callGap(code2, "left", false, skill);
    case "variable":
    case "string":
    case "arithmetic":
    case "number":
    case "print":
    case "sequence":
    case "indentation":
    case "text_syntax":
      return callGap(code2, "print", false, skill) || callGap(code2, "forward", false, skill);
  }
}

// src/supportVariants.ts
function codeFirstVariant(source, level, focus) {
  if (level === "blocks" || level === "blocks_with_code" || !source.codeAnswer) return null;
  const code2 = source.codeAnswer;
  const base2 = { ...source, scaffoldSkill: focus || source.scaffoldSkill, supportLevel: level, tutorial: void 0, choices: void 0, tokens: void 0, prefix: void 0, suffix: void 0 };
  if (level === "free_code") return { ...base2, mode: "text", answer: code2 };
  if (level === "code_tokens") {
    const tokens = code2.split(/(?<=\n)/).filter(Boolean);
    if (tokens.length === 1) {
      const parts = code2.match(/\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\p{L}_][\p{L}\p{N}_]*|\d+|[^\s])\s*/gu);
      if (!parts || parts.join("") !== code2) return null;
      return { ...base2, mode: "tokens", answer: code2, tokens: [...parts].reverse() };
    }
    return { ...base2, mode: "tokens", answer: code2, tokens: [...tokens].reverse() };
  }
  const skill = focus || source.skills?.primarySkill || "print";
  const gap = scaffoldForSkill(code2, skill) || (source.skills?.primarySkill ? scaffoldForSkill(code2, source.skills.primarySkill) : void 0);
  if (!gap) return null;
  const { answer, index } = gap;
  const choices = [.../* @__PURE__ */ new Set([answer, "0", '"\u0434\u0440\u0443\u0433\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"'])];
  const variant = { ...base2, scaffoldSkill: gap.skill, mode: "completion", answer, choices, prefix: code2.slice(0, index), suffix: code2.slice(index + answer.length) };
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

// src/adaptiveSupport.ts
var supportLevels = ["blocks", "blocks_with_code", "guided_code", "code_tokens", "free_code"];

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
var bounded2 = (value, max2) => Math.min(max2, Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)));
function buildTutorContext(lesson, progress, session, program, errorType) {
  const allowedConcepts = [.../* @__PURE__ */ new Set([...lesson.skills?.teaches || [], ...lesson.skills?.practices || []])];
  const skillId = lesson.skills?.primarySkill || allowedConcepts[0] || "print";
  const state3 = progress.skillStates?.[skillId];
  const representation = lesson.extended || lesson.mode === "text" ? "code" : lesson.mode === "blocks" ? "blocks" : "choice";
  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    skill: { id: skillId, name: skills[skillId].title, mastery: Math.max(0, Math.min(1, state3?.mastery || 0)) },
    task: { description: lesson.goal, expectedConcept: skillId, supportLevel: lesson.supportLevel || "blocks_with_code" },
    learner: { attempts: bounded2(session.attempts, 100), consecutiveErrors: bounded2(state3?.consecutiveErrors || 0, 100), hintsUsed: bounded2(session.hintsUsed, 3), independentSuccesses: bounded2(state3?.independentSuccesses || 0, 100) },
    ...errorType ? { lastError: { type: errorType, message: errorLabels[errorType] } } : {},
    currentSolution: { representation, normalizedStructure: program.normalizedStructure || (representation === "choice" ? "not_shared" : program.statements.slice(0, 12).map(stmt).join(",").slice(0, 160) || "empty") },
    allowedConcepts
  };
}
function sanitizeTutorContext(lesson, raw) {
  const level = raw?.task?.supportLevel;
  if (supportLevels.includes(level)) lesson = materializeSupport(lesson, level);
  const safeSession = { attempts: bounded2(raw?.learner?.attempts, 100), hintsUsed: bounded2(raw?.learner?.hintsUsed, 3) };
  const skillId = lesson.skills?.primarySkill || lesson.skills?.teaches[0] || lesson.skills?.practices[0] || "print";
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
  const safeKinds = ["empty", "not_shared", "print", "assign", "call", "define", "repeat", "if", "binary", "comparison", "string", "number", "variable", "missing", "syntax_error", "function", "params_", "for", "while", "return", "list", "index", "expression", "pass", "unary", "boolean", "input", "int", "str", "len", "range", "forward", "right", "left", "more"];
  if (clean.currentSolution.representation !== "choice" && typeof structure === "string" && structure.length <= 512 && /^[a-z0-9_,:() +*<>=!-]+$/.test(structure) && tokens.every((token) => safeKinds.includes(token))) clean.currentSolution.normalizedStructure = structure;
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
var normalize2 = (s) => s.replace(/\s+/g, "").replace(/['"`]/g, "").toLowerCase();
var cleanText = (value, max2) => typeof value === "string" && value.trim().length > 0 && value.length <= max2 && !unsafe.test(value);
function validateTutorResponse(value, request, lesson, onReject) {
  const reject = (reason) => {
    onReject?.(reason);
    return null;
  };
  if (!value || typeof value !== "object") return reject("shape");
  const result = value;
  if (Object.keys(result).some((key2) => !["type", "message", "concept", "example", "shouldRevealSolution", "confidence"].includes(key2))) return reject("extra_fields");
  const expected = request.action === "hint" ? "hint" : request.action === "example" ? "example" : "explanation";
  if (result.type !== expected) return reject("type");
  if (result.shouldRevealSolution !== false) return reject("reveal");
  if (!cleanText(result.message, 280)) return reject("message");
  if (result.concept != null && !cleanText(result.concept, 80)) return reject("concept_shape");
  if (result.concept && !request.context.allowedConcepts.some((id) => result.concept.toLowerCase().includes(id) || result.concept.toLowerCase().includes(request.context.skill.name.toLowerCase()))) return reject("concept_boundary");
  if (result.example != null && (typeof result.example !== "object" || Object.keys(result.example).some((key2) => !["code", "explanation"].includes(key2)) || result.example.code != null && !cleanText(result.example.code, 100) || result.example.explanation != null && !cleanText(result.example.explanation, 160))) return reject("example_shape");
  const message = result.message;
  const exampleCode = result.example?.code || "";
  const combined = `${message}
${exampleCode}`;
  if (/\b(?:import|class|try|except|lambda)\b/i.test(combined)) return reject("unsupported_python");
  if (python.test(combined) && (!lesson?.extended || /\bwhile\b/i.test(combined) && !request.context.allowedConcepts.includes("loop") || /\binput\b/i.test(combined) && !request.context.allowedConcepts.includes("input") || /\breturn\b/i.test(combined) && !request.context.allowedConcepts.includes("function"))) return reject("unsupported_python");
  if (request.hintLevel < 3 && request.action === "hint" && (executableCode(message) || exampleCode)) return reject("hint_code");
  if (request.action === "hint" && exampleCode && (request.hintLevel < 3 || !exampleCode.includes("...") || exampleCode.includes("\n"))) return reject("hint_full_code");
  if (request.context.task.supportLevel === "blocks" && (code.test(message) || exampleCode)) return reject("blocks_code");
  if (lesson) {
    const answer = lesson.answer || lesson.codeAnswer || "";
    const merged = normalize2(message + exampleCode + (result.example?.explanation || ""));
    if (answer.length >= 6 && merged.includes(normalize2(answer))) return reject("exact_answer");
    if (lesson.expectedOutput.some((output) => output.length >= 3 && merged.includes(normalize2(output)))) return reject("expected_output");
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
async function post(url, key2, payload, signal) {
  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${key2}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new ProviderError(response.status === 429 ? 429 : 502);
  return response.json();
}
function groqProvider(key2) {
  return { name: "groq", async generate(prompt, signal) {
    const data = await post("https://api.groq.com/openai/v1/chat/completions", key2, {
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
function openAIProvider(key2, model) {
  return { name: "openai", async generate(prompt, signal) {
    const data = await post("https://api.openai.com/v1/responses", key2, {
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
async function database(path, body, prefer) {
  const url = process.env.SUPABASE_URL, key2 = secret();
  if (!url || !key2) throw Error("storage_unavailable");
  const response = await fetch(`${url}/rest/v1/${path}`, { method: "POST", headers: { apikey: key2, Authorization: `Bearer ${key2}`, "Content-Type": "application/json", ...prefer ? { Prefer: prefer } : {} }, body: JSON.stringify(body), signal: AbortSignal.timeout(2500) });
  if (!response.ok) {
    console.warn("learning_storage_failed", { status: response.status });
    throw Error("storage_unavailable");
  }
  const text4 = await response.text();
  return text4 ? JSON.parse(text4) : null;
}
function bucket(key2, limit, windowMs) {
  const window = Math.floor(Date.now() / windowMs);
  return { key: `${key2}:${window}`, limit, expires: new Date((window + 1) * windowMs).toISOString() };
}
async function claim(buckets) {
  return await database("rpc/claim_learning_budget", { p_buckets: buckets }) === true;
}
function dailyLimit(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 1e4) : fallback;
}

// server/apiOrigin.ts
var androidOrigin = "https://localhost";
function trustedApiOrigin(req) {
  const origin = req.headers.origin;
  if (origin === void 0) return true;
  if (typeof origin !== "string") return false;
  if (origin === androidOrigin) return true;
  try {
    const url = new URL(origin);
    return ["https:", "http:"].includes(url.protocol) && url.host === req.headers.host && url.origin === origin;
  } catch {
    return false;
  }
}
function apiCors(req, res) {
  if (!trustedApiOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  if (req.headers.origin === androidOrigin) {
    res.setHeader("Access-Control-Allow-Origin", androidOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).json({});
    return false;
  }
  return true;
}

// server/aiTutor.ts
var actions = ["hint", "error_explanation", "concept", "example"];
var maxBody = 4096;
async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!apiCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const aiPaused = true;
  if (aiPaused) return res.status(503).json({ error: "ai_disabled" });
  const provider = configuredTutorProvider();
  if (process.env.AI_TUTOR_ENABLED !== "true" || !provider) return res.status(503).json({ error: "ai_unavailable" });
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
  try {
    const user = identity(req, res), day = 864e5;
    const allowed = await claim([
      bucket(`ai:learner:${user.learner}:lesson:${lesson.id}`, 8, day),
      bucket(`ai:ip:${user.address}:minute`, 30, 6e4),
      bucket(`ai:learner:${user.learner}:day`, dailyLimit("AI_LEARNER_DAILY_LIMIT", 80), day),
      bucket(`ai:ip:${user.address}:day`, dailyLimit("AI_IP_DAILY_LIMIT", 200), day),
      bucket("ai:global:day", dailyLimit("AI_DAILY_REQUEST_LIMIT", 1e3), day)
    ]);
    if (!allowed) return res.status(429).json({ error: "rate_limit" });
  } catch {
    return res.status(503).json({ error: "budget_unavailable" });
  }
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
