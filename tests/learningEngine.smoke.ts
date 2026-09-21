import { checkLesson, lessons, renderPython, runProgram, type Program } from '../src/learningEngine'

const programs: Program[] = [
  { statements: [{ kind: 'print', value: { kind: 'string', value: 'Привет, мир!' } }] },
  { statements: [
    { kind: 'assign', name: 'имя', value: { kind: 'string', value: 'Мира' } },
    { kind: 'print', value: { kind: 'variable', name: 'имя' } }
  ] },
  { statements: [{ kind: 'print', value: { kind: 'binary', operator: '+', left: { kind: 'number', value: 2 }, right: { kind: 'number', value: 3 } } }] },
  { statements: [{ kind: 'repeat', times: { kind: 'number', value: 3 }, body: [{ kind: 'print', value: { kind: 'string', value: 'Учусь!' } }] }] },
  { statements: [
    { kind: 'assign', name: 'баллы', value: { kind: 'number', value: 12 } },
    { kind: 'if', condition: { kind: 'comparison', operator: '>=', left: { kind: 'variable', name: 'баллы' }, right: { kind: 'number', value: 10 } }, then: [{ kind: 'print', value: { kind: 'string', value: 'Уровень пройден!' } }], otherwise: [] }
  ] }
]

for (const [index, program] of programs.entries()) {
  const verdict = checkLesson(lessons[index], program)
  if (!verdict.passed) throw new Error(`Урок ${index + 1} не прошёл проверку: ${verdict.message}`)
  const run = runProgram(program)
  if (run.error || !renderPython(program).trim()) throw new Error(`Урок ${index + 1} не сформировал исполнимый Python`)
}

console.log('✓ Все 5 уроков проходят путь: IR → Python → запуск → проверка.')
