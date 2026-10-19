import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {existsSync} from 'node:fs';
import { ExecutionQueue } from "./execution-queue.mjs";
import { outputMatches } from "../../src/shared/outputMatch.mjs";
const runner = fileURLToPath(
  new URL("../../.runner/runner.cjs", import.meta.url),
);
export const executionQueue = new ExecutionQueue();
export function execute(code, inputs = [], options = {}) {
  return executionQueue.run(
    options.tenant || "local",
    () => executeProcess(code, inputs, options.rules || []),
    options,
  );
}
function executeProcess(code, inputs, rules) {
  if(!existsSync(runner))return Promise.resolve({infrastructure:true,error:'Исполнитель не собран. Решение не оценивалось.',output:[]});
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
        `--allow-fs-read=${runner}`,
        "--max-old-space-size=48",
        "--stack-size=512",
        runner,
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
    }, 2500);
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
    child.stdin.end(JSON.stringify({ code, inputs, rules }));
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
