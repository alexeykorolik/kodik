import { checkLesson, runProgram, validName, type Lesson, type Program, type Expr, type Stmt } from './learningEngine'
import { issue } from './validation'

type Token = { kind: 'number'|'string'|'name'|'operator'|'paren'; value: string }

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let rest = source.trim()
  while (rest) {
    const whitespace = /^\s+/.exec(rest)
    if (whitespace) { rest = rest.slice(whitespace[0].length); continue }
    const string = /^(["'])(?:\\.|(?!\1).)*\1/.exec(rest)
    if (string) { tokens.push({ kind: 'string', value: string[0] }); rest = rest.slice(string[0].length); continue }
    const number = /^\d+(?:\.\d+)?/.exec(rest)
    if (number) { tokens.push({ kind: 'number', value: number[0] }); rest = rest.slice(number[0].length); continue }
    const name = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(rest)
    if (name) { tokens.push({ kind: 'name', value: name[0] }); rest = rest.slice(name[0].length); continue }
    const operator = /^(==|!=|>=|<=|\*\*|[+\-*/><()])/.exec(rest)
    if (operator) { tokens.push({ kind: operator[1] === '(' || operator[1] === ')' ? 'paren' : 'operator', value: operator[1] }); rest = rest.slice(operator[1].length); continue }
    throw new Error(`Не удалось прочитать фрагмент «${rest.slice(0, 12)}». Проверь синтаксис.`)
  }
  return tokens
}

function decodeString(token: string) {
  const body = token.slice(1,-1)
  let result = ''
  for (let i=0;i<body.length;i++) {
    if (body[i] !== '\\') { result += body[i]; continue }
    const next = body[++i]
    const escapes: Record<string,string> = { n:'\n', t:'\t', '\\':'\\', '"':'"', "'":"'" }
    if (!(next in escapes)) throw new Error('После обратной косой черты допустимы n, t, кавычка или ещё одна косая черта.')
    result += escapes[next]
  }
  return result
}

function parseExpression(source: string): Expr {
  const tokens = tokenize(source)
  let index = 0
  const primary = (): Expr => {
    const token = tokens[index++]
    if (!token) throw new Error('После знака не хватает значения.')
    if (token.kind === 'string') return { kind: 'string', value: decodeString(token.value) }
    if (token.kind === 'number') return { kind: 'number', value: Number(token.value) }
    if (token.kind === 'name') return { kind: 'variable', name: token.value }
    if (token.value === '(') {
      const value = comparison()
      if (tokens[index++]?.value !== ')') throw new Error('Не хватает закрывающей круглой скобки.')
      return value
    }
    if (token.value === '-') {
      const value = primary()
      if (value.kind !== 'number') throw new Error('В учебных заданиях минус перед значением используется только с числами.')
      return { kind: 'number', value: -value.value }
    }
    throw new Error(`Неожиданный знак «${token.value}».`)
  }
  const power = (): Expr => { let left=primary(); while(tokens[index]?.value==='**'){index++;left={kind:'binary',operator:'**',left,right:primary()}} return left }
  const multiply = (): Expr => { let left=power(); while(['*','/'].includes(tokens[index]?.value)){const operator=tokens[index++].value as '*'|'/';left={kind:'binary',operator,left,right:power()}} return left }
  const add = (): Expr => { let left=multiply(); while(['+','-'].includes(tokens[index]?.value)){const operator=tokens[index++].value as '+'|'-';left={kind:'binary',operator,left,right:multiply()}} return left }
  const comparison = (): Expr => {
    const left=add(), token=tokens[index]
    if (!token || !['==','!=','>','>=','<','<='].includes(token.value)) return left
    index++
    return { kind:'comparison', operator:token.value as '=='|'!='|'>'|'>='|'<'|'<=', left, right:add() }
  }
  const expression = comparison()
  if (index !== tokens.length) throw new Error(`Лишний фрагмент «${tokens[index].value}» в выражении.`)
  return expression
}

type SourceLine = { number: number; indent: number; text: string }
export function parsePythonProgram(source: string): Program {
  if (source.length > 10000) throw new Error('Программа слишком длинная для этого задания.')
  const lines: SourceLine[] = source.replace(/\t/g,'    ').split(/\r?\n/).map((raw,index) => ({ number:index+1, indent:/^ */.exec(raw)![0].length, text:raw.trim() })).filter(line => line.text && !line.text.startsWith('#'))
  if (!lines.length) throw new Error('Напиши программу, затем нажми «Проверить».')
  if (lines.some(line => line.indent % 4 !== 0)) throw new Error('Используй отступ в 4 пробела внутри if, for и def.')
  let cursor = 0
  const block = (indent: number): Stmt[] => {
    const statements: Stmt[] = []
    while (cursor < lines.length) {
      const line = lines[cursor]
      if (line.indent < indent) break
      if (line.indent > indent) throw new Error(`Строка ${line.number}: неожиданный отступ. Вложенные команды идут после строки с двоеточием.`)
      if (line.text === 'else:') break
      cursor++
      let match: RegExpExecArray | null
      if ((match=/^print\s*\((.*)\)$/.exec(line.text))) { statements.push({kind:'print',value:parseExpression(match[1])}); continue }
      if ((match=/^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(.+)$/u.exec(line.text))) {
        if (!validName(match[1])) throw new Error(`Строка ${line.number}: некорректное имя переменной.`)
        statements.push({kind:'assign',name:match[1],value:parseExpression(match[2])}); continue
      }
      if ((match=/^if\s+(.+):$/.exec(line.text))) {
        const then=block(indent+4)
        let otherwise: Stmt[]=[]
        if (lines[cursor]?.indent===indent && lines[cursor]?.text==='else:') { cursor++; otherwise=block(indent+4) }
        if (!then.length) throw new Error(`Строка ${line.number}: после if нужна команда с отступом.`)
        statements.push({kind:'if',condition:parseExpression(match[1]),then,otherwise}); continue
      }
      if ((match=/^for\s+([\p{L}_][\p{L}\p{N}_]*)\s+in\s+range\s*\((.+)\):$/u.exec(line.text))) {
        if (!validName(match[1])) throw new Error(`Строка ${line.number}: некорректное имя счётчика цикла.`)
        const body=block(indent+4)
        if (!body.length) throw new Error(`Строка ${line.number}: после for нужна команда с отступом.`)
        statements.push({kind:'repeat',times:parseExpression(match[2]),body}); continue
      }
      if ((match=/^def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(\s*\)\s*:$/u.exec(line.text))) {
        if (!validName(match[1])) throw new Error(`Строка ${line.number}: некорректное имя функции.`)
        const body=block(indent+4)
        if (!body.length) throw new Error(`Строка ${line.number}: после def нужна команда с отступом.`)
        statements.push({kind:'define',name:match[1],body}); continue
      }
      if ((match=/^([\p{L}_][\p{L}\p{N}_]*)\s*\(\s*\)$/u.exec(line.text))) { statements.push({kind:'call',name:match[1]}); continue }
      throw new Error(`Строка ${line.number}: пока поддерживаются присваивание, print, if/else, for range и функции без параметров.`)
    }
    return statements
  }
  const statements = block(0)
  if (cursor !== lines.length) throw new Error(`Строка ${lines[cursor].number}: else должен идти сразу после соответствующего if.`)
  return { statements }
}

export const parsePrintProgram = parsePythonProgram

export function checkTextLesson(lesson: Lesson, answer: string) {
  if (lesson.mode === 'text' || lesson.mode === 'tokens') {
    try {
      const source = lesson.mode === 'tokens' && (lesson.prefix !== undefined || lesson.suffix !== undefined) ? `${lesson.prefix || ''}${answer}${lesson.suffix || ''}` : answer
      const program = parsePythonProgram(source)
      return { ...checkLesson(lesson, program), program }
    } catch (error) {
      const message=(error as Error).message, details=issue(message,lesson.skills?.practices || [])
      return { passed:false,message,result:{output:[],errorType:details.errorType,affectedSkills:details.affectedSkills},program:{statements:[]} as Program }
    }
  }
  const passed = answer === lesson.answer
  let program: Program = { statements: [] }
  try {
    const source = lesson.mode === 'completion' ? `${lesson.prefix || ''}${answer}${lesson.suffix || ''}` : lesson.answer || ''
    program = parsePythonProgram(source)
  } catch { /* Wrong choices are reported pedagogically below. */ }
  const message = passed ? (lesson.codeNote || lesson.success || lesson.instruction) : !answer ? 'Сначала выбери ответ, затем нажми «Проверить».' : lesson.mode === 'completion' ? 'Выбранный фрагмент не выполняет условие задания. Попробуй другой вариант.' : 'Сравни запись с визуальной командой и обрати внимание на имя, скобки и кавычки.'
  const details = passed ? null : issue(message, lesson.skills?.practices || [])
  return { passed, message, result: passed ? runProgram(program) : { output: [], errorType: details!.errorType, affectedSkills: details!.affectedSkills }, program }
}
