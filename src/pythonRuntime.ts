export type Value = string | number | boolean | Value[] | null
export type Expr =
  | { kind: 'literal'; value: Value }
  | { kind: 'name'; name: string }
  | { kind: 'list'; items: Expr[] }
  | { kind: 'unary'; operator: string; value: Expr }
  | { kind: 'binary'; operator: string; left: Expr; right: Expr }
  | { kind: 'call'; name: string; args: Expr[] }
  | { kind: 'index'; target: Expr; index: Expr }
export type Statement =
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
        if (value.kind !== 'name') syntax('Перед скобками вызова запиши имя функции.')
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
      if (/^(if|elif|else|while|for|def)\b/.test(line.text)) syntax(`Строка ${line.number}: после условия, цикла или def нужны двоеточие и строка с отступом.`)
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

export { runCourseProgram, runPythonAst } from './pythonExecution'
