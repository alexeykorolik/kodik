import assert from 'node:assert/strict'
import * as Blockly from 'blockly'
import '../src/blocks'
import { lessons } from '../src/course'
import { checkLesson, renderPython, workspaceToProgram } from '../src/learningEngine'

for (const lesson of lessons) {
  const workspace = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(lesson.solution, workspace)
  const program = workspaceToProgram(workspace)
  const check = checkLesson(lesson, program)
  assert.equal(check.passed, true, `${lesson.title}: ${check.message}\n${renderPython(program)}`)
  workspace.clear()
  Blockly.serialization.workspaces.load(lesson.starter, workspace)
  assert.equal(checkLesson(lesson, workspaceToProgram(workspace)).passed, false, `Starter must require work: ${lesson.title}`)
  workspace.dispose()
}
console.log(`✓ ${lessons.length} упражнений: Blockly → IR → Python → запуск → проверка; все стартовые состояния требуют решения.`)
