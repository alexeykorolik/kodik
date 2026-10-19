/**
 * Kodik B2B: deterministic translation of a Blockly workspace (its JSON
 * serialization) into the learning-Python subset that the existing B2B runner
 * executes. Pure TypeScript with no Blockly import, so the same rules can run
 * in the browser (live Python mirror) and in the trusted grading process.
 *
 * Proof of concept, 19 Oct 2026. Not wired into the B2B API yet.
 */

export const TRANSLATOR_VERSION = 'blocks-py/0.1'

export type BlockJson = {
  type?: unknown
  id?: unknown
  x?: unknown
  y?: unknown
  enabled?: unknown
  fields?: Record<string, unknown>
  inputs?: Record<string, { block?: BlockJson; shadow?: BlockJson }>
  next?: { block?: BlockJson }
  extraState?: unknown
}
export type WorkspaceJson = {
  blocks?: { languageVersion?: number; blocks?: BlockJson[] }
  variables?: { name?: unknown; id?: unknown; type?: unknown }[]
}

export type SkillId = 'output' | 'input' | 'variables' | 'arithmetic' | 'strings' | 'comparison' | 'logic' | 'conditions' | 'loops' | 'functions'
export type BlockSpec = { type: string; label: string; category: string; skill: SkillId; shape: 'statement' | 'value'; python: string }

/** Every block the translator accepts. Anything else is rejected with an explanation. */
export const BLOCKS: BlockSpec[] = [
  { type: 'text_print', label: 'напечатать', category: 'Ввод и вывод', skill: 'output', shape: 'statement', python: 'print(…)' },
  { type: 'kodik_input_int', label: 'ввести целое число', category: 'Ввод и вывод', skill: 'input', shape: 'value', python: 'int(input())' },
  { type: 'kodik_input_text', label: 'ввести текст', category: 'Ввод и вывод', skill: 'input', shape: 'value', python: 'input()' },
  { type: 'variables_set', label: 'присвоить', category: 'Переменные', skill: 'variables', shape: 'statement', python: 'x = …' },
  { type: 'variables_get', label: 'значение переменной', category: 'Переменные', skill: 'variables', shape: 'value', python: 'x' },
  { type: 'math_change', label: 'увеличить на', category: 'Переменные', skill: 'variables', shape: 'statement', python: 'x = x + …' },
  { type: 'math_number', label: 'число', category: 'Числа и вычисления', skill: 'arithmetic', shape: 'value', python: '5' },
  { type: 'math_arithmetic', label: '+ − × ÷ степень', category: 'Числа и вычисления', skill: 'arithmetic', shape: 'value', python: 'a + b, a - b, a * b, a / b, a ** b' },
  { type: 'math_modulo', label: 'остаток от деления', category: 'Числа и вычисления', skill: 'arithmetic', shape: 'value', python: 'a % b' },
  { type: 'text', label: 'текст', category: 'Текст', skill: 'strings', shape: 'value', python: '"…"' },
  { type: 'text_join', label: 'соединить', category: 'Текст', skill: 'strings', shape: 'value', python: 'str(a) + str(b)' },
  { type: 'text_length', label: 'длина', category: 'Текст', skill: 'strings', shape: 'value', python: 'len(…)' },
  { type: 'logic_compare', label: 'сравнить', category: 'Условия', skill: 'comparison', shape: 'value', python: '== != < <= > >=' },
  { type: 'logic_operation', label: 'и / или', category: 'Условия', skill: 'logic', shape: 'value', python: 'and, or' },
  { type: 'logic_negate', label: 'не', category: 'Условия', skill: 'logic', shape: 'value', python: 'not …' },
  { type: 'logic_boolean', label: 'истина / ложь', category: 'Условия', skill: 'logic', shape: 'value', python: 'True, False' },
  { type: 'controls_if', label: 'если / иначе если / иначе', category: 'Условия', skill: 'conditions', shape: 'statement', python: 'if / elif / else' },
  { type: 'controls_repeat_ext', label: 'повторить N раз', category: 'Циклы', skill: 'loops', shape: 'statement', python: 'for _kodik_i1 in range(N):' },
  { type: 'controls_whileUntil', label: 'повторять пока / до', category: 'Циклы', skill: 'loops', shape: 'statement', python: 'while …:' },
  { type: 'kodik_define', label: 'создать функцию', category: 'Функции', skill: 'functions', shape: 'statement', python: 'def name():' },
  { type: 'kodik_call', label: 'вызвать функцию', category: 'Функции', skill: 'functions', shape: 'statement', python: 'name()' }
]
const SPEC = new Map(BLOCKS.map(b => [b.type, b]))

/** Known Blockly blocks without a correct learning-Python mapping yet, with the reason shown to people. */
export const UNSUPPORTED_REASONS: Record<string, string> = {
  controls_flow_statements: 'break и continue пока не поддерживаются учебным Python.',
  controls_for: 'Цикл со счётчиком «от … до … шаг» пока не имеет проверенного соответствия в учебном Python.',
  controls_forEach: 'Списки пока не поддерживаются визуальными блоками.',
  lists_create_with: 'Списки пока не поддерживаются визуальными блоками.',
  math_single: 'Эта математическая функция пока не поддерживается учебным Python.',
  math_round: 'round() пока не поддерживается учебным Python.',
  text_prompt_ext: 'Используйте блоки «ввести целое число» или «ввести текст».',
  procedures_defreturn: 'Функции с return пока доступны только в режиме Python.',
  procedures_defnoreturn: 'Используйте блок «создать функцию» Kodik.'
}

export const LIMITS = { blocks: 200, depth: 12, text: 500, name: 40, json: 100_000, number: 1e12, elseIf: 20, joinItems: 10 }

export type Issue = { message: string; blockId?: string }
export type Translation = {
  ok: boolean
  python: string
  errors: Issue[]
  warnings: Issue[]
  /** Generated line numbers (1-based, inclusive) for each block id, for the mixed-mode highlight. */
  lines: Record<string, [number, number]>
  skills: SkillId[]
  blockCount: number
  version: string
}

// Same naming rules as src/pythonRuntime.ts (namePattern, forbidden, builtins), plus the translator's own prefix.
const NAME = /^[\p{L}_][\p{L}\p{N}_]*$/u
const RESERVED = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield exec eval open print input int str len range forward right left float list dict max min abs sum round'.split(' '))
const nameProblem = (name: string): string | null => {
  if (!name) return 'У переменной нет имени.'
  if (name.length > LIMITS.name) return `Имя «${name.slice(0, 20)}…» слишком длинное.`
  if (!NAME.test(name)) return `Имя «${name}» не подходит: используй буквы, цифры и _, начиная с буквы.`
  if (RESERVED.has(name)) return `«${name}» — служебное слово Python. Выбери другое имя.`
  if (name.startsWith('_')) return `Имя «${name}» не должно начинаться с подчёркивания.`
  return null
}

class Fatal extends Error {}

export type TranslateOptions = { allowed?: Iterable<string> }

export function translateWorkspace(input: unknown, options: TranslateOptions = {}): Translation {
  const errors: Issue[] = [], warnings: Issue[] = [], lines: Record<string, [number, number]> = {}, skills = new Set<SkillId>()
  const allowed = options.allowed ? new Set(options.allowed) : null
  const out: string[] = []
  let blockCount = 0
  const fail = (message: string, blockId?: string) => { errors.push({ message, blockId }); return '…' }
  const done = (python = ''): Translation => ({ ok: errors.length === 0, python: errors.length ? '' : python, errors, warnings, lines, skills: [...skills], blockCount, version: TRANSLATOR_VERSION })

  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) { fail('Программа повреждена: ожидается рабочее пространство Blockly.'); return done() }
    let size = 0
    try { size = JSON.stringify(input).length } catch { fail('Программа повреждена: блоки ссылаются сами на себя.'); return done() }
    if (size > LIMITS.json) { fail('Программа слишком большая.'); return done() }
    const ws = input as WorkspaceJson
    const variableNames = new Map<string, string>()
    for (const v of Array.isArray(ws.variables) ? ws.variables : []) {
      if (v && typeof v.id === 'string' && typeof v.name === 'string') variableNames.set(v.id, v.name)
    }
    const roots = Array.isArray(ws.blocks?.blocks) ? ws.blocks!.blocks! : []
    const functions = new Set<string>(), assigned = new Set<string>()
    const loopNames: string[] = []

    const idOf = (b: BlockJson) => typeof b.id === 'string' ? b.id : undefined
    const field = (b: BlockJson, name: string) => b.fields ? b.fields[name] : undefined
    const child = (b: BlockJson, name: string): BlockJson | undefined => { const slot = b.inputs?.[name]; return slot?.block ?? slot?.shadow }
    const enter = (b: BlockJson, depth: number, shape: 'statement' | 'value'): BlockSpec => {
      if (!b || typeof b !== 'object' || typeof b.type !== 'string') throw new Fatal('Программа повреждена: найден блок без типа.')
      if (++blockCount > LIMITS.blocks) throw new Fatal(`В программе слишком много блоков. Оставь не больше ${LIMITS.blocks}.`)
      if (depth > LIMITS.depth) throw new Fatal('Блоки вложены слишком глубоко. Упрости программу.')
      const spec = SPEC.get(b.type)
      if (!spec) { fail(UNSUPPORTED_REASONS[b.type] ?? `Блок «${b.type}» не поддерживается.`, idOf(b)); throw new Skip() }
      if (allowed && !allowed.has(b.type)) { fail(`Блок «${spec.label}» не входит в набор этого задания.`, idOf(b)); throw new Skip() }
      if (spec.shape !== shape) { fail(shape === 'statement' ? `Блок «${spec.label}» — это значение. Вставь его в пустое место другого блока.` : `Блок «${spec.label}» — это команда, его нельзя вставить как значение.`, idOf(b)); throw new Skip() }
      skills.add(spec.skill)
      return spec
    }
    const varName = (b: BlockJson): string => {
      const raw = field(b, 'VAR')
      const name = raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'string' ? variableNames.get((raw as { id: string }).id) ?? '' : typeof raw === 'string' ? (variableNames.get(raw) ?? raw) : ''
      const problem = nameProblem(name)
      if (problem) { fail(problem, idOf(b)); return 'x' }
      if (functions.has(name)) fail(`«${name}» уже имя функции. Дай переменной другое имя.`, idOf(b))
      return name
    }
    const textField = (b: BlockJson, name: string) => {
      const value = field(b, name)
      if (typeof value !== 'string') { fail('В текстовом блоке нет значения.', idOf(b)); return '' }
      if (value.length > LIMITS.text) { fail(`Текст длиннее ${LIMITS.text} символов.`, idOf(b)); return '' }
      return value
    }
    const pyString = (s: string) => '"' + Array.from(s).map(ch => ch === '\\' ? '\\\\' : ch === '"' ? '\\"' : ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t' : ch.charCodeAt(0) < 32 ? '\\x' + ch.charCodeAt(0).toString(16).padStart(2, '0') : ch).join('') + '"'
    const wrap = (b: BlockJson | undefined, code: string) => b && ['math_arithmetic', 'math_modulo', 'logic_compare', 'logic_operation', 'logic_negate', 'text_join'].includes(String(b.type)) ? `(${code})` : code

    const value = (b: BlockJson | undefined, depth: number, owner: BlockJson, slot: string): string => {
      if (!b) return fail(`В блоке «${SPEC.get(String(owner.type))?.label ?? owner.type}» пустое место «${slotName(slot)}». Вставь туда значение.`, idOf(owner))
      if (b.enabled === false) return fail('Отключённый блок нельзя использовать как значение.', idOf(b))
      let spec: BlockSpec
      try { spec = enter(b, depth, 'value') } catch (e) { if (e instanceof Skip) return '…'; throw e }
      void spec
      switch (b.type) {
        case 'kodik_input_int': return 'int(input())'
        case 'kodik_input_text': return 'input()'
        case 'variables_get': {
          const name = varName(b)
          if (!assigned.has(name)) warnings.push({ message: `Переменная «${name}» используется раньше, чем ей присвоено значение.`, blockId: idOf(b) })
          return name
        }
        case 'math_number': {
          const n = Number(field(b, 'NUM'))
          if (!Number.isFinite(n) || Math.abs(n) > LIMITS.number) return fail('Число вне учебного диапазона.', idOf(b))
          const text = String(n)
          return n < 0 ? `(${text})` : text
        }
        case 'text': return pyString(textField(b, 'TEXT'))
        case 'math_arithmetic': {
          const op = ({ ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: '**' } as Record<string, string>)[String(field(b, 'OP'))]
          if (!op) return fail('Неизвестная операция в блоке вычисления.', idOf(b))
          const a = child(b, 'A'), c = child(b, 'B')
          return `${wrap(a, value(a, depth + 1, b, 'A'))} ${op} ${wrap(c, value(c, depth + 1, b, 'B'))}`
        }
        case 'math_modulo': { const a = child(b, 'DIVIDEND'), c = child(b, 'DIVISOR'); return `${wrap(a, value(a, depth + 1, b, 'DIVIDEND'))} % ${wrap(c, value(c, depth + 1, b, 'DIVISOR'))}` }
        case 'logic_compare': {
          const op = ({ EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' } as Record<string, string>)[String(field(b, 'OP'))]
          if (!op) return fail('Неизвестное сравнение.', idOf(b))
          const a = child(b, 'A'), c = child(b, 'B')
          return `${wrap(a, value(a, depth + 1, b, 'A'))} ${op} ${wrap(c, value(c, depth + 1, b, 'B'))}`
        }
        case 'logic_operation': {
          const op = ({ AND: 'and', OR: 'or' } as Record<string, string>)[String(field(b, 'OP'))]
          if (!op) return fail('Неизвестная логическая операция.', idOf(b))
          const a = child(b, 'A'), c = child(b, 'B')
          return `${wrap(a, value(a, depth + 1, b, 'A'))} ${op} ${wrap(c, value(c, depth + 1, b, 'B'))}`
        }
        case 'logic_negate': { const a = child(b, 'BOOL'); return `not ${wrap(a, value(a, depth + 1, b, 'BOOL'))}` }
        case 'logic_boolean': { const v = field(b, 'BOOL'); return v === 'TRUE' ? 'True' : v === 'FALSE' ? 'False' : fail('Неизвестное логическое значение.', idOf(b)) }
        case 'text_join': {
          const count = (b.extraState as { itemCount?: unknown } | undefined)?.itemCount ?? 2
          if (!Number.isInteger(count) || (count as number) < 0 || (count as number) > LIMITS.joinItems) return fail(`В блоке «соединить» допустимо от 0 до ${LIMITS.joinItems} частей.`, idOf(b))
          if (count === 0) return '""'
          const parts = Array.from({ length: count as number }, (_, i) => { const p = child(b, `ADD${i}`); return p?.type === 'text' ? value(p, depth + 1, b, `ADD${i}`) : `str(${value(p, depth + 1, b, `ADD${i}`)})` })
          return parts.join(' + ')
        }
        case 'text_length': { const a = child(b, 'VALUE'); return `len(${value(a, depth + 1, b, 'VALUE')})` }
      }
      return fail('Блок не поддерживается.', idOf(b))
    }

    const body = (first: BlockJson | undefined, depth: number, indent: string): void => {
      const start = out.length
      statements(first, depth, indent)
      if (out.length === start) out.push(`${indent}pass`)
    }
    const statements = (first: BlockJson | undefined, depth: number, indent: string): void => {
      let b = first
      let guard = 0
      while (b) {
        if (++guard > LIMITS.blocks) throw new Fatal('Программа повреждена: цепочка блоков зациклена.')
        const next: BlockJson | undefined = b.next?.block
        if (b.enabled === false) { b = next; continue }
        const startLine = out.length + 1
        try {
          enter(b, depth, 'statement')
          statement(b, depth, indent)
        } catch (e) { if (!(e instanceof Skip)) throw e }
        const id = idOf(b)
        if (id && out.length >= startLine) lines[id] = [startLine, out.length]
        b = next
      }
    }
    const statement = (b: BlockJson, depth: number, indent: string) => {
      const inner = indent + '    '
      switch (b.type) {
        case 'text_print': { const v = child(b, 'TEXT'); out.push(`${indent}print(${value(v, depth + 1, b, 'TEXT')})`); return }
        case 'variables_set': {
          const name = varName(b), v = child(b, 'VALUE')
          const code = value(v, depth + 1, b, 'VALUE')
          assigned.add(name); out.push(`${indent}${name} = ${code}`); return
        }
        case 'math_change': {
          const name = varName(b), v = child(b, 'DELTA')
          if (!assigned.has(name)) warnings.push({ message: `Переменная «${name}» изменяется раньше, чем ей присвоено значение.`, blockId: idOf(b) })
          out.push(`${indent}${name} = ${name} + ${wrap(v, value(v, depth + 1, b, 'DELTA'))}`); return
        }
        case 'controls_if': {
          const state = (b.extraState ?? {}) as { elseIfCount?: unknown; hasElse?: unknown }
          const elseIf = state.elseIfCount ?? 0
          if (!Number.isInteger(elseIf) || (elseIf as number) < 0 || (elseIf as number) > LIMITS.elseIf) { fail('Слишком много веток «иначе если».', idOf(b)); return }
          for (let i = 0; i <= (elseIf as number); i++) {
            const cond = child(b, `IF${i}`)
            out.push(`${indent}${i === 0 ? 'if' : 'elif'} ${value(cond, depth + 1, b, `IF${i}`)}:`)
            const before = out.length; body(child(b, `DO${i}`), depth + 1, inner)
            if (out.length === before + 1 && out[before].trim() === 'pass') warnings.push({ message: 'Внутри «если» нет команд.', blockId: idOf(b) })
          }
          if (state.hasElse === true) { out.push(`${indent}else:`); body(child(b, 'ELSE'), depth + 1, inner) }
          return
        }
        case 'controls_repeat_ext': {
          const counter = `_kodik_i${loopNames.length + 1}`
          out.push(`${indent}for ${counter} in range(${value(child(b, 'TIMES'), depth + 1, b, 'TIMES')}):`)
          loopNames.push(counter)
          try { body(child(b, 'DO'), depth + 1, inner) } finally { loopNames.pop() }
          return
        }
        case 'controls_whileUntil': {
          const mode = field(b, 'MODE'), cond = child(b, 'BOOL')
          if (mode !== 'WHILE' && mode !== 'UNTIL') { fail('Неизвестный режим цикла.', idOf(b)); return }
          const c = value(cond, depth + 1, b, 'BOOL')
          out.push(`${indent}while ${mode === 'WHILE' ? c : `not ${wrap(cond, c)}`}:`)
          body(child(b, 'DO'), depth + 1, inner); return
        }
        case 'kodik_define': {
          if (depth > 0) { fail('Создавай функцию отдельно, вне других блоков.', idOf(b)); return }
          const name = typeof field(b, 'NAME') === 'string' ? String(field(b, 'NAME')).trim() : ''
          const problem = nameProblem(name); if (problem) { fail(problem, idOf(b)); return }
          if (functions.has(name)) { fail(`Функция «${name}» уже создана.`, idOf(b)); return }
          if (assigned.has(name)) { fail(`«${name}» уже имя переменной. Дай функции другое имя.`, idOf(b)); return }
          functions.add(name)
          out.push(`${indent}def ${name}():`); body(child(b, 'BODY'), depth + 1, inner); return
        }
        case 'kodik_call': {
          const name = typeof field(b, 'NAME') === 'string' ? String(field(b, 'NAME')).trim() : ''
          const problem = nameProblem(name); if (problem) { fail(problem, idOf(b)); return }
          if (!functions.has(name)) { fail(`Сначала создай функцию «${name}» выше, затем вызови её.`, idOf(b)); return }
          out.push(`${indent}${name}()`); return
        }
      }
      fail('Блок не поддерживается.', idOf(b))
    }

    const valid = roots.filter((r): r is BlockJson => !!r && typeof r === 'object')
    // Functions are defined before the main program, as in Blockly's own generators.
    const ordered = valid.slice().sort((a, b) => (Number(a.y) || 0) - (Number(b.y) || 0) || (Number(a.x) || 0) - (Number(b.x) || 0))
    const defs = ordered.filter(r => r.type === 'kodik_define'), main = ordered.filter(r => r.type !== 'kodik_define')
    for (const r of defs) statements(r, 0, '')
    for (const r of main) {
      if (SPEC.get(String(r.type))?.shape === 'value') { blockCount++; fail(`Блок «${SPEC.get(String(r.type))!.label}» лежит отдельно. Вставь его в команду.`, idOf(r)); continue }
      statements(r, 0, '')
    }
    if (main.length > 1) warnings.push({ message: 'Есть несколько отдельных групп команд. Они выполнятся сверху вниз.' })
    if (!out.length && !errors.length) fail('Программа пустая. Добавь первый блок.')
    return done(out.join('\n') + '\n')
  } catch (e) {
    if (e instanceof Fatal) { fail(e.message); return done() }
    throw e
  }
}

class Skip extends Error {}
const slotName = (slot: string) => ({ TEXT: 'что вывести', VALUE: 'значение', A: 'слева', B: 'справа', DIVIDEND: 'делимое', DIVISOR: 'делитель', BOOL: 'условие', TIMES: 'сколько раз', DELTA: 'на сколько' } as Record<string, string>)[slot] ?? (/^IF\d+$/.test(slot) ? 'условие' : /^ADD\d+$/.test(slot) ? 'часть' : slot)
