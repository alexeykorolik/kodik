import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {existsSync} from 'node:fs';
import { ExecutionQueue } from "./execution-queue.mjs";
import { outputMatches } from "../../src/shared/outputMatch.mjs";
const runner = fileURLToPath(
  new URL("../../.runner/runner.cjs", import.meta.url),
);
const blocklyChecker = fileURLToPath(
  new URL("../../.runner/blockly-check.cjs", import.meta.url),
);
export const executionQueue = new ExecutionQueue();
export function execute(code, inputs = [], options = {}) {
  return executionQueue.run(
    options.tenant || "local",
    () => spawnRestricted(runner, { code, inputs, rules: options.rules || [] }),
    options,
  );
}
/**
 * Trusted block → Python translation inside the restricted executor process.
 * Returns {ok, python, errors, warnings, translator, block_types} or {infrastructure, error}.
 */
export function translateBlocks(workspace, palette, options = {}) {
  return executionQueue.run(
    options.tenant || "local",
    () => spawnRestricted(runner, { action: "translate", workspace, palette }),
    options,
  );
}
/** Publication-time load of workspaces into real (headless) Blockly, in its own restricted process. */
export function checkWithBlockly(workspaces, palette, options = {}) {
  return executionQueue.run(
    options.tenant || "local",
    () => spawnRestricted(blocklyChecker, { workspaces, palette }, 10000, 128),
    options,
  );
}
function spawnRestricted(file, payload, deadline = 2500, heapMb = 48) {
  if(!existsSync(file))return Promise.resolve({infrastructure:true,error:'Исполнитель не собран. Решение не оценивалось.',output:[]});
  return new Promise((resolve) => {
    let output = "",
      finished = false, diagnostic='';
    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result);
    };
    const child = spawn(
      process.execPath,
      [
        "--permission",
        `--allow-fs-read=${file}`,
        `--max-old-space-size=${heapMb}`,
        "--stack-size=512",
        file,
      ],
      {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
        env: { SYSTEMROOT: process.env.SYSTEMROOT || "", PATH: "" },
      },
    );
    const timer = setTimeout(() => {
      child.kill();
      finish({ output: [], error: "Превышено время или ресурсы выполнения." });
    }, deadline);
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.length > 128000) {
        child.kill();
        finish({ output: [], error: "Слишком много вывода." });
      }
    });
    child.stderr.on('data',chunk=>{if(diagnostic.length<8192)diagnostic+=String(chunk).slice(0,8192-diagnostic.length);});
    child.on("error", () =>
      finish({
        infrastructure: true,
        output: [],
        error: "Исполнитель недоступен.",
      }),
    );
    child.on("close", (status) => {
      if (status !== 0) return finish(/heap out of memory|allocation failed/i.test(diagnostic)
        ? {output:[],error:'Программа превысила лимит памяти. Уменьшите объём вычислений.'}
        : {infrastructure:true,output:[],error:'Исполнитель завершился с ошибкой. Решение не оценивалось; повторите проверку.'});
      try {
        finish(JSON.parse(output));
      } catch {
        finish({
          infrastructure: true,
          output: [],
          error: "Ошибка ответа исполнителя.",
        });
      }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify(payload));
  });
}
export async function grade(task, code, options = {}) {
  if (task.check_mode === "manual")
    return {
      status: "pending_review",
      message: "Решение отправлено преподавателю.",
      cases: [],
    };
  const tests = JSON.parse(task.tests),
    cases = [];
  for (const [index, test] of tests.entries()) {
    const result = await execute(code, test.inputs, {...options,rules:JSON.parse(task.learning_rules||'[]')});
    if (result.infrastructure)
      return { status: "checker_error", message: result.error, cases: [] };
    if (result.error)
      return {
        status: "runtime_error",
        message: test.hidden
          ? "Ошибка выполнения на скрытом тесте."
          : result.error,
        cases,
      };
    if(result.learning_error&&!test.hidden)
      return {status:'failed',message:result.learning_error,cases};
    const passed = !result.learning_error &&
      outputMatches(result.output, test.expected);
    cases.push(
      test.hidden
        ? { index: index + 1, hidden: true, passed }
        : {
            index: index + 1,
            passed,
            output: result.output.join("\n"),
            inputs: test.inputs,
            expected: test.expected,
          },
    );
  }
  const passed = cases.every((t) => t.passed);
  return {
    status: passed ? "passed" : "failed",
    message: passed
      ? "Отлично! Все тесты пройдены."
      : "Результат отличается от ожидаемого. Попробуй ещё раз.",
    cases,
  };
}
