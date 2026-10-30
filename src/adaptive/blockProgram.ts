/**
 * Kodik B2B: Blockly workspace (JSON serialization of Blockly 12) → learning Python.
 *
 * Two separate checks, deliberately:
 *  - validateWorkspaceShape(): may this be STORED as a draft? Safe structure, sizes, known
 *    block types and fields. Empty sockets, unnamed variables and other normal
 *    in-progress states are allowed.
 *  - translateWorkspace(): may this be RUN or SUBMITTED? Complete program, palette of the
 *    exact task version, no disabled blocks, valid names; produces Python for the
 *    existing interpreter.
 *
 * Pure TypeScript without Blockly, shared by the browser mirror and the trusted runner.
 */
import { variableName } from '../pythonRuntime'

export const TRANSLATOR_VERSION = 'blocks-py/1'
/** Serialization format of stored workspaces (Blockly 12 JSON). */
export const WORKSPACE_FORMAT = 1

export type BlockJson = {
  type?: unknown; id?: unknown; x?: unknown; y?: unknown
  enabled?: unknown; disabledReasons?: unknown
  fields?: Record<string, unknown>
  inputs?: Record<string, { block?: BlockJson; shadow?: BlockJson }>
  next?: { block?: BlockJson; shadow?: BlockJson }
  extraState?: unknown
}
export type WorkspaceJson = {
  blocks?: { languageVersion?: number; blocks?: BlockJson[] }
  variables?: { name?: unknown; id?: unknown; type?: unknown }[]
}

export type SkillId = 'output' | 'input' | 'variables' | 'arithmetic' | 'strings' | 'comparison' | 'logic' | 'conditions' | 'loops' | 'functions'
type FieldSpec = Record<string, 'text' | 'number' | 'variable' | 'name' | readonly string[]>
export type BlockSpec = { type: string; label: string; category: string; skill: SkillId; shape: 'statement' | 'value'; python: string; fields: FieldSpec; inputs: readonly string[] }

const OPS = { arith: ['ADD', 'MINUS', 'MULTIPLY', 'DIVIDE', 'POWER'], cmp: ['EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE'], logic: ['AND', 'OR'], bool: ['TRUE', 'FALSE'], loop: ['WHILE', 'UNTIL'] } as const

/** Every block the translator accepts. Anything else is rejected with an explanation. */
export const BLOCKS: BlockSpec[] = [
  { type: 'text_print', label: 'напечатать', category: 'Ввод и вывод', skill: 'output', shape: 'statement', python: 'print(…)', fields: {}, inputs: ['TEXT'] },
  { type: 'kodik_input_int', label: 'ввести целое число', category: 'Ввод и вывод', skill: 'input', shape: 'value', python: 'int(input())', fields: {}, inputs: [] },
  { type: 'kodik_input_text', label: 'ввести текст', category: 'Ввод и вывод', skill: 'input', shape: 'value', python: 'input()', fields: {}, inputs: [] },
  { type: 'variables_set', label: 'присвоить', category: 'Переменные', skill: 'variables', shape: 'statement', python: 'x = …', fields: { VAR: 'variable' }, inputs: ['VALUE'] },
  { type: 'variables_get', label: 'значение переменной', category: 'Переменные', skill: 'variables', shape: 'value', python: 'x', fields: { VAR: 'variable' }, inputs: [] },
  { type: 'math_change', label: 'увеличить на', category: 'Переменные', skill: 'variables', shape: 'statement', python: 'x = x + …', fields: { VAR: 'variable' }, inputs: ['DELTA'] },
  { type: 'math_number', label: 'число', category: 'Числа и вычисления', skill: 'arithmetic', shape: 'value', python: '5', fields: { NUM: 'number' }, inputs: [] },
  { type: 'math_arithmetic', label: '+ − × ÷ степень', category: 'Числа и вычисления', skill: 'arithmetic', shape: 'value', python: 'a + b, a - b, a * b, a / b, a ** b', fields: { OP: OPS.arith }, inputs: ['A', 'B'] },
  { type: 'math_modulo', label: 'остаток от деления', category: 'Числа и вычисления', skill: 'arithmetic', shape: 'value', python: 'a % b', fields: {}, inputs: ['DIVIDEND', 'DIVISOR'] },
  { type: 'text', label: 'текст', category: 'Текст', skill: 'strings', shape: 'value', python: '"…"', fields: { TEXT: 'text' }, inputs: [] },
  { type: 'text_join', label: 'соединить', category: 'Текст', skill: 'strings', shape: 'value', python: 'str(a) + str(b)', fields: {}, inputs: [] },
  { type: 'text_length', label: 'длина', category: 'Текст', skill: 'strings', shape: 'value', python: 'len(…)', fields: {}, inputs: ['VALUE'] },
  { type: 'logic_compare', label: 'сравнить', category: 'Условия', skill: 'comparison', shape: 'value', python: '== != < <= > >=', fields: { OP: OPS.cmp }, inputs: ['A', 'B'] },
  { type: 'logic_operation', label: 'и / или', category: 'Условия', skill: 'logic', shape: 'value', python: 'and, or', fields: { OP: OPS.logic }, inputs: ['A', 'B'] },
  { type: 'logic_negate', label: 'не', category: 'Условия', skill: 'logic', shape: 'value', python: 'not …', fields: {}, inputs: ['BOOL'] },
  { type: 'logic_boolean', label: 'истина / ложь', category: 'Условия', skill: 'logic', shape: 'value', python: 'True, False', fields: { BOOL: OPS.bool }, inputs: [] },
  { type: 'controls_if', label: 'если / иначе если / иначе', category: 'Условия', skill: 'conditions', shape: 'statement', python: 'if / elif / else', fields: {}, inputs: [] },
  { type: 'controls_repeat_ext', label: 'повторить N раз', category: 'Циклы', skill: 'loops', shape: 'statement', python: 'for _kodik_i1 in range(N):', fields: {}, inputs: ['TIMES', 'DO'] },
  { type: 'controls_whileUntil', label: 'повторять пока / до', category: 'Циклы', skill: 'loops', shape: 'statement', python: 'while …:', fields: { MODE: OPS.loop }, inputs: ['BOOL', 'DO'] },
  { type: 'kodik_define', label: 'создать функцию', category: 'Функции', skill: 'functions', shape: 'statement', python: 'def name():', fields: { NAME: 'name' }, inputs: ['BODY'] },
  { type: 'kodik_call', label: 'вызвать функцию', category: 'Функции', skill: 'functions', shape: 'statement', python: 'name()', fields: { NAME: 'name' }, inputs: [] }
]
const SPEC = new Map(BLOCKS.map(b => [b.type, b]))
/** Shadows are editable literals that belong to their parent block; only these types may be shadows. */
export const SHADOW_TYPES = new Set(['math_number', 'text'])

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

/** Linked limits (docs/adaptive/LIMITS.md). Bytes are UTF-8 bytes of the serialized workspace. */
export const LIMITS = { bytes: 64_000, jsonDepth: 450, blocks: 200, variables: 50, nesting: 12, text: 500, name: 40, id: 64, number: 1e12, elseIf: 20, joinItems: 10, pythonChars: 12_000, pythonLines: 250 }
/** Prefix the translator reserves for its own loop counters. Any other interpreter-valid name is allowed. */
export const RESERVED_PREFIX = '_kodik'

export type Issue = { message: string; blockId?: string; code?: string }
export type Translation = {
  ok: boolean
  python: string
  errors: Issue[]
  warnings: Issue[]
  /** 1-based generated line range for each statement block id; values map to their statement. */
  lines: Record<string, [number, number]>
  skills: SkillId[]
  blockTypes: string[]
  blockCount: number
  version: string
}

/** Name problems shared by the editor, the translator and the reference analysis. */
export function nameProblem(name: string): string | null {
  if (!name) return 'У переменной нет имени.'
  if (name.length > LIMITS.name) return `Имя «${name.slice(0, 20)}…» длиннее ${LIMITS.name} символов.`
  if (name.startsWith(RESERVED_PREFIX)) return `Имена, начинающиеся с «${RESERVED_PREFIX}», заняты Kodik. Выбери другое имя.`
  if (!variableName(name)) return `Имя «${name}» не подходит: нужны буквы, цифры и _, начиная с буквы; служебные слова Python и команды print, input, int, str, len, range заняты.`
  return null
}

const utf8Bytes = (s: string) => { let n = 0; for (const ch of s) { const c = ch.codePointAt(0)!; n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4 } return n }
export const isDisabled = (b: BlockJson) => b.enabled === false || (Array.isArray(b.disabledReasons) && b.disabledReasons.length > 0)

const BLOCK_KEYS = new Set(['type', 'id', 'x', 'y', 'collapsed', 'deletable', 'movable', 'editable', 'enabled', 'disabledReasons', 'inline', 'extraState', 'fields', 'inputs', 'next', 'icons', 'data'])

export type ShapeCheck = { ok: boolean; errors: Issue[]; bytes: number; blockCount: number }
/**
 * Draft-level validation: safe to store and to load into Blockly later. Does NOT require a
 * complete or correct program.
 */
export function validateWorkspaceShape(input: unknown): ShapeCheck {
  const errors: Issue[] = []
  let blockCount = 0, bytes = 0
  const bad = (message: string, blockId?: string) => { if (errors.length < 20) errors.push({ message, blockId, code: 'invalid_workspace' }); return false }
  try { bytes = utf8Bytes(JSON.stringify(input) ?? '') } catch { bad('Блоки повреждены: найдена ссылка блока на самого себя.'); return { ok: false, errors, bytes, blockCount } }
  if (!input || typeof input !== 'object' || Array.isArray(input)) { bad('Ожидается рабочее поле блоков.'); return { ok: false, errors, bytes, blockCount } }
  if (bytes > LIMITS.bytes) { bad(`Блоков слишком много: сохранение больше ${Math.round(LIMITS.bytes / 1000)} КБ.`); return { ok: false, errors, bytes, blockCount } }
  const depthOf = (v: unknown, d: number): number => { if (d > LIMITS.jsonDepth) return d; if (!v || typeof v !== 'object') return d; let m = d; for (const x of Object.values(v as object)) { m = Math.max(m, depthOf(x, d + 1)); if (m > LIMITS.jsonDepth) break } return m }
  if (depthOf(input, 0) > LIMITS.jsonDepth) { bad('Блоки вложены слишком глубоко.'); return { ok: false, errors, bytes, blockCount } }
  const ws = input as Record<string, unknown>
  if (Object.keys(ws).some(k => !['blocks', 'variables'].includes(k))) bad('В сохранении блоков есть неизвестные данные.')
  const vars = ws.variables
  if (vars !== undefined) {
    if (!Array.isArray(vars) || vars.length > LIMITS.variables) bad(`Допустимо не больше ${LIMITS.variables} переменных.`)
    else {
      const ids = new Set<string>()
      for (const v of vars) {
        if (!v || typeof v !== 'object' || typeof (v as { id?: unknown }).id !== 'string' || typeof (v as { name?: unknown }).name !== 'string') { bad('Переменная сохранена неверно.'); continue }
        const { id, name, type } = v as { id: string; name: string; type?: unknown }
        if (id.length > LIMITS.id || name.length > LIMITS.name * 2 || (type !== undefined && type !== '' && type !== null)) bad('Переменная сохранена неверно.')
        if (ids.has(id)) bad('Две переменные с одним идентификатором.')
        ids.add(id)
      }
    }
  }
  const blocksSection = ws.blocks
  if (blocksSection === undefined) return { ok: errors.length === 0, errors, bytes, blockCount }
  if (!blocksSection || typeof blocksSection !== 'object' || !Array.isArray((blocksSection as { blocks?: unknown }).blocks) && (blocksSection as { blocks?: unknown }).blocks !== undefined) { bad('Список блоков сохранён неверно.'); return { ok: false, errors, bytes, blockCount } }
  const ids = new Set<string>()
  const visit = (b: unknown, asShadow: boolean): void => {
    if (!b || typeof b !== 'object' || Array.isArray(b)) { bad('Блок сохранён неверно.'); return }
    const block = b as BlockJson & Record<string, unknown>
    if (++blockCount > LIMITS.blocks) { bad(`Не больше ${LIMITS.blocks} блоков.`); return }
    const type = block.type
    if (typeof type !== 'string') { bad('Блок без типа.'); return }
    const id = typeof block.id === 'string' ? block.id : undefined
    if (block.id !== undefined && (typeof block.id !== 'string' || block.id.length > LIMITS.id)) bad('Неверный идентификатор блока.')
    if (id) { if (ids.has(id)) bad('Два блока с одним идентификатором.', id); ids.add(id) }
    if (Object.keys(block).some(k => !BLOCK_KEYS.has(k))) bad('В блоке есть неизвестные данные.', id)
    const spec = SPEC.get(type)
    if (asShadow && !SHADOW_TYPES.has(type)) bad('Подставленное значение может быть только числом или текстом.', id)
    if (!spec && !UNSUPPORTED_REASONS[type]) bad(`Неизвестный блок «${type.slice(0, 40)}».`, id)
    if (block.disabledReasons !== undefined && (!Array.isArray(block.disabledReasons) || block.disabledReasons.length > 5 || block.disabledReasons.some(r => typeof r !== 'string' || r.length > 40))) bad('Неверное состояние отключения блока.', id)
    for (const k of ['x', 'y']) if (block[k] !== undefined && (typeof block[k] !== 'number' || !Number.isFinite(block[k] as number) || Math.abs(block[k] as number) > 1e6)) bad('Неверные координаты блока.', id)
    if (block.fields !== undefined) {
      if (!block.fields || typeof block.fields !== 'object' || Array.isArray(block.fields)) bad('Поля блока сохранены неверно.', id)
      else for (const [name, value] of Object.entries(block.fields)) {
        const kind = spec?.fields[name]
        if (spec && !kind) { bad('У блока неизвестное поле.', id); continue }
        if (kind === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) bad('В числовом поле не число.', id)
        if ((kind === 'text' || kind === 'name') && (typeof value !== 'string' || value.length > LIMITS.text)) bad(`Текст длиннее ${LIMITS.text} символов.`, id)
        if (kind === 'variable' && !(value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string')) bad('Переменная в блоке сохранена неверно.', id)
        if (Array.isArray(kind) && !kind.includes(value as string)) bad('Неизвестное значение в списке блока.', id)
      }
    }
    if (block.data !== undefined && (typeof block.data !== 'string' || block.data.length > 1000)) bad('Неверные данные блока.', id)
    if (block.extraState !== undefined) {
      const s = block.extraState as Record<string, unknown>
      const okState = type === 'controls_if' ? s && typeof s === 'object' && Object.keys(s).every(k => k === 'elseIfCount' || k === 'hasElse') && (s.elseIfCount === undefined || (Number.isInteger(s.elseIfCount) && (s.elseIfCount as number) >= 0 && (s.elseIfCount as number) <= LIMITS.elseIf)) && (s.hasElse === undefined || typeof s.hasElse === 'boolean')
        : type === 'text_join' ? s && typeof s === 'object' && Object.keys(s).every(k => k === 'itemCount') && Number.isInteger(s.itemCount) && (s.itemCount as number) >= 0 && (s.itemCount as number) <= LIMITS.joinItems
        : false
      if (!okState) bad('Неверная настройка блока.', id)
    }
    if (block.inputs !== undefined) {
      if (!block.inputs || typeof block.inputs !== 'object' || Array.isArray(block.inputs)) { bad('Входы блока сохранены неверно.', id); return }
      for (const [name, slot] of Object.entries(block.inputs)) {
        if (!slot || typeof slot !== 'object' || Object.keys(slot).some(k => k !== 'block' && k !== 'shadow')) { bad('Вход блока сохранён неверно.', id); continue }
        const dynamic = (type === 'controls_if' && /^(IF|DO)\d{1,2}$|^ELSE$/.test(name)) || (type === 'text_join' && /^ADD\d{1,2}$/.test(name))
        if (spec && !spec.inputs.includes(name) && !dynamic) bad('У блока неизвестный вход.', id)
        if (slot.shadow !== undefined) visit(slot.shadow, true)
        if (slot.block !== undefined) visit(slot.block, false)
      }
    }
    if (block.next !== undefined) {
      if (!block.next || typeof block.next !== 'object' || Object.keys(block.next).some(k => k !== 'block')) bad('Связь блоков сохранена неверно.', id)
      else if (block.next.block !== undefined) visit(block.next.block, false)
    }
  }
  for (const root of ((blocksSection as { blocks?: unknown[] }).blocks ?? [])) visit(root, false)
  return { ok: errors.length === 0, errors, bytes, blockCount }
}

export type TranslateOptions = { allowed?: Iterable<string> }

class Fatal extends Error {}
class Skip extends Error {}

/** Run/submit-level translation. Requires a structurally valid workspace and a complete program. */
export function translateWorkspace(input: unknown, options: TranslateOptions = {}): Translation {
  const errors: Issue[] = [], warnings: Issue[] = [], lines: Record<string, [number, number]> = {}, skills = new Set<SkillId>(), used = new Set<string>()
  const allowed = options.allowed ? new Set(options.allowed) : null
  const out: string[] = []
  const shape = validateWorkspaceShape(input)
  const done = (): Translation => {
    let python = errors.length ? '' : out.join('\n') + '\n'
    if (python && (python.length > LIMITS.pythonChars || out.length > LIMITS.pythonLines)) { errors.push({ message: `Программа из блоков получилась больше учебного предела (${LIMITS.pythonLines} строк). Упрости её.`, code: 'too_large' }); python = '' }
    return { ok: errors.length === 0, python, errors, warnings, lines, skills: [...skills], blockTypes: [...used], blockCount: shape.blockCount, version: TRANSLATOR_VERSION }
  }
  if (!shape.ok) { errors.push(...shape.errors); return done() }
  const fail = (message: string, blockId?: string, code = 'incomplete') => { errors.push({ message, blockId, code }); return '…' }
  try {
    const ws = input as WorkspaceJson
    const variableNames = new Map<string, string>()
    for (const v of ws.variables ?? []) variableNames.set(v.id as string, v.name as string)
    const roots = ws.blocks?.blocks ?? []
    const functions = new Set<string>(), assigned = new Set<string>()
    let loopDepth = 0
    const idOf = (b: BlockJson) => typeof b.id === 'string' ? b.id : undefined
    const field = (b: BlockJson, name: string) => b.fields ? b.fields[name] : undefined
    const label = (type: unknown) => SPEC.get(String(type))?.label ?? String(type)
    const child = (b: BlockJson, name: string): BlockJson | undefined => {
      const slot = b.inputs?.[name]
      if (slot?.block) return slot.block
      // A shadow is the editable literal the toolbox put into the parent; it is part of the parent block.
      return slot?.shadow
    }
    const enter = (b: BlockJson, depth: number, shape: 'statement' | 'value', shadow = false): BlockSpec => {
      if (depth > LIMITS.nesting) throw new Fatal('Блоки вложены слишком глубоко. Упрости программу.')
      const spec = SPEC.get(String(b.type))
      if (!spec) { fail(UNSUPPORTED_REASONS[String(b.type)] ?? `Блок «${b.type}» не поддерживается.`, idOf(b), 'unsupported'); throw new Skip() }
      if (isDisabled(b)) { fail(`Блок «${spec.label}» выключен. Включи его или удали — иначе программа будет не такой, как на поле.`, idOf(b), 'disabled'); throw new Skip() }
      if (!shadow && allowed && !allowed.has(spec.type)) { fail(`Блок «${spec.label}» не входит в набор этого задания.`, idOf(b), 'palette'); throw new Skip() }
      if (spec.shape !== shape) { fail(shape === 'statement' ? `Блок «${spec.label}» — это значение. Вставь его в пустое место другого блока.` : `Блок «${spec.label}» — это команда, его нельзя вставить как значение.`, idOf(b), 'shape'); throw new Skip() }
      skills.add(spec.skill); if (!shadow) used.add(spec.type)
      return spec
    }
    const varName = (b: BlockJson): string => {
      const raw = field(b, 'VAR') as { id?: string } | undefined
      const name = raw?.id ? variableNames.get(raw.id) ?? '' : ''
      if (!name) { fail('В блоке не выбрана переменная.', idOf(b)); return 'x' }
      const problem = nameProblem(name)
      if (problem) { fail(problem, idOf(b), 'name'); return 'x' }
      if (functions.has(name)) fail(`«${name}» уже имя функции. Дай переменной другое имя.`, idOf(b), 'name')
      return name
    }
    const pyString = (s: string) => '"' + Array.from(s).map(ch => ch === '\\' ? '\\\\' : ch === '"' ? '\\"' : ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t' : ch.charCodeAt(0) < 32 ? '\\x' + ch.charCodeAt(0).toString(16).padStart(2, '0') : ch).join('') + '"'
    const COMPOUND = new Set(['math_arithmetic', 'math_modulo', 'logic_compare', 'logic_operation', 'logic_negate', 'text_join'])
    const wrap = (b: BlockJson | undefined, code: string) => b && COMPOUND.has(String(b.type)) ? `(${code})` : code

    const value = (b: BlockJson | undefined, depth: number, owner: BlockJson, slot: string): string => {
      if (!b) return fail(`В блоке «${label(owner.type)}» пустое место «${slotName(slot)}». Вставь туда значение.`, idOf(owner))
      const isShadow = owner.inputs?.[slot]?.block === undefined && owner.inputs?.[slot]?.shadow === b
      try { enter(b, depth, 'value', isShadow) } catch (e) { if (e instanceof Skip) return '…'; throw e }
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
          if (!Number.isFinite(n) || Math.abs(n) > LIMITS.number) return fail('Число вне учебного диапазона (до 10¹²).', idOf(b))
          const text = String(n)
          if (/e/i.test(text)) return fail('Число слишком мало или велико для записи. Используй до 15 знаков.', idOf(b))
          return n < 0 || Object.is(n, -0) ? `(${text === '0' ? '-0' : text})` : text
        }
        case 'text': {
          const t = field(b, 'TEXT')
          return pyString(typeof t === 'string' ? t : '')
        }
        case 'math_arithmetic': {
          const op = ({ ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: '**' } as Record<string, string>)[String(field(b, 'OP') ?? 'ADD')]
          const a = child(b, 'A'), c = child(b, 'B')
          return `${wrap(a, value(a, depth + 1, b, 'A'))} ${op} ${wrap(c, value(c, depth + 1, b, 'B'))}`
        }
        case 'math_modulo': { const a = child(b, 'DIVIDEND'), c = child(b, 'DIVISOR'); return `${wrap(a, value(a, depth + 1, b, 'DIVIDEND'))} % ${wrap(c, value(c, depth + 1, b, 'DIVISOR'))}` }
        case 'logic_compare': {
          const op = ({ EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' } as Record<string, string>)[String(field(b, 'OP') ?? 'EQ')]
          const a = child(b, 'A'), c = child(b, 'B')
          return `${wrap(a, value(a, depth + 1, b, 'A'))} ${op} ${wrap(c, value(c, depth + 1, b, 'B'))}`
        }
        case 'logic_operation': {
          const op = field(b, 'OP') === 'OR' ? 'or' : 'and'
          const a = child(b, 'A'), c = child(b, 'B')
          return `${wrap(a, value(a, depth + 1, b, 'A'))} ${op} ${wrap(c, value(c, depth + 1, b, 'B'))}`
        }
        case 'logic_negate': { const a = child(b, 'BOOL'); return `not ${wrap(a, value(a, depth + 1, b, 'BOOL'))}` }
        case 'logic_boolean': return field(b, 'BOOL') === 'FALSE' ? 'False' : 'True'
        case 'text_join': {
          const count = (b.extraState as { itemCount?: number } | undefined)?.itemCount ?? 2
          if (count === 0) return '""'
          return Array.from({ length: count }, (_, i) => { const p = child(b, `ADD${i}`); const v = value(p, depth + 1, b, `ADD${i}`); return p?.type === 'text' ? v : `str(${v})` }).join(' + ')
        }
        case 'text_length': { const a = child(b, 'VALUE'); return `len(${value(a, depth + 1, b, 'VALUE')})` }
      }
      return fail('Блок не поддерживается.', idOf(b), 'unsupported')
    }

    const body = (first: BlockJson | undefined, depth: number, indent: string, owner: BlockJson, what: string): void => {
      const start = out.length
      statements(first, depth, indent)
      if (out.length === start) { out.push(`${indent}pass`); warnings.push({ message: `Внутри «${label(owner.type)}» нет команд${what ? ` (${what})` : ''}.`, blockId: idOf(owner) }) }
    }
    const statements = (first: BlockJson | undefined, depth: number, indent: string): void => {
      for (let b = first; b; b = b.next?.block) {
        const startLine = out.length + 1
        try { enter(b, depth, 'statement'); statement(b, depth, indent) } catch (e) { if (!(e instanceof Skip)) throw e }
        const id = idOf(b)
        if (id && out.length >= startLine) lines[id] = [startLine, out.length]
      }
    }
    const statement = (b: BlockJson, depth: number, indent: string) => {
      const inner = indent + '    '
      switch (b.type) {
        case 'text_print': out.push(`${indent}print(${value(child(b, 'TEXT'), depth + 1, b, 'TEXT')})`); return
        case 'variables_set': {
          const name = varName(b), code = value(child(b, 'VALUE'), depth + 1, b, 'VALUE')
          assigned.add(name); out.push(`${indent}${name} = ${code}`); return
        }
        case 'math_change': {
          const name = varName(b), v = child(b, 'DELTA')
          if (!assigned.has(name)) warnings.push({ message: `Переменная «${name}» изменяется раньше, чем ей присвоено значение.`, blockId: idOf(b) })
          out.push(`${indent}${name} = ${name} + ${wrap(v, value(v, depth + 1, b, 'DELTA'))}`); return
        }
        case 'controls_if': {
          const state = (b.extraState ?? {}) as { elseIfCount?: number; hasElse?: boolean }
          for (let i = 0; i <= (state.elseIfCount ?? 0); i++) {
            out.push(`${indent}${i === 0 ? 'if' : 'elif'} ${value(child(b, `IF${i}`), depth + 1, b, `IF${i}`)}:`)
            body(child(b, `DO${i}`), depth + 1, inner, b, i === 0 ? '' : `ветка ${i + 1}`)
          }
          if (state.hasElse === true) { out.push(`${indent}else:`); body(child(b, 'ELSE'), depth + 1, inner, b, 'иначе') }
          return
        }
        case 'controls_repeat_ext': {
          loopDepth++
          try {
            out.push(`${indent}for ${RESERVED_PREFIX}_i${loopDepth} in range(${value(child(b, 'TIMES'), depth + 1, b, 'TIMES')}):`)
            body(child(b, 'DO'), depth + 1, inner, b, '')
          } finally { loopDepth-- }
          return
        }
        case 'controls_whileUntil': {
          const cond = child(b, 'BOOL'), c = value(cond, depth + 1, b, 'BOOL')
          out.push(`${indent}while ${field(b, 'MODE') === 'UNTIL' ? `not ${wrap(cond, c)}` : c}:`)
          body(child(b, 'DO'), depth + 1, inner, b, ''); return
        }
        case 'kodik_define': {
          if (depth > 0) { fail('Создавай функцию отдельно, вне других блоков.', idOf(b), 'shape'); return }
          const name = String(field(b, 'NAME') ?? '').trim()
          const problem = nameProblem(name); if (problem) { fail(problem.replace('У переменной', 'У функции'), idOf(b), 'name'); return }
          if (functions.has(name)) { fail(`Функция «${name}» уже создана.`, idOf(b), 'name'); return }
          functions.add(name)
          out.push(`${indent}def ${name}():`); body(child(b, 'BODY'), depth + 1, inner, b, ''); return
        }
        case 'kodik_call': {
          const name = String(field(b, 'NAME') ?? '').trim()
          if (!functions.has(name)) { fail(`Сначала создай функцию «${name}», затем вызови её.`, idOf(b)); return }
          out.push(`${indent}${name}()`); return
        }
      }
      fail('Блок не поддерживается.', idOf(b), 'unsupported')
    }

    // Blockly's own ordering: top blocks by position. Functions are defined before the main program.
    const ordered = roots.slice().sort((a, b) => (Number(a.y) || 0) - (Number(b.y) || 0) || (Number(a.x) || 0) - (Number(b.x) || 0))
    const defs = ordered.filter(r => r.type === 'kodik_define'), main = ordered.filter(r => r.type !== 'kodik_define')
    for (const r of defs) {
      const name = String(r.fields?.NAME ?? '').trim()
      if (name && !isDisabled(r)) { if (assigned.has(name)) fail(`«${name}» уже имя переменной.`, idOf(r), 'name') }
      statements(r, 0, '')
    }
    for (const r of main) {
      if (SPEC.get(String(r.type))?.shape === 'value') { fail(`Блок «${label(r.type)}» лежит отдельно. Вставь его в команду.`, idOf(r), 'shape'); continue }
      statements(r, 0, '')
    }
    if (main.length > 1) warnings.push({ message: 'Есть несколько отдельных групп команд. Они выполнятся сверху вниз.' })
    if (!out.length && !errors.length) fail('Программа пустая. Добавь первый блок.')
    return done()
  } catch (e) {
    if (e instanceof Fatal) { errors.push({ message: e.message, code: 'too_large' }); return done() }
    throw e
  }
}

const slotName = (slot: string) => ({ TEXT: 'что напечатать', VALUE: 'значение', A: 'слева', B: 'справа', DIVIDEND: 'делимое', DIVISOR: 'делитель', BOOL: 'условие', TIMES: 'сколько раз', DELTA: 'на сколько' } as Record<string, string>)[slot] ?? (/^IF\d+$/.test(slot) ? 'условие' : /^ADD\d+$/.test(slot) ? 'часть' : slot)
