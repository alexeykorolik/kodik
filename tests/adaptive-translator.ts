/**
 * Blockly → learning Python translator, exercised through REAL Blockly: blocks are
 * created, connected, disabled, saved and loaded with Blockly's own API (headless).
 * Generated programs are compared with CPython 3.11 when it is available; the
 * mandatory pipeline sets KODIK_REQUIRE_CPYTHON=1 so a missing CPython fails loudly.
 *
 * Run: tsx tests/adaptive-translator.ts
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import * as Blockly from 'blockly'
import '../src/adaptive/blocklyBlocks'
import { translateWorkspace, validateWorkspaceShape, nameProblem, LIMITS, BLOCKS } from '../src/adaptive/blockProgram'
import { analyzeReference } from '../src/adaptive/referenceAnalysis'
import { parseCourseProgram, runPythonAst } from '../src/pythonRuntime'
import { outputMatches, joinOutput } from '../src/shared/outputMatch.mjs'

let checks = 0
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); checks++ }
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); checks++ }

// ---------- real Blockly helpers ----------
const W = () => new Blockly.Workspace()
const save = (w: Blockly.Workspace) => Blockly.serialization.workspaces.save(w)
const roundTrip = (w: Blockly.Workspace) => { const json = save(w); const w2 = W(); Blockly.serialization.workspaces.load(json, w2); const again = save(w2); w2.dispose(); return again }
const variable = (w: Blockly.Workspace, name: string) => w.getVariableMap().getVariable(name) ?? w.getVariableMap().createVariable(name)
const block = (w: Blockly.Workspace, type: string, fields: Record<string, unknown> = {}) => { const b = w.newBlock(type); for (const [k, v] of Object.entries(fields)) b.setFieldValue(v as never, k); return b }
const num = (w: Blockly.Workspace, n: number) => block(w, 'math_number', { NUM: n })
const txt = (w: Blockly.Workspace, s: string) => block(w, 'text', { TEXT: s })
const plug = (parent: Blockly.Block, input: string, child: Blockly.Block) => { parent.getInput(input)!.connection!.connect(child.outputConnection ?? child.previousConnection!); return parent }
const then = (...blocks: Blockly.Block[]) => { for (let i = 0; i < blocks.length - 1; i++) blocks[i].nextConnection!.connect(blocks[i + 1].previousConnection!); return blocks[0] }
const set = (w: Blockly.Workspace, name: string, value: Blockly.Block) => plug(block(w, 'variables_set', { VAR: variable(w, name).getId() }), 'VALUE', value)
const get = (w: Blockly.Workspace, name: string) => block(w, 'variables_get', { VAR: variable(w, name).getId() })
const print = (w: Blockly.Workspace, value: Blockly.Block) => plug(block(w, 'text_print'), 'TEXT', value)
const op = (w: Blockly.Workspace, type: string, opName: string | null, a: Blockly.Block, b: Blockly.Block) => { const x = block(w, type, opName ? { OP: opName } : {}); const [l, r] = type === 'math_modulo' ? ['DIVIDEND', 'DIVISOR'] : ['A', 'B']; plug(x, l, a); plug(x, r, b); return x }
const translate = (w: Blockly.Workspace, allowed?: string[]) => translateWorkspace(roundTrip(w), allowed ? { allowed } : {})
const run = (code: string, inputs: string[] = []) => { try { const r = runPythonAst(parseCourseProgram(code), inputs); return { lines: r.output, error: r.error } } catch (e) { return { lines: [] as string[], error: (e as Error).message } } }

const cpythonAvailable = spawnSync('python', ['-I', '-X', 'utf8', '-c', 'import sys; print(sys.version_info[:2])'], { encoding: 'utf8' })
const hasCpython = cpythonAvailable.status === 0 && /3, 1[1-9]/.test(cpythonAvailable.stdout)
if (process.env.KODIK_REQUIRE_CPYTHON === '1' && !hasCpython) { console.error('✗ CPython 3.11+ обязателен для этой проверки (KODIK_REQUIRE_CPYTHON=1), но не найден.'); process.exit(1) }
const cpython = (code: string, inputs: string[]) => { const r = spawnSync('python', ['-I', '-X', 'utf8', '-c', code], { input: inputs.join('\n') + '\n', encoding: 'utf8', timeout: 5000 }); return { out: (r.stdout ?? '').replace(/\r\n/g, '\n'), err: r.stderr ?? '', status: r.status } }
let cpythonCompared = 0
const sameAsCpython = (code: string, inputs: string[], label: string) => {
  const ours = run(code, inputs)
  if (!hasCpython) return
  const theirs = cpython(code, inputs)
  if (ours.error) { ok(theirs.status !== 0, `${label}: both fail (ours: ${ours.error.slice(0, 60)})`); return }
  eq(theirs.err, '', `${label}: CPython without error`)
  ok(outputMatches(ours.lines, theirs.out), `${label}: same output\nours=${JSON.stringify(joinOutput(ours.lines))}\ncpython=${JSON.stringify(theirs.out)}`)
  cpythonCompared++
}

// ===== 1. Disabled blocks: actual Blockly 12 serialization is disabledReasons =====
{
  const w = W()
  const a = set(w, 'n', num(w, 1)), p = print(w, get(w, 'n'))
  then(a, p)
  p.setDisabledReason(true, Blockly.constants.MANUALLY_DISABLED)
  const json = roundTrip(w)
  ok(JSON.stringify(json).includes('"disabledReasons":["MANUALLY_DISABLED"]'), 'Blockly 12 writes disabledReasons')
  ok(validateWorkspaceShape(json).ok, 'draft with a disabled block is storable')
  const t = translateWorkspace(json)
  ok(!t.ok && t.errors[0].code === 'disabled' && t.errors[0].blockId === p.id, 'manually disabled statement blocks run with an explanation, never silently dropped')
  w.dispose()
}
{
  const w = W()
  const loop = plug(block(w, 'controls_repeat_ext'), 'TIMES', num(w, 2))
  plug(loop, 'DO', print(w, txt(w, 'внутри')))
  then(print(w, txt(w, 'до')), loop, print(w, txt(w, 'после')))
  loop.setDisabledReason(true, Blockly.constants.MANUALLY_DISABLED)
  const t = translate(w)
  ok(!t.ok && t.errors.some(e => e.code === 'disabled' && e.blockId === loop.id), 'disabled chain head (with children) is reported, not executed partially')
  w.dispose()
}
{
  const w = W()
  const p = print(w, op(w, 'math_arithmetic', 'ADD', num(w, 1), num(w, 2)))
  const inner = p.getInputTargetBlock('TEXT')!
  inner.setDisabledReason(true, Blockly.constants.MANUALLY_DISABLED)
  const t = translate(w)
  ok(!t.ok && t.errors.some(e => e.code === 'disabled' && e.blockId === inner.id), 'disabled value block is reported')
  w.dispose()
}
{
  const w = W()
  then(print(w, txt(w, 'a')))
  const orphan = print(w, txt(w, 'b'))
  orphan.setDisabledReason(true, 'ORPHANED_BLOCK')
  const t = translate(w)
  ok(!t.ok && t.errors.some(e => e.blockId === orphan.id && e.code === 'disabled'), 'automatically disabled orphan is reported')
  w.dispose()
}
{
  const w = W()
  Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [{ type: 'text_print', enabled: false, inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'x' } } } } }] } }, w)
  ok(!translate(w).ok, 'legacy enabled:false is also treated as disabled')
  ok(!translateWorkspace({ blocks: { blocks: [{ type: 'text_print', enabled: false, inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'x' } } } } }] } }).ok, 'raw legacy flag rejected by translator')
  w.dispose()
}

// ===== 2. Shadows: literals that belong to the parent; never a palette bypass =====
{
  const w = W()
  Blockly.serialization.blocks.append({ type: 'text_print', inputs: { TEXT: { block: { type: 'math_arithmetic', fields: { OP: 'MULTIPLY' }, inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 6 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 7 } } } } } } } }, w)
  const t = translate(w, ['text_print', 'math_arithmetic'])
  eq(t.python, 'print(6 * 7)\n', 'toolbox shadows work without math_number in the palette')
  ok(!t.blockTypes.includes('math_number'), 'shadows are not counted as used palette blocks')
  // Learner drops a real variable onto the shadow: the real block wins and IS palette-checked.
  const ar = w.getTopBlocks(false)[0].getInputTargetBlock('TEXT')!
  plug(ar, 'A', get(w, 'n'))
  const t2 = translate(w, ['text_print', 'math_arithmetic'])
  ok(!t2.ok && t2.errors.some(e => e.code === 'palette'), 'a real block over a shadow is checked against the palette')
  w.dispose()
}
ok(!validateWorkspaceShape({ blocks: { blocks: [{ type: 'text_print', inputs: { TEXT: { shadow: { type: 'kodik_input_int' } } } }] } }).ok, 'shadow of a non-literal type is rejected (forged palette bypass)')
ok(!translateWorkspace({ blocks: { blocks: [{ type: 'text_print', inputs: { TEXT: { shadow: { type: 'math_arithmetic', fields: { OP: 'ADD' } } } } }] } }, { allowed: ['text_print'] }).ok, 'forged arithmetic shadow cannot sneak past the palette')

// ===== 3. Incomplete programs: storable draft, explained translation error =====
{
  const w = W()
  then(set(w, 'n', block(w, 'kodik_input_int')), block(w, 'text_print'))
  const json = roundTrip(w)
  ok(validateWorkspaceShape(json).ok, 'empty socket is a normal draft state')
  const t = translateWorkspace(json)
  ok(!t.ok && /пустое место «что напечатать»/.test(t.errors[0].message), 'empty socket explained at run time')
  const loose = W(); loose.newBlock('math_number'); ok(validateWorkspaceShape(roundTrip(loose)).ok && !translate(loose).ok, 'detached value: storable, not runnable')
  const unnamed = W(); unnamed.newBlock('variables_set'); ok(validateWorkspaceShape(roundTrip(unnamed)).ok, 'variable block with default variable is storable')
  w.dispose(); loose.dispose(); unnamed.dispose()
}

// ===== 4. Names: one rule set for editor, translator, analysis and interpreter =====
for (const name of ['max', 'float', 'list', 'sum', 'Имя', 'x1', '_x', 'счёт_2'])
  { eq(nameProblem(name), null, `name allowed everywhere: ${name}`); ok(!run(`${name} = 1\nprint(${name})`).error, `interpreter accepts ${name}`) }
for (const name of ['print', 'input', 'range', 'if', 'True', '__x', '1a', 'a-b', '_kodik_i1', 'x'.repeat(41)])
  ok(nameProblem(name), `name rejected with reason: ${name}`)
{
  const w = W(); then(set(w, 'max', num(w, 3)), print(w, get(w, 'max')))
  eq(translate(w).python, 'max = 3\nprint(max)\n', 'interpreter-valid name "max" now translates (was wrongly rejected before)')
  w.dispose()
}
ok(analyzeReference('max = int(input())\nprint(max)').blocklyCompatible, 'analysis accepts the same names')
ok(analyzeReference('_kodik_i1 = 1\nprint(_kodik_i1)').reasons.some(r => /заняты Kodik/.test(r)), 'analysis explains the reserved prefix specifically')

// ===== 5. Numbers, repetition bounds, short-circuit, functions/scope, escaping — vs CPython =====
const program = (build: (w: Blockly.Workspace) => void) => { const w = W(); build(w); const t = translate(w); w.dispose(); assert.ok(t.ok, t.errors.map(e => e.message).join('; ')); return t.python }
const numbers = program(w => then(print(w, num(w, -5)), print(w, op(w, 'math_arithmetic', 'MINUS', num(w, 0), num(w, -2.5))), print(w, op(w, 'math_arithmetic', 'DIVIDE', num(w, 7), num(w, 2))), print(w, op(w, 'math_arithmetic', 'POWER', num(w, 2), num(w, -1))), print(w, op(w, 'math_modulo', null, num(w, -7), num(w, 3))), print(w, num(w, 0.1))))
ok(numbers.includes('(-5)') && numbers.includes('(-2.5)'), 'negative numbers parenthesised')
sameAsCpython(numbers, [], 'negative and fractional numbers')
const repeatZero = program(w => { const r = plug(block(w, 'controls_repeat_ext'), 'TIMES', num(w, 0)); plug(r, 'DO', print(w, txt(w, 'x'))); then(r, print(w, txt(w, 'end'))) })
sameAsCpython(repeatZero, [], 'repeat 0 times')
const repeatNeg = program(w => { const r = plug(block(w, 'controls_repeat_ext'), 'TIMES', num(w, -3)); plug(r, 'DO', print(w, txt(w, 'x'))); then(r, print(w, txt(w, 'end'))) })
sameAsCpython(repeatNeg, [], 'repeat negative times')
const repeatInput = program(w => { const r = plug(block(w, 'controls_repeat_ext'), 'TIMES', block(w, 'kodik_input_int')); plug(r, 'DO', print(w, txt(w, '*'))); then(r) })
sameAsCpython(repeatInput, ['3'], 'repeat N from input')
const repeatFloat = program(w => { const r = plug(block(w, 'controls_repeat_ext'), 'TIMES', num(w, 2.5)); plug(r, 'DO', print(w, txt(w, 'x'))) })
sameAsCpython(repeatFloat, [], 'repeat with fractional count is an error in both')
const shortCircuit = program(w => {
  const cond = op(w, 'logic_operation', 'AND', op(w, 'logic_compare', 'GT', num(w, 0), num(w, 1)), op(w, 'logic_compare', 'EQ', block(w, 'kodik_input_int'), num(w, 5)))
  const iff = plug(block(w, 'controls_if'), 'IF0', cond); plug(iff, 'DO0', print(w, txt(w, 'да')))
  then(iff, print(w, block(w, 'kodik_input_int')))
})
sameAsCpython(shortCircuit, ['7', '8'], 'and short-circuits: the second input() is not consumed by the condition')
const orCircuit = program(w => {
  const cond = op(w, 'logic_operation', 'OR', op(w, 'logic_compare', 'LT', num(w, 0), num(w, 1)), op(w, 'logic_compare', 'EQ', block(w, 'kodik_input_int'), num(w, 5)))
  const iff = plug(block(w, 'controls_if'), 'IF0', cond); plug(iff, 'DO0', print(w, block(w, 'kodik_input_int')))
  then(iff)
})
sameAsCpython(orCircuit, ['7', '8'], 'or short-circuits')
const scope = program(w => {
  const def = block(w, 'kodik_define', { NAME: 'шаг' }); plug(def, 'BODY', then(set(w, 'x', num(w, 10)), print(w, get(w, 'x'))))
  then(set(w, 'x', num(w, 1)), block(w, 'kodik_call', { NAME: 'шаг' }), print(w, get(w, 'x')))
  def.moveBy(0, -500)
})
eq(scope.split('\n')[0], 'def шаг():', 'function defined first')
sameAsCpython(scope, [], 'assignment inside a function is local (Python scope)')
const escaping = program(w => then(print(w, txt(w, 'кав"ычки \\ слэш')), print(w, txt(w, 'таб\tконец')), print(w, txt(w, "апостроф ' и \\n буквально")), print(w, txt(w, '')), print(w, txt(w, 'пробел в конце   ')), print(w, txt(w, 'x'))))
sameAsCpython(escaping, [], 'string escaping and trailing spaces inside output')
const joinW = W(); Blockly.serialization.blocks.append({ type: 'text_print', inputs: { TEXT: { block: { type: 'text_join', extraState: { itemCount: 3 }, inputs: { ADD0: { block: { type: 'text', fields: { TEXT: 'итог: ' } } }, ADD1: { block: { type: 'math_number', fields: { NUM: 2 } } }, ADD2: { block: { type: 'logic_boolean', fields: { BOOL: 'TRUE' } } } } } } } }, joinW)
const joinPy = translateWorkspace(roundTrip(joinW)).python; joinW.dispose()
eq(joinPy, 'print("итог: " + str(2) + str(True))\n', 'join wraps non-text parts in str()')
sameAsCpython(joinPy, [], 'join')
const whileUntil = program(w => { const lp = block(w, 'controls_whileUntil', { MODE: 'UNTIL' }); plug(lp, 'BOOL', op(w, 'logic_compare', 'GTE', get(w, 'i'), num(w, 3))); plug(lp, 'DO', then(print(w, get(w, 'i')), plug(block(w, 'math_change', { VAR: variable(w, 'i').getId() }), 'DELTA', num(w, 1)))); then(set(w, 'i', num(w, 0)), lp) })
sameAsCpython(whileUntil, [], 'repeat-until with change')
const elif = program(w => { Blockly.serialization.blocks.append({ type: 'controls_if', extraState: { elseIfCount: 2, hasElse: true }, inputs: { IF0: { block: { type: 'logic_boolean', fields: { BOOL: 'FALSE' } } }, DO0: { block: { type: 'text_print', inputs: { TEXT: { block: { type: 'text', fields: { TEXT: '0' } } } } } }, IF1: { block: { type: 'logic_negate', inputs: { BOOL: { block: { type: 'logic_boolean', fields: { BOOL: 'FALSE' } } } } } }, DO1: { block: { type: 'text_print', inputs: { TEXT: { block: { type: 'text', fields: { TEXT: '1' } } } } } }, IF2: { block: { type: 'logic_boolean', fields: { BOOL: 'TRUE' } } }, ELSE: { block: { type: 'text_print', inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'иначе' } } } } } } } }, w) })
ok(elif.includes('elif') && elif.includes('    pass'), 'empty elif branch becomes pass with a warning')
sameAsCpython(elif, [], 'elif / else')
const textLen = program(w => then(print(w, plug(block(w, 'text_length'), 'VALUE', block(w, 'kodik_input_text')))))
sameAsCpython(textLen, ['Привет'], 'len of input text')
const big = program(w => then(print(w, op(w, 'math_arithmetic', 'MULTIPLY', num(w, 999999999999), num(w, 999999999999)))))
ok(/слишком большой/.test(run(big).error ?? ''), 'documented learning-range limit: huge product is a clear error (CPython would use big integers)')

// ===== 6. Generated valid programs (seeded) vs our interpreter and CPython =====
let seed = 20261019
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n }
const genValue = (w: Blockly.Workspace, depth: number, vars: string[]): Blockly.Block => {
  const k = depth > 2 ? rnd(3) : rnd(7)
  if (k === 0) return num(w, rnd(21) - 10)
  if (k === 1 && vars.length) return get(w, vars[rnd(vars.length)])
  if (k === 2) return num(w, rnd(9) + 1)
  if (k <= 4) return op(w, 'math_arithmetic', ['ADD', 'MINUS', 'MULTIPLY'][rnd(3)], genValue(w, depth + 1, vars), genValue(w, depth + 1, vars))
  if (k === 5) return op(w, 'math_modulo', null, genValue(w, depth + 1, vars), num(w, rnd(5) + 1))
  return block(w, 'kodik_input_int')
}
const genStatements = (w: Blockly.Workspace, depth: number, vars: string[]): Blockly.Block[] => Array.from({ length: 1 + rnd(3) }, () => {
  const k = depth > 1 ? rnd(3) : rnd(5)
  if (k === 0) { const name = ['a', 'b', 'c'][rnd(3)]; const s = set(w, name, genValue(w, 0, vars)); if (!vars.includes(name)) vars.push(name); return s }
  if (k <= 2) return print(w, genValue(w, 0, vars))
  if (k === 3) { const r = plug(block(w, 'controls_repeat_ext'), 'TIMES', num(w, rnd(4))); const inner = genStatements(w, depth + 1, [...vars]); plug(r, 'DO', then(...inner)); return r }
  const iff = plug(block(w, 'controls_if'), 'IF0', op(w, 'logic_compare', ['LT', 'GT', 'EQ', 'NEQ'][rnd(4)], genValue(w, 1, vars), genValue(w, 1, vars))); plug(iff, 'DO0', then(...genStatements(w, depth + 1, [...vars]))); return iff
})
let generated = 0
for (let i = 0; i < 40; i++) {
  const w = W(); then(...genStatements(w, 0, []))
  const t = translate(w); w.dispose()
  if (!t.ok) continue // variables used before assignment are fine to skip
  const inputs = Array.from({ length: 12 }, () => String(rnd(19) - 9))
  sameAsCpython(t.python, inputs, `generated program #${i}`)
  generated++
}
ok(generated >= 30, `enough generated programs translated (${generated})`)

// ===== 7. Corrupted structures never throw; always explained =====
const baseW = W(); then(set(baseW, 'n', block(baseW, 'kodik_input_int')), print(baseW, op(baseW, 'math_arithmetic', 'MULTIPLY', get(baseW, 'n'), num(baseW, 2))))
const base = roundTrip(baseW); baseW.dispose()
const mutate = (value: unknown, path: number): unknown => {
  const clone = JSON.parse(JSON.stringify(value))
  const nodes: { parent: Record<string, unknown>; key: string }[] = []
  const walk = (v: unknown) => { if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { nodes.push({ parent: v as Record<string, unknown>, key: k }); walk(x) } }
  walk(clone)
  const n = nodes[path % nodes.length]
  const replacements = [null, 42, 'x', [], {}, -1, 1e308, { type: 'text_print' }, '__proto__', true, { block: null }, 'A'.repeat(600)]
  n.parent[n.key] = replacements[path % replacements.length]
  return clone
}
let corrupted = 0
for (let i = 0; i < 400; i++) {
  const bad = mutate(base, i * 7 + 3)
  let shape, tr
  try { shape = validateWorkspaceShape(bad); tr = translateWorkspace(bad) } catch (e) { assert.fail(`mutation ${i} threw: ${(e as Error).message}`) }
  ok(tr.ok || tr.errors.length > 0, `mutation ${i} handled`)
  if (!shape.ok) ok(!tr.ok, `mutation ${i}: invalid draft is never runnable`)
  if (!tr.ok) corrupted++
}
ok(corrupted > 100, 'corruptions are detected')
const dupIds = JSON.parse(JSON.stringify(base)); dupIds.blocks.blocks[0].next.block.id = dupIds.blocks.blocks[0].id
ok(!validateWorkspaceShape(dupIds).ok, 'duplicate block ids rejected')
const extraMeta = JSON.parse(JSON.stringify(base)); extraMeta.blocks.blocks[0].evil = { $where: 1 }
ok(!validateWorkspaceShape(extraMeta).ok, 'unexpected metadata rejected')
const wrongField = JSON.parse(JSON.stringify(base)); wrongField.blocks.blocks[0].next.block.inputs.TEXT.block.fields.OP = 'DELETE'
ok(!validateWorkspaceShape(wrongField).ok, 'unknown dropdown value rejected')
const deepJson: Record<string, unknown> = {}; let cur = deepJson; for (let i = 0; i < 600; i++) { cur.x = {}; cur = cur.x as Record<string, unknown> }
ok(!validateWorkspaceShape({ blocks: { blocks: [{ type: 'text_print', data: 'x', extraState: deepJson }] } }).ok, 'huge JSON nesting rejected')
const deepBlocks = (n: number): unknown => n === 0 ? { type: 'math_number', fields: { NUM: 1 } } : { type: 'math_arithmetic', fields: { OP: 'ADD' }, inputs: { A: { block: deepBlocks(n - 1) }, B: { block: { type: 'math_number', fields: { NUM: 1 } } } } }
ok(validateWorkspaceShape({ blocks: { blocks: [{ type: 'text_print', inputs: { TEXT: { block: deepBlocks(20) } } }] } }).ok, 'deep but small expression is a storable draft')
ok(/глубоко/.test(translateWorkspace({ blocks: { blocks: [{ type: 'text_print', inputs: { TEXT: { block: deepBlocks(20) } } }] } }).errors[0].message), 'and is explained as too deep to run')
const seq: Record<string, unknown> = { type: 'text_print', id: 's0', inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'x' } } } } }
let seqTail = seq; for (let i = 1; i < 99; i++) { const nb = { type: 'text_print', id: 's' + i, inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'x' } } } } }; seqTail.next = { block: nb }; seqTail = nb }
ok(validateWorkspaceShape({ blocks: { blocks: [seq] } }).ok && translateWorkspace({ blocks: { blocks: [seq] } }).ok, 'a normal sequential program of 99 commands (198 blocks, deep next-nesting) is storable and runnable')
const manyVars = { variables: Array.from({ length: 51 }, (_, i) => ({ name: 'v' + i, id: 'id' + i })) }
ok(!validateWorkspaceShape(manyVars).ok, `more than ${LIMITS.variables} variables rejected`)
const bytes = { blocks: { blocks: Array.from({ length: 150 }, (_, i) => ({ type: 'text', id: 'b' + i, x: 0, y: i, fields: { TEXT: 'ы'.repeat(250) } })) } }
ok(JSON.stringify(bytes).length < LIMITS.bytes && !validateWorkspaceShape(bytes).ok, 'limit counts UTF-8 bytes, not characters')
const longProgram: Record<string, unknown> = { type: 'text_print', id: 'l0', inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'x'.repeat(450) } } } } }
let lTail = longProgram; for (let i = 1; i < 100; i++) { const nb = { type: 'text_print', id: 'l' + i, inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'x'.repeat(450) } } } } }; lTail.next = { block: nb }; lTail = nb }
const lpShape = validateWorkspaceShape({ blocks: { blocks: [longProgram] } }), lp = translateWorkspace({ blocks: { blocks: [longProgram] } })
ok(lpShape.ok && !lp.ok && lp.errors.some(e => e.code === 'too_large'), 'a storable draft whose Python exceeds the interpreter limit (12000 chars) is explained, not sent')


// ===== 8. Every palette block is registered in Blockly =====
for (const b of BLOCKS) ok(Blockly.Blocks[b.type], `registered: ${b.type}`)

console.log(`✓ ${checks} проверок транслятора на настоящем Blockly; ${hasCpython ? `${cpythonCompared} программ сверены с CPython` : 'CPython не найден — сверка не выполнялась'}`)
