import { checkLesson, runProgram, type Lesson, type Program, type Expr } from './learningEngine'
// A parser for the first text-writing tasks. No eval, Function, or Python execution.
export function parsePrintProgram(source: string): Program {
  if (source.length > 2000) throw new Error('Программа слишком длинная. Здесь достаточно одной или двух строк.')
  const lines = source.trim().split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) throw new Error('Напиши команду print, затем текст в кавычках внутри круглых скобок.')
  return { statements: lines.map(line => {
    const match = /^\s*print\s*\(\s*(["'])(.*?)\1\s*\)\s*$/.exec(line)
    if (!match) throw new Error('Нужна команда print("текст"). Проверь имя print, круглые скобки и одинаковые кавычки с двух сторон текста.')
    const text = match[2]
    let value = ''
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\\') { const next = text[++i]; const escapes: Record<string,string> = { n: '\n', t: '\t', '\\': '\\', '"': '"', "'": "'" }; if (!(next in escapes)) throw new Error('После обратной косой черты допустимы n, t, кавычка или ещё одна косая черта.'); value += escapes[next] }
      else { if (text[i] === match[1]) throw new Error('Внутри текста встретилась незакрытая кавычка.'); value += text[i] }
    }
    return { kind: 'print' as const, value: { kind: 'string', value } as Expr }
  }) }
}
export function checkTextLesson(lesson: Lesson, answer: string) {
  if (lesson.mode === 'text' || lesson.mode === 'tokens') {
    try { const program = parsePrintProgram(answer); return { ...checkLesson(lesson, program), program } }
    catch (error) { return { passed: false, message: (error as Error).message, result: { output: [] }, program: { statements: [] } as Program } }
  }
  const passed = answer === lesson.answer
  const program: Program = lesson.mode === 'completion' ? { statements: [{ kind: 'if', condition: { kind: 'comparison', operator: '>=', left: { kind: 'number', value: 12 }, right: { kind: 'number', value: 10 } }, then: [{ kind: 'print', value: { kind: 'string', value: 'Можно пройти' } }], otherwise: [] }] } : lesson.id === 15 ? { statements: [{ kind: 'assign', name: 'имя', value: { kind: 'string', value: 'Мира' } }, { kind: 'print', value: { kind: 'variable', name: 'имя' } }] } : parsePrintProgram(lesson.answer!)
  return { passed, message: passed ? (lesson.codeNote || lesson.success || lesson.instruction) : !answer ? 'Сначала выбери ответ, затем нажми «Проверить».' : lesson.mode === 'completion' ? '== означает «ровно столько», а < — «меньше». Нам подходят и 10, и 11, и 12. Попробуй другой знак.' : 'Сравни команду с блоком: print — показать, скобки — что показать, кавычки — обычный текст. Имя переменной читается без кавычек.', result: passed ? runProgram(program) : { output: [] }, program }
}
