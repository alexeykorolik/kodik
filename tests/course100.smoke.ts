import assert from 'node:assert/strict'
import course from '../src/course100.json'
import { solutionReferences } from '../src/course100Solutions'
import { checkCourseTask, fixtureFor, runCourseProgram } from '../src/course100Runtime'

assert.equal(course.chapters.length, 12)
assert.equal(course.tasks.length, 100)
for (const task of course.tasks) {
  assert.equal(task.id, course.tasks.indexOf(task) + 1)
  assert.ok(task.title && task.prompt && task.theory)
  assert.equal(task.hints.length, 3, `Подсказки задания ${task.id}`)
  assert.ok(solutionReferences[task.id], `Нет решения задания ${task.id}`)
  const verdict = checkCourseTask(task.id, solutionReferences[task.id])
  assert.equal(verdict.passed, true, `Задание ${task.id}: ${verdict.message}`)
  const invalid = runCourseProgram('import os', fixtureFor(task.id))
  assert.ok(invalid.error, 'Импорт должен быть запрещён')
}
assert.equal(checkCourseTask(17, 'print("Аня")').passed, false, 'Имя должно сохраняться в переменной')
assert.equal(checkCourseTask(27, 'city = "Минск"').passed, true, 'Исправленное присваивание без печати допустимо')
assert.equal(checkCourseTask(87, 'name = input("Имя: ")\nprint("Привет, Маша!")').passed, false, 'Ввод должен влиять на результат')
assert.equal(checkCourseTask(95, 'for i in range(4):\n    forward(60)\n    right(80)').passed, false, 'Геометрия квадрата должна проверяться')
assert.ok(runCourseProgram('while True:\n    pass').error, 'Бесконечный цикл должен останавливаться')
console.log('✓ Все 100 заданий: данные, три подсказки, эталон, безопасный запуск и проверка.')
