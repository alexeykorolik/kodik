/**
 * Per-task learning configuration (tasks.learning_config, frozen into task_versions.snapshot).
 * Python is implicit and always supported; block modes need a proven block solution.
 */
import { BLOCKS, LIMITS, validateWorkspaceShape, type SkillId } from './blockProgram'
import { MODES, type Mode } from './modePolicy'

export const SKILLS: { id: SkillId; label: string }[] = [
  { id: 'output', label: 'Вывод' }, { id: 'input', label: 'Ввод' }, { id: 'variables', label: 'Переменные' },
  { id: 'arithmetic', label: 'Арифметика' }, { id: 'strings', label: 'Строки' }, { id: 'comparison', label: 'Сравнения' },
  { id: 'logic', label: 'Логические операции' }, { id: 'conditions', label: 'Условия' }, { id: 'loops', label: 'Циклы' }, { id: 'functions', label: 'Функции' }
]
export type LearningConfig = {
  version: 1
  /** Block modes enabled for this task. Python is always supported and is not listed. */
  modes: Exclude<Mode, 'python'>[]
  palette: string[]
  /** Teacher's starting workspace; may be incomplete. Null = empty workspace. */
  starter_blocks: unknown | null
  /** Target skills confirmed by the teacher (not every detected construct). */
  skills: SkillId[]
}
export const EMPTY_CONFIG: LearningConfig = { version: 1, modes: [], palette: [], starter_blocks: null, skills: [] }

export function parseLearningConfig(raw: unknown): LearningConfig {
  let value = raw
  if (typeof raw === 'string') { try { value = raw ? JSON.parse(raw) : {} } catch { value = {} } }
  const checked = validateLearningConfig(value)
  return checked.config ?? EMPTY_CONFIG
}

/** Draft-level validation (storable). Publication additionally needs the block proof. */
export function validateLearningConfig(input: unknown): { config?: LearningConfig; error?: string } {
  if (input === undefined || input === null) return { config: EMPTY_CONFIG }
  if (typeof input !== 'object' || Array.isArray(input)) return { error: 'Настройки режимов указаны неверно.' }
  const raw = input as Record<string, unknown>
  if (Object.keys(raw).some(k => !['version', 'modes', 'palette', 'starter_blocks', 'skills'].includes(k))) return { error: 'В настройках режимов есть неизвестные поля.' }
  if (raw.version !== undefined && raw.version !== 1) return { error: 'Неизвестная версия настроек режимов.' }
  const modes = raw.modes ?? []
  if (!Array.isArray(modes) || modes.some(m => m !== 'blocks' && m !== 'mixed') || new Set(modes).size !== modes.length) return { error: 'Режимы задания: только «Блоки» и «Блоки + Python» (Python доступен всегда).' }
  const palette = raw.palette ?? []
  const known = new Set(BLOCKS.map(b => b.type))
  if (!Array.isArray(palette) || palette.length > BLOCKS.length || palette.some(t => typeof t !== 'string' || !known.has(t)) || new Set(palette).size !== palette.length) return { error: 'В наборе блоков есть неизвестный блок.' }
  if (modes.length && !palette.length) return { error: 'Для режима блоков выберите хотя бы один блок.' }
  const skills = raw.skills ?? []
  const skillIds = new Set(SKILLS.map(s => s.id))
  if (!Array.isArray(skills) || skills.length > SKILLS.length || skills.some(s => !skillIds.has(s as SkillId)) || new Set(skills).size !== skills.length) return { error: 'Выберите навыки из списка.' }
  const starter = raw.starter_blocks ?? null
  if (starter !== null) {
    const shape = validateWorkspaceShape(starter)
    if (!shape.ok) return { error: `Стартовые блоки: ${shape.errors[0].message}` }
  }
  return { config: { version: 1, modes: MODES.filter(m => (modes as string[]).includes(m)) as LearningConfig['modes'], palette: BLOCKS.map(b => b.type).filter(t => (palette as string[]).includes(t)), starter_blocks: starter, skills: SKILLS.map(s => s.id).filter(s => (skills as string[]).includes(s)) } }
}

/** What a learner may see of the config: no target skills, nothing private. */
export const publicLearningConfig = (c: LearningConfig) => ({ modes: c.modes, palette: c.palette, starter_blocks: c.starter_blocks })

export const BLOCK_SOLUTION_LIMIT = LIMITS.bytes
