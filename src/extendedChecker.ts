import type { Lesson, Program, RunResult } from './learningEngine'
import { parseCourseProgram, runCourseProgram, runPythonAst, type Statement, type Value } from './pythonRuntime'
import { structureError, summarizePython } from './pythonStructure'
import { issue } from './validation'

const equal = (actual: ReturnType<typeof runCourseProgram>, reference: ReturnType<typeof runCourseProgram>, drawing: boolean) => !actual.error && !reference.error && actual.output.length === reference.output.length && actual.output.every((value, i) => value === reference.output[i]) && (!drawing || actual.segments.length === reference.segments.length && actual.segments.every((part, i) => (['x1','y1','x2','y2'] as const).every(key => Math.abs(part[key] - reference.segments[i][key]) < .02)))
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const dataValue = (node: Statement): Value | undefined => {
  if (node.kind !== 'assign' || node.index) return undefined
  if (node.value.kind === 'literal') return node.value.value
  if (node.value.kind === 'unary' && node.value.operator === '-' && node.value.value.kind === 'literal' && typeof node.value.value.value === 'number') return -node.value.value.value
  if (node.value.kind === 'list' && node.value.items.every(item => item.kind === 'literal')) return node.value.items.map(item => item.kind === 'literal' ? item.value : null)
}
const changed = (value: Value): Value => Array.isArray(value) ? value.map((part, i) => typeof part === 'number' ? part + i + 2 : typeof part === 'string' ? `${part}!` : part) : typeof value === 'number' ? value > 10 ? value - 7 : value + 2 : typeof value === 'string' ? `${value}!` : value

function generalizes(actual: Statement[], reference: Statement[], inputs: string[], drawing: boolean) {
  const seen = new Set<string>()
  for (let i = 0; i < reference.length; i++) {
    const value = dataValue(reference[i]); if (value === undefined || seen.has(JSON.stringify(value))) continue
    seen.add(JSON.stringify(value))
    const primary = runPythonAst(actual, inputs)
    const candidateIndex = actual.findIndex(node => dataValue(node) !== undefined && JSON.stringify(dataValue(node)) === JSON.stringify(value) && primary.observed.has(node))
    if (candidateIndex < 0) continue // Algebraically equivalent programs may have no matching binding.
    const expected = clone(reference), candidate = clone(actual), replacement = changed(value)
    ;(expected[i] as Extract<Statement, { kind: 'assign' }>).value = { kind: 'literal', value: replacement }
    ;(candidate[candidateIndex] as Extract<Statement, { kind: 'assign' }>).value = { kind: 'literal', value: replacement }
    if (!equal(runPythonAst(candidate, inputs), runPythonAst(expected, inputs), drawing)) return false
    if (seen.size >= 3) break
  }
  const refRun = runPythonAst(reference, inputs), actualRun = runPythonAst(actual, inputs)
  const refFunctions = reference.filter((node): node is Extract<Statement, { kind: 'function' }> => node.kind === 'function' && refRun.observed.has(node))
  const actualFunctions = actual.filter((node): node is Extract<Statement, { kind: 'function' }> => node.kind === 'function' && actualRun.observed.has(node))
  for (let i = 0; i < refFunctions.length; i++) {
    const fn = refFunctions[i], candidate = actualFunctions[i]
    if (!candidate || candidate.params.length !== fn.params.length) return false
    for (const n of [1, 3, 7]) {
      const args = fn.params.map((_, index) => ({ kind: 'literal', value: n + index } as const))
      // String functions get string probes; numeric functions get numeric ones.
      const calls = [...refRun.observed].filter(node => node.kind === 'call' && node.name === fn.name)
      const stringArgs = calls.some(node => node.kind === 'call' && node.args.some(arg => arg.kind === 'literal' && typeof arg.value === 'string'))
      const probeArgs = stringArgs ? args.map((_, index) => ({ kind: 'literal', value: `Гость${n + index}` } as const)) : args
      const returns = [...refRun.observed].some(node => node.kind === 'return')
      const call = (name: string): Statement => ({ kind: 'expression', value: returns ? { kind: 'call', name: 'print', args: [{ kind: 'call', name, args: probeArgs }] } : { kind: 'call', name, args: probeArgs } })
      if (!equal(runPythonAst([...actual, call(candidate.name)], inputs), runPythonAst([...reference, call(fn.name)], inputs), drawing)) return false
    }
  }
  return true
}

export function checkExtendedLesson(lesson: Lesson, answer: string): { passed: boolean; message: string; result: RunResult; program: Program } {
  const source = lesson.mode === 'completion' || lesson.mode === 'tokens' ? `${lesson.prefix || ''}${answer}${lesson.suffix || ''}` : answer
  let ast: Statement[] = []; try { ast = parseCourseProgram(source) } catch { /* Runtime reports the useful syntax message. */ }
  const primary = ast.length ? runPythonAst(ast, lesson.extended!.inputs[0] || []) : runCourseProgram(source, lesson.extended!.inputs[0] || [])
  const program: Program = { statements: [], normalizedStructure: ast.length ? summarizePython(ast) : 'syntax_error' }
  const failed = (message: string) => {
    const details = issue(message, [...(lesson.skills?.teaches || []), ...(lesson.skills?.practices || [])])
    return { passed: false, message, result: { output: primary.output, segments: primary.segments, error: primary.error, systemError: false, errorType: details.errorType, affectedSkills: details.affectedSkills }, program }
  }
  if (primary.error) return failed(primary.error)
  const structural = structureError(ast, primary, lesson.extended!.rules)
  if (structural) return failed(structural)
  for (const inputs of lesson.extended!.inputs) {
    if (!equal(runCourseProgram(source, inputs), runCourseProgram(lesson.codeAnswer!, inputs), !!lesson.extended!.drawing)) return failed(lesson.extended!.drawing ? 'Рисунок отличается. Проверь длины, повороты и порядок линий.' : 'Программа даёт другой результат. Проверь данные и порядок действий.')
  }
  if (!generalizes(ast, parseCourseProgram(lesson.codeAnswer!), lesson.extended!.inputs[0], !!lesson.extended!.drawing)) return failed('С другими данными решение перестаёт работать. Используй значения переменных и аргументы функции, чтобы вычислять результат.')
  return { passed: true, message: lesson.success || 'Получилось!', result: { output: primary.output, segments: primary.segments, systemError: false }, program }
}
