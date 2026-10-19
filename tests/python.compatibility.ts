import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { runCourseProgram } from "../src/pythonExecution";
// Only these reviewed, immutable programs are sent to CPython. Never import a
// learner submission into this test harness or expose it as a server executor.
const version = spawnSync(
  "python",
  ["-I", "-c", "import platform; print(platform.python_version())"],
  { encoding: "utf8" },
);
assert.equal(version.status, 0, version.stderr);
assert.equal(
  version.stdout.trim(),
  "3.11.9",
  "Use the pinned CPython reference, not an unrecorded version.",
);
const cases = [
  'print(1.0 // .1, -1.0 // .1, 1.0 // -.1, -0.0 // 3.0)',
  'print(5.5 % 2, -5.5 % 2, 5.5 % -2, -5.5 % -2, .3 % .1, 0.0 % -3.0)',
  'a = [1]\ndef f():\n    a[0] = 2\n    a = [3]\nf()',
  'def f():\n    print("global")\ndef g():\n    f()\n    f = 3\ng()',
  'print([] * 1000000000)',
  'print("\\x41\\u043a\\U0001f600\\101")',
  'print(["\\a\\b\\f\\v\\r\\t", "\\u200b", "\\u00a0"])',
  'print("\\x4Z")',
  'print("line1\\nline2")',
  'input("name: ")',
  'print([1.0] + [2, 3.0])',
  'print([1.0, 2] * 2)',
  'print(2 * "ab", "ab" * -2)',
  'print("a" * 2.0)',
  'def f():\n    print("old")\nf = 3\nf()',
  'print(6 / 2)',
  'print(3.0, -0.0, 1e-5, 1_000, .5, 3.)',
  'print(["a", "b", "can\'t", 3.0, None])',
  'a = [1.0, [2.0]]\na[0] = 3.0\nprint(a, a[0], a[1][0])',
  'for n in [1.0, 2]:\n    print(n)',
  'def identity(n):\n    return n\nx = identity(3.0)\nprint(x)',
  'print(3 < 2 < 1)',
  'print(1 < 2 <= 2 != 3)',
  'print(3 < 2 < missing)',
  'def middle():\n    print("once")\n    return 2\nprint(1 < middle() < 3)',
  'print(1.0 and 2, 0.0 or 3, 0.0 and 2, 1.0 or 3)',
  'print(range(3.0))',
  'print([1][0.0])',
  'print([1][True])',
  'print(-7 // 3, 7 // -3, 7.0 // 3, 2 ** -2, +3, -2 ** 2)',
  'print("😀" > "\\ue000")',
  'x = 1\ndef f():\n    print(x)\n    x = 2\nf()',
  'x = 1\ndef f():\n    if False:\n        x = 2\n    print(x)\nf()',
  'print("# visible") # comment\nx = 3 # another\nprint(x)',
  'def f():\n    return\nprint(f())',
  "print(int(3.9))",
  "print(int(-3.9))",
  'print(int(""))',
  'print(int("   "))',
  'print(int("  +31  "))',
  'print(int("1_024"))',
  'print(int("3.9"))',
  "print(int(True))",
  "print(int(False))",
  "print(int())",
  'if []:\n    print("wrong")\nelse:\n    print("correct")',
  "print(not [])",
  "print([] or 7)",
  "print([] and 9)",
  "print([1] and 7)",
  "print(not 0 == 2)",
  "print(True == 1)",
  "print(False == 0)",
  "print(True != 1)",
  "print([True, False] == [1, 0])",
  'print("abc" == "abc")',
  'print("1" == 1)',
  "print(True + 2)",
  'print(len("Привет"))',
  'print(len("😀"))',
  'print("кот"[1])',
  'print("кот"[-1])',
  'for letter in "кот":\n    print(letter)',
  "print(len([1,2,3]))",
  'x = 0\nwhile x:\n    print("wrong")\nprint("done")',
  'if "":\n    print("wrong")\nelse:\n    print("ok")',
  "print(2 + 3 * 4)",
  "print(2 ** 3 ** 2)",
  "print(-7 % 3)",
  "def twice(n):\n    return n * 2\nprint(twice(8))",
];
const reference = `import contextlib,io,json\nprograms=json.loads(input())\nresults=[]\nfor source in programs:\n    output=io.StringIO()\n    try:\n        with contextlib.redirect_stdout(output):\n            exec(source,{})\n        results.append({"output":output.getvalue().splitlines(),"error":False})\n    except Exception:\n        results.append({"output":output.getvalue().splitlines(),"error":True})\nprint(json.dumps(results,ensure_ascii=False))`;
const run = spawnSync("python", ["-I", "-X", "utf8", "-c", reference], {
  encoding: "utf8",
  input: JSON.stringify(cases),
  timeout: 10000,
});
assert.equal(run.status, 0, run.stderr);
const expected = JSON.parse(run.stdout);
for (const [i, source] of cases.entries()) {
  const actual = runCourseProgram(source);
  assert.deepEqual(
    { output: actual.output, error: Boolean(actual.error) },
    expected[i],
    source,
  );
}
console.log(
  `✓ ${cases.length} reviewed Python examples match CPython 3.11.9; no learner code is executed by CPython.`,
);
