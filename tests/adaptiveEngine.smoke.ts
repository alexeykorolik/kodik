import assert from 'node:assert/strict'
import { lessons } from '../src/course'
import { selectNextExercise } from '../src/exerciseSelector'
import { applyMasteryEvent, emptySkillState } from '../src/mastery'
import { practicePool } from '../src/practicePool'
import { skillIds } from '../src/skills'
import { checkLesson } from '../src/learningEngine'

for (const lesson of lessons) {
  assert.ok(lesson.skills, `${lesson.id} must declare skill metadata`)
  assert.ok(lesson.difficulty && lesson.difficulty >= 1 && lesson.difficulty <= 5, `${lesson.id} must declare difficulty`)
  assert.ok(lesson.supportLevel, `${lesson.id} must declare support level`)
  assert.equal(lesson.progressiveHints?.length, 3, `${lesson.id} must have progressive hints`)
}
for (const skillId of skillIds) assert.ok(practicePool.some(item => item.skills.includes(skillId)), `Practice pool must cover ${skillId}`)
assert.ok(practicePool.every(item => item.durationSeconds >= 20 && item.durationSeconds <= 60))
const missing = checkLesson(lessons.find(lesson=>lesson.id===18)!, {statements:[]})
assert.equal(missing.result.errorType,'missing_block')
assert.ok(missing.result.affectedSkills?.includes('loop'))

const supportFor = (skillId: typeof skillIds[number]) => lessons.filter(lesson=>[...(lesson.skills?.teaches||[]),...(lesson.skills?.practices||[])].includes(skillId)).map(lesson=>lesson.supportLevel)
assert.ok(supportFor('variable').includes('free_code'))
assert.ok(supportFor('loop').includes('code_tokens') && supportFor('loop').includes('free_code'))
assert.ok(supportFor('function').includes('free_code'))

let states = applyMasteryEvent({}, { skills: ['print'], success: true, supportLevel: 'blocks', hintsUsed: 2, solutionUsed: false, at: '2026-01-01T00:00:00.000Z', sequence: 1 })
assert.equal(states.print?.successes, 1)
assert.equal(states.print?.independentSuccesses, 0)
assert.ok((states.print?.mastery || 0) > 0, 'A supported success still contributes evidence')
const afterHint = states.print!.mastery
states = applyMasteryEvent(states, { skills: ['print'], success: true, supportLevel: 'free_code', hintsUsed: 0, solutionUsed: false, at: '2026-01-02T00:00:00.000Z', sequence: 2 })
assert.ok(states.print!.mastery > afterHint)
assert.equal(states.print?.independentSuccesses, 1)

const weakIf = { ...emptySkillState('if'), mastery: 0.2, attempts: 3, consecutiveErrors: 2 }
const corrective = selectNextExercise({ lessons, pool: practicePool, completed: lessons.filter(l => lessons.indexOf(l) < lessons.findIndex(x => x.id === 17)).map(l => l.id), currentLessonId: 16, skillStates: { if: weakIf }, practiceSequence: 3 })
assert.equal(corrective?.reason, 'corrective')
assert.ok(corrective?.practiceId?.includes('if'))

const staleLoop = { ...emptySkillState('loop'), mastery: 0.6, successes: 3, independentSuccesses: 2, lastPracticedSequence: 1 }
const review = selectNextExercise({ lessons, pool: practicePool, completed: [], currentLessonId: 17, skillStates: { loop: staleLoop }, practiceSequence: 7 })
assert.equal(review?.reason, 'review')
assert.equal(review?.practiceId, 'loop-review-1')

const history = { ...emptySkillState('print'), mastery: 0.8, successes: 4, independentSuccesses: 3 }
const input = { lessons, pool: practicePool, completed: [1], currentLessonId: 1, skillStates: { print: history, string: history }, practiceSequence: 4 }
assert.deepEqual(selectNextExercise(input), selectNextExercise(input), 'Selection must be reproducible for identical history')
console.log('✓ Skill mastery and deterministic corrective/review selection.')
