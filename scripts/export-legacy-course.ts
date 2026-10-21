// Exports the self-study course of the first Kodik version (src/course.ts, opened with ?legacy=1)
// as ready data for the school course installer: every chapter becomes a separate course (server/b2b/legacy-course.mjs).
//   npx tsx scripts/export-legacy-course.ts          writes server/b2b/legacy-course.json
//   npx tsx scripts/export-legacy-course.ts --check  fails if the file is out of date
// Every expected output is produced by running the reference program in the same learning
// interpreter that grades the school tasks, for every input set the old lesson checked.
import { readFileSync, writeFileSync } from "node:fs";
import { lessons, chapters } from "../src/course";
import { runCourseProgram } from "../src/pythonExecution";
import { BLOCKS } from "../src/adaptive/blockProgram";
import { learningRules } from "../src/b2b/learningRules";

type Legacy = (typeof lessons)[number] & Record<string, any>;
const target = new URL("../server/b2b/legacy-course.json", import.meta.url);
const supported = new Set(BLOCKS.map((b) => b.type));
const ruleIds = new Set(learningRules.map((r: { id: string }) => r.id));
const blockTypes = (state: unknown) => [...JSON.stringify(state ?? {}).matchAll(/"type":"([^"]+)"/g)].map((m) => m[1]);

// One check question per chapter: the school lesson asks one, the old course had none for most chapters.
const questions: Record<number, [string, string[], number, string]> = {
  1: ["Какая строка Python печатает «Привет!»?", ['say("Привет!")', 'print("Привет!")', "print(Привет!)"], 1, "Команда вывода — print, а текст записывается в кавычках."],
  2: ["Что напечатает программа?\nx = 2 + 3\nprint(x)", ["x", "5", "2 + 3"], 1, "В переменной хранится результат вычисления — 5."],
  3: ["Что напечатает print(12 >= 10)?", ["True", "False", "12"], 0, "12 больше 10, значит сравнение истинно."],
  4: ["Сколько раз выполнится тело цикла for i in range(3)?", ["Два", "Три", "Четыре"], 1, "range(3) даёт 0, 1 и 2 — три повторения."],
  5: ["Что делает строка def hello():?", ["Сразу печатает hello", "Создаёт функцию с именем hello", "Удаляет переменную hello"], 1, "def создаёт функцию; её команды выполнятся при вызове hello()."],
  6: ["Что напечатает print(14 % 2 == 0)?", ["True", "False", "7"], 0, "Остаток от деления 14 на 2 равен 0, значит число чётное."],
  7: ["Когда выполняется ветка else?", ["Всегда", "Когда условие if ложно", "Когда условие if истинно"], 1, "Программа выбирает одну ветку: else — если условие не выполнилось."],
  8: ["Что напечатает программа?\ns = 0\nfor i in range(4):\n    s += i\nprint(s)", ["4", "6", "10"], 1, "0 + 1 + 2 + 3 = 6."],
  9: ["Что делает return в функции?", ["Печатает значение", "Возвращает результат в место вызова", "Повторяет функцию"], 1, "return отдаёт значение туда, где функцию вызвали; печатает только print."],
  10: ["Что напечатает print([3, 7, 9][0])?", ["3", "7", "9"], 0, "Элементы списка нумеруются с нуля."],
  11: ["Что вернёт input(), если ввести 5?", ["Число 5", "Строку «5»", "Ничего"], 1, "input() всегда возвращает строку; для вычислений нужен int()."],
  12: ["На сколько градусов поворачивать черепашку, чтобы нарисовать квадрат?", ["60", "90", "120"], 1, "Четыре стороны: 360 / 4 = 90 градусов."],
};

const output = (code: string, inputs: string[]) => {
  const run = runCourseProgram(code, inputs);
  if (run.error) throw new Error(`reference fails: ${run.error}\n${code}`);
  return { text: run.output.join("\n"), drawing: !!run.scene?.turtle };
};

function task(l: Legacy, chapter: string) {
  const drawing = !!l.extended?.drawing;
  // Old drawings used built-in forward/left that leave no turtle scene; the school checker compares
  // turtle scenes, so drawing tasks import the real turtle (that line is given in the start).
  const TURTLE = "from turtle import *\n";
  const code: string = (drawing ? TURTLE : "") + (l.codeAnswer || l.answer || "");
  if (!code.trim()) throw new Error(`lesson ${l.id} has no reference program`);
  const inputSets: string[][] = l.extended?.inputs?.length ? l.extended.inputs : [[]];
  const tests = inputSets.map((inputs, i) => {
    const r = output(code, inputs);
    // Guided modes were checked by the chosen answer, so only programs the old course ran are compared.
    if (i === 0 && !drawing && ["blocks", "text"].includes(l.mode) && r.text !== (l.expectedOutput || []).join("\n")) throw new Error(`lesson ${l.id}: reference prints «${r.text}», the old lesson expected «${(l.expectedOutput || []).join("\n")}»`);
    if (drawing && !r.drawing) throw new Error(`lesson ${l.id}: drawing task without a drawing`);
    return { inputs, expected: drawing ? "" : r.text, hidden: i > 0, ...(drawing ? { checks: ["drawing"] } : {}) };
  });
  const blocks = l.mode === "blocks" && blockTypes(l.solution).length > 0;
  // Guided modes of the old course (pick a line, fill a gap, arrange parts) become "write the code"
  // with the given part of the program as the start.
  const gap = ["completion", "tokens"].includes(l.mode) && (l.prefix || l.suffix) ? `${l.prefix || ""}${l.suffix || ""}` : "";
  const starter = drawing ? TURTLE + gap : gap;
  if (gap) { const r = runCourseProgram(starter, inputSets[0]); if (!r.error && r.output.join("\n") === tests[0].expected && !drawing) throw new Error(`lesson ${l.id}: the start already solves the task`); }
  const palette = blocks ? [...new Set([...(l.allowed || []).filter((t: string) => supported.has(t)), ...blockTypes(l.solution), ...blockTypes(l.starter)])] : [];
  for (const t of palette) if (!supported.has(t)) throw new Error(`lesson ${l.id}: block ${t} is not available in the school editor`);
  const rules = [...new Set((l.extended?.rules || []).map((r: string) => (/^input:\d+$/.test(r) ? "input:1" : r)).filter((r: string) => ruleIds.has(r)))];
  return {
    key: l.key || `legacy-${l.id}`,
    title: l.title,
    // The school task shows its goal as a short chip: the old topic line fits it; the full aim stays in the text.
    goal: l.kicker || chapter,
    aim: l.goal,
    instruction: (l.mode === "recognition" ? `${l.instruction}\n\n${l.goal} Напиши эту строку сам.` : l.instruction.startsWith(l.goal) ? l.instruction : `${l.goal}\n\n${l.instruction}`)
      .replace("В Kodik эти команды доступны сразу.", "Первая строка from turtle import * подключает черепашку — она уже есть в заготовке."),
    theory: l.codeNote || "",
    hints: [...new Set([...(l.progressiveHints || []), l.hint].filter(Boolean))].slice(0, 3),
    starter,
    code,
    // A characteristic wrong answer: the program that does nothing. The installer's quality gate
    // checks that it fails and that the reference passes.
    wrong: [drawing ? TURTLE + "forward(1)" : 'print("")'],
    tests,
    rules,
    ...(blocks ? { blocks: { solution: l.solution, starter: blockTypes(l.starter).length ? l.starter : null, palette } } : {}),
  };
}

const data = {
  template: "legacy/v1",
  chapters: chapters.map((c) => {
    const items = (lessons as Legacy[]).filter((l) => l.chapter === c.id).map((l) => task(l, c.title));
    const [question, choices, correct, explanation] = questions[c.id];
    return { id: c.id, title: c.title, description: c.description, question, choices, correct, explanation, tasks: items };
  }),
};
const total = data.chapters.reduce((n, c) => n + c.tasks.length, 0);
if (total !== lessons.length) throw new Error(`exported ${total} of ${lessons.length} lessons`);
const json = JSON.stringify(data, null, 1) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== json) throw new Error("server/b2b/legacy-course.json is out of date: run npx tsx scripts/export-legacy-course.ts");
  console.log(`✓ legacy course data is current: ${data.chapters.length} chapters, ${total} tasks`);
} else {
  writeFileSync(target, json);
  console.log(`wrote ${data.chapters.length} chapters, ${total} tasks (${data.chapters.flatMap((c) => c.tasks).filter((t) => "blocks" in t).length} with blocks)`);
}
