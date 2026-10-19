/**
 * PoC: Blockly program → trusted translation → existing B2B grader with the task's own tests.
 * Run: npm run build:runner && tsx tests/adaptive-blockly.poc.ts
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import * as Blockly from 'blockly'
import { translateWorkspace, BLOCKS, type BlockJson, type WorkspaceJson } from '../src/adaptive/blockProgram'
import '../src/adaptive/blocklyBlocks'
import { analyzeReference } from '../src/adaptive/referenceAnalysis'
// @ts-expect-error untyped ESM server module
import { grade, executionQueue } from '../server/b2b/grader.mjs'

let checks = 0
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); checks++ }
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); checks++ }

// ---- tiny builders for Blockly JSON serialization ----
let seq = 0
const B = (type: string, fields: Record<string, unknown> = {}, inputs: Record<string, BlockJson | undefined> = {}, extra: Partial<BlockJson> = {}): BlockJson => ({
  type, id: `b${++seq}`, ...(Object.keys(fields).length ? { fields } : {}),
  ...(Object.keys(inputs).length ? { inputs: Object.fromEntries(Object.entries(inputs).filter(([, v]) => v).map(([k, v]) => [k, { block: v }])) } : {}), ...extra
})
const chain = (...blocks: BlockJson[]): BlockJson => { for (let i = blocks.length - 2; i >= 0; i--) blocks[i].next = { block: blocks[i + 1] }; return blocks[0] }
const vars = (...names: string[]) => names.map(name => ({ name, id: `v-${name}` }))
const V = (name: string) => ({ id: `v-${name}` })
const ws = (variables: string[], ...roots: BlockJson[]): WorkspaceJson => ({ blocks: { languageVersion: 0, blocks: roots.map((r, i) => ({ x: 20, y: 20 + i * 200, ...r })) }, variables: vars(...variables) })
const num = (n: number) => B('math_number', { NUM: n })
const txt = (s: string) => B('text', { TEXT: s })
const get = (n: string) => B('variables_get', { VAR: V(n) })
const set = (n: string, v: BlockJson) => B('variables_set', { VAR: V(n) }, { VALUE: v })
const print = (v: BlockJson) => B('text_print', {}, { TEXT: v })
const arith = (op: string, a: BlockJson, b: BlockJson) => B('math_arithmetic', { OP: op }, { A: a, B: b })
const cmp = (op: string, a: BlockJson, b: BlockJson) => B('logic_compare', { OP: op }, { A: a, B: b })

const task = (tests: { inputs: string[]; expected: string; hidden?: boolean }[], rules: string[] = []) => ({ check_mode: 'tests', tests: JSON.stringify(tests.map(t => ({ hidden: false, ...t }))), learning_rules: JSON.stringify(rules) })
// Server path: the client may send any "python" it likes; only the blocks are trusted.
async function gradeBlocks(t: ReturnType<typeof task>, submission: { blocks: unknown; python?: string }, palette?: string[]) {
  const tr = translateWorkspace(submission.blocks, { allowed: palette })
  if (!tr.ok) return { status: 'failed', message: tr.errors[0].message, cases: [], translation: tr }
  return { ...(await grade(t, tr.python, { tenant: 'poc' })), translation: tr }
}
function cpython(code: string, inputs: string[]) {
  const r = spawnSync('python', ['-I', '-X', 'utf8', '-c', code], { input: inputs.join('\n') + '\n', encoding: 'utf8', timeout: 5000 })
  return r.error ? null : { out: r.stdout.replace(/\r\n/g, '\n').trimEnd(), err: r.stderr }
}
const hasPython = !!cpython('print(1)', [])

// ===== 1. Task «Удвоим число»: the same tests for blocks and for Python =====
const doubleTask = task([{ inputs: ['2'], expected: '4' }, { inputs: ['0'], expected: '0' }, { inputs: ['21'], expected: '42', hidden: true }], ['input:1', 'assign:1'])
const reference = 'n = int(input())\nprint(n * 2)\n'
const analysis = analyzeReference(reference)
ok(analysis.blocklyCompatible, 'reference is Blockly-compatible')
eq(new Set(analysis.palette), new Set(['variables_set', 'kodik_input_int', 'text_print', 'math_arithmetic', 'variables_get', 'math_number']), 'palette from reference')
eq(new Set(analysis.skills), new Set(['variables', 'input', 'output', 'arithmetic']), 'skills from reference')

const correct = ws(['n'], chain(set('n', B('kodik_input_int')), print(arith('MULTIPLY', get('n'), num(2)))))
const tr = translateWorkspace(correct, { allowed: analysis.palette })
eq(tr.python, 'n = int(input())\nprint(n * 2)\n', 'generated Python')
ok(tr.lines[(correct.blocks!.blocks![0]).id as string][0] === 1, 'line map for mixed-mode highlight')
const passed = await gradeBlocks(doubleTask, { blocks: correct }, analysis.palette)
eq(passed.status, 'passed', 'blocks solution passes the task tests and learning rules')
const pyPassed = await grade(doubleTask, 'n = int(input())\nprint(n * 2)\n', { tenant: 'poc' })
eq(pyPassed.status, 'passed', 'Python-mode solution passes the same tests')

const wrong = ws(['n'], chain(set('n', B('kodik_input_int')), print(arith('ADD', get('n'), num(2)))))
const failed = await gradeBlocks(doubleTask, { blocks: wrong }, analysis.palette)
eq(failed.status, 'failed', 'wrong blocks are rejected')
const hiddenCase = failed.cases.find((c: { hidden?: boolean }) => c.hidden)
eq(Object.keys(hiddenCase).sort(), ['hidden', 'index', 'passed'], 'hidden test reveals only pass/fail')

// Tampering: client claims correct Python, sends wrong blocks → blocks win.
const tampered = await gradeBlocks(doubleTask, { blocks: wrong, python: reference })
eq(tampered.status, 'failed', 'server ignores client-supplied Python')

// Learning rule: output without input/variable is caught by the existing structural checker.
const cheat = ws([], print(num(4)))
eq((await gradeBlocks(task([{ inputs: ['2'], expected: '4' }], ['input:1'])
  , { blocks: cheat })).status, 'failed', 'learning rules apply to block programs')

// ===== 2. Conditions, modulo, elif/else, logic =====
const parity = ws(['n'], chain(
  set('n', B('kodik_input_int')),
  B('controls_if', {}, {
    IF0: cmp('EQ', B('math_modulo', {}, { DIVIDEND: get('n'), DIVISOR: num(2) }), num(0)), DO0: print(txt('чётное')),
    IF1: B('logic_operation', { OP: 'AND' }, { A: cmp('LT', get('n'), num(0)), B: B('logic_negate', {}, { BOOL: cmp('EQ', get('n'), num(-1)) }) }), DO1: print(txt('отрицательное нечётное')),
    ELSE: print(txt('нечётное'))
  }, { extraState: { elseIfCount: 1, hasElse: true } })))
const parityTr = translateWorkspace(parity)
eq(parityTr.python, 'n = int(input())\nif (n % 2) == 0:\n    print("чётное")\nelif (n < 0) and (not (n == (-1))):\n    print("отрицательное нечётное")\nelse:\n    print("нечётное")\n', 'if/elif/else with modulo and logic')
const parityTask = task([{ inputs: ['4'], expected: 'чётное' }, { inputs: ['7'], expected: 'нечётное' }, { inputs: ['-3'], expected: 'отрицательное нечётное' }, { inputs: ['-1'], expected: 'нечётное', hidden: true }], ['kind:if'])
eq((await gradeBlocks(parityTask, { blocks: parity })).status, 'passed', 'condition task passes')

// ===== 3. Loops: repeat N, nested repeat, while with «увеличить на», text_join =====
const stars = ws(['n'], chain(set('n', B('kodik_input_int')), B('controls_repeat_ext', {}, { TIMES: get('n'), DO: B('controls_repeat_ext', {}, { TIMES: num(2), DO: print(txt('*')) }) })))
const starsTr = translateWorkspace(stars)
eq(starsTr.python, 'n = int(input())\nfor _kodik_i1 in range(n):\n    for _kodik_i2 in range(2):\n        print("*")\n', 'nested repeat uses distinct valid counters')
eq((await gradeBlocks(task([{ inputs: ['2'], expected: '*\n*\n*\n*' }], ['nested_loop']), { blocks: stars })).status, 'passed', 'nested loop task passes')
const countdown = ws(['i'], chain(set('i', num(3)), B('controls_whileUntil', { MODE: 'WHILE' }, { BOOL: cmp('GT', get('i'), num(0)), DO: chain(print(B('text_join', {}, { ADD0: txt('осталось '), ADD1: get('i') }, { extraState: { itemCount: 2 } })), B('math_change', { VAR: V('i') }, { DELTA: num(-1) })) })))
const countdownTr = translateWorkspace(countdown)
eq(countdownTr.python, 'i = 3\nwhile i > 0:\n    print("осталось " + str(i))\n    i = i + (-1)\n', 'while + change + join (no += needed)')
eq((await gradeBlocks(task([{ inputs: [], expected: 'осталось 3\nосталось 2\nосталось 1' }], ['kind:while']), { blocks: countdown })).status, 'passed', 'while task passes')
const until = ws(['i'], chain(set('i', num(0)), B('controls_whileUntil', { MODE: 'UNTIL' }, { BOOL: cmp('EQ', get('i'), num(2)), DO: B('math_change', { VAR: V('i') }, { DELTA: num(1) }) }), print(get('i'))))
eq(translateWorkspace(until).python, 'i = 0\nwhile not (i == 2):\n    i = i + 1\nprint(i)\n', 'repeat-until becomes while not')

// ===== 4. Functions without parameters =====
const fn = ws([], B('kodik_define', { NAME: 'привет' }, { BODY: print(txt('Привет!')) }), chain(B('kodik_call', { NAME: 'привет' }), B('kodik_call', { NAME: 'привет' })))
eq(translateWorkspace(fn).python, 'def привет():\n    print("Привет!")\nпривет()\nпривет()\n', 'functions defined before main program')
eq((await gradeBlocks(task([{ inputs: [], expected: 'Привет!\nПривет!' }]), { blocks: fn })).status, 'passed', 'function task passes')

// ===== 5. Rejections with explanations =====
const errorOf = (w: unknown, allowed?: string[]) => { const t = translateWorkspace(w, allowed ? { allowed } : {}); ok(!t.ok && t.python === '', 'rejected program yields no code'); return t.errors[0]?.message ?? '' }
ok(/не входит в набор/.test(errorOf(ws([], print(arith('ADD', num(1), num(2)))), ['text_print', 'math_number'])), 'block outside palette rejected')
ok(/break и continue/.test(errorOf(ws([], B('controls_repeat_ext', {}, { TIMES: num(2), DO: B('controls_flow_statements', { FLOW: 'BREAK' }) })))), 'break block rejected with reason')
ok(/со счётчиком/.test(errorOf(ws(['i'], B('controls_for', { VAR: V('i') })))), 'controls_for rejected with reason')
ok(/не поддерживается/.test(errorOf(ws([], B('evil_block')))), 'unknown block rejected')
ok(/пустое место/.test(errorOf(ws([], print(undefined as unknown as BlockJson)))), 'empty socket explained')
ok(/лежит отдельно/.test(errorOf(ws([], num(5)))), 'detached value block explained')
ok(/это значение/.test(errorOf(ws([], chain(print(num(1)), num(2) as BlockJson)))), 'value in statement position rejected')
ok(/служебное слово/.test(errorOf(ws(['print'], set('print', num(1))))), 'reserved name rejected')
ok(/подчёркивания/.test(errorOf(ws(['_kodik_i1'], set('_kodik_i1', num(1))))), 'translator prefix reserved')
ok(/Сначала создай функцию/.test(errorOf(ws([], B('kodik_call', { NAME: 'нет' })))), 'call before define rejected')
ok(/иначе если/.test(errorOf(ws([], B('controls_if', {}, { IF0: B('logic_boolean', { BOOL: 'TRUE' }) }, { extraState: { elseIfCount: 5000 } })))), 'mutation bomb rejected')
const deep = (n: number): BlockJson => n === 0 ? num(1) : arith('ADD', deep(n - 1), num(1))
ok(/слишком глубоко/.test(errorOf(ws([], print(deep(20))))), 'deep nesting rejected')
ok(/слишком много блоков/.test(errorOf(ws([], chain(...Array.from({ length: 210 }, () => print(num(1)))))) ), 'block count limit')
ok(/слишком большая|слишком много блоков/.test(errorOf(ws([], chain(...Array.from({ length: 900 }, () => print(txt('x'.repeat(100))))))) ), 'size limit')
ok(/длиннее/.test(errorOf(ws([], print(txt('я'.repeat(501)))))), 'long text rejected')
for (const garbage of [null, 42, 'print(1)', [], { blocks: { blocks: [{ id: 'x' }] } }, { blocks: { blocks: [{ type: {} }] } }])
  ok(!translateWorkspace(garbage).ok, `garbage rejected: ${JSON.stringify(garbage)}`)
const cyc: BlockJson = print(num(1)); cyc.next = { block: cyc }
let cycMsg = ''; try { cycMsg = translateWorkspace({ blocks: { blocks: [cyc] } }).errors[0].message } catch (e) { cycMsg = 'threw ' + (e as Error).message }
ok(/слишком много|зациклена|большая|сами на себя/.test(cycMsg), 'cyclic object graph handled: ' + cycMsg.slice(0, 60))
ok(translateWorkspace(ws([], print(txt('кавычки " и \\ слэш\nперевод')))).python === 'print("кавычки \\" и \\\\ слэш\\nперевод")\n', 'string escaping')

// ===== 6. Execution limits still apply =====
const forever = ws([], B('controls_whileUntil', { MODE: 'WHILE' }, { BOOL: B('logic_boolean', { BOOL: 'TRUE' }), DO: print(num(1)) }))
const loopResult = await gradeBlocks(task([{ inputs: [], expected: '1' }]), { blocks: forever })
eq(loopResult.status, 'runtime_error', 'infinite loop stopped by existing limits')

// ===== 7. Real Blockly: our JSON is valid Blockly serialization and survives a round trip =====
for (const [name, w] of Object.entries({ correct, parity, stars, countdown, until, fn })) {
  const workspace = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(w as object, workspace)
  const saved = Blockly.serialization.workspaces.save(workspace)
  workspace.dispose()
  eq(translateWorkspace(saved).python, translateWorkspace(w).python, `Blockly round trip keeps Python: ${name}`)
}
const known = new Set(Object.keys(Blockly.Blocks))
for (const b of BLOCKS) ok(known.has(b.type), `block type registered in Blockly: ${b.type}`)

// ===== 8. Reference analysis explains incompatibility =====
const inc = (code: string, pattern: RegExp) => { const a = analyzeReference(code); ok(!a.blocklyCompatible && a.reasons.some(r => pattern.test(r)), `incompatible: ${code.split('\n')[0]} → ${a.reasons[0]}`) }
inc('n = int(input())\nfor i in range(n):\n    print(i)', /счётчиком/)
inc('a = [1, 2]\nprint(a[0])', /Списки|индексу/)
inc('def sq(x):\n    return x * x\nprint(sq(3))', /параметрами|return/)
inc('print(7 // 2)', /\/\//)
inc('x = 3\nprint(1 < x < 5)', /Цепочка/)
inc('s = 0\ns += 1', /не разбирается/)
ok(analyzeReference('x = int(input())\nif x > 0:\n    print("плюс")\nelse:\n    print("не плюс")').blocklyCompatible, 'condition reference compatible')
ok(analyzeReference('s = 0\nfor _ in range(3):\n    s = s + 2\nprint("итог: " + str(s))').palette.includes('math_change'), 'x = x + d suggests «увеличить на»')

// ===== 9. Generated Python means the same in CPython (our reviewed fixtures only) =====
let cpythonChecked = 0
if (hasPython) {
  for (const [w, inputs] of [[correct, ['21']], [parity, ['-3']], [parity, ['4']], [stars, ['2']], [countdown, []], [until, []], [fn, []]] as [WorkspaceJson, string[]][]) {
    const code = translateWorkspace(w).python
    const ours = await grade(task([{ inputs, expected: '' }]), code, { tenant: 'poc' })
    const theirs = cpython(code, inputs)!
    eq(theirs.err, '', 'CPython runs generated code without error')
    eq((ours.cases[0]?.output ?? '').trimEnd(), theirs.out, `same output in Kodik runner and CPython for: ${code.split('\n')[0]}`)
    cpythonChecked++
  }
}

executionQueue.close?.()
console.log(`✓ ${checks} проверок PoC Blockly → Python → проверяющий B2B${hasPython ? `; ${cpythonChecked} программ совпали с CPython` : '; CPython не найден, сверка пропущена'}`)
process.exit(0)
