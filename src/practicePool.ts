import type { SkillId, SupportLevel } from './skills'
import { lessons } from './course'
import { materializeSupport } from './supportVariants'

export type PracticeItem = {
  id: string
  kind: 'corrective' | 'review'
  title: string
  prompt: string
  skills: SkillId[]
  requires: SkillId[]
  supportLevel: SupportLevel
  durationSeconds: number
  sourceLessonId: number
}

// Curated, finite tasks. The selector only chooses from this list; it never
// invents exercises or learner-facing copy.
export const practicePool: PracticeItem[] = [
  { id: 'print-review-1', kind: 'review', title: 'Быстро вспомним вывод', prompt: 'Покажи короткое сообщение на экране.', skills: ['print','string'], requires: [], supportLevel: 'guided_code', durationSeconds: 25, sourceLessonId: 14 },
  { id: 'string-corrective-1', kind: 'corrective', title: 'Сообщение и кавычки', prompt: 'Покажи сообщение и проверь, где у текста кавычки.', skills: ['print','string'], requires: ['print'], supportLevel: 'blocks_with_code', durationSeconds: 30, sourceLessonId: 13 },
  { id: 'number-review-1', kind: 'review', title: 'Число без кавычек', prompt: 'Выведи число как число, а не как текст.', skills: ['number','print'], requires: ['print'], supportLevel: 'blocks_with_code', durationSeconds: 25, sourceLessonId: 6 },
  { id: 'sequence-review-1', kind: 'review', title: 'Что выполнится сначала?', prompt: 'Расположи две команды в нужном порядке.', skills: ['sequence','print'], requires: ['print'], supportLevel: 'blocks_with_code', durationSeconds: 35, sourceLessonId: 22 },
  { id: 'variable-review-1', kind: 'review', title: 'Достань значение из коробки', prompt: 'Прочитай сохранённое значение по имени.', skills: ['variable','print'], requires: ['print','string'], supportLevel: 'guided_code', durationSeconds: 30, sourceLessonId: 15 },
  { id: 'assignment-corrective-1', kind: 'corrective', title: 'Сначала сохрани', prompt: 'Сохрани значение, а затем используй его.', skills: ['assignment','variable'], requires: ['variable'], supportLevel: 'blocks_with_code', durationSeconds: 45, sourceLessonId: 2 },
  { id: 'arithmetic-review-1', kind: 'review', title: 'Короткий счёт', prompt: 'Собери одно вычисление и покажи результат.', skills: ['arithmetic','number'], requires: ['number'], supportLevel: 'blocks_with_code', durationSeconds: 35, sourceLessonId: 3 },
  { id: 'comparison-review-1', kind: 'review', title: 'Сравним ещё раз', prompt: 'Выбери проверку «не меньше».', skills: ['comparison'], requires: ['number'], supportLevel: 'guided_code', durationSeconds: 25, sourceLessonId: 16 },
  { id: 'if-corrective-1', kind: 'corrective', title: 'Действие по условию', prompt: 'Помести действие внутрь верной ветки.', skills: ['if','comparison','indentation'], requires: ['comparison','assignment'], supportLevel: 'blocks_with_code', durationSeconds: 50, sourceLessonId: 5 },
  { id: 'loop-review-1', kind: 'review', title: 'Быстро вспомним циклы', prompt: 'Повтори одно действие три раза.', skills: ['loop','indentation','print'], requires: ['print','number'], supportLevel: 'guided_code', durationSeconds: 40, sourceLessonId: 18 },
  { id: 'comparison-if-review', kind: 'review', title: 'Проверка и действие', prompt: 'Вспомни, как проверка управляет действием.', skills: ['comparison','if'], requires: ['assignment','comparison','if'], supportLevel: 'guided_code', durationSeconds: 55, sourceLessonId: 17 },
  { id: 'function-review-1', kind: 'review', title: 'Опиши и вызови', prompt: 'Отличи определение функции от её запуска.', skills: ['function','indentation'], requires: ['sequence'], supportLevel: 'blocks_with_code', durationSeconds: 45, sourceLessonId: 11 },
  { id: 'text-syntax-review-1', kind: 'review', title: 'Одна настоящая строка', prompt: 'Собери корректную строку Python.', skills: ['text_syntax','print'], requires: ['print'], supportLevel: 'code_tokens', durationSeconds: 30, sourceLessonId: 19 }
]

// Negative IDs isolate practice drafts, attempts and sessions from curriculum rewards.
export function practiceLessonId(id: string) { const index = practicePool.findIndex(item => item.id === id); return index < 0 ? undefined : -100 - index }
export function getPracticeLesson(id: string, support?: SupportLevel) {
  const item = practicePool.find(candidate => candidate.id === id)
  const source = lessons.find(lesson => lesson.id === item?.sourceLessonId)
  if (!item || !source) return undefined
  const variant = materializeSupport(source, support || item.supportLevel)
  return { ...variant, id: practiceLessonId(id)!, title: item.title, instruction: `${item.prompt} ${source.instruction}`, tutorial: undefined, review: true,
    skills: { teaches: [], practices: item.skills, requires: item.requires } }
}
export const practiceLessons = practicePool.map(item => getPracticeLesson(item.id)!)
