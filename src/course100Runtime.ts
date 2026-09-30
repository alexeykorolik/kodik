import { solutionReferences } from './course100Solutions'

type Value = string | number | boolean | Value[] | null
type Expr =
  | { kind: 'literal'; value: Value }
  | { kind: 'name'; name: string }
  | { kind: 'list'; items: Expr[] }
  | { kind: 'unary'; operator: string; value: Expr }
  | { kind: 'binary'; operator: string; left: Expr; right: Expr }
  | { kind: 'call'; name: string; args: Expr[] }
  | { kind: 'index'; target: Expr; index: Expr }
type Statement =
  | { kind: 'assign'; name: string; index?: Expr; value: Expr }
  | { kind: 'expression'; value: Expr }
  | { kind: 'if'; branches: { condition: Expr; body: Statement[] }[]; otherwise: Statement[] }
  | { kind: 'for'; name: string; iterable: Expr; body: Statement[] }
  | { kind: 'while'; condition: Expr; body: Statement[] }
  | { kind: 'function'; name: string; params: string[]; body: Statement[] }
  | { kind: 'return'; value: Expr }
  | { kind: 'pass' }

export type Segment = { x1: number; y1: number; x2: number; y2: number }
export type CourseRun = { output: string[]; segments: Segment[]; error?: string; operations: number }
export type CourseCheck = CourseRun & { passed: boolean; message: string }

const namePattern = /^[\p{L}_][\p{L}\p{N}_]*$/u
const forbidden = new Set('import from as class async await lambda global nonlocal exec eval open del yield try except finally with raise break continue'.split(' '))
function validName(name: string) { return namePattern.test(name) && !forbidden.has(name) && !name.startsWith('__') }
function syntax(message: string): never { throw new Error(message) }

function tokenize(source: string): string[] {
  const tokens: string[] = []
  let position = 0
  while (position < source.length) {
    const rest = source.slice(position)
    const whitespace = /^\s+/.exec(rest)
    if (whitespace) { position += whitespace[0].length; continue }
    const string = /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/.exec(rest)
    if (string) { tokens.push(string[0]); position += string[0].length; continue }
    const number = /^\d+(?:\.\d+)?/.exec(rest)
    if (number) { tokens.push(number[0]); position += number[0].length; continue }
    const name = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(rest)
    if (name) { tokens.push(name[0]); position += name[0].length; continue }
    const operator = /^(==|!=|>=|<=|\*\*|[+\-*/%><(),\[\]])/.exec(rest)
    if (operator) { tokens.push(operator[0]); position += operator[0].length; continue }
    syntax(`Незнакомый фрагмент «${rest.slice(0, 12)}». Проверь синтаксис.`)
  }
  return tokens
}

function decodeString(token: string): string {
  return token.slice(1, -1).replace(/\\(n|t|\\|"|')/g, (_match, code: string) => ({ n: '\n', t: '\t', '\\': '\\', '"': '"', "'": "'" })[code]!)
}

class ExpressionParser {
  private index = 0
  constructor(private tokens: string[]) {}
  private peek() { return this.tokens[this.index] }
  private take() { return this.tokens[this.index++] }
  private expect(value: string) { if (this.take() !== value) syntax(`Ожидается «${value}». Проверь скобки и запятые.`) }
  parse(): Expr {
    const value = this.expression(0)
    if (this.peek()) syntax(`Лишний фрагмент «${this.peek()}» в выражении.`)
    return value
  }
  private expression(minPrecedence: number): Expr {
    let left = this.primary()
    const precedence: Record<string, number> = { or: 1, and: 2, '==': 3, '!=': 3, '>': 3, '>=': 3, '<': 3, '<=': 3, '+': 4, '-': 4, '*': 5, '/': 5, '%': 5, '**': 6 }
    while (precedence[this.peek()] && precedence[this.peek()] >= minPrecedence) {
      const operator = this.take()
      const priority = precedence[operator]
      const right = this.expression(priority + (operator === '**' ? 0 : 1))
      left = { kind: 'binary', operator, left, right }
    }
    return left
  }
  private primary(): Expr {
    const token = this.take()
    if (!token) syntax('После знака не хватает значения.')
    let value: Expr
    if (token === '-' || token === 'not') value = { kind: 'unary', operator: token, value: this.expression(6) }
    else if (token === '(') { value = this.expression(0); this.expect(')') }
    else if (token === '[') {
      const items: Expr[] = []
      while (this.peek() !== ']') { if (!this.peek()) syntax('Не закрыт список.'); items.push(this.expression(0)); if (this.peek() !== ']') this.expect(',') }
      this.expect(']'); value = { kind: 'list', items }
    } else if (/^['"]/.test(token)) value = { kind: 'literal', value: decodeString(token) }
    else if (/^\d/.test(token)) value = { kind: 'literal', value: Number(token) }
    else if (token === 'True' || token === 'False') value = { kind: 'literal', value: token === 'True' }
    else if (validName(token)) value = { kind: 'name', name: token }
    else syntax(`Неожиданный знак «${token}».`)
    while (this.peek() === '(' || this.peek() === '[') {
      if (this.peek() === '(') {
        this.take()
        if (value.kind !== 'name') syntax('Вызов поддерживается только по имени функции.')
        const args: Expr[] = []
        while (this.peek() !== ')') { if (!this.peek()) syntax('Не закрыт вызов функции.'); args.push(this.expression(0)); if (this.peek() !== ')') this.expect(',') }
        this.expect(')'); value = { kind: 'call', name: value.name, args }
      } else {
        this.take(); const index = this.expression(0); this.expect(']'); value = { kind: 'index', target: value, index }
      }
    }
    return value
  }
}
function expression(source: string) { return new ExpressionParser(tokenize(source)).parse() }

type SourceLine = { number: number; indent: number; text: string }
export function parseCourseProgram(source: string): Statement[] {
  if (source.length > 12000) syntax('Программа слишком длинная для учебного запуска.')
  const lines: SourceLine[] = source.replace(/\t/g, '    ').split(/\r?\n/).map((raw, index) => ({ number: index + 1, indent: /^ */.exec(raw)![0].length, text: raw.trim() })).filter(line => line.text && !line.text.startsWith('#'))
  if (!lines.length) syntax('Напиши решение или добавь команды, затем нажми «Проверить».')
  if (lines.length > 250) syntax('Оставь не больше 250 строк.')
  if (lines.some(line => line.indent % 4 !== 0)) syntax('Для вложенной команды используй отступ в 4 пробела.')
  let cursor = 0
  const block = (indent: number): Statement[] => {
    const result: Statement[] = []
    while (cursor < lines.length) {
      const line = lines[cursor]
      if (line.indent < indent) break
      if (line.indent > indent) syntax(`Строка ${line.number}: неожиданный отступ.`)
      if (line.text === 'else:' || line.text.startsWith('elif ')) break
      cursor++
      const nested = () => { const body = block(indent + 4); if (!body.length) syntax(`Строка ${line.number}: после двоеточия нужна команда с отступом.`); return body }
      let match: RegExpExecArray | null
      if ((match = /^if\s+(.+):$/.exec(line.text))) {
        const branches = [{ condition: expression(match[1]), body: nested() }]
        while (lines[cursor]?.indent === indent && (match = /^elif\s+(.+):$/.exec(lines[cursor].text))) { cursor++; branches.push({ condition: expression(match[1]), body: nested() }) }
        let otherwise: Statement[] = []
        if (lines[cursor]?.indent === indent && lines[cursor].text === 'else:') { cursor++; otherwise = nested() }
        result.push({ kind: 'if', branches, otherwise }); continue
      }
      if ((match = /^for\s+([\p{L}_][\p{L}\p{N}_]*)\s+in\s+(.+):$/u.exec(line.text))) {
        if (!validName(match[1])) syntax(`Строка ${line.number}: неверное имя счётчика.`)
        result.push({ kind: 'for', name: match[1], iterable: expression(match[2]), body: nested() }); continue
      }
      if ((match = /^while\s+(.+):$/.exec(line.text))) { result.push({ kind: 'while', condition: expression(match[1]), body: nested() }); continue }
      if ((match = /^def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(([^()]*)\):$/u.exec(line.text))) {
        const params = match[2].trim() ? match[2].split(',').map(item => item.trim()) : []
        if (!validName(match[1]) || params.some(name => !validName(name)) || new Set(params).size !== params.length) syntax(`Строка ${line.number}: проверь имя функции и параметры.`)
        result.push({ kind: 'function', name: match[1], params, body: nested() }); continue
      }
      if ((match = /^return\s+(.+)$/.exec(line.text))) { result.push({ kind: 'return', value: expression(match[1]) }); continue }
      if (line.text === 'pass') { result.push({ kind: 'pass' }); continue }
      if ((match = /^([\p{L}_][\p{L}\p{N}_]*)(?:\[(.+)\])?\s*=\s*(.+)$/u.exec(line.text))) {
        if (!validName(match[1])) syntax(`Строка ${line.number}: неверное имя переменной.`)
        result.push({ kind: 'assign', name: match[1], index: match[2] ? expression(match[2]) : undefined, value: expression(match[3]) }); continue
      }
      const value = expression(line.text)
      if (value.kind !== 'call') syntax(`Строка ${line.number}: здесь нужна команда или присваивание.`)
      result.push({ kind: 'expression', value })
    }
    return result
  }
  const program = block(0)
  if (cursor < lines.length) syntax(`Строка ${lines[cursor].number}: else или elif должны идти сразу после if.`)
  return program
}

const asNumber = (value: Value): number => { if (typeof value !== 'number' || !Number.isFinite(value)) syntax('Здесь нужно число. Проверь кавычки и преобразование input через int.'); return value }
const asList = (value: Value): Value[] => { if (!Array.isArray(value)) syntax('Здесь нужен список.'); return value }
const display = (value: Value): string => {
  if (Array.isArray(value)) return `[${value.map(item => typeof item === 'string' ? JSON.stringify(item) : display(item)).join(', ')}]`
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (value === null) return 'None'
  return String(value)
}
class ReturnSignal { constructor(public value: Value) {} }

export function runCourseProgram(source: string, inputs: string[] = []): CourseRun {
  const output: string[] = [], segments: Segment[] = []
  let operations = 0, inputCursor = 0, x = 0, y = 0, heading = 0
  try {
    const program = parseCourseProgram(source)
    const globals = new Map<string, Value>()
    const functions = new Map<string, Extract<Statement, { kind: 'function' }>>()
    const tick = () => { if (++operations > 10000) syntax('Программа выполняется слишком долго. Проверь цикл или вызовы функций.') }
    const evaluate = (node: Expr, scope: Map<string, Value>, depth: number): Value => {
      tick()
      if (node.kind === 'literal') return node.value
      if (node.kind === 'name') { if (scope.has(node.name)) return scope.get(node.name)!; if (globals.has(node.name)) return globals.get(node.name)!; syntax(`Сначала задай значение переменной «${node.name}».`) }
      if (node.kind === 'list') { if (node.items.length > 1000) syntax('Список слишком длинный.'); return node.items.map(item => evaluate(item, scope, depth)) }
      if (node.kind === 'unary') { const value = evaluate(node.value, scope, depth); return node.operator === 'not' ? !value : -asNumber(value) }
      if (node.kind === 'index') {
        const list = asList(evaluate(node.target, scope, depth)), index = asNumber(evaluate(node.index, scope, depth))
        if (!Number.isInteger(index) || index < -list.length || index >= list.length) syntax('Индекс вне списка.')
        return list[index < 0 ? list.length + index : index]
      }
      if (node.kind === 'binary') {
        const left = evaluate(node.left, scope, depth)
        if (node.operator === 'and') return left ? evaluate(node.right, scope, depth) : left
        if (node.operator === 'or') return left ? left : evaluate(node.right, scope, depth)
        const right = evaluate(node.right, scope, depth)
        if (node.operator === '==') return JSON.stringify(left) === JSON.stringify(right)
        if (node.operator === '!=') return JSON.stringify(left) !== JSON.stringify(right)
        if (['<', '<=', '>', '>='].includes(node.operator)) {
          if (typeof left !== typeof right || (typeof left !== 'number' && typeof left !== 'string')) syntax('Сравнивай два числа или две строки.')
          const a = left as number | string, b = right as number | string
          if (node.operator === '<') return a < b
          if (node.operator === '<=') return a <= b
          if (node.operator === '>') return a > b
          return a >= b
        }
        if (node.operator === '+' && typeof left === 'string' && typeof right === 'string') return left + right
        const a = asNumber(left), b = asNumber(right)
        if (['/', '%'].includes(node.operator) && b === 0) syntax('Делить на ноль нельзя.')
        const result = node.operator === '+' ? a + b : node.operator === '-' ? a - b : node.operator === '*' ? a * b : node.operator === '/' ? a / b : node.operator === '%' ? ((a % b) + b) % b : a ** b
        if (!Number.isFinite(result) || Math.abs(result) > 1e12) syntax('Число слишком большое для учебного запуска.')
        return result
      }
      const args = node.args.map(arg => evaluate(arg, scope, depth))
      if (node.name === 'print') { if (output.length >= 500) syntax('Слишком много строк вывода.'); output.push(args.map(display).join(' ')); return null }
      if (node.name === 'input') { if (args.length > 1) syntax('input принимает не больше одной подсказки.'); if (inputCursor >= inputs.length) syntax('Для проверки не хватает входных данных.'); return inputs[inputCursor++] }
      if (node.name === 'int') { if (args.length !== 1) syntax('int принимает одно значение.'); const value = Number(args[0]); if (!Number.isInteger(value)) syntax('Не удалось превратить ввод в целое число.'); return value }
      if (node.name === 'str') { if (args.length !== 1) syntax('str принимает одно значение.'); return display(args[0]) }
      if (node.name === 'len') { if (args.length !== 1) syntax('len принимает один список.'); return asList(args[0]).length }
      if (node.name === 'range') {
        if (args.length < 1 || args.length > 3) syntax('range принимает от одного до трёх чисел.')
        const numbers = args.map(asNumber), start = numbers.length === 1 ? 0 : numbers[0], end = numbers.length === 1 ? numbers[0] : numbers[1], step = numbers[2] ?? 1
        if (![start, end, step].every(Number.isInteger) || step === 0) syntax('range нужны целые числа и ненулевой шаг.')
        const values: Value[] = []
        for (let current = start; step > 0 ? current < end : current > end; current += step) { if (values.length >= 1000) syntax('Слишком длинный диапазон range.'); values.push(current) }
        return values
      }
      if (node.name === 'forward' || node.name === 'right' || node.name === 'left') {
        if (args.length !== 1) syntax('Команде черепашки нужно одно число.')
        const amount = asNumber(args[0])
        if (Math.abs(amount) > 10000) syntax('Шаг или поворот черепашки слишком велик.')
        if (node.name === 'forward') {
          const nextX = x + Math.cos(heading * Math.PI / 180) * amount, nextY = y + Math.sin(heading * Math.PI / 180) * amount
          if (segments.length >= 500) syntax('Слишком много линий на рисунке.')
          segments.push({ x1: x, y1: y, x2: nextX, y2: nextY }); x = nextX; y = nextY
        } else heading += node.name === 'left' ? amount : -amount
        return null
      }
      const fn = functions.get(node.name)
      if (!fn) syntax(`Функция «${node.name}» не определена или не поддерживается.`)
      if (fn.params.length !== args.length) syntax(`Функции «${node.name}» нужно ${fn.params.length} аргументов.`)
      if (depth >= 40) syntax('Слишком глубокие вызовы функций.')
      const local = new Map(fn.params.map((name, index) => [name, args[index]] as [string, Value]))
      try { execute(fn.body, local, depth + 1) } catch (signal) { if (signal instanceof ReturnSignal) return signal.value; throw signal }
      return null
    }
    const execute = (items: Statement[], scope: Map<string, Value>, depth: number): void => {
      for (const item of items) {
        tick()
        if (item.kind === 'pass') continue
        if (item.kind === 'function') { functions.set(item.name, item); continue }
        if (item.kind === 'return') { if (depth === 0) syntax('return используется внутри функции.'); throw new ReturnSignal(evaluate(item.value, scope, depth)) }
        if (item.kind === 'expression') { evaluate(item.value, scope, depth); continue }
        if (item.kind === 'assign') {
          const value = evaluate(item.value, scope, depth)
          if (item.index) {
            const list = asList(scope.has(item.name) ? scope.get(item.name)! : globals.get(item.name) ?? null), index = asNumber(evaluate(item.index, scope, depth))
            if (!Number.isInteger(index) || index < -list.length || index >= list.length) syntax('Индекс вне списка.')
            list[index < 0 ? list.length + index : index] = value
          } else scope.set(item.name, value)
          continue
        }
        if (item.kind === 'if') { const branch = item.branches.find(entry => Boolean(evaluate(entry.condition, scope, depth))); execute(branch?.body || item.otherwise, scope, depth); continue }
        if (item.kind === 'for') { const iterable = asList(evaluate(item.iterable, scope, depth)); for (const value of iterable) { tick(); scope.set(item.name, value); execute(item.body, scope, depth) } continue }
        if (item.kind === 'while') { while (Boolean(evaluate(item.condition, scope, depth))) { tick(); execute(item.body, scope, depth) } }
      }
    }
    execute(program, globals, 0)
    return { output, segments, operations }
  } catch (error) { return { output, segments, operations, error: error instanceof Error ? error.message : 'Не удалось проверить программу.' } }
}

const fixtures: Record<number, string[]> = { 87: ['Маша'], 88: ['12'], 89: ['7', '8'], 90: ['16'], 91: ['4'], 92: ['12'] }
export function fixtureFor(id: number): string[] { return fixtures[id] || [] }

function hasStructure(id: number, source: string): string | undefined {
  source = source.split(/\r?\n/).filter(line => !line.trimStart().startsWith('#')).join('\n')
  const includes = (pattern: RegExp) => pattern.test(source)
  if (id === 5 && !includes(/['"]\s*\+\s*['"]/)) return 'Соедини две строки знаком +.'
  if ([3, 6, 8].includes(id) && (source.match(/\bprint\s*\(/g) || []).length < (id === 3 ? 2 : 3)) return 'Здесь нужны отдельные команды print в нужном порядке.'
  if (id >= 10 && id <= 16 && !includes(/[+*/-]/)) return 'Покажи вычисление в программе, а не только готовый ответ.'
  if (id >= 17 && id <= 32 && id !== 28 && !includes(/^\s*[\p{L}_][\p{L}\p{N}_]*\s*=/mu)) return 'Сохрани значение в переменной.'
  const namedVariable: Record<number, string> = { 17: 'name', 18: 'age', 19: 'score', 20: 'a', 21: 'money', 22: 'name', 23: 'x', 24: 'name', 25: 'name', 26: 'name', 27: 'city', 29: 'name', 30: 'x', 31: 'name', 32: 'total', 37: 'age', 38: 'a', 41: 'age', 42: 'temperature', 45: 'password', 46: 'age', 47: 'score', 48: 'color', 50: 'price' }
  if (namedVariable[id] && !includes(new RegExp(`^\\s*${namedVariable[id]}\\s*=`, 'm'))) return `Используй переменную ${namedVariable[id]} из условия.`
  if (id === 19 && (source.match(/^\s*score\s*=/gm) || []).length < 2) return 'Сначала сохрани 5, затем измени score на 8.'
  if (id === 20 && !includes(/^\s*b\s*=/m)) return 'Сохрани оба числа в a и b.'
  if (id === 24 && (!includes(/^\s*age\s*=/m) || !includes(/^\s*level\s*=/m))) return 'Создай name, age и level.'
  if (id === 32 && (!includes(/^\s*item\s*=/m) || !includes(/^\s*price\s*=/m) || !includes(/^\s*count\s*=/m))) return 'Сохрани товар, цену и количество.'
  if (id >= 33 && id <= 40 && !includes(/==|!=|>=|<=|>|</)) return 'Используй оператор сравнения.'
  if (id >= 41 && id <= 50 && !includes(/^\s*if\s+/m)) return 'Используй условие if.'
  if (id >= 51 && id <= 68 && !includes(/^\s*(for|while)\s+/m)) return 'Используй цикл.'
  if (id >= 63 && id <= 65 && !includes(/^\s*while\s+/m)) return 'В этом задании нужен цикл while.'
  if ([62, 68].includes(id) && !includes(/%/)) return 'Проверь делимость с помощью остатка %.'
  if (id === 67 && (source.match(/\bfor\s+/g) || []).length < 2) return 'Используй вложенный цикл для строк и символов.'
  if (id >= 69 && id <= 78 && !includes(/^\s*def\s+/m)) return 'Опиши и вызови функцию.'
  if ([73, 74, 75, 77, 78].includes(id) && !includes(/^\s*return\s+/m)) return 'Функция должна вернуть значение через return.'
  if (id >= 79 && id <= 86 && !includes(/\[[^\]]*\]/)) return 'Используй список.'
  if ([80, 81, 82].includes(id) && !includes(/\[\s*[012]\s*\]/)) return 'Обратись к элементу списка по индексу.'
  if ([84, 85, 86].includes(id) && !includes(/^\s*for\s+/m)) return 'Обойди список циклом.'
  if (id === 85 && includes(/\bsum\s*\(/)) return 'Посчитай сумму циклом без sum().'
  if (id === 86 && includes(/\bmax\s*\(/)) return 'Найди максимум циклом без max().'
  if (id >= 87 && id <= 92 && !includes(/\binput\s*\(/)) return 'Получи данные через input.'
  if ([88, 89, 90, 91, 92].includes(id) && !includes(/\bint\s*\(/)) return 'Преобразуй ввод в число через int.'
  if (id >= 93 && id <= 100 && !includes(/\bforward\s*\(/)) return 'Для рисунка нужна команда forward.'
  if ([95, 96, 97, 98, 99, 100].includes(id) && !includes(/^\s*for\s+/m)) return 'Повтори стороны фигуры циклом.'
  if ([99, 100].includes(id) && !includes(/^\s*def\s+/m)) return 'Раздели рисунок на функцию и её вызов.'
  if (id === 97 && !includes(/^\s*size\s*=\s*50\b/m)) return 'Сохрани размер 50 в переменной size.'
  if (id === 98 && (!includes(/^\s*sides\s*=\s*6\b/m) || !includes(/360\s*\/\s*sides/))) return 'Задай 6 сторон и вычисли угол как 360 / sides.'
  if (id === 100 && !includes(/^\s*size\s*=\s*80\b/m)) return 'Сохрани размер 80 в переменной size.'
  return undefined
}

function length(segment: Segment) { return Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1) }
function turn(first: Segment, second: Segment) {
  const a = Math.atan2(first.y2 - first.y1, first.x2 - first.x1)
  const b = Math.atan2(second.y2 - second.y1, second.x2 - second.x1)
  return Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)) * 180 / Math.PI)
}
function close(a: number, b: number) { return Math.abs(a - b) < 0.01 }
function polygon(segments: Segment[], sides: number, sideLength: number): boolean {
  if (segments.length !== sides || !segments.every(segment => close(length(segment), sideLength))) return false
  if (!close(segments[0].x1, segments[sides - 1].x2) || !close(segments[0].y1, segments[sides - 1].y2)) return false
  return segments.every((segment, index) => close(turn(segment, segments[(index + 1) % sides]), 360 / sides))
}
function drawingMatches(id: number, segments: Segment[]): boolean {
  if (id === 93) return segments.length === 1 && close(length(segments[0]), 100)
  if (id === 94) return segments.length === 2 && segments.every(segment => close(length(segment), 80)) && close(turn(segments[0], segments[1]), 90)
  if (id === 95) return polygon(segments, 4, 60)
  if (id === 96) return polygon(segments, 3, 80)
  if (id === 97) return polygon(segments, 4, 50)
  if (id === 98) return polygon(segments, 6, 40)
  if (id === 99) return polygon(segments, 4, 70)
  if (id === 100) {
    let square = false, roof = false
    for (let index = 0; index < segments.length; index++) {
      if (polygon(segments.slice(index, index + 4), 4, 80)) square = true
      if (polygon(segments.slice(index, index + 3), 3, 80)) roof = true
    }
    return square && roof
  }
  return false
}

export function checkCourseTask(id: number, source: string): CourseCheck {
  const result = runCourseProgram(source, fixtureFor(id))
  if (result.error) return { ...result, passed: false, message: result.error }
  const structuralError = hasStructure(id, source)
  if (structuralError) return { ...result, passed: false, message: structuralError }
  const reference = runCourseProgram(solutionReferences[id], fixtureFor(id))
  if (reference.error) return { ...result, passed: false, message: 'Эталон этого задания требует исправления.' }
  const sameOutput = (actual: string[], expected: string[]) => actual.length === expected.length && actual.every((line, index) => id === 13 ? Number(line) === Number(expected[index]) : line === expected[index])
  let passed = id >= 93 ? drawingMatches(id, result.segments) : id === 27 ? /^\s*city\s*=\s*(["'])Минск\1\s*$/m.test(source) && (result.output.length === 0 || sameOutput(result.output, reference.output)) : sameOutput(result.output, reference.output)
  const extraInputs: Record<number, string[][]> = { 87: [['Олег']], 88: [['20']], 89: [['2', '9']], 90: [['18']], 91: [['2']], 92: [['11']] }
  if (passed && extraInputs[id]) for (const inputs of extraInputs[id]) {
    const actual = runCourseProgram(source, inputs), expected = runCourseProgram(solutionReferences[id], inputs)
    if (actual.error || expected.error || !sameOutput(actual.output, expected.output)) { passed = false; break }
  }
  return { ...result, passed, message: passed ? 'Задание выполнено. Программа даёт нужный результат.' : id >= 93 ? 'Рисунок отличается от задания. Проверь длины сторон, повороты и порядок действий.' : `Результат отличается. Ожидается: ${reference.output.length ? reference.output.join(' → ') : 'пустой вывод'}.` }
}
