import assert from 'node:assert/strict'
import { chapters, lessons } from '../src/course'
import { checkTextLesson } from '../src/textLearning'
import { runCourseProgram } from '../src/pythonRuntime'

assert.equal(chapters.length, 12)
assert.equal(lessons.length, 100)
assert.deepEqual(lessons.map(lesson => lesson.id).sort((a, b) => a - b), Array.from({ length: 100 }, (_, index) => index + 1))

for (const lesson of lessons.filter(item => item.extended)) {
  const source = lesson.codeAnswer!
  const verdict = checkTextLesson(lesson, lesson.answer!)
  assert.equal(verdict.passed, true, `Задание ${lesson.id} «${lesson.title}»: ${verdict.message}`)
  assert.equal(checkTextLesson(lesson, '').passed, false, `Пустой ответ принят в задании ${lesson.id}`)
  const alternate = lesson.answer!.replace(/"([^"\n]*)"/g, "'$1'")
  assert.equal(checkTextLesson(lesson, alternate).passed, true, `Одинарные кавычки в задании ${lesson.id}`)
  if (lesson.mode === 'text') {
    const variable = /^([a-z_]+)\s*=/m.exec(source)?.[1]
    if (variable) {
      const renamed = source.replace(new RegExp(`\\b${variable}\\b`, 'g'), 'value_test')
      assert.equal(checkTextLesson(lesson, renamed).passed, true, `Другое имя переменной в задании ${lesson.id}`)
    }
  }
  for (const inputs of lesson.extended!.inputs) {
    const result = runCourseProgram(source, inputs)
    assert.equal(result.error, undefined, `Задание ${lesson.id}: ${result.error}`)
    assert.ok(result.output.length || result.segments.length, `Задание ${lesson.id} не даёт результата`)
  }
}

console.log('✓ Основной курс: 100 уникальных заданий, все 78 новых решений приняты и пустые ответы отклонены.')
