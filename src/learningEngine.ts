import type * as Blockly from 'blockly'
import type { LessonSkills, SkillId, SupportLevel } from './skills'
import { issue, type ErrorType, type ValidationIssue } from './validation'

/**
 * Stable, language-neutral program representation. Blockly is only an input
 * adapter: renderers and the teaching runtime never depend on Blockly blocks.
 */
export type Expr =
  | { kind: 'missing' }
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'variable'; name: string }
  | { kind: 'binary'; operator: '+' | '-' | '*' | '/' | '**'; left: Expr; right: Expr }
  | { kind: 'comparison'; operator: '==' | '!=' | '>' | '>=' | '<' | '<='; left: Expr; right: Expr }

export type Stmt =
  | { kind: 'define'; name: string; body: Stmt[] }
  | { kind: 'call'; name: string }
  | { kind: 'print'; value: Expr }
  | { kind: 'assign'; name: string; value: Expr }
  | { kind: 'repeat'; times: Expr; body: Stmt[] }
  | { kind: 'if'; condition: Expr; then: Stmt[]; otherwise: Stmt[] }

export type Program = { statements: Stmt[]; issues?: string[] }

export type Lesson = {
  id: number
  chapter?: number
  tutorial?: string[]
  mode?: 'blocks' | 'recognition' | 'completion' | 'tokens' | 'text'
  choices?: string[]
  answer?: string
  codeAnswer?: string
  prefix?: string
  suffix?: string
  tokens?: string[]
  codeNote?: string
  review?: boolean
  adaptiveOnly?: boolean
  skills?: LessonSkills
  difficulty?: 1 | 2 | 3 | 4 | 5
  supportLevel?: SupportLevel
  progressiveHints?: string[]
  allowed?: string[]
  success?: string
  title: string
  kicker: string
  instruction: string
  goal: string
  hint: string
  starterHint: string
  expectedOutput: string[]
  /** A deliberately incomplete workspace for gradual release of responsibility. */
  starter: object
  solution: object
  validate: (program: Program) => string | ValidationIssue | null
}

const str = (value: string): Expr => ({ kind: 'string', value })
const num = (value: number): Expr => ({ kind: 'number', value })
const variable = (name: string): Expr => ({ kind: 'variable', name })
const print = (value: Expr): Stmt => ({ kind: 'print', value })

const solution = (blocks: object[]) => {
  // Variable fields are serialized by Blockly as model ids, not visible names.
  // Convert the readable lesson fixtures into the exact workspace-save shape.
  const names = new Set<string>()
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit)
    if (!value || typeof value !== 'object') return value
    const clone = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, visit(nested)])) as Record<string, unknown>
    if ((clone.type === 'variables_set' || clone.type === 'variables_get') && clone.fields && typeof clone.fields === 'object') {
      const fields = clone.fields as Record<string, unknown>
      if (typeof fields.VAR === 'string') {
        names.add(fields.VAR)
        fields.VAR = { id: `lesson-variable-${fields.VAR}` }
      }
    }
    return clone
  }
  const preparedBlocks = visit(blocks) as object[]
  return {
    variables: Array.from(names).map((name) => ({ name, id: `lesson-variable-${name}` })),
    blocks: { languageVersion: 0, blocks: preparedBlocks }
  }
}
const textBlock = (text: string) => ({ type: 'text', fields: { TEXT: text } })
const numberBlock = (number: number) => ({ type: 'math_number', fields: { NUM: number } })
const variableBlock = (name: string) => ({ type: 'variables_get', fields: { VAR: name } })

export const lessons: Lesson[] = [
  {
    id: 1,
    title: 'Скажи «привет»',
    kicker: 'Первый вывод',
    instruction: 'Компьютер выполнит то, что ты ему скажешь. Выведи дружелюбное сообщение на экран.',
    goal: 'Напечатай: Привет, мир!',
    hint: 'Нажми на белое поле текста внутри блока и впиши сообщение.',
    starterHint: 'Разминка: программа уже собрана. Впиши только текст сообщения.',
    expectedOutput: ['Привет, мир!'],
    starter: solution([{ type: 'text_print', x: 72, y: 64, inputs: { TEXT: { block: textBlock('') } } }]),
    solution: solution([{ type: 'text_print', x: 72, y: 64, inputs: { TEXT: { block: textBlock('Привет, мир!') } } }]),
    validate: (p) => p.statements.some((s) => s.kind === 'print') ? null : 'Нужен блок «напечатать».'
  },
  {
    id: 2,
    title: 'Запомни имя',
    kicker: 'Переменные',
    instruction: 'Переменная — это подписанная коробка для данных. Сохрани имя, а затем напечатай его.',
    goal: 'Сохрани «Мира» в переменную «имя» и выведи её.',
    hint: 'Переменная уже создана. В разделе «Данные» возьми фиолетовый блок «имя» и вставь его в пустое место блока печати.',
    starterHint: 'Один шаг: добавь в печать блок, который получает значение «имя».',
    expectedOutput: ['Мира'],
    starter: solution([
      { type: 'variables_set', x: 72, y: 48, fields: { VAR: 'имя' }, inputs: { VALUE: { block: textBlock('Мира') } }, next: { block: { type: 'text_print' } } }
    ]),
    solution: solution([
      { type: 'variables_set', x: 72, y: 48, fields: { VAR: 'имя' }, inputs: { VALUE: { block: textBlock('Мира') } }, next: { block: { type: 'text_print', inputs: { TEXT: { block: variableBlock('имя') } } } } }
    ]),
    validate: (p) => {
      const assignment = p.statements.find((s): s is Extract<Stmt, { kind: 'assign' }> => s.kind === 'assign')
      if (!assignment) return 'Сначала сохрани значение в переменной.'
      if (assignment.name !== 'имя' || !isString(assignment.value, 'Мира')) return 'В переменную «имя» нужно сохранить текст «Мира».'
      return p.statements.some((s) => s.kind === 'print' && isVariable(s.value, 'имя')) ? null : 'Напечатай значение с помощью блока «получить имя».'
    }
  },
  {
    id: 3,
    title: 'Сложи баллы',
    kicker: 'Вычисления',
    instruction: 'Компьютер умеет считать. Собери выражение и покажи результат.',
    goal: 'Напечатай результат 2 + 3.',
    hint: 'Второе белое число в выражении можно отредактировать прямо внутри блока.',
    starterHint: 'Выражение уже готово: заполни недостающее число.',
    expectedOutput: ['5'],
    starter: solution([{ type: 'text_print', x: 72, y: 64, inputs: { TEXT: { block: { type: 'math_arithmetic', fields: { OP: 'ADD' }, inputs: { A: { block: numberBlock(2) }, B: { block: numberBlock(0) } } } } } }]),
    solution: solution([{ type: 'text_print', x: 72, y: 64, inputs: { TEXT: { block: { type: 'math_arithmetic', fields: { OP: 'ADD' }, inputs: { A: { block: numberBlock(2) }, B: { block: numberBlock(3) } } } } } }]),
    validate: (p) => hasExpression(p, (e) => e.kind === 'binary' && e.operator === '+' && ((isNumber(e.left, 2) && isNumber(e.right, 3)) || (isNumber(e.left, 3) && isNumber(e.right, 2)))) ? null : 'Используй сложение чисел 2 и 3 внутри печати.'
  },
  {
    id: 4,
    title: 'Повтори трижды',
    kicker: 'Циклы',
    instruction: 'Когда действие нужно сделать несколько раз, помогает цикл. Он повторяет блоки внутри себя.',
    goal: 'Три раза напечатай: Учусь!',
    hint: 'Добавь блок «напечатать» из категории «Вывод» внутрь цикла, затем впиши текст.',
    starterHint: 'Следующий уровень: цикл уже есть, а его тело тебе нужно собрать самому.',
    expectedOutput: ['Учусь!', 'Учусь!', 'Учусь!'],
    starter: solution([{ type: 'controls_repeat_ext', x: 72, y: 52, inputs: { TIMES: { block: numberBlock(3) } } }]),
    solution: solution([{ type: 'controls_repeat_ext', x: 72, y: 52, inputs: { TIMES: { block: numberBlock(3) }, DO: { block: { type: 'text_print', inputs: { TEXT: { block: textBlock('Учусь!') } } } } } }]),
    validate: (p) => {
      const loop = p.statements.find((s): s is Extract<Stmt, { kind: 'repeat' }> => s.kind === 'repeat')
      if (!loop) return 'Нужен блок «повторить». Помести печать внутрь него.'
      if (!isNumber(loop.times, 3)) return 'Поставь число 3 в блоке повторения.'
      return loop.body.some((s) => s.kind === 'print' && isString(s.value, 'Учусь!')) ? null : 'Внутри цикла напечатай «Учусь!».'
    }
  },
  {
    id: 5,
    title: 'Открой уровень',
    kicker: 'Условия',
    instruction: 'Условие помогает программе выбрать действие. Если баллов достаточно, можно открыть уровень.',
    goal: 'Сохрани 12 в «баллы». Если баллы ≥ 10, напечатай «Уровень пройден!».',
    hint: 'Это самостоятельная сборка. Начни с «Данные» → «создать переменную», затем добавь присваивание, условие и печать.',
    starterHint: 'Финал: пустое поле. Теперь ты собираешь программу целиком — как настоящий разработчик.',
    expectedOutput: ['Уровень пройден!'],
    starter: solution([]),
    solution: solution([
      { type: 'variables_set', x: 72, y: 48, fields: { VAR: 'баллы' }, inputs: { VALUE: { block: numberBlock(12) } }, next: { block: { type: 'controls_if', inputs: { IF0: { block: { type: 'logic_compare', fields: { OP: 'GTE' }, inputs: { A: { block: variableBlock('баллы') }, B: { block: numberBlock(10) } } } }, DO0: { block: { type: 'text_print', inputs: { TEXT: { block: textBlock('Уровень пройден!') } } } } } } } }
    ]),
    validate: (p) => {
      const score = p.statements.find((s): s is Extract<Stmt, { kind: 'assign' }> => s.kind === 'assign' && s.name === 'баллы')
      if (!score || !isNumber(score.value, 12)) return 'Сохрани число 12 в переменной «баллы».'
      const condition = p.statements.find((s): s is Extract<Stmt, { kind: 'if' }> => s.kind === 'if')
      if (!condition) return 'Нужен блок «если». Проверь в нём количество баллов.'
      const correctCondition = condition.condition.kind === 'comparison' && condition.condition.operator === '>=' && isVariable(condition.condition.left, 'баллы') && isNumber(condition.condition.right, 10)
      if (!correctCondition) return 'Уровень должен открываться и при 11, 12, 13 баллах. Равенство проверяет только одно число. Выбери сравнение «не меньше».'
      return condition.then.some((s) => s.kind === 'print' && isString(s.value, 'Уровень пройден!')) ? null : 'Положи печать «Уровень пройден!» внутрь условия.'
    }
  }
]

function fieldText(block: Blockly.Block, field: string) {
  return block.getField(field)?.getText() || block.getFieldValue(field) || ''
}

function fieldValue(block: Blockly.Block, field: string) {
  return block.getFieldValue(field) || fieldText(block, field)
}

function expression(block: Blockly.Block | null): Expr {
  if (!block || !block.isEnabled()) return { kind: 'missing' }
  switch (block.type) {
    case 'text': return str(fieldText(block, 'TEXT'))
    case 'math_number': return num(Number(fieldText(block, 'NUM')) || 0)
    case 'variables_get': return variable(fieldText(block, 'VAR'))
    case 'math_arithmetic': {
      const op: Record<string, '+' | '-' | '*' | '/' | '**'> = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: '**' }
      return { kind: 'binary', operator: op[fieldValue(block, 'OP')] ?? '+', left: expression(block.getInputTargetBlock('A')), right: expression(block.getInputTargetBlock('B')) }
    }
    case 'logic_compare': {
      const op: Record<string, '==' | '!=' | '>' | '>=' | '<' | '<='> = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' }
      return { kind: 'comparison', operator: op[fieldValue(block, 'OP')] ?? '==', left: expression(block.getInputTargetBlock('A')), right: expression(block.getInputTargetBlock('B')) }
    }
    default: return { kind: 'missing' }
  }
}

function statements(first: Blockly.Block | null): Stmt[] {
  const result: Stmt[] = []
  let block = first
  while (block) {
    if (!block.isEnabled()) { block = block.getNextBlock(); continue }
    if (block.type === 'text_print') result.push({ kind: 'print', value: expression(block.getInputTargetBlock('TEXT')) })
    if (block.type === 'variables_set') result.push({ kind: 'assign', name: fieldText(block, 'VAR'), value: expression(block.getInputTargetBlock('VALUE')) })
    if (block.type === 'controls_repeat_ext') result.push({ kind: 'repeat', times: expression(block.getInputTargetBlock('TIMES')), body: statements(block.getInputTargetBlock('DO')) })
    if (block.type === 'kodik_define') result.push({ kind: 'define', name: fieldText(block, 'NAME'), body: statements(block.getInputTargetBlock('BODY')) })
    if (block.type === 'kodik_call') result.push({ kind: 'call', name: fieldText(block, 'NAME') })
    if (block.type === 'controls_if') {
      let tail = statements(block.getInputTargetBlock('ELSE'))
      const count = block.inputList.filter(input => /^IF\d+$/.test(input.name)).length
      for (let index = count - 1; index >= 0; index--) tail = [{ kind: 'if', condition: expression(block.getInputTargetBlock(`IF${index}`)), then: statements(block.getInputTargetBlock(`DO${index}`)), otherwise: tail }]
      result.push(...tail)
    }
    block = block.getNextBlock()
  }
  return result
}

export function workspaceToProgram(workspace: Blockly.Workspace): Program {
  const roots = workspace.getTopBlocks(true).filter(b => b.isEnabled())
  if (workspace.getAllBlocks(false).length > 200) return { statements: [], issues: ['В программе слишком много блоков. Оставь не больше 200.'] }
  return { statements: roots.flatMap(statements), issues: roots.some(b => b.outputConnection) ? ['Есть отдельный блок значения. Вставь его в программу.'] : [] }
}

function renderExpr(expr: Expr): string {
  if (expr.kind === 'missing') return '...'
  if (expr.kind === 'string') return JSON.stringify(expr.value)
  if (expr.kind === 'number') return expr.value < 0 ? `(${expr.value})` : String(expr.value)
  if (expr.kind === 'variable') return safeName(expr.name)
  const operand = (value: Expr) => value.kind === 'binary' || value.kind === 'comparison' ? `(${renderExpr(value)})` : renderExpr(value)
  return `${operand(expr.left)} ${expr.operator} ${operand(expr.right)}`
}

function safeName(name: string) {
  return validName(name) ? name : 'некорректное_имя'
}

const reserved = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print range'.split(' '))
export function validName(name: string) { return /^[\p{L}_][\p{L}\p{N}_]*$/u.test(name) && !reserved.has(name) && !name.startsWith('__kodik') }

function renderStatements(statementsToRender: Stmt[], indent = ''): string[] {
  if (!statementsToRender.length) return [`${indent}pass`]
  return statementsToRender.flatMap((statement) => {
    if (statement.kind === 'define') return [`${indent}def ${safeName(statement.name)}():`, ...renderStatements(statement.body, `${indent}    `)]
    if (statement.kind === 'call') return [`${indent}${safeName(statement.name)}()`]
    if (statement.kind === 'print') return [`${indent}print(${renderExpr(statement.value)})`]
    if (statement.kind === 'assign') return [`${indent}${safeName(statement.name)} = ${renderExpr(statement.value)}`]
    if (statement.kind === 'repeat') return [`${indent}for __kodik_repeat in range(${renderExpr(statement.times)}):`, ...renderStatements(statement.body, `${indent}    `)]
    const lines = [`${indent}if ${renderExpr(statement.condition)}:`, ...renderStatements(statement.then, `${indent}    `)]
    return statement.otherwise.length ? [...lines, `${indent}else:`, ...renderStatements(statement.otherwise, `${indent}    `)] : lines
  })
}

export function renderPython(program: Program) {
  if (!program.statements.length) return '# Добавь первый блок, чтобы увидеть Python'
  const lines = renderStatements(program.statements)
  return lines.length ? lines.join('\n') : '# Собери программу из блоков\n'
}

type Real = { kind: 'real'; value: number }
type Value = string | number | boolean | Real
class LearningError extends Error {}
const primitive = (value: Value) => typeof value === 'object' ? value.value : value
const truthy = (value: Value) => Boolean(primitive(value))
const display = (value: Value): string => typeof value === 'boolean' ? (value ? 'True' : 'False') : typeof value === 'object' ? (Number.isInteger(value.value) ? `${value.value}.0` : String(value.value)) : String(value)
function bounded(value: number, real: boolean): Value {
  if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw new LearningError('Число слишком большое для учебного запуска. Используй значения от −1 000 000 000 000 до 1 000 000 000 000.')
  return real ? { kind: 'real', value } : value
}
export type RunResult = { output: string[]; error?: string; systemError?: boolean; errorType?: ErrorType; affectedSkills?: SkillId[] }

function evaluate(expr: Expr, memory: Map<string, Value>): Value {
  if (expr.kind === 'missing') throw new LearningError('В блоке осталось пустое место. Добавь туда значение.')
  if (expr.kind === 'string') {
    if (expr.value.length > 2000) throw new LearningError('Текст слишком длинный. Оставь не больше 2000 символов.')
    return expr.value
  }
  if (expr.kind === 'number') return bounded(expr.value, !Number.isInteger(expr.value))
  if (expr.kind === 'variable') {
    if (!memory.has(expr.name)) throw new LearningError(`Сначала сохрани значение в переменной «${expr.name}».`)
    return memory.get(expr.name)!
  }
  const rawLeft = evaluate(expr.left, memory), rawRight = evaluate(expr.right, memory)
  const left = primitive(rawLeft), right = primitive(rawRight)
  if (expr.kind === 'comparison') {
    if (expr.operator === '==') return left === right
    if (expr.operator === '!=') return left !== right
    if (typeof left !== typeof right) throw new LearningError('Сравнивай значения одного типа: два числа или две строки.')
    if (expr.operator === '>') return left > right
    if (expr.operator === '>=') return left >= right
    if (expr.operator === '<') return left < right
    return left <= right
  }
  if (expr.operator === '+' && typeof left === 'string' && typeof right === 'string') {
    if (left.length + right.length > 2000) throw new LearningError('Текст слишком длинный. Уменьши число повторений или длину строки.')
    return left + right
  }
  if (typeof left !== 'number' || typeof right !== 'number') throw new LearningError('Для этого вычисления нужны два числа. Текст в кавычках — это строка.')
  const real = typeof rawLeft === 'object' || typeof rawRight === 'object'
  if (expr.operator === '+') return bounded(left + right, real)
  if (expr.operator === '-') return bounded(left - right, real)
  if (expr.operator === '*') return bounded(left * right, real)
  if (expr.operator === '**') {
    const result = left ** right
    if (!Number.isFinite(result)) throw new LearningError('Результат слишком большой или не является действительным числом.')
    return bounded(result, real || right < 0)
  }
  if (right === 0) throw new LearningError('Делить на ноль нельзя. Измени второе число.')
  return bounded(left / right, true)
}

export function runProgram(program: Program): RunResult {
  const memory = new Map<string, Value>()
  const functions = new Map<string, Stmt[]>()
  const output: string[] = []
  let operations = 0
  const inspect = (items: Stmt[], nested = false): void => {
    for (const item of items) {
      if (item.kind === 'define') {
        if (nested) throw new LearningError('В этом курсе создавай функции отдельно, вне циклов, условий и других функций.')
        inspect(item.body, true)
      } else if (item.kind === 'repeat') inspect(item.body, true)
      else if (item.kind === 'if') { inspect(item.then, true); inspect(item.otherwise, true) }
    }
  }
  const assignedNames = (items: Stmt[]): string[] => items.flatMap(item => item.kind === 'assign' ? [item.name] : item.kind === 'repeat' ? assignedNames(item.body) : item.kind === 'if' ? [...assignedNames(item.then), ...assignedNames(item.otherwise)] : [])
  const tick = () => { if (++operations > 1000) throw new LearningError('Слишком много повторений. Уменьши число в цикле или проверь вызовы функции.') }
  const execute = (items: Stmt[], scope = memory, depth = 0): void => {
    if (depth > 40) throw new LearningError('Функция вызывает себя слишком много раз. Проверь блоки вызова.')
    for (const item of items) {
      tick()
      if ('name' in item && !validName(item.name)) throw new LearningError('Используй имя из букв, цифр и подчёркиваний, начиная с буквы. Служебные слова Python не подходят.')
      if (item.kind === 'define') {
        if (memory.has(item.name)) throw new LearningError('Дай функции и переменной разные имена.')
        functions.set(item.name, item.body)
      }
      if (item.kind === 'call') {
        const body = functions.get(item.name)
        if (!body) throw new LearningError(`Сначала создай функцию «${item.name}», затем вызови её.`)
        const local = new Map(memory)
        for (const name of assignedNames(body)) local.delete(name)
        execute(body, local, depth + 1)
      }
      if (item.kind === 'print') {
        const value = evaluate(item.value, scope)
        output.push(display(value))
      }
      if (item.kind === 'assign') {
        if (functions.has(item.name)) throw new LearningError('Дай функции и переменной разные имена.')
        scope.set(item.name, evaluate(item.value, scope))
      }
      if (item.kind === 'repeat') {
        const times = evaluate(item.times, scope)
        if (typeof times !== 'number' || !Number.isInteger(times)) throw new LearningError('Число повторений должно быть целым числом.')
        for (let index = 0; index < Number(times); index += 1) { tick(); execute(item.body, scope, depth) }
      }
      if (item.kind === 'if') execute(truthy(evaluate(item.condition, scope)) ? item.then : item.otherwise, scope, depth)
    }
  }
  try { if (program.issues?.length) throw new LearningError(program.issues[0]); inspect(program.statements); execute(program.statements); return { output } } catch (error) { return { output, error: error instanceof LearningError ? error.message : 'Не удалось проверить программу. Твои блоки сохранены. Попробуй ещё раз.', systemError: !(error instanceof LearningError) } }
}

export function checkLesson(lesson: Lesson, program: Program) {
  const practicedSkills = lesson.skills?.practices || lesson.skills?.teaches || []
  const result = runProgram(program)
  if (result.error) { const details = issue(result.error, practicedSkills); return { passed: false, message: result.error, result: { ...result, errorType: details.errorType, affectedSkills: details.affectedSkills } } }
  if (!program.statements.length) return { passed: false, message: 'Поле пока пустое. Нажми «Добавить блок» и собери программу.', result: { output: [], errorType: 'missing_block', affectedSkills: practicedSkills } as RunResult }
  const requiredError = lesson.validate(program)
  if (requiredError) { const details = typeof requiredError === 'string' ? issue(requiredError, practicedSkills) : requiredError; return { passed: false, message: details.message, result: { ...result, errorType: details.errorType, affectedSkills: details.affectedSkills } } }
  const correct = result.output.length === lesson.expectedOutput.length && result.output.every((line, index) => line === lesson.expectedOutput[index])
  if (correct) return { passed: true, message: lesson.success || lesson.instruction, result }
  const errorType: ErrorType = result.output.length === lesson.expectedOutput.length ? 'wrong_value' : 'wrong_order'
  return { passed: false, message: `Сейчас вывод отличается от задания. Ожидаем: ${lesson.expectedOutput.join(' → ')}. Проверь значения и порядок блоков.`, result: { ...result, errorType, affectedSkills: practicedSkills } }
}

function hasExpression(program: Program, test: (expr: Expr) => boolean): boolean {
  const visitExpr = (expr: Expr): boolean => test(expr) || ('left' in expr && visitExpr(expr.left)) || ('right' in expr && visitExpr(expr.right))
  const visitStatements = (items: Stmt[]): boolean => items.some((item) => {
    if (item.kind === 'call') return false
    if (item.kind === 'define') return visitStatements(item.body)
    if (item.kind === 'print' || item.kind === 'assign') return visitExpr(item.value)
    if (item.kind === 'repeat') return visitExpr(item.times) || visitStatements(item.body)
    return visitExpr(item.condition) || visitStatements(item.then) || visitStatements(item.otherwise)
  })
  return visitStatements(program.statements)
}

function isString(expr: Expr, value: string): expr is Extract<Expr, { kind: 'string' }> {
  return expr.kind === 'string' && expr.value === value
}

function isNumber(expr: Expr, value: number): expr is Extract<Expr, { kind: 'number' }> {
  return expr.kind === 'number' && expr.value === value
}

function isVariable(expr: Expr, name: string): expr is Extract<Expr, { kind: 'variable' }> {
  return expr.kind === 'variable' && expr.name === name
}
