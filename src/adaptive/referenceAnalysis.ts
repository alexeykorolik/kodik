/**
 * Suggests skills and a Blockly palette from a teacher's reference solution,
 * and explains why a task cannot have a visual mode. The suggestion is a
 * starting point: the teacher confirms skills and edits the palette.
 */
import { parseCourseProgram, type Expr, type Statement } from '../pythonRuntime'
import type { SkillId } from './blockProgram'

export type Compatibility = {
  /** The reference parses and every construct has a block. */
  blocklyCompatible: boolean
  reasons: string[]
  skills: SkillId[]
  palette: string[]
}

const SKILL_LABELS: Record<SkillId, string> = { output: 'Вывод', input: 'Ввод', variables: 'Переменные', arithmetic: 'Арифметика', strings: 'Строки', comparison: 'Сравнения', logic: 'Логические операции', conditions: 'Условия', loops: 'Циклы', functions: 'Функции' }
export const skillLabel = (id: SkillId) => SKILL_LABELS[id]

export function analyzeReference(source: string): Compatibility {
  const reasons = new Set<string>(), skills = new Set<SkillId>(), palette = new Set<string>()
  let program: Statement[]
  try { program = parseCourseProgram(source) } catch (e) {
    return { blocklyCompatible: false, reasons: [`Эталон не разбирается учебным Python: ${(e as Error).message}`], skills: [], palette: [] }
  }
  const use = (skill: SkillId, ...blocks: string[]) => { skills.add(skill); blocks.forEach(b => palette.add(b)) }
  const no = (reason: string) => reasons.add(reason)
  const isStringy = (e: Expr): boolean => (e.kind === 'literal' && typeof e.value === 'string') || (e.kind === 'call' && e.name === 'str') || (e.kind === 'binary' && e.operator === '+' && (isStringy(e.left) || isStringy(e.right)))
  const usesName = (items: Statement[], name: string): boolean => JSON.stringify(items).includes(`"name":"${name}"`)

  const expr = (e: Expr): void => {
    switch (e.kind) {
      case 'literal':
        if (typeof e.value === 'number') use('arithmetic', 'math_number')
        else if (typeof e.value === 'string') use('strings', 'text')
        else if (typeof e.value === 'boolean') use('logic', 'logic_boolean')
        else no('Значение None не имеет визуального блока.')
        return
      case 'name': use('variables', 'variables_get'); return
      case 'list': no('Списки пока не поддерживаются визуальными блоками.'); return
      case 'index': no('Обращение по индексу пока не поддерживается визуальными блоками.'); return
      case 'unary':
        if (e.operator === 'not') { use('logic', 'logic_negate'); expr(e.value) }
        else if (e.operator === '-' && e.value.kind === 'literal' && typeof e.value.value === 'number') use('arithmetic', 'math_number')
        else no(`Унарный «${e.operator}» перед выражением пока не имеет блока.`)
        return
      case 'binary':
        if (['==', '!=', '<', '<=', '>', '>='].includes(e.operator)) { use('comparison', 'logic_compare'); expr(e.left); expr(e.right); return }
        if (e.operator === 'and' || e.operator === 'or') { use('logic', 'logic_operation'); expr(e.left); expr(e.right); return }
        if (e.operator === '+' && isStringy(e)) {
          use('strings', 'text_join')
          const parts = (x: Expr): Expr[] => x.kind === 'binary' && x.operator === '+' && isStringy(x) ? [...parts(x.left), ...parts(x.right)] : [x.kind === 'call' && x.name === 'str' && x.args.length === 1 ? x.args[0] : x]
          parts(e).forEach(expr); return
        }
        if (e.operator === '//') { no('Целочисленное деление // пока не имеет блока.'); return }
        use('arithmetic', e.operator === '%' ? 'math_modulo' : 'math_arithmetic'); expr(e.left); expr(e.right); return
      case 'compare':
        if (e.operands.length > 2) no('Цепочка сравнений вида 1 < x < 5 пока не имеет блока. Разбейте её на два сравнения с «и».')
        use('comparison', 'logic_compare'); e.operands.forEach(expr); return
      case 'call':
        if (e.name === 'int' && e.args.length === 1 && e.args[0].kind === 'call' && e.args[0].name === 'input' && e.args[0].args.length === 0) { use('input', 'kodik_input_int'); return }
        if (e.name === 'input' && e.args.length === 0) { use('input', 'kodik_input_text'); return }
        if (e.name === 'input') { no('input с подсказкой пока не имеет блока: подсказка попадёт в вывод.'); return }
        if (e.name === 'len' && e.args.length === 1) { use('strings', 'text_length'); expr(e.args[0]); return }
        no(`Вызов ${e.name}(…) внутри выражения пока не имеет блока.`); return
    }
  }
  const statements = (items: Statement[], depth: number): void => {
    for (const s of items) {
      switch (s.kind) {
        case 'assign':
          if (s.index) { no('Присваивание по индексу пока не поддерживается визуальными блоками.'); break }
          use('variables', 'variables_set')
          if (s.value.kind === 'binary' && s.value.operator === '+' && s.value.left.kind === 'name' && s.value.left.name === s.name && !isStringy(s.value)) palette.add('math_change')
          expr(s.value); break
        case 'expression':
          if (s.value.kind === 'call' && s.value.name === 'print') {
            use('output', 'text_print')
            if (s.value.args.length !== 1) no('print с несколькими значениями через запятую пока не имеет блока. Соедините их в одну строку.')
            s.value.args.forEach(expr)
          } else if (s.value.kind === 'call' && s.value.args.length === 0 && !['input', 'int', 'str', 'len', 'range', 'print'].includes(s.value.name)) use('functions', 'kodik_call')
          else no('Эта команда пока не имеет блока.')
          break
        case 'if':
          use('conditions', 'controls_if')
          if (s.branches.length > 21) no('Слишком много веток elif.')
          s.branches.forEach(b => { expr(b.condition); statements(b.body, depth + 1) }); statements(s.otherwise, depth + 1); break
        case 'while': use('loops', 'controls_whileUntil'); expr(s.condition); statements(s.body, depth + 1); break
        case 'for':
          if (s.iterable.kind === 'call' && s.iterable.name === 'range' && s.iterable.args.length === 1 && !usesName(s.body, s.name)) { use('loops', 'controls_repeat_ext'); expr(s.iterable.args[0]); statements(s.body, depth + 1) }
          else no('Цикл for со счётчиком, который используется внутри, или с range(a, b) пока не имеет блока. Блок «повторить N раз» подходит, только если счётчик не нужен.')
          break
        case 'function':
          if (depth > 0) no('Вложенные функции не поддерживаются.')
          if (s.params.length) no('Функции с параметрами пока доступны только в режиме Python.')
          use('functions', 'kodik_define', 'kodik_call'); statements(s.body, depth + 1); break
        case 'return': no('return пока доступен только в режиме Python.'); break
        case 'pass': break
      }
    }
  }
  statements(program, 0)
  return { blocklyCompatible: reasons.size === 0, reasons: [...reasons], skills: [...skills], palette: [...palette] }
}
