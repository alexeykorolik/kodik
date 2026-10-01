import { parseCourseProgram, type Expr, type Statement, type Value, type CourseRun, type Segment } from './pythonRuntime'

export type PythonNode = Expr | Statement
type Tracked = { value: Value; trail: Set<PythonNode> }
type Scope = Map<string, Tracked>
const fail = (message: string): never => { throw new Error(message) }
const number = (v: Value): number => typeof v === 'number' && Number.isFinite(v) ? v : fail('Здесь нужно число. Проверь кавычки и преобразование ввода через int.')
const list = (v: Value): Value[] => Array.isArray(v) ? v : fail('Здесь нужен список.')
const display = (v: Value): string => Array.isArray(v) ? `[${v.map(item => typeof item === 'string' ? JSON.stringify(item) : display(item)).join(', ')}]` : typeof v === 'boolean' ? v ? 'True' : 'False' : v === null ? 'None' : String(v)
class ReturnSignal { constructor(public result: Tracked) {} }

export type PythonRun = CourseRun & { observed: Set<PythonNode>; reassigned: Set<Statement> }
// Trails track dependencies reaching an observable result, including control
// flow and return values. Dead calculations and overwritten values give no evidence.
export function runPythonAst(program: Statement[], inputs: string[] = []): PythonRun {
  const output: string[] = [], segments: Segment[] = [], observed = new Set<PythonNode>(), reassigned = new Set<Statement>()
  let operations = 0, inputCursor = 0, x = 0, y = 0, heading = 0
  const drawingTrail = new Set<PythonNode>()
  const globals: Scope = new Map(), functions = new Map<string, Extract<Statement, { kind: 'function' }>>()
  const tick = () => { if (++operations > 10000) fail('Программа выполняется слишком долго. Проверь условие окончания цикла.') }
  const track = (value: Value, node: PythonNode, values: Tracked[] = [], control: Set<PythonNode> = new Set()): Tracked => ({ value, trail: new Set([node, ...control, ...values.flatMap(item => [...item.trail])]) })
  const observe = (result: Tracked) => { for (const node of result.trail) observed.add(node) }
  const evaluate = (node: Expr, scope: Scope, depth: number, control: Set<PythonNode>): Tracked => {
    tick()
    const done = (value: Value, children: Tracked[] = []) => track(value, node, children, control)
    if (node.kind === 'literal') return done(node.value)
    if (node.kind === 'name') { const value = scope.get(node.name) || globals.get(node.name); if (!value) return fail(`Сначала задай значение переменной «${node.name}».`); return done(value.value, [value]) }
    if (node.kind === 'list') { if (node.items.length > 1000) fail('Список слишком длинный.'); const items = node.items.map(item => evaluate(item, scope, depth, control)); return done(items.map(item => item.value), items) }
    if (node.kind === 'unary') { const child = evaluate(node.value, scope, depth, control); return done(node.operator === 'not' ? !child.value : -number(child.value), [child]) }
    if (node.kind === 'index') {
      const target = evaluate(node.target, scope, depth, control), position = evaluate(node.index, scope, depth, control), values = list(target.value), index = number(position.value)
      if (!Number.isInteger(index) || index < -values.length || index >= values.length) fail('Такого элемента в списке нет. Проверь индекс: первый элемент имеет индекс 0.')
      return done(values[index < 0 ? values.length + index : index], [target, position])
    }
    if (node.kind === 'binary') {
      const left = evaluate(node.left, scope, depth, control)
      if (node.operator === 'and' && !left.value || node.operator === 'or' && left.value) return done(left.value, [left])
      const right = evaluate(node.right, scope, depth, control), a = left.value, b = right.value, children = [left, right]
      if (node.operator === 'and' || node.operator === 'or') return done(b, children)
      if (node.operator === '==') return done(JSON.stringify(a) === JSON.stringify(b), children)
      if (node.operator === '!=') return done(JSON.stringify(a) !== JSON.stringify(b), children)
      if (['<', '<=', '>', '>='].includes(node.operator)) {
        if (typeof a !== typeof b || typeof a !== 'number' && typeof a !== 'string') fail('Сравнивай два числа или две строки.')
        const lhs = a as number | string, rhs = b as number | string
        return done(node.operator === '<' ? lhs < rhs : node.operator === '<=' ? lhs <= rhs : node.operator === '>' ? lhs > rhs : lhs >= rhs, children)
      }
      if (node.operator === '+' && typeof a === 'string' && typeof b === 'string') return done(a + b, children)
      const lhs = number(a), rhs = number(b)
      if (['/', '%'].includes(node.operator) && rhs === 0) fail('Делить на ноль нельзя. Проверь делитель.')
      const result = node.operator === '+' ? lhs + rhs : node.operator === '-' ? lhs - rhs : node.operator === '*' ? lhs * rhs : node.operator === '/' ? lhs / rhs : node.operator === '%' ? ((lhs % rhs) + rhs) % rhs : lhs ** rhs
      if (!Number.isFinite(result) || Math.abs(result) > 1e12) fail('Результат слишком большой. Проверь вычисление.')
      return done(result, children)
    }
    const args = node.args.map(arg => evaluate(arg, scope, depth, control)), values = args.map(arg => arg.value)
    if (node.name === 'print') { if (output.length >= 500) fail('Слишком много строк вывода.'); output.push(values.map(display).join(' ')); observe(done(null, args)); return done(null, args) }
    if (node.name === 'input') { if (args.length > 1) fail('В input достаточно одной подсказки.'); if (inputCursor >= inputs.length) fail('Проверь количество команд input: для этого задания ввод уже закончился.'); return done(inputs[inputCursor++], args) }
    if (['int', 'str', 'len'].includes(node.name)) {
      if (args.length !== 1) fail(`${node.name} принимает одно значение.`)
      if (node.name === 'str') return done(display(values[0]), args)
      if (node.name === 'len') return done(list(values[0]).length, args)
      const value = Number(values[0]); if (!Number.isInteger(value)) fail('Не удалось превратить ввод в целое число. Проверь int(input()).'); return done(value, args)
    }
    if (node.name === 'range') {
      if (args.length < 1 || args.length > 3) fail('У range нужны границы диапазона и, если нужно, шаг.')
      const numbers = values.map(number), start = numbers.length === 1 ? 0 : numbers[0], end = numbers.length === 1 ? numbers[0] : numbers[1], step = numbers[2] ?? 1
      if (![start, end, step].every(Number.isInteger) || step === 0) fail('В range используй целые числа и ненулевой шаг.')
      const result: Value[] = []
      for (let current = start; step > 0 ? current < end : current > end; current += step) { if (result.length >= 1000) fail('Диапазон слишком длинный. Проверь границы range.'); result.push(current) }
      return done(result, args)
    }
    if (['forward', 'right', 'left'].includes(node.name)) {
      if (args.length !== 1) fail('Для движения или поворота укажи одно число.')
      const amount = number(values[0]); if (Math.abs(amount) > 10000) fail('Шаг или поворот слишком велик. Проверь число.')
      if (node.name === 'forward') { if (segments.length >= 500) fail('Слишком много линий. Проверь число повторений.'); const nextX = x + Math.cos(heading * Math.PI / 180) * amount, nextY = y + Math.sin(heading * Math.PI / 180) * amount; segments.push({ x1: x, y1: y, x2: nextX, y2: nextY }); x = nextX; y = nextY }
      else heading += node.name === 'left' ? amount : -amount
      const result = done(null, args); for (const part of result.trail) drawingTrail.add(part); if (node.name === "forward") observe({ value: null, trail: drawingTrail }); return result
    }
    const fn = functions.get(node.name)
    if (!fn) return fail(`Сначала опиши функцию «${node.name}» через def, затем вызови её.`)
    if (fn.params.length !== args.length) fail(`Эта функция принимает ${fn.params.length} аргументов. Проверь вызов и строку def.`)
    if (depth >= 40) fail('Функция вызывает себя слишком много раз. Проверь условие остановки.')
    const local: Scope = new Map(fn.params.map((name, index) => [name, args[index]])), inside = new Set([...control, node, fn])
    try { execute(fn.body, local, depth + 1, inside) } catch (signal) { if (signal instanceof ReturnSignal) return done(signal.result.value, [signal.result, ...args]); throw signal }
    return track(null, fn, args, inside)
  }
  const execute = (items: Statement[], scope: Scope, depth: number, control: Set<PythonNode>): void => {
    for (const item of items) {
      tick()
      if (item.kind === 'pass') continue
      if (item.kind === 'function') { functions.set(item.name, item); continue }
      if (item.kind === 'return') { if (!depth) fail('Помести return внутрь функции с отступом.'); const result = evaluate(item.value, scope, depth, control); throw new ReturnSignal(track(result.value, item, [result], control)) }
      if (item.kind === 'expression') { evaluate(item.value, scope, depth, new Set([...control, item])); continue }
      if (item.kind === 'assign') {
        const result = evaluate(item.value, scope, depth, control), assigned = track(result.value, item, [result], control)
        if (item.index) {
          const owner = scope.get(item.name) || globals.get(item.name); if (!owner) fail('Сначала создай список, затем меняй его элемент.')
          const values = list(owner!.value), position = evaluate(item.index, scope, depth, control), index = number(position.value)
          if (!Number.isInteger(index) || index < -values.length || index >= values.length) fail('Такого индекса в списке нет.')
          values[index < 0 ? values.length + index : index] = result.value
          for (const node of [...assigned.trail, ...position.trail]) owner!.trail.add(node)
        } else { if (scope.has(item.name)) reassigned.add(item); scope.set(item.name, assigned) }
        continue
      }
      if (item.kind === 'if') {
        const tests: Tracked[] = []; let body = item.otherwise
        for (const branch of item.branches) { const condition = evaluate(branch.condition, scope, depth, control); tests.push(condition); if (condition.value) { body = branch.body; break } }
        execute(body, scope, depth, track(null, item, tests, control).trail); continue
      }
      if (item.kind === 'for') {
        const source = evaluate(item.iterable, scope, depth, control), inside = track(null, item, [source], control).trail
        for (const value of list(source.value)) { tick(); scope.set(item.name, track(value, item, [source], control)); execute(item.body, scope, depth, inside) } continue
      }
      while (true) { const condition = evaluate(item.condition, scope, depth, control); if (!condition.value) break; tick(); execute(item.body, scope, depth, track(null, item, [condition], control).trail) }
    }
  }
  try { execute(program, globals, 0, new Set()); return { output, segments, operations, observed, reassigned } }
  catch (error) { return { output, segments, operations, observed, reassigned, error: error instanceof Error ? error.message : 'Проверь команды программы.' } }
}
export function runCourseProgram(source: string, inputs: string[] = []): PythonRun {
  try { return runPythonAst(parseCourseProgram(source), inputs) }
  catch (error) { return { output: [], segments: [], operations: 0, observed: new Set(), reassigned: new Set(), error: error instanceof Error ? error.message : 'Проверь запись Python.' } }
}
