import type { PyObject } from './python/values'
export type Value = string | number | boolean | Value[] | null | PyObject
export type Keyword = { name: string; value: Expr }
export type Expr =
  | { kind: 'literal'; value: Value; float?: boolean }
  | { kind: 'name'; name: string }
  | { kind: 'list'; items: Expr[] }
  | { kind: 'unary'; operator: string; value: Expr }
  | { kind: 'binary'; operator: string; left: Expr; right: Expr }
  | { kind: 'compare'; operands: Expr[]; operators: string[] }
  | { kind: 'call'; name: string; args: Expr[]; callee?: Expr; keywords?: Keyword[] }
  | { kind: 'index'; target: Expr; index: Expr }
  | { kind: 'attribute'; target: Expr; name: string }
  | { kind: 'tuple'; items: Expr[] }
  | { kind: 'slice'; start?: Expr; stop?: Expr; step?: Expr }
export type Statement =
  | { kind: 'assign'; name: string; index?: Expr; value: Expr }
  | { kind: 'expression'; value: Expr }
  | { kind: 'if'; branches: { condition: Expr; body: Statement[] }[]; otherwise: Statement[] }
  | { kind: 'for'; name: string; iterable: Expr; body: Statement[] }
  | { kind: 'while'; condition: Expr; body: Statement[] }
  | { kind: 'function'; name: string; params: string[]; body: Statement[]; decorators?: Expr[] }
  | { kind: 'return'; value: Expr }
  | { kind: 'pass' }
  | { kind: 'import'; modules: { name: string; alias?: string }[] }
  | { kind: 'from'; module: string; names: { name: string; alias?: string }[]; star?: boolean }
  | { kind: 'unpack'; names: string[]; value: Expr }

import type { Scene } from './python/scene'
export type Segment = { x1: number; y1: number; x2: number; y2: number }
export type CourseRun = { output: string[]; segments: Segment[]; error?: string; operations: number; scene?: Scene; outputTimes?: number[] }
export type CourseCheck = CourseRun & { passed: boolean; message: string }

const namePattern = /^[\p{L}_][\p{L}\p{N}_]*$/u
const forbidden = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield exec eval open'.split(' '))
const builtins = new Set('print input int str len range forward right left'.split(' '))
export function validName(name: string) { return namePattern.test(name) && !forbidden.has(name) && !name.startsWith('__') }
export function variableName(name: string) { return validName(name) && !builtins.has(name) }
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
    const number = /^(?:\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?/.exec(rest)
    if (number) { tokens.push(number[0]); position += number[0].length; continue }
    const name = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(rest)
    if (name) { tokens.push(name[0]); position += name[0].length; continue }
    const operator = /^(==|!=|>=|<=|\*\*|\/\/|[+\-*/%><(),\[\].:=])/.exec(rest)
    if (operator) { tokens.push(operator[0]); position += operator[0].length; continue }
    syntax(`Незнакомый фрагмент «${rest.slice(0, 12)}». Проверь синтаксис.`)
  }
  return tokens
}

function decodeString(token: string): string {
  const source=token.slice(1,-1),escapes:Record<string,string>={a:'\x07',b:'\b',f:'\f',n:'\n',r:'\r',t:'\t',v:'\v','\\':'\\','"':'"',"'":"'"};let result=''
  for(let i=0;i<source.length;i++){
    if(source[i]!=='\\'){result+=source[i];continue}
    const code=source[++i]
    if(code in escapes){result+=escapes[code];continue}
    if(/[0-7]/.test(code)) {const digits=/^[0-7]{1,3}/.exec(source.slice(i))![0];result+=String.fromCodePoint(parseInt(digits,8));i+=digits.length-1;continue}
    if(['x','u','U'].includes(code)){
      const length=code==='x'?2:code==='u'?4:8,digits=source.slice(i+1,i+1+length),point=parseInt(digits,16)
      if(digits.length!==length||!/^[0-9a-f]+$/i.test(digits)||point>0x10ffff)syntax('Проверь код символа после обратной косой черты.')
      result+=String.fromCodePoint(point);i+=length;continue
    }
    if(code==='N')syntax('Имена символов через \\N пока не поддерживаются. Вставь сам символ.')
    result+='\\'+code
  }
  return result
}

class ExpressionParser {
  private index = 0
  constructor(private tokens: string[]) {}
  private peek() { return this.tokens[this.index] }
  private take() { return this.tokens[this.index++] }
  private expect(value: string) {
    const got = this.take()
    if (got === value) return
    if (got === undefined) syntax(value === ')' || value === ']' ? `Не хватает закрывающей скобки «${value}» в конце.` : `В конце не хватает «${value}».`)
    syntax(value === ',' ? `Между значениями нужна запятая — перед «${got}».` : `Ожидается «${value}», а написано «${got}». Проверь скобки.`)
  }
  parse(): Expr {
    const value = this.expression(0)
    if (this.peek()) syntax(`Лишний фрагмент «${this.peek()}» в выражении.`)
    return value
  }
  /** A statement-level value: `a, b` without brackets is a tuple, as in Python. */
  parseTuple(): Expr {
    const first = this.expression(0)
    if (this.peek() !== ',') { if (this.peek()) syntax(`Лишний фрагмент «${this.peek()}» в выражении.`); return first }
    const items = [first]
    while (this.peek() === ',') { this.take(); if (!this.peek()) break; items.push(this.expression(0)) }
    if (this.peek()) syntax(`Лишний фрагмент «${this.peek()}» в выражении.`)
    return { kind: 'tuple', items }
  }
  private expression(minPrecedence: number): Expr {
    let left = this.primary()
    const precedence: Record<string, number> = { or: 1, and: 2, '==': 3, '!=': 3, '>': 3, '>=': 3, '<': 3, '<=': 3, '+': 4, '-': 4, '*': 5, '/': 5, '//': 5, '%': 5, '**': 6 }
    while (precedence[this.peek()] && precedence[this.peek()] >= minPrecedence) {
      const operator = this.take()
      const priority = precedence[operator]
      const right = this.expression(priority + (operator === '**' ? 0 : 1))
      if(priority===3 && precedence[this.peek()]===3){
        const operands=[left,right],operators=[operator]
        while(precedence[this.peek()]===3){operators.push(this.take());operands.push(this.expression(4))}
        left={kind:'compare',operands,operators};continue
      }
      left = { kind: 'binary', operator, left, right }
    }
    return left
  }
  private primary(): Expr {
    const token = this.take()
    if (!token) syntax('После знака не хватает значения.')
    let value: Expr
    if (token === '-' || token === '+' || token === 'not') value = { kind: 'unary', operator: token, value: this.expression(token==='not'?3:6) }
    else if (token === '(') {
      if (this.peek() === ')') { this.take(); value = { kind: 'tuple', items: [] } }
      else {
        value = this.expression(0)
        if (this.peek() === ',') {
          const items = [value]
          while (this.peek() === ',') { this.take(); if (this.peek() === ')') break; if (!this.peek()) syntax('Не хватает закрывающей скобки «)» в конце.'); items.push(this.expression(0)) }
          value = { kind: 'tuple', items }
        }
        this.expect(')')
      }
    }
    else if (token === '[') {
      const items: Expr[] = []
      while (this.peek() !== ']') { if (!this.peek()) syntax('Не хватает закрывающей скобки «]» у списка.'); items.push(this.expression(0)); if (!this.peek()) syntax('Не хватает закрывающей скобки «]» у списка.'); if (this.peek() !== ']') this.expect(',') }
      this.expect(']'); value = { kind: 'list', items }
    } else if (/^['"]/.test(token)) value = { kind: 'literal', value: decodeString(token) }
    else if (/^[\d.]/.test(token)) {
      const floating=/[.eE]/.test(token),number=Number(token.replace(/_/g,''))
      if(!floating&&!/^(?:0(?:_?0)*|[1-9](?:_?\d)*)$/.test(token))syntax('В целом числе нельзя ставить лишний ноль в начале.')
      if(!Number.isFinite(number)||!floating&&!Number.isSafeInteger(number))syntax('Число выходит за пределы учебного диапазона.')
      value = { kind: 'literal', value: number, ...(floating?{float:true}:{}) }
    }
    else if (token === 'True' || token === 'False') value = { kind: 'literal', value: token === 'True' }
    else if (token === 'None') value = { kind: 'literal', value: null }
    else if (validName(token) || token === '__name__') value = { kind: 'name', name: token }
    else syntax(`Неожиданный знак «${token}».`)
    while (this.peek() === '(' || this.peek() === '[' || this.peek() === '.') {
      if (this.peek() === '.') {
        this.take(); const name = this.take()
        if (!name || !validName(name)) syntax('После точки запиши имя функции или значения из библиотеки.')
        value = { kind: 'attribute', target: value, name }
      } else if (this.peek() === '(') {
        this.take()
        if (value.kind !== 'name' && value.kind !== 'attribute') syntax('Перед скобками вызова запиши имя функции.')
        const args: Expr[] = [], keywords: Keyword[] = []
        while (this.peek() !== ')') {
          if (!this.peek()) syntax('Не хватает закрывающей скобки «)» в конце команды.')
          if (validName(this.peek()) && this.tokens[this.index + 1] === '=') {
            const name = this.take(); this.take()
            if (keywords.some(item => item.name === name)) syntax(`Аргумент «${name}» указан дважды.`)
            keywords.push({ name, value: this.expression(0) })
          } else {
            if (keywords.length) syntax('Обычные аргументы пишутся до именованных (имя=значение).')
            args.push(this.expression(0))
          }
          if (!this.peek()) syntax('Не хватает закрывающей скобки «)» в конце команды.'); if (this.peek() !== ')') this.expect(',')
        }
        this.expect(')')
        // Old programs keep exactly their old tree: optional parts appear only when used.
        value = value.kind === 'name' ? { kind: 'call', name: value.name, args } : { kind: 'call', name: value.name, args, callee: value }
        if (keywords.length) value.keywords = keywords
      } else {
        this.take()
        const items = [this.subscript()]; let trailing = false
        while (this.peek() === ',') { this.take(); if (this.peek() === ']') { trailing = true; break } items.push(this.subscript()) }
        this.expect(']')
        value = { kind: 'index', target: value, index: items.length === 1 && !trailing ? items[0] : { kind: 'tuple', items } }
      }
    }
    return value
  }
  /** One position inside [ ]: an index or a slice start:stop:step. */
  private subscript(): Expr {
    let start: Expr | undefined
    if (!this.peek()) syntax('Не хватает закрывающей скобки «]».')
    if (this.peek() !== ':') { start = this.expression(0); if (this.peek() !== ':') return start }
    this.take()
    let stop: Expr | undefined, step: Expr | undefined
    if (this.peek() && ![':', ']', ','].includes(this.peek())) stop = this.expression(0)
    if (this.peek() === ':') { this.take(); if (this.peek() && ![']', ','].includes(this.peek())) step = this.expression(0) }
    return { kind: 'slice', ...(start ? { start } : {}), ...(stop ? { stop } : {}), ...(step ? { step } : {}) }
  }
}
function expression(source: string) { return new ExpressionParser(tokenize(source)).parse() }
function tupleExpression(source: string, line: { number: number }) {
  try { return new ExpressionParser(tokenize(source)).parseTuple() } catch (e) { const message = (e as Error).message; throw new Error(message.startsWith('Строка') ? message : `Строка ${line.number}: ${message[0].toLowerCase()}${message.slice(1)}`) }
}
/** The same parse, with the line named so a child knows where to look. */
function lineExpression(source: string, line: { number: number }) {
  try { return expression(source) } catch (e) { const message = (e as Error).message; throw new Error(message.startsWith('Строка') ? message : `Строка ${line.number}: ${message[0].toLowerCase()}${message.slice(1)}`) }
}

type SourceLine = { number: number; indent: number; text: string }
function withoutComment(raw: string) {
  let quote='',escaped=false
  for(let i=0;i<raw.length;i++){
    const char=raw[i]
    if(escaped){escaped=false;continue}
    if(quote&&char==='\\'){escaped=true;continue}
    if(quote){if(char===quote)quote='';continue}
    if(char==='"'||char==="'"){quote=char;continue}
    if(char==='#')return raw.slice(0,i)
  }
  return raw
}
export function parseCourseProgram(source: string): Statement[] {
  if (source.length > 12000) syntax('Программа слишком длинная для учебного запуска.')
  // A tab counts as four spaces only in the leading indentation; inside the line (string values) it stays one character.
  const lines: SourceLine[] = source.split(/\r?\n/).map(raw => raw.replace(/^[ \t]+/, lead => lead.replace(/\t/g, '    '))).map((raw, index) => ({ number: index + 1, indent: /^ */.exec(raw)![0].length, text: withoutComment(raw).trim() })).filter(line => line.text)
  if (!lines.length) syntax('Напиши решение или добавь команды, затем нажми «Проверить».')
  if (lines.length > 250) syntax('Оставь не больше 250 строк.')
  if (lines.some(line => line.indent % 4 !== 0)) syntax('Для вложенной команды используй отступ в 4 пробела.')
  let cursor = 0
  const block = (indent: number,functionDepth=0): Statement[] => {
    const result: Statement[] = []
    let decorators: Expr[] = []
    while (cursor < lines.length) {
      const line = lines[cursor]
      if (line.indent < indent) break
      if (line.indent > indent) syntax(`Строка ${line.number}: неожиданный отступ.`)
      if (line.text === 'else:' || line.text.startsWith('elif ')) break
      cursor++
      if (decorators.length && !line.text.startsWith('def ') && !line.text.startsWith('@')) syntax(`Строка ${line.number}: после декоратора @ нужна строка def.`)
      const nested = (functionBody=false) => { const body = block(indent + 4,functionDepth+(functionBody?1:0)); if (!body.length) syntax(`Строка ${line.number}: после двоеточия нужна команда с отступом.`); return body }
      let match: RegExpExecArray | null
      if ((match = /^@(.+)$/.exec(line.text))) { decorators.push(lineExpression(match[1], line)); continue }
      if ((match = /^import\s+(.+)$/.exec(line.text))) {
        const modules = match[1].split(',').map(part => {
          const item = /^\s*([\p{L}_][\p{L}\p{N}_]*(?:\s*\.\s*[\p{L}_][\p{L}\p{N}_]*)*)(?:\s+as\s+([\p{L}_][\p{L}\p{N}_]*))?\s*$/u.exec(part)
          if (!item || item[2] && !validName(item[2])) syntax(`Строка ${line.number}: запиши импорт как import имя или import имя as короткое_имя.`)
          return { name: item[1].replace(/\s+/g, ''), ...(item[2] ? { alias: item[2] } : {}) }
        })
        result.push({ kind: 'import', modules }); continue
      }
      if ((match = /^from\s+([\p{L}_][\p{L}\p{N}_]*(?:\s*\.\s*[\p{L}_][\p{L}\p{N}_]*)*)\s+import\s+(.+)$/u.exec(line.text))) {
        const module = match[1].replace(/\s+/g, ''), list = match[2].trim().replace(/^\((.*)\)$/, '$1').trim()
        if (list === '*') { result.push({ kind: 'from', module, names: [], star: true }); continue }
        const names = list.split(',').filter((part, i, all) => part.trim() || i < all.length - 1).map(part => {
          const item = /^\s*([\p{L}_][\p{L}\p{N}_]*)(?:\s+as\s+([\p{L}_][\p{L}\p{N}_]*))?\s*$/u.exec(part)
          if (!item || !validName(item[1]) || item[2] && !validName(item[2])) syntax(`Строка ${line.number}: запиши импорт как from модуль import имя, имя2 или from модуль import *.`)
          return { name: item[1], ...(item[2] ? { alias: item[2] } : {}) }
        })
        result.push({ kind: 'from', module, names }); continue
      }
      if (/^(import|from)/.test(line.text)) syntax(`Строка ${line.number}: запиши импорт как import модуль или from модуль import имя.`)
      if ((match = /^if\s+(.+):$/.exec(line.text))) {
        const branches = [{ condition: lineExpression(match[1], line), body: nested() }]
        while (lines[cursor]?.indent === indent && (match = /^elif\s+(.+):$/.exec(lines[cursor].text))) { const elifLine = lines[cursor]; cursor++; branches.push({ condition: lineExpression(match[1], elifLine), body: nested() }) }
        let otherwise: Statement[] = []
        if (lines[cursor]?.indent === indent && lines[cursor].text === 'else:') { cursor++; otherwise = nested() }
        result.push({ kind: 'if', branches, otherwise }); continue
      }
      if ((match = /^for\s+([\p{L}_][\p{L}\p{N}_]*)\s+in\s+(.+):$/u.exec(line.text))) {
        if (!variableName(match[1])) syntax(`Строка ${line.number}: неверное имя счётчика.`)
        result.push({ kind: 'for', name: match[1], iterable: lineExpression(match[2], line), body: nested() }); continue
      }
      if ((match = /^while\s+(.+):$/.exec(line.text))) { result.push({ kind: 'while', condition: lineExpression(match[1], line), body: nested() }); continue }
      if ((match = /^def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(([^()]*)\):$/u.exec(line.text))) {
        if(functionDepth)syntax('Вложенные функции пока не поддерживаются. Опиши функции отдельно.')
        const params = match[2].trim() ? match[2].split(',').map(item => item.trim()) : []
        if (!variableName(match[1]) || params.some(name => !variableName(name)) || new Set(params).size !== params.length) syntax(`Строка ${line.number}: проверь имя функции и параметры; имена встроенных команд не переопределяй.`)
        const fn: Statement = { kind: 'function', name: match[1], params, body: nested(true) }
        if (decorators.length) { fn.decorators = decorators; decorators = [] }
        result.push(fn); continue
      }
      if ((match = /^return\s+(.+)$/.exec(line.text))) { result.push({ kind: 'return', value: tupleExpression(match[1], line) }); continue }
      if(line.text==='return'){result.push({kind:'return',value:{kind:'literal',value:null}});continue}
      if (line.text === 'pass') { result.push({ kind: 'pass' }); continue }
      // Index targets are parsed as one expression so `a[1, 2]` and `a[1:3]` read like everywhere else.
      const indexOf = (name: string, inside: string) => { const target = lineExpression(`${name}[${inside}]`, line); if (target.kind !== 'index' || target.target.kind !== 'name') syntax(`Строка ${line.number}: меняй элемент так: имя[индекс] = значение.`); return target.index }
      if ((match = /^([\p{L}_][\p{L}\p{N}_]*)(?:\[(.+)\])?\s*(\*\*|\/\/|[+\-*/%])=\s*(.+)$/u.exec(line.text))) {
        if (!variableName(match[1])) syntax(`Строка ${line.number}: неверное имя переменной; имена встроенных команд не переопределяй.`)
        const index = match[2] ? indexOf(match[1], match[2]) : undefined, current: Expr = index ? { kind: 'index', target: { kind: 'name', name: match[1] }, index } : { kind: 'name', name: match[1] }
        result.push({ kind: 'assign', name: match[1], index, value: { kind: 'binary', operator: match[3], left: current, right: lineExpression(match[4], line) } }); continue
      }
      if ((match = /^([\p{L}_][\p{L}\p{N}_]*(?:\s*,\s*[\p{L}_][\p{L}\p{N}_]*)+)\s*,?\s*=(?!=)\s*(.+)$/u.exec(line.text))) {
        const names = match[1].split(',').map(name => name.trim())
        if (names.some(name => !variableName(name)) || new Set(names).size !== names.length) syntax(`Строка ${line.number}: неверное имя переменной; имена встроенных команд не переопределяй.`)
        result.push({ kind: 'unpack', names, value: tupleExpression(match[2], line) }); continue
      }
      if ((match = /^([\p{L}_][\p{L}\p{N}_]*)(?:\[(.+)\])?\s*=\s*(.+)$/u.exec(line.text))) {
        if (!variableName(match[1])) syntax(`Строка ${line.number}: неверное имя переменной; имена встроенных команд не переопределяй.`)
        result.push({ kind: 'assign', name: match[1], index: match[2] ? indexOf(match[1], match[2]) : undefined, value: tupleExpression(match[3], line) }); continue
      }
      if (/^[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)+\s*=(?!=)/u.test(line.text)) syntax(`Строка ${line.number}: менять свойства через точку нельзя — вызови функцию, например t.color("red").`)
      if (/^(if|elif|else|while|for|def)\b/.test(line.text)) syntax(`Строка ${line.number}: после условия, цикла или def нужны двоеточие и строка с отступом.`)
      const value = lineExpression(line.text, line)
      if (value.kind !== 'call') syntax(`Строка ${line.number}: здесь нужна команда или присваивание.`)
      result.push({ kind: 'expression', value })
    }
    if (decorators.length) syntax('После декоратора @ нужна строка def.')
    return result
  }
  const program = block(0)
  if (cursor < lines.length && lines[cursor].text.startsWith('@')) syntax(`Строка ${lines[cursor].number}: после декоратора @ нужна строка def.`)
  if (cursor < lines.length) syntax(`Строка ${lines[cursor].number}: else или elif должны идти сразу после if.`)
  return program
}

export { runCourseProgram, runPythonAst } from './pythonExecution'
