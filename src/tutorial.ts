import type { Lesson, Program, Stmt } from './learningEngine'
export type BlockInfo = { id: string; type: string; fields: Record<string, string> }
export type WorkspaceInfo = { blocks: BlockInfo[]; variables: string[]; selectedType?: string; selectedId?: string }
export const emptyInfo: WorkspaceInfo = { blocks: [], variables: [] }
export type GuideStep = { id: string; text: string; target: 'add' | 'field' | 'variable'; block?: string; done: (info: WorkspaceInfo, program: Program) => boolean }
const has = (type: string, count = 1) => (i: WorkspaceInfo) => i.blocks.filter(b => b.type === type).length >= count
const value = (type: string, field: string, text: string) => (i: WorkspaceInfo) => i.blocks.some(b => b.type === type && b.fields[field] === text)
const add = (id: string, block: string, text: string, count = 1): GuideStep => ({ id, block, text, target: 'add', done: has(block, count) })
const edit = (id: string, block: string, field: string, expected: string, text: string): GuideStep => ({ id, block, text, target: 'field', done: value(block, field, expected) })
const steps: Record<string, GuideStep[]> = {
  print: [add('command', 'text_print', 'Программа состоит из команд. Нажми «Добавить блок», затем выбери «Напечатать». Эта команда показывает что-то на экране.')],
  text_value: [add('value', 'text', 'Команда пока не знает, ЧТО показать. В её пустое место нужен текст. Нажми «Добавить блок» и выбери «Текст» — он вставится внутрь.'), edit('greeting', 'text', 'TEXT', 'Привет!', 'Теперь внутри команды есть текст. Нажми на белое поле и напиши Привет! Кавычки добавятся сами.')],
  sequence: [add('second-command', 'text_print', 'Первое сообщение готово. Добавь ещё «Напечатать»: новая команда соединится с первой снизу.', 2), add('second-value', 'text', 'Вторая команда тоже должна знать, что показать. Добавь «Текст» — он заполнит её пустое место.', 2), edit('finish', 'text', 'TEXT', 'Финиш', 'В новом белом поле напиши Финиш. Соединённые команды выполняются сверху вниз.')],
  number: [add('number-value', 'math_number', 'Теперь покажем количество. Добавь «Число» — оно встанет в пустое место команды.'), edit('seven', 'math_number', 'NUM', '7', 'Нажми на число и замени его на 7. В Python числа пишутся без кавычек.')],
  variable: [
    { id: 'name', target: 'variable', text: 'Создадим подписанную коробку. Нажми «Создать переменную» и назови её имя.', done: i => i.variables.includes('имя') },
    add('store', 'variables_set', 'Коробка «имя» создана. Добавь «Присвоить», чтобы положить в неё значение.'),
    add('stored-text', 'text', 'Что запомнить? Добавь «Текст» в пустое место команды «Присвоить».'),
    edit('mira', 'text', 'TEXT', 'Мира', 'Впиши Мира в белое поле. Команда сохранит этот текст в коробке «имя».'),
    add('read-command', 'text_print', 'Теперь прочитаем содержимое коробки. Добавь команду «Напечатать» после сохранения.'),
    add('read-value', 'variables_get', 'Добавь «Получить переменную». Он вставится внутрь печати и прочитает «имя». Такая именованная коробка называется переменной.')
  ],
  arithmetic: [edit('sum', 'math_number', 'NUM', '3', 'Внутри печати находится вычисление. Слева 2, посередине +. Нажми на число 0 справа и замени его на 3.')],
  comparison: [edit('operator', 'logic_compare', 'OP', 'GTE', 'Слева — 12 баллов, справа — порог 10. Нажми знак = между ними и выбери ≥: «больше или равно».')],
  if: [add('condition', 'controls_if', '12 баллов уже сохранены. Добавь «Если»: сверху будет проверка, а внутри — действие на случай «да».'), add('comparison', 'logic_compare', 'В верхнее пустое место нужна проверка. Добавь «Сравнить».'), add('score', 'variables_get', 'Добавь «Получить переменную»: слева в сравнении появятся баллы игрока.'), add('threshold', 'math_number', 'Добавь «Число»: справа появится порог для открытия уровня.'), edit('ten', 'math_number', 'NUM', '10', 'Измени новое число 0 на 10. Число 12 в сохранении оставь прежним.'), edit('at-least', 'logic_compare', 'OP', 'GTE', 'Выбери ≥ между баллами и 10. Это означает «хотя бы 10».'), add('action', 'text_print', 'Теперь добавь «Напечатать». Команда попадёт внутрь «Если» и выполнится только при верной проверке.'), add('message', 'text', 'Добавь «Текст» в печать внутри условия.'), edit('congratulation', 'text', 'TEXT', 'Уровень пройден!', 'Впиши Уровень пройден! В Python отступ перед print показывает, что действие внутри if.')],
  else: [add('otherwise', 'text_print', '3 баллов недостаточно. Добавь «Напечатать» в пустую ветку «иначе»: она выполняется, когда ответ на проверку — «нет».', 2), add('otherwise-text', 'text', 'Добавь текст для второй ветки.', 2), edit('otherwise-message', 'text', 'TEXT', 'Пока рано', 'Напиши Пока рано. В Python «иначе» записывается как else: с отступом перед действием.')],
  loop: [add('loop-body', 'text_print', 'Цикл уже настроен на 3 повтора. Добавь «Напечатать» — команда встанет внутрь и повторится три раза.'), add('loop-text', 'text', 'Добавь «Текст» в пустую печать внутри цикла.'), edit('loop-message', 'text', 'TEXT', 'Учусь!', 'Напиши Учусь! В Python отступ показывает, какую команду повторяет цикл.')],
  function: [add('call', 'kodik_call', 'Функция «приветствие» хранит команду печати, но ещё не запускает её. Добавь «Вызвать функцию» после определения. Имена должны совпадать.')]
}
export function tutorialSteps(lesson: Lesson, introduced: string[]) { return (lesson.tutorial || []).filter(c => !introduced.includes(c)).flatMap(c => steps[c] || []) }
export function nextGuide(lesson: Lesson, introduced: string[], info: WorkspaceInfo, program: Program) { return tutorialSteps(lesson, introduced).find(step => !step.done(info, program)) }
export function newBlocks(lesson: Lesson) { return [...new Set((lesson.tutorial || []).flatMap(c => (steps[c] || []).map(s => s.block).filter((b): b is string => !!b)))] }
export function selectedLines(program: Program, type?: string): number[] {
  // The same statement traversal and indentation rules as renderPython.
  let line = 0
  const result: number[] = []
  const expressionType: Record<string, string> = { text: 'string', math_number: 'number', variables_get: 'variable', math_arithmetic: 'binary', logic_compare: 'comparison' }
  const contains = (value: unknown): boolean => !!value && typeof value === 'object' && (('kind' in value && value.kind === expressionType[type || '']) || Object.values(value).some(v => typeof v === 'object' && contains(v)))
  const visit = (items: Stmt[]) => {
    if (!items.length) { line++; return }
    for (const item of items) {
      const own = line++
      const mapped: Record<string, string> = { text_print: 'print', variables_set: 'assign', controls_if: 'if', controls_repeat_ext: 'repeat', kodik_define: 'define', kodik_call: 'call' }
      if (mapped[type || ''] === item.kind || ('value' in item && contains(item.value)) || (item.kind === 'if' && contains(item.condition)) || (item.kind === 'repeat' && contains(item.times))) result.push(own)
      if ('body' in item) visit(item.body)
      if (item.kind === 'if') { visit(item.then); if (item.otherwise.length) { line++; visit(item.otherwise) } }
    }
  }
  visit(program.statements); return result
}
