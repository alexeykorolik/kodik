import { lessons as base } from './courseBase'
import type { Lesson } from './learningEngine'
import { supportForMode, type LessonSkills, type SkillId } from './skills'
const original = (id: number) => base.find(l => l.id === id)!
export const emptyWorkspace = { blocks: { languageVersion: 0, blocks: [] } }
const text = (value: string) => ({ type: 'text', fields: { TEXT: value } })
const print = (value: string) => ({ type: 'text_print', inputs: { TEXT: { block: text(value) } } })
const state = (block: object) => ({ blocks: { languageVersion: 0, blocks: [{ ...block, x: 24, y: 28 }] } })
const greeting = (id: number, title: string, phrase: string): Lesson => ({ ...original(1), id, title, goal: `Сделай так, чтобы программа написала: ${phrase}`, instruction: 'Команда «Напечатать» показывает то, что находится внутри неё.', starter: emptyWorkspace, solution: state(print(phrase)), expectedOutput: [phrase], hint: 'Добавь «Напечатать», а внутрь — «Текст». Впиши сообщение без кавычек: блок добавит их в Python сам.', starterHint: 'Собери команду и скажи ей, что показать.', success: 'Команда print показывает текст в скобках. Кавычки отмечают начало и конец текста.', allowed: ['text_print', 'text'], codeNote: 'Напечатать → print. Текст → слова в кавычках. Скобки соединяют команду и значение.' })

export const chapters = [
  { id: 1, title: 'Команды и сообщения', description: 'Попроси программу что-нибудь сказать.', required: 6 },
  { id: 2, title: 'Запоминать и считать', description: 'Дай данным имя и научи программу считать.', required: 4 },
  { id: 3, title: 'Принимать решения', description: 'Разные действия для разных ситуаций.', required: 4 },
  { id: 4, title: 'Повторять действия', description: 'Одна команда вместо нескольких одинаковых.', required: 4 },
  { id: 5, title: 'От блоков к Python', description: 'Назови действия и напиши свои строки кода.', required: 0 }
]
const newLessons: Lesson[] = [
  { ...greeting(1, 'Научим программу говорить', 'Привет!'), chapter: 1, tutorial: ['print', 'text_value'] },
  { ...greeting(13, 'Теперь — твоё сообщение', 'Мне нравится Python'), chapter: 1, instruction: 'Поздоровались! Теперь расскажем, что нам нравится. Собери сообщение самостоятельно.' },
  { ...greeting(14, 'Узнай свою строку', 'Привет!'), chapter: 1, mode: 'recognition', goal: 'Как записать эту команду на Python?', instruction: 'Блок «Напечатать» с текстом «Привет!» превращается в одну строку. Выбери её.', choices: ['say("Привет!")', 'print("Привет!")', 'print(Привет!)'], answer: 'print("Привет!")', hint: 'Команда вывода называется print. Текст внутри круглых скобок окружён кавычками.' },
  { ...original(7), chapter: 1, tutorial: ['sequence'], starter: state(print('Старт')), codeNote: 'Соединённые команды выполняются сверху вниз. Каждая print занимает свою строку.' },
  { ...original(7), id: 22, chapter: 1, title: 'Два сообщения по порядку', review: true, instruction: 'Объявим начало и конец короткой гонки. Собери две команды: сначала «Старт», затем «Финиш».', codeNote: 'Порядок блоков = порядок строк Python.' },
  { ...original(6), chapter: 2, tutorial: ['number'], starter: state({ type: 'text_print' }), goal: 'На табло нужно показать число 7. Добавь число в пустую команду.', expectedOutput: ['7'], solution: state({ type: 'text_print', inputs: { TEXT: { block: { type: 'math_number', fields: { NUM: 7 } } } } }), validate: p => p.statements.some(s => s.kind === 'print' && s.value.kind === 'number') ? null : 'Вставь именно число, чтобы с ним можно было считать.', codeNote: 'Числа записываются без кавычек: print(7). Текст — с кавычками.', success: '7 без кавычек — число. Программа может использовать его в вычислениях.' },
  { ...original(2), chapter: 2, tutorial: ['variable'], starter: emptyWorkspace, instruction: 'Программе нужно запомнить имя участницы — Мира. Создадим подписанную «коробку», положим туда имя и прочитаем его.', starterHint: 'Сначала создай коробку с названием «имя».', codeNote: 'имя = "Мира" сохраняет текст. print(имя) читает сохранённое значение. Такая коробка называется переменной.' },
  { ...original(3), chapter: 2, tutorial: ['arithmetic'], instruction: 'За первый раунд дали 2 балла, за второй — 3. Посчитаем, сколько получилось вместе.', codeNote: 'Знак + внутри print сначала складывает числа, затем print показывает сумму.' },
  { ...original(8), chapter: 2, review: true, instruction: 'В каждой из четырёх коробок лежат 2 красных и 3 зелёных карандаша. Сначала посчитай карандаши в одной коробке, затем во всех.', codeNote: 'Внутренний блок превращается в скобки: (2 + 3) * 4.' },
  { ...original(2), id: 15, chapter: 2, mode: 'recognition', title: 'Прочитай из коробки', instruction: 'Имя «Мира» уже сохранено в переменной имя. Выбери строку, которая прочитает её содержимое.', goal: 'Покажи сохранённое имя, а не слово «имя».', choices: ['print("имя")', 'print(имя)', 'имя("Мира")'], answer: 'print(имя)', hint: 'Кавычки обозначают обычный текст. Чтобы прочитать переменную, напиши её имя без кавычек.', codeNote: 'print(имя) читает переменную. print("имя") печатает само слово.' },
  { ...original(9), chapter: 3, tutorial: ['comparison'], instruction: 'Для прохода нужно хотя бы 10 баллов, а у игрока их 12. Узнаем, достаточно ли этого.', codeNote: 'Слева — баллы игрока, справа — порог. >= означает «не меньше». True означает «да».' },
  { ...original(5), chapter: 3, tutorial: ['if'], starter: { variables: [{ name: 'баллы', id: 'score' }], blocks: { languageVersion: 0, blocks: [{ type: 'variables_set', x: 24, y: 28, fields: { VAR: { id: 'score' } }, inputs: { VALUE: { block: { type: 'math_number', fields: { NUM: 12 } } } } }] } }, instruction: 'У игрока 12 баллов. Уровень открывается, если баллов хотя бы 10. Команда «Если» решит, показывать ли поздравление.', codeNote: 'if — «если». После проверки ставится двоеточие. Отступ перед print показывает, что действие находится внутри условия.' },
  { ...original(10), chapter: 3, tutorial: ['else'], codeNote: 'else: — «иначе». Её действие тоже записывается с отступом.' },
  { ...original(9), id: 16, chapter: 3, mode: 'completion', title: 'Допиши знак сравнения', instruction: 'В переменной баллы сохранено 12. Пропускаем игрока с 10 баллами и больше. Вставь пропущенный знак.', goal: 'Выбери знак, который означает «не меньше».', prefix: 'баллы = 12\nif баллы ', suffix: ' 10:\n    print("Можно пройти")', choices: ['==', '>=', '<'], answer: '>=', hint: 'Равенство подходит только для 10. Здесь нужно «больше или равно».', codeNote: 'Сравнение >= пропускает и 10, и 11, и 12.' },
  { ...original(5), id: 17, chapter: 3, review: true, title: 'Проверь пропуск', instruction: 'Проверь всё вместе: запомнить 12 баллов, сравнить с порогом 10, показать поздравление только при выполнении условия.', codeNote: 'Сохранение → сравнение → действие внутри if.' },
  { ...original(4), chapter: 4, tutorial: ['loop'], codeNote: 'for … in range(3): повторяет действие три раза. Отступ показывает, что именно повторяется.' },
  { ...original(4), id: 18, chapter: 4, title: 'Повтори самостоятельно', starter: emptyWorkspace, instruction: 'На тренировке нужно три раза сказать «Учусь!». Собери повторение самостоятельно.', codeNote: 'Один print внутри цикла заменяет три одинаковые строки.' },
  { ...original(4), id: 19, chapter: 4, review: true, mode: 'tokens', title: 'Собери цикл на Python', instruction: 'Блок повторения превращается в заголовок for. Собери его из настоящих частей Python.', goal: 'Составь строку, которая начинает цикл из трёх повторений.', tokens: ['range(3)', ':', 'for ', 'i ', 'in '], answer: 'for i in range(3):', prefix: '', suffix: '\n    print("Учусь!")', hint: 'Порядок такой: for, имя счётчика, in, range с числом повторений, двоеточие.', expectedOutput: ['Учусь!','Учусь!','Учусь!'], validate: p => p.statements.some(s => s.kind === 'repeat') ? null : 'Собери заголовок цикла for с range(3).', codeNote: 'for i in range(3): — заголовок цикла. Отступ показывает повторяемое действие.' },
  { ...original(11), chapter: 5, tutorial: ['function'], codeNote: 'def даёт группе команд имя. приветствие() запускает их. Без вызова определение ничего не печатает.' },
  { ...original(12), chapter: 5, review: true, codeNote: 'Определение хранит действие, цикл повторяет вызов. Нажми на заголовок функции, чтобы добавить цикл после неё.' },
  { ...original(2), id: 20, chapter: 5, mode: 'text', title: 'Переменная без блоков', instruction: 'Ты уже сохранял имя в блоках и узнавал его строку. Теперь напиши обе команды сам.', goal: 'Сохрани «Мира» в переменную имя и напечатай её значение.', expectedOutput: ['Мира'], answer: 'имя = "Мира"\nprint(имя)', validate: p => p.statements.some(s => s.kind === 'assign' && s.name === 'имя') && p.statements.some(s => s.kind === 'print' && s.value.kind === 'variable' && s.value.name === 'имя') ? null : 'Сначала сохрани текст в имя, затем передай имя в print без кавычек.', codeNote: 'Это те же присваивание и чтение переменной, но теперь блоки больше не нужны.' },
  { ...original(12), id: 21, chapter: 5, mode: 'text', review: true, title: 'Функция и цикл — твой код', instruction: 'Собери знакомые идеи уже в настоящем Python: опиши функцию и вызови её три раза в цикле.', goal: 'Функция приветствие печатает «Привет!», а цикл вызывает её 3 раза.', expectedOutput: ['Привет!','Привет!','Привет!'], answer: 'def приветствие():\n    print("Привет!")\n\nfor i in range(3):\n    приветствие()', validate: p => { const hasFunction=p.statements.some(s=>s.kind==='define'&&s.name==='приветствие'); const hasLoop=p.statements.some(s=>s.kind==='repeat'&&s.body.some(c=>c.kind==='call'&&c.name==='приветствие')); return hasFunction&&hasLoop?null:'Определи функцию приветствие, затем вызови её внутри цикла for.' }, codeNote: 'Blockly исчез: структура осталась той же — определение, цикл и вложенный вызов с отступом.' }
]
const metadata: Record<number, LessonSkills> = {
  1: { teaches: ['print','string'], practices: [], requires: [] },
  13: { teaches: [], practices: ['print','string'], requires: ['print','string'] },
  14: { teaches: ['text_syntax'], practices: ['print','string'], requires: ['print','string'] },
  7: { teaches: ['sequence'], practices: ['print','string'], requires: ['print'] },
  22: { teaches: [], practices: ['sequence','print','string'], requires: ['print','sequence'] },
  6: { teaches: ['number'], practices: ['print'], requires: ['print'] },
  2: { teaches: ['variable','assignment'], practices: ['print','string'], requires: ['print','string'] },
  3: { teaches: ['arithmetic'], practices: ['number','print'], requires: ['number','print'] },
  8: { teaches: [], practices: ['arithmetic','number','sequence','print'], requires: ['arithmetic','number'] },
  15: { teaches: [], practices: ['variable','assignment','print','text_syntax'], requires: ['variable','assignment','print'] },
  9: { teaches: ['comparison'], practices: ['number','print'], requires: ['number','print'] },
  5: { teaches: ['if','indentation'], practices: ['comparison','assignment','variable','print'], requires: ['comparison','assignment'] },
  10: { teaches: [], practices: ['if','comparison','indentation','print'], requires: ['if','comparison'] },
  16: { teaches: [], practices: ['comparison','if','text_syntax'], requires: ['comparison','if'] },
  17: { teaches: [], practices: ['variable','assignment','comparison','if','indentation','print'], requires: ['assignment','comparison','if'] },
  4: { teaches: ['loop','indentation'], practices: ['sequence','number','print'], requires: ['sequence','number'] },
  18: { teaches: [], practices: ['loop','indentation','sequence','number','print'], requires: ['loop','sequence'] },
  19: { teaches: ['text_syntax'], practices: ['loop','indentation','number','print'], requires: ['loop','print'] },
  11: { teaches: ['function','indentation'], practices: ['print','sequence'], requires: ['print','sequence'] },
  12: { teaches: [], practices: ['function','loop','indentation','print','sequence'], requires: ['function','loop'] },
  20: { teaches: [], practices: ['variable','assignment','print','string','text_syntax'], requires: ['variable','assignment','print'] },
  21: { teaches: [], practices: ['function','loop','indentation','sequence','print','text_syntax'], requires: ['function','loop','print'] }
}
const codeAnswers: Partial<Record<number,string>> = {
  1:'print("Привет!")',13:'print("Мне нравится Python")',14:'print("Привет!")',7:'print("Старт")\nprint("Финиш")',22:'print("Старт")\nprint("Финиш")',
  6:'print(7)',2:'имя = "Мира"\nprint(имя)',3:'print(2 + 3)',8:'print((2 + 3) * 4)',15:'имя = "Мира"\nprint(имя)',
  9:'print(12 >= 10)',5:'баллы = 12\nif баллы >= 10:\n    print("Уровень пройден!")',10:'if 3 >= 10:\n    print("Можно")\nelse:\n    print("Пока рано")',
  16:'баллы = 12\nif баллы >= 10:\n    print("Можно пройти")',17:'баллы = 12\nif баллы >= 10:\n    print("Уровень пройден!")',
  4:'for i in range(3):\n    print("Учусь!")',18:'for i in range(3):\n    print("Учусь!")',19:'for i in range(3):\n    print("Учусь!")',
  11:'def приветствие():\n    print("Привет!")\nприветствие()',12:'def приветствие():\n    print("Привет!")\nfor i in range(3):\n    приветствие()',
  20:'имя = "Мира"\nprint(имя)',21:'def приветствие():\n    print("Привет!")\nfor i in range(3):\n    приветствие()'
}

const hintsFor = (lesson: Lesson) => {
  const concept = lesson.skills?.teaches[0] || lesson.skills?.practices[0]
  const first: Partial<Record<SkillId,string>> = {
    print: 'Подумай, какая команда показывает значение на экране.',
    variable: 'Сначала реши, где программе нужно сохранить значение, а где прочитать его.',
    comparison: 'Сформулируй проверку словами: какое отношение между левым и правым значением?',
    if: 'Найди действие, которое должно выполняться только при верной проверке.',
    loop: 'Найди действие, которое повторяется, и количество повторений.',
    function: 'Отдели описание действия от места, где его нужно запустить.'
  }
  return [first[concept!] || lesson.starterHint, lesson.starterHint, lesson.hint]
}

export const lessons: Lesson[] = newLessons.map(source => {
  const mode = source.mode || 'blocks'
  const lesson: Lesson = { ...source, mode, codeAnswer:codeAnswers[source.id], skills: metadata[source.id], difficulty: Math.min(5, Math.max(1, source.chapter || 1)) as 1|2|3|4|5, supportLevel: source.tutorial?.length ? 'blocks' : supportForMode(mode) }
  return { ...lesson, progressiveHints: hintsFor(lesson) }
})
export function chapterLessons(id: number) { return lessons.filter(l => l.chapter === id) }
