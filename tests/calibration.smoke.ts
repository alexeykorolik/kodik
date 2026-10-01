import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { lessons } from '../src/course'
import { buildExtendedLessons, extendedSeeds } from '../src/extendedCourse'
import { lessonSkills } from '../src/adaptiveSupport'
import { openLessonVariant } from '../src/learningFlow'
import { emptySkillState } from '../src/mastery'
import { materializeSupport } from '../src/supportVariants'
import { scaffoldForSkill } from '../src/skillScaffolds'
import { checkTextLesson } from '../src/textLearning'
import { newSession } from '../src/achievement'
import { cleanProgress } from '../src/progress'
import { normalizeInvalidPython } from '../src/pythonEvidence'
import { eventRelease, curriculumVersion } from '../src/release'
import { practicePool, practiceLessonId } from '../src/practicePool'

const source = (id: number) => lessons.find(item => item.id === id)!
for (const id of [23,31,50,58,67,68,79,80,90,91]) {
  const lesson = source(id), ids = lessonSkills(lesson)
  assert.equal(openLessonVariant(lesson,{completed:[]}).lesson.supportLevel,'guided_code',`${id}: unknown skill starts supported`)
  for (const [mastery, independentSuccesses, level] of [[.39,3,'guided_code'],[.4,1,'code_tokens'],[.719,3,'code_tokens'],[.72,1,'code_tokens'],[.72,2,'free_code']] as const) {
    const skillStates = Object.fromEntries(ids.map(skill => [skill,{...emptySkillState(skill),mastery,independentSuccesses}]))
    const opened = openLessonVariant(lesson,{completed:[],skillStates})
    assert.equal(opened.lesson.supportLevel,level,`${id}: initial ${mastery}/${independentSuccesses}`)
    assert.equal(checkTextLesson(opened.lesson,opened.lesson.answer!).passed,true)
  }
  const weak = Object.fromEntries(ids.map(skill => [skill,{...emptySkillState(skill),mastery:.2}]))
  const known = openLessonVariant(lesson,{completed:[],skillStates:weak,supportOverrides:{[id]:'free_code'}})
  assert.equal(known.lesson.supportLevel,'code_tokens',`${id}: known format changes only one step`)
  assert.equal(openLessonVariant(lesson,known.progress).lesson.supportLevel,'guided_code')
  const saved = { ...newSession(), supportLevel:'free_code' as const, answer:'draft(  ',hintsUsed:1 }
  const resumed = openLessonVariant(lesson,{completed:[],skillStates:weak,sessions:{[id]:saved}})
  assert.equal(resumed.lesson.supportLevel,'free_code')
  assert.equal(resumed.progress.sessions![id].answer,'draft(  ')
}
// A hinted introduction never causes an unsupported jump on the next task.
for (const [first,next] of [[67,68],[79,80],[90,91]]) {
  const opened = openLessonVariant(source(first),{completed:[]})
  const skill = source(first).skills!.primarySkill!
  const progress = {...opened.progress,skillStates:{[skill]:{...emptySkillState(skill),mastery:.15,hintsUsed:1}}}
  assert.equal(openLessonVariant(source(next),progress).lesson.supportLevel,'guided_code')
}
for (const [id,skill,answer] of [[80,'input','int(input())'],[31,'assignment','points + 4'],[34,'comparison','temp < 0'],[50,'loop','n <= 5'],[58,'function','n * n'],[68,'list','2'],[92,'drawing','50']] as const) {
  const variant = materializeSupport(source(id),'guided_code',skill)
  assert.equal(variant.scaffoldSkill,skill)
  assert.equal(variant.answer,answer)
  assert.equal(checkTextLesson(variant,variant.answer!).passed,true)
  const progress = cleanProgress({completed:[],sessions:{[id]:{...newSession(),supportLevel:'guided_code',scaffoldSkill:skill,answer}}})
  assert.equal(openLessonVariant(source(id),progress).lesson.answer,answer,'Focused gap survives reload')
}
assert.equal(scaffoldForSkill('grades = [3, 2, 5]\ngrades[1] = 4\nprint(grades)','list')!.answer,'1')
assert.equal(scaffoldForSkill('name = input()\nprint(name)','input')!.answer,'input()')
assert.equal(scaffoldForSkill('def greet():\n    print("hi")\ngreet()','function')!.answer,'greet()')
// Legacy special completion values survive calibration without replacing drafts.
assert.equal(openLessonVariant(source(90),{completed:[],sessions:{90:{...newSession(),supportLevel:'guided_code',answer:'forward'}}}).lesson.answer,'forward')
const frozen: Record<string,string> = JSON.parse(readFileSync(new URL('./lesson-identities.json',import.meta.url),'utf8'))
assert.equal(new Set(lessons.map(item=>item.key)).size,100)
for (const lesson of lessons) assert.equal(lesson.key,frozen[lesson.id])
const reordered = buildExtendedLessons([...extendedSeeds].reverse().map(chapter=>({...chapter,tasks:[...chapter.tasks].reverse()})))
for (const lesson of reordered) { assert.equal(lesson.key,frozen[lesson.id]); assert.deepEqual(lesson.skills,source(lesson.id).skills); assert.deepEqual(lesson.extended,source(lesson.id).extended) }
// Move the last seed into the middle: neighbours retain their identity and checks.
const inserted = extendedSeeds.map(chapter=>({...chapter,tasks:[...chapter.tasks]}))
inserted[0].tasks.splice(2,0,inserted[0].tasks.pop()!)
for (const lesson of buildExtendedLessons(inserted)) assert.equal(lesson.key,frozen[lesson.id])
assert.throws(()=>buildExtendedLessons([{id:6,tasks:[extendedSeeds[0].tasks[0],extendedSeeds[0].tasks[0]]}]),/Duplicate/)
for (const item of practicePool) assert.ok(source(item.sourceLessonId).key && practiceLessonId(item.id)! < 0)
assert.equal(normalizeInvalidPython('print( "x"'),normalizeInvalidPython('print("x"'))
assert.equal(normalizeInvalidPython('print(  "x" # comment'),normalizeInvalidPython('print("x"'))
assert.notEqual(normalizeInvalidPython('print("x  "'),normalizeInvalidPython('print("x "'))
assert.notEqual(normalizeInvalidPython('if True:\n    print('),normalizeInvalidPython('if True:\n        print('))
assert.notEqual(normalizeInvalidPython('a b'),normalizeInvalidPython('ab'))
assert.deepEqual(eventRelease({}),{curriculumVersion:'legacy',appVersion:'legacy'})
assert.deepEqual(eventRelease({curriculumVersion,appVersion:'abcdef1'}),{curriculumVersion,appVersion:'abcdef1'})
assert.equal(eventRelease({curriculumVersion,appVersion:'private@example.com'}),null)
console.log('✓ Calibration: predictive help, boundaries, no jumps, resumed/focused drafts, stable identities, invalid syntax evidence and historical releases.')
