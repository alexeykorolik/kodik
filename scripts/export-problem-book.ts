// Exports «Задачник Kodik» (scripts/problem-book/tasks.ts) as ready school courses, one per chapter
// (server/b2b/problem-book.mjs). For every task and every input set the reference program runs in
// the teaching interpreter that grades the school and in CPython; the outputs must match. The
// characteristic wrong program must fail at least one test.
//   npx tsx scripts/export-problem-book.ts          writes server/b2b/problem-book.json
//   npx tsx scripts/export-problem-book.ts --check  fails if the file is out of date
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { chapters } from "./problem-book/tasks";
import { runCourseProgram } from "../src/pythonExecution";
import { learningRules } from "../src/b2b/learningRules";

const target = new URL("../server/b2b/problem-book.json", import.meta.url);
const ruleIds = new Set(learningRules.map((r: { id: string }) => r.id));
const PYTHON = process.env.KODIK_CPYTHON || (process.platform === "win32" ? "python" : "python3");
function cpython(code: string, inputs: string[]) {
  const r = spawnSync(PYTHON, ["-I", "-X", "utf8", "-c", code], { input: inputs.map((x) => x + "\n").join(""), encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" }, timeout: 10000 });
  if (r.error) throw new Error(`CPython is required for this export (${PYTHON}): ${r.error.message}`);
  if (r.status !== 0) throw new Error(`CPython fails:\n${r.stderr}\n${code}`);
  return r.stdout.replace(/\r\n/g, "\n").replace(/\n$/, "");
}
const ours = (code: string, inputs: string[]) => { const r = runCourseProgram(code, inputs); return r.error ? { error: r.error } : { text: r.output.join("\n") }; };

const data = {
  template: "problems/v1",
  chapters: chapters.map((chapter, ci) => {
    for (const rule of chapter.rules) if (!ruleIds.has(rule)) throw new Error(`unknown learning rule ${rule}`);
    const [question, choices, correct, explanation] = chapter.question;
    return {
      id: ci + 1, title: chapter.title, description: chapter.description, question, choices, correct, explanation, learned: chapter.learned,
      tasks: chapter.tasks.map((p) => {
        const sets = p.inputs?.length ? p.inputs : [[]];
        const tests = sets.map((inputs, i) => {
          const r = ours(p.code, inputs);
          if ("error" in r) throw new Error(`${chapter.key}/${p.key}: reference fails in Kodik: ${r.error}`);
          const real = cpython(p.code, inputs);
          if (real !== r.text) throw new Error(`${chapter.key}/${p.key} ${JSON.stringify(inputs)}: Kodik prints «${r.text}», CPython «${real}»`);
          // The first two examples are visible to the learner; the rest check the solution unseen.
          return { inputs, expected: r.text, hidden: i >= 2 };
        });
        const caught = tests.some((t) => { const w = ours(p.wrong, t.inputs); return "error" in w || w.text !== t.expected; });
        if (!caught) throw new Error(`${chapter.key}/${p.key}: the wrong program passes every test`);
        return {
          key: `${chapter.key}-${p.key}`, title: p.title, goal: chapter.title, aim: p.text, instruction: p.text, theory: chapter.theory,
          hints: [p.hint], starter: "", code: p.code, wrong: [p.wrong], tests,
          rules: [...chapter.rules, ...(p.inputs?.length ? ["input:1"] : [])],
        };
      }),
    };
  }),
};
// The school grader (output plus learning rules, which ask a construct to matter in EVERY test) must
// accept the reference on each test and reject the characteristic mistake — exactly what the quality
// gate checks at install, caught here instead.
const { grade } = await import("../server/b2b/grader.mjs");
for (const chapter of data.chapters) for (const t of chapter.tasks) {
  const as = (tests: unknown[]) => ({ tests: JSON.stringify(tests), learning_rules: JSON.stringify(t.rules), reference_solution: t.code, check_mode: "tests" });
  for (const test of t.tests) {
    const r = await grade(as([test]), t.code, { tenant: "export" });
    if (r.status !== "passed") throw new Error(`${t.key} ${JSON.stringify(test.inputs)}: the school grader rejects the reference: ${r.message}`);
  }
  if ((await grade(as(t.tests), t.wrong[0], { tenant: "export" })).status === "passed") throw new Error(`${t.key}: the school grader accepts the wrong program`);
}
const total = data.chapters.reduce((n, c) => n + c.tasks.length, 0);
const json = JSON.stringify(data, null, 1) + "\n";
if (process.argv.includes("--check")) {
  // Line endings follow the checkout (Git may convert them on Windows); the content must match.
  if (readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== json) throw new Error("server/b2b/problem-book.json is out of date: run npx tsx scripts/export-problem-book.ts");
  console.log(`✓ problem book data is current and matches CPython: ${data.chapters.length} courses, ${total} tasks`);
} else {
  writeFileSync(target, json);
  console.log(`wrote ${data.chapters.length} courses, ${total} tasks; every reference matches CPython on ${data.chapters.reduce((n, c) => n + c.tasks.reduce((m, t) => m + t.tests.length, 0), 0)} input sets`);
}
