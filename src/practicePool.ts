import type { SkillId, SupportLevel } from './skills'
import { lessons } from './course'
import { materializeSupport } from './supportVariants'
import { runCourseProgram } from './pythonRuntime'

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
  code?: string
  rules?: string[]
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
  { id: 'text-syntax-review-1', kind: 'review', title: 'Одна настоящая строка', prompt: 'Собери корректную строку Python.', skills: ['text_syntax','print'], requires: ['print'], supportLevel: 'code_tokens', durationSeconds: 30, sourceLessonId: 19 },
  { id: 'code-string-fix', kind: 'corrective', title: 'Соедини две части', prompt: 'Выведи «Привет, мир» из двух строк.', skills: ['string'], requires: ['print'], supportLevel: 'guided_code', durationSeconds: 30, sourceLessonId: 23, code: 'print("Привет, " + "мир")' },
  { id: 'code-arithmetic-fix', kind: 'corrective', title: 'Цена двух вещей', prompt: 'Цена вещи — 4. Вычисли цену двух вещей.', skills: ['arithmetic','variable'], requires: ['number'], supportLevel: 'guided_code', durationSeconds: 35, sourceLessonId: 24, code: 'price = 4\nprint(price * 2)' },
  { id: 'code-variable-fix', kind: 'corrective', title: 'Используй сохранённое имя', prompt: 'Сохрани имя Мира, затем выведи «Привет, Мира».', skills: ['variable','string'], requires: ['print','string'], supportLevel: 'guided_code', durationSeconds: 35, sourceLessonId: 26, code: 'name = "Мира"\nprint("Привет, " + name)' },
  { id: 'code-assignment-fix', kind: 'corrective', title: 'Обнови счёт', prompt: 'Было 2 очка. Добавь 3 в ту же переменную и выведи счёт.', skills: ['assignment','arithmetic'], requires: ['variable'], supportLevel: 'guided_code', durationSeconds: 40, sourceLessonId: 31, code: 'score = 2\nscore = score + 3\nprint(score)' },
  { id: 'code-if-fix', kind: 'corrective', title: 'Две температуры', prompt: 'При температуре −1 выведи «Холодно», иначе «Тепло».', skills: ['if','comparison'], requires: ['comparison'], supportLevel: 'guided_code', durationSeconds: 40, sourceLessonId: 34, code: 'temp = -1\nif temp < 0:\n    print("Холодно")\nelse:\n    print("Тепло")' },
  { id: 'code-comparison-fix', kind: 'corrective', title: 'Хватит ли очков?', prompt: 'Проверь, не меньше ли 8 очков порога 6.', skills: ['comparison'], requires: ['number'], supportLevel: 'guided_code', durationSeconds: 25, sourceLessonId: 32, code: 'score = 8\nprint(score >= 6)' },
  { id: 'code-loop-fix', kind: 'corrective', title: 'Сигнал три раза', prompt: 'Выведи «Сигнал» три раза циклом.', skills: ['loop'], requires: ['print'], supportLevel: 'guided_code', durationSeconds: 30, sourceLessonId: 45, code: 'for i in range(3):\n    print("Сигнал")' },
  { id: 'code-function-fix', kind: 'corrective', title: 'Верни утроенное число', prompt: 'Функция принимает число и возвращает его, умноженное на 3. Покажи результат для 2.', skills: ['function'], requires: ['arithmetic'], supportLevel: 'guided_code', durationSeconds: 40, sourceLessonId: 58, code: 'def triple(n):\n    return n * 3\nprint(triple(2))' },
  { id: 'list-index-fix', kind: 'corrective', title: 'Первый элемент', prompt: 'Выведи первый элемент списка [4, 7].', skills: ['list'], requires: ['variable'], supportLevel: 'guided_code', durationSeconds: 30, sourceLessonId: 67, code: 'values = [4, 7]\nprint(values[0])' },
  { id: 'list-loop-fix', kind: 'corrective', title: 'Каждый элемент', prompt: 'Выведи числа 2 и 5 из списка циклом.', skills: ['list','loop'], requires: ['loop'], supportLevel: 'code_tokens', durationSeconds: 40, sourceLessonId: 71, code: 'values = [2, 5]\nfor value in values:\n    print(value)' },
  { id: 'list-review', kind: 'review', title: 'Размер списка', prompt: 'Покажи количество элементов в списке [1, 3, 5].', skills: ['list'], requires: ['variable'], supportLevel: 'guided_code', durationSeconds: 25, sourceLessonId: 69, code: 'values = [1, 3, 5]\nprint(len(values))' },
  { id: 'input-fix', kind: 'corrective', title: 'Прочитай и ответь', prompt: 'Получи имя через input и поздоровайся с ним.', skills: ['input','string'], requires: ['variable'], supportLevel: 'guided_code', durationSeconds: 30, sourceLessonId: 79 },
  { id: 'input-number-fix', kind: 'corrective', title: 'Ввод становится числом', prompt: 'Прочитай возраст и покажи, сколько будет через год.', skills: ['input','arithmetic'], requires: ['arithmetic'], supportLevel: 'guided_code', durationSeconds: 35, sourceLessonId: 80 },
  { id: 'input-review', kind: 'review', title: 'Два числа с клавиатуры', prompt: 'Получи два числа, сложи и покажи сумму.', skills: ['input','arithmetic'], requires: ['arithmetic'], supportLevel: 'code_tokens', durationSeconds: 40, sourceLessonId: 81 },
  { id: 'drawing-fix', kind: 'corrective', title: 'Одна линия', prompt: 'Нарисуй линию длиной 25.', skills: ['drawing'], requires: ['number'], supportLevel: 'guided_code', durationSeconds: 20, sourceLessonId: 90, code: 'forward(25)' },
  { id: 'drawing-loop-fix', kind: 'corrective', title: 'Стороны квадрата', prompt: 'Нарисуй квадрат со стороной 20 одним циклом.', skills: ['drawing','loop'], requires: ['loop'], supportLevel: 'code_tokens', durationSeconds: 40, sourceLessonId: 92, code: 'for i in range(4):\n    forward(20)\n    right(90)' },
  { id: 'drawing-review', kind: 'review', title: 'Две линии и поворот', prompt: 'Нарисуй две линии по 40 с поворотом на 90 между ними.', skills: ['drawing','sequence'], requires: ['sequence'], supportLevel: 'code_tokens', durationSeconds: 35, sourceLessonId: 91 },
  ...([['arithmetic',24],['variable',26],['if',34],['comparison',32],['loop',45],['function',58],['string',23],['assignment',31]] as const).map(([skill, sourceLessonId]) => ({ id: `code-${skill}-review`, kind: 'review' as const, title: 'Коротко вспомним тему', prompt: 'Выполни короткую задачу, чтобы освежить навык.', skills: [skill], requires: [], supportLevel: 'guided_code' as const, durationSeconds: 35, sourceLessonId }))
]

// Negative IDs isolate practice drafts, attempts and sessions from curriculum rewards.
const practiceNumericIds: Record<string, number> = {
  "print-review-1": -100,
  "string-corrective-1": -101,
  "number-review-1": -102,
  "sequence-review-1": -103,
  "variable-review-1": -104,
  "assignment-corrective-1": -105,
  "arithmetic-review-1": -106,
  "comparison-review-1": -107,
  "if-corrective-1": -108,
  "loop-review-1": -109,
  "comparison-if-review": -110,
  "function-review-1": -111,
  "text-syntax-review-1": -112,
  "code-string-fix": -113,
  "code-arithmetic-fix": -114,
  "code-variable-fix": -115,
  "code-assignment-fix": -116,
  "code-if-fix": -117,
  "code-comparison-fix": -118,
  "code-loop-fix": -119,
  "code-function-fix": -120,
  "list-index-fix": -121,
  "list-loop-fix": -122,
  "list-review": -123,
  "input-fix": -124,
  "input-number-fix": -125,
  "input-review": -126,
  "drawing-fix": -127,
  "drawing-loop-fix": -128,
  "drawing-review": -129,
  "code-arithmetic-review": -130,
  "code-variable-review": -131,
  "code-if-review": -132,
  "code-comparison-review": -133,
  "code-loop-review": -134,
  "code-function-review": -135,
  "code-string-review": -136,
  "code-assignment-review": -137
}
export function practiceLessonId(id: string) { return practiceNumericIds[id] }
export function getPracticeLesson(id: string, support?: SupportLevel) {
  const item = practicePool.find(candidate => candidate.id === id)
  const source = lessons.find(lesson => lesson.id === item?.sourceLessonId)
  if (!item || !source) return undefined
  const prepared = item.code && source.extended ? { ...source, goal: item.prompt, hint: 'Проверь команду, её данные и порядок действий.', progressiveHints: ['Найди в задании данные, с которыми должна работать команда.', 'Используй конструкцию из разбора темы и подставь данные короткой задачи.', 'Сравни порядок команд с целью задания.'], success: 'Закрепили тему!', codeAnswer: item.code, answer: item.code, mode: 'text' as const, supportLevel: 'free_code' as const, expectedOutput: runCourseProgram(item.code, source.extended.inputs[0]).output, prefix: undefined, suffix: undefined, choices: undefined, extended: { ...source.extended, rules: item.rules || source.extended.rules } } : source
  const variant = materializeSupport({ ...prepared, skills: { primarySkill: item.skills[0], teaches: [], practices: item.skills, requires: item.requires } }, support || item.supportLevel)
  return { ...variant, id: practiceLessonId(id)!, key: `practice.${id}`, title: item.title, instruction: item.code ? item.prompt : `${item.prompt} ${source.instruction}`, tutorial: undefined, review: true,
    skills: { primarySkill: item.skills[0], teaches: [], practices: item.skills, requires: item.requires } }
}
export const practiceLessons = practicePool.map(item => getPracticeLesson(item.id)!)
