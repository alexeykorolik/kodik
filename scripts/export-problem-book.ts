// Exports the ready school course sets written as original problems, one course per chapter:
// «Задачник Kodik» (scripts/problem-book/tasks.ts → server/b2b/problem-book.json) and «Практикум
// Kodik» (scripts/problem-book/practicum.ts → server/b2b/practicum.json). For every task and every
// input set the reference program runs in the teaching interpreter that grades the school and in
// CPython; the outputs must match. Robot and turtle tasks print nothing to compare: the reference
// must solve every field (robot) or draw a picture (drawing), and the school grader compares the
// learner's scene with it. The characteristic wrong program must fail at least one test. A task
// solved with blocks gets its block solution built from the reference (problem-book/toBlocks.ts);
// it must load in real Blockly, translate back and pass every test, as the publication gate checks.
//   npx tsx scripts/export-problem-book.ts          writes both data files
//   npx tsx scripts/export-problem-book.ts --check  fails if a file is out of date
//   npx tsx scripts/export-problem-book.ts --only=blocks-start,py-lists  checks these practicum chapters, writes nothing
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { chapters as book, type Chapter } from "./problem-book/tasks";
import { chapters as practicum } from "./problem-book/practicum";
import { toBlocks } from "./problem-book/toBlocks";
import { runCourseProgram } from "../src/pythonExecution";
import { translateWorkspace } from "../src/adaptive/blockProgram";
import { learningRules } from "../src/b2b/learningRules";
import { checkScene } from "../src/python/sceneCheck";

const ruleIds = new Set(learningRules.map((r: { id: string }) => r.id));
const PYTHON = process.env.KODIK_CPYTHON || (process.platform === "win32" ? "python" : "python3");
function cpython(code: string, inputs: string[]) {
  const r = spawnSync(PYTHON, ["-I", "-X", "utf8", "-c", code], { input: inputs.map((x) => x + "\n").join(""), encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" }, timeout: 10000 });
  if (r.error) throw new Error(`CPython is required for this export (${PYTHON}): ${r.error.message}`);
  if (r.status !== 0) throw new Error(`CPython fails:\n${r.stderr}\n${code}`);
  return r.stdout.replace(/\r\n/g, "\n").replace(/\n$/, "");
}
const ours = (code: string, inputs: string[], world?: string) => { const r = runCourseProgram(code, inputs, world === undefined ? {} : { world }); return r.error ? { error: r.error } : { text: r.output.join("\n"), scene: r.scene }; };
// Scene tasks start from the import, so the learner writes only the solution.
const starters = { robot: "from pyrob.api import *\n\n", drawing: "import turtle\n\nt = turtle.Turtle()\n" };
const { grade, checkWithBlockly } = await import("../server/b2b/grader.mjs");

async function exportSet(chapters: Chapter[], template: string, file: string) {
  const target = new URL(`../server/b2b/${file}`, import.meta.url);
  const keys = new Set<string>();
  const data = {
    template,
    chapters: chapters.map((chapter, ci) => {
      for (const rule of chapter.rules) if (!ruleIds.has(rule)) throw new Error(`unknown learning rule ${rule}`);
      if (!chapter.title || !chapter.tasks.length) throw new Error(`chapter ${chapter.key} has no title or no tasks`);
      const [question, choices, correct, explanation] = chapter.question;
      return {
        id: ci + 1, title: chapter.title, description: chapter.description, question, choices, correct, explanation, learned: chapter.learned,
        tasks: chapter.tasks.map((p) => {
          const key = `${chapter.key}-${p.key}`;
          if (keys.has(key)) throw new Error(`${key}: two tasks with one key`);
          keys.add(key);
          const sets = p.inputs?.length ? p.inputs : [[]];
          const kind = p.worlds ? "robot" : p.draw ? "drawing" : null;
          const level = p.level ?? chapter.level;
          const common = { key, title: p.title, goal: chapter.title, aim: p.text, instruction: p.text, theory: chapter.theory, hints: [p.hint], ...(level ? { level } : {}) };
          const rules = [...chapter.rules, ...(p.rules ?? []), ...(p.inputs?.length ? ["input:1"] : [])];
          for (const rule of rules) if (!ruleIds.has(rule)) throw new Error(`${key}: unknown learning rule ${rule}`);
          if (kind) {
            if (p.mode ?? chapter.mode) throw new Error(`${key}: the Robot and the turtle have no blocks`);
            // No CPython here: it has neither the Robot nor a headless turtle. The reference must solve
            // each field or draw something; the wrong program must differ from it on some test.
            const checks = [kind];
            const tests = (p.worlds ?? sets.map(() => undefined)).map((world, i) => {
              const inputs = p.worlds ? [] : sets[i], r = ours(p.code, inputs, world);
              if ("error" in r) throw new Error(`${key} test ${i + 1}: reference fails in Kodik: ${r.error}`);
              const verdict = checkScene(checks, r.scene, r.scene);
              if (!verdict.passed) throw new Error(`${key} test ${i + 1}: the reference does not solve it: ${verdict.message}`);
              return { inputs, expected: "", hidden: i >= 2, checks, ...(world === undefined ? {} : { world }), scene: r.scene };
            });
            const caught = tests.some((t) => { const w = ours(p.wrong, t.inputs, t.world); return "error" in w || !checkScene(checks, w.scene, t.scene).passed; });
            if (!caught) throw new Error(`${key}: the wrong program passes every test`);
            return { ...common, starter: starters[kind], code: p.code, wrong: [p.wrong], tests: tests.map(({ scene: _, ...t }) => t), rules };
          }
          const tests = sets.map((inputs, i) => {
            const r = ours(p.code, inputs);
            if ("error" in r) throw new Error(`${key}: reference fails in Kodik: ${r.error}`);
            const real = cpython(p.code, inputs);
            if (real !== r.text) throw new Error(`${key} ${JSON.stringify(inputs)}: Kodik prints «${r.text}», CPython «${real}»`);
            if (!r.text.trim()) throw new Error(`${key} ${JSON.stringify(inputs)}: the reference prints nothing`);
            // The first two examples are visible to the learner; the rest check the solution unseen.
            return { inputs, expected: r.text, hidden: i >= 2 };
          });
          const caught = tests.some((t) => { const w = ours(p.wrong, t.inputs); return "error" in w || w.text !== t.expected; });
          if (!caught) throw new Error(`${key}: the wrong program passes every test`);
          const mode = p.mode ?? chapter.mode;
          let blocks;
          if (mode) {
            let built;
            try { built = toBlocks(p.code); } catch (e) { throw new Error(`${key}: ${(e as Error).message}`); }
            const back = translateWorkspace(built.workspace, { allowed: built.palette });
            if (!back.ok) throw new Error(`${key}: the block solution does not translate: ${back.errors[0]?.message}`);
            for (const t of tests) { const r = ours(back.python, t.inputs); if ("error" in r || r.text !== t.expected) throw new Error(`${key}: the block solution prints «${"error" in r ? r.error : r.text}» instead of «${t.expected}»\n${back.python}`); }
            // "Блоки" opens in blocks with Python beside them; "Блоки + Python" starts from the mixed view.
            blocks = { solution: built.workspace, starter: null, palette: built.palette, modes: mode === "blocks" ? ["blocks", "mixed"] : ["mixed"] };
          }
          return { ...common, starter: p.starter ?? "", code: p.code, wrong: [p.wrong], tests, rules, ...(blocks ? { blocks } : {}) };
        }),
      };
    }),
  };
  // The school grader (output plus learning rules, which ask a construct to matter in EVERY test) must
  // accept the reference on each test and reject the characteristic mistake — exactly what the quality
  // gate checks at install, caught here instead. Block solutions go the learner's way: real Blockly
  // loads them and the grader accepts their translation.
  for (const chapter of data.chapters) for (const t of chapter.tasks as any[]) {
    const as = (tests: unknown[]) => ({ tests: JSON.stringify(tests), learning_rules: JSON.stringify(t.rules), reference_solution: t.code, check_mode: "tests" });
    for (const test of t.tests) {
      const r = await grade(as([test]), t.code, { tenant: "export" });
      if (r.status !== "passed") throw new Error(`${t.key} ${JSON.stringify(test.inputs)}: the school grader rejects the reference: ${r.message}`);
    }
    if ((await grade(as(t.tests), t.wrong[0], { tenant: "export" })).status === "passed") throw new Error(`${t.key}: the school grader accepts the wrong program`);
    if (t.starter.trim() && !t.tests.some((x: { checks?: string[] }) => x.checks) && (await grade(as(t.tests), t.starter, { tenant: "export" })).status === "passed") throw new Error(`${t.key}: the starter already solves the task`);
    if (t.blocks) {
      const loaded = await checkWithBlockly([t.blocks.solution], t.blocks.palette, { tenant: "export" });
      if (loaded.infrastructure || !loaded.results?.[0]?.ok) throw new Error(`${t.key}: real Blockly does not load the block solution: ${loaded.error || loaded.results?.[0]?.message}`);
      const python = translateWorkspace(t.blocks.solution, { allowed: t.blocks.palette }).python;
      const r = await grade(as(t.tests), python, { tenant: "export" });
      if (r.status !== "passed") throw new Error(`${t.key}: the school grader rejects the block solution: ${r.message}\n${python}`);
    }
  }
  const all = data.chapters.flatMap((c) => c.tasks as any[]), total = all.length;
  const json = JSON.stringify(data, null, 1) + "\n";
  if (!file) { console.log(`✓ ${data.chapters.map((c) => c.title).join(", ")}: ${total} tasks pass every check`); return; }
  if (process.argv.includes("--check")) {
    // Line endings follow the checkout (Git may convert them on Windows); the content must match.
    if (readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== json) throw new Error(`server/b2b/${file} is out of date: run npx tsx scripts/export-problem-book.ts`);
    console.log(`✓ ${file} is current and matches CPython: ${data.chapters.length} courses, ${total} tasks`);
  } else {
    writeFileSync(target, json);
    const tests = all.flatMap((t) => t.tests as { checks?: string[] }[]), scenes = tests.filter((t) => t.checks).length;
    const blocks = all.filter((t) => t.blocks), mixed = blocks.filter((t) => !t.blocks.modes.includes("blocks")).length;
    console.log(`${file}: ${data.chapters.length} courses, ${total} tasks (${blocks.length - mixed} in blocks, ${mixed} in blocks + Python, ${total - blocks.length} in Python); every reference matches CPython on ${tests.length - scenes} input sets and solves ${scenes} Robot fields and drawings`);
  }
}

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
if (only) {
  const picked = practicum.filter((c) => only.includes(c.key));
  if (picked.length !== only.length) throw new Error(`no practicum chapter ${only.filter((k) => !picked.some((c) => c.key === k)).join(", ")}`);
  await exportSet(picked, "practicum/v1", "");
} else {
  await exportSet(book, "problems/v1", "problem-book.json");
  await exportSet(practicum, "practicum/v1", "practicum.json");
}
