import assert from 'node:assert/strict'
import { lessons } from '../src/course'
import { checkTextLesson } from '../src/textLearning'
import { parseCourseProgram, runCourseProgram } from '../src/pythonRuntime'
import { summarizePython } from '../src/pythonStructure'
import { materializeSupport } from '../src/supportVariants'
import { buildTutorContext, sanitizeTutorContext } from '../src/ai/aiContext'
import { newSession } from '../src/achievement'
import { emptySkillState } from '../src/mastery'
import { resolveAdaptiveSupport } from '../src/adaptiveSupport'
import { openLessonVariant } from '../src/learningFlow'
import { getPracticeLesson, practicePool, practiceLessons } from '../src/practicePool'
import { selectNextExercise } from '../src/exerciseSelector'
import { cleanEventData } from '../src/eventSchema'

const source = (id: number) => lessons.find(item => item.id === id)!
const free = (id: number) => materializeSupport(source(id), 'free_code')
const reject = (id: number, code: string) => assert.equal(checkTextLesson(free(id),code).passed,false, `Task ${id} rejected: ${code}`)
reject(28,'unused = (7 + 9) / 2\nprint(8)')
reject(28,'value = (7 + 9) / 2\nvalue = 8\nprint(value)')
reject(28,'if False:\n    print((7 + 9) / 2)\nprint(8)')
reject(28,'# print((7 + 9) / 2)\nprint(8)')
reject(24,'ticket = 7\nunused = ticket * 3\nprint(21)')
reject(58,'def double(n):\n    return 12\nprint(double(6))')
reject(58,'def double(n):\n    unused = n * 2\n    return 12\nprint(double(6))')
reject(67,'values = ["кот", "пёс", "лиса"]\nunused = values[0]\nprint("кот")')
reject(79,'name = input()\nprint("Привет, Лея")')
reject(90,'forward(50)\nfor i in range(3):\n    right(120)')

for (const lesson of lessons.filter(item => item.extended)) {
  assert.ok(lesson.skills!.primarySkill)
  assert.equal(lesson.skills!.teaches.length,1)
  assert.ok(lesson.extended!.rules.length)
  for (const level of ['guided_code','code_tokens','free_code'] as const) {
    const variant = materializeSupport(lesson,level)
    assert.equal(variant.supportLevel,level,`${lesson.id} exposes ${level}`)
    assert.equal(checkTextLesson(variant,variant.answer!).passed,true,`${lesson.id} ${level}`)
  }
  for (const level of ['blocks','blocks_with_code'] as const) assert.notEqual(materializeSupport(lesson,level).mode,'blocks')
  const resumed = openLessonVariant(lesson,{completed:[],sessions:{[lesson.id]:{...newSession(),supportLevel:'code_tokens',tokens:[0]}}})
  assert.equal(resumed.lesson.supportLevel,'code_tokens')
}
for (const lesson of practiceLessons.filter(item => item.extended)) assert.equal(checkTextLesson(lesson,lesson.answer!).passed,true,`Practice ${lesson.id}`)
for (const item of practicePool) assert.equal(cleanEventData({practiceId:item.id}).practiceId,item.id)

for (const id of [50,58,67,79,92]) {
  const lesson=free(id), skill=lesson.skills!.primarySkill!
  const weak={...emptySkillState(skill),mastery:.2,consecutiveErrors:2,attempts:2}
  const states=Object.fromEntries([...new Set([...(lesson.skills?.requires || []),...(lesson.skills?.practices || []),skill])].map(key => [key,{...emptySkillState(key),mastery:.7,successes:3,independentSuccesses:3}]))
  states[skill]=weak
  assert.equal(resolveAdaptiveSupport(lesson,states,'free_code',undefined,true).nextSupport,'code_tokens')
  assert.equal(resolveAdaptiveSupport(lesson,states,'guided_code',undefined,true).nextSupport,'guided_code')
  const next=selectNextExercise({lessons,pool:practicePool,completed:lessons.filter(item=>item.id<id).map(item=>item.id),targetLessonId:id,skillStates:states,practiceSequence:2,correctiveOnly:true})
  assert.equal(next?.reason,'corrective',`${id} has recovery`)
  assert.ok(getPracticeLesson(next!.practiceId!)?.extended)
}

const code='def privateName(privateParameter):\n    values = ["secret@example.com", "secret-input"]\n    while privateParameter > 0:\n        privateParameter = privateParameter - 1\n    return values[0]\nprint(privateName(2))'
const summary=summarizePython(parseCourseProgram(code))
assert.ok(summary.includes('function(params_1') && summary.includes('while') && summary.includes('index'))
assert.ok(!/private|secret|@/.test(summary))
const context=buildTutorContext(free(58),{} as never,newSession(),{statements:[],normalizedStructure:summary})
assert.equal(context.currentSolution.normalizedStructure,summary)
const sanitized=sanitizeTutorContext(source(58),{...context,task:{...context.task,supportLevel:'guided_code'}})
assert.equal(sanitized.task.supportLevel,'guided_code')
assert.equal(sanitized.currentSolution.normalizedStructure,summary)
assert.equal(sanitizeTutorContext(source(58),{...context,currentSolution:{...context.currentSolution,normalizedStructure:'secret@example.com'}}).currentSolution.normalizedStructure,'empty')
assert.deepEqual(cleanEventData({code:'print("secret")',email:'secret@example.com',kind:'secret@example.com',attempt:1,passed:true,skillId:'loop'}),{attempt:1,passed:true,skillId:'loop'})
assert.ok(runCourseProgram('while True:\n    pass').error)
assert.ok(runCourseProgram('print(range(10001))').error)
assert.ok(runCourseProgram('import os').error)
console.log('✓ Audit: observed AST, hidden probes, 78×3 code stages, practice, recovery, private AI structure and event schema.')
