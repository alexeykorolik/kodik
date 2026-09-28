import assert from 'node:assert/strict'
import { lessons } from '../src/course'
import { selectNextExercise } from '../src/exerciseSelector'
import { applyMasteryEvent, emptySkillState } from '../src/mastery'
import { getPracticeLesson, practicePool } from '../src/practicePool'
import { skillIds } from '../src/skills'
import { checkLesson } from '../src/learningEngine'
import { checkpointFor, resolveAdaptiveSupport, supportLevels } from '../src/adaptiveSupport'
import { createSupportVariant, materializeSupport } from '../src/supportVariants'
import { checkTextLesson } from '../src/textLearning'
import { answerFingerprint, applySupportDecision, openLessonVariant, meaningfulAnswer } from '../src/learningFlow'
import { cleanProgress } from '../src/progress'
import type { Progress } from '../src/progress'

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
const corrective = selectNextExercise({ lessons, pool: practicePool, completed: lessons.filter(l => lessons.indexOf(l) < lessons.findIndex(x => x.id === 17)).map(l => l.id), currentLessonId: 16, skillStates: { if: weakIf, comparison:{...emptySkillState('comparison'),mastery:.6}, assignment:{...emptySkillState('assignment'),mastery:.6} }, practiceSequence: 3 })
assert.equal(corrective?.reason, 'corrective')
assert.ok(corrective?.practiceId?.includes('if'))

const staleLoop = { ...emptySkillState('loop'), mastery: 0.6, successes: 3, independentSuccesses: 2, lastPracticedSequence: 1,lastPracticedAt:'2026-01-01T00:00:00Z' }
const reviewInput = { lessons, pool: practicePool, completed: [], currentLessonId: 17, skillStates: { loop: staleLoop,print:{...emptySkillState('print'),mastery:.6},number:{...emptySkillState('number'),mastery:.6},sequence:{...emptySkillState('sequence'),mastery:.6} }, practiceSequence: 7,now:Date.parse('2026-01-05') }
const review = selectNextExercise(reviewInput)
assert.equal(review?.reason, 'review')
assert.equal(review?.practiceId, 'loop-review-1')
assert.equal(selectNextExercise({...reviewInput,completedPracticeIds:['loop-review-1']})?.reason,'review','A later revisit can review again')
const prematureReview = selectNextExercise({lessons,pool:practicePool,completed:[1,13],currentLessonId:13,skillStates:{text_syntax:{...staleLoop,skillId:'text_syntax'},print:{...emptySkillState('print'),mastery:.6},string:{...emptySkillState('string'),mastery:.6}},practiceSequence:7,now:Date.parse('2026-01-05')})
assert.equal(prematureReview?.reason,'main','Syntax review cannot introduce an unlearned loop')

const history = { ...emptySkillState('print'), mastery: 0.8, successes: 4, independentSuccesses: 3 }
const input = { lessons, pool: practicePool, completed: [1], currentLessonId: 1, skillStates: { print: history, string: history }, practiceSequence: 4 }
assert.deepEqual(selectNextExercise(input), selectNextExercise(input), 'Selection must be reproducible for identical history')
console.log('✓ Skill mastery and deterministic corrective/review selection.')

const greeting = lessons.find(l=>l.id===13)!
const strong = Object.fromEntries(['print','string'].map(id=>[id,{...emptySkillState(id as 'print'|'string'),mastery:.85,independentSuccesses:4,successes:4}]))
for (let rank=0;rank<supportLevels.length;rank++) {
  const decision = resolveAdaptiveSupport(greeting,strong,supportLevels[rank])
  assert.equal(decision.nextSupport,supportLevels[Math.min(4,rank+1)])
  assert.ok(Math.abs(supportLevels.indexOf(decision.nextSupport)-rank)<=1,'No jumping')
}
const medium = {print:{...strong.print,mastery:.6},string:{...strong.string,mastery:.6}}
assert.equal(resolveAdaptiveSupport(greeting,medium,'blocks_with_code').reason,'keep')
const insufficient = {print:{...strong.print,independentSuccesses:1},string:strong.string}
assert.equal(resolveAdaptiveSupport(greeting,insufficient,'blocks').reason,'keep')
const checkpoint = checkpointFor(greeting,strong)
assert.equal(resolveAdaptiveSupport(greeting,strong,'guided_code',checkpoint).reason,'keep','Old evidence cannot promote twice')
const newEvidence = {print:{...strong.print,independentSuccesses:6},string:{...strong.string,independentSuccesses:6}}
assert.equal(resolveAdaptiveSupport(greeting,newEvidence,'guided_code',checkpoint).nextSupport,'code_tokens')
const errors = {print:{...strong.print,consecutiveErrors:2},string:strong.string}
assert.equal(resolveAdaptiveSupport(greeting,errors,'free_code',undefined,true).nextSupport,'code_tokens')
assert.equal(resolveAdaptiveSupport(greeting,errors,'guided_code').reason,'keep')
const unknown = {...greeting,codeAnswer:undefined}
assert.equal(resolveAdaptiveSupport(unknown,strong,'blocks_with_code').reason,'fallback')
assert.equal(materializeSupport(unknown,'guided_code'),unknown)
assert.equal(meaningfulAnswer('  \n# пусто'),false)
assert.equal(meaningfulAnswer('print("ошибка")'),true)
assert.equal(answerFingerprint('print("ошибка")'),answerFingerprint('print("ошибка")'))
assert.notEqual(answerFingerprint('print("ошибка")'),answerFingerprint('print("другое")'))
const assisted = applyMasteryEvent({}, {skills:['print'],success:true,supportLevel:'blocks',hintsUsed:0,solutionUsed:false,guided:true,sequence:1,at:'2026-01-01'})
assert.equal(assisted.print?.independentSuccesses,0,'Onboarding is not independent')
const independently = applyMasteryEvent(assisted, {skills:['print'],success:true,supportLevel:'blocks',hintsUsed:0,solutionUsed:false,sequence:2,at:'2026-01-01'})
assert.equal(independently.print?.independentSuccesses,1,'Unassisted blocks are independent evidence')
let persisted: Progress = {completed:[],skillStates:strong}
const first = openLessonVariant(greeting,persisted)
persisted = applySupportDecision(greeting,persisted,first.decision!)
assert.equal(openLessonVariant(greeting,persisted).lesson.supportLevel,'guided_code','No oscillation on another open')
const resumed = openLessonVariant(greeting,{...persisted,sessions:{13:{attempts:1,hintsUsed:0,solutionUsed:false,startedAt:1,supportLevel:'code_tokens',tokens:[0]}}})
assert.equal(resumed.lesson.mode,'tokens','Resume uses its saved format')
assert.ok(getPracticeLesson('string-corrective-1')!.id<0)
assert.notEqual(getPracticeLesson('string-corrective-1')!.id,greeting.id)
for (const source of lessons) for (const level of supportLevels) {
  const variant = createSupportVariant(source,level)
  if (!variant || variant.mode === 'blocks') continue
  assert.equal(checkTextLesson(variant,variant.answer!).passed,true,`${source.id} ${level} must be solvable`)
}
const tokens = createSupportVariant(greeting,'code_tokens')!
const migrated = cleanProgress({version:3,completed:[1,13],bestStars:{13:3},drafts:{13:{blocks:{languageVersion:0}}},currentLesson:13,skillStates:strong,sessions:{13:{attempts:2,hintsUsed:1,solutionUsed:false,startedAt:1,supportLevel:'code_tokens',tokens:[0,tokens.tokens!.length-1]}},recommendedPractice:{id:'string-corrective-1',lessonId:13,returnLessonId:13,reason:'corrective',message:'Закрепим'}})
assert.equal(migrated.version,4)
assert.deepEqual(migrated.sessions?.[13].tokens,[0,tokens.tokens!.length-1])
assert.deepEqual(migrated.completed,[1,13])
assert.equal(migrated.bestStars?.[13],3)
assert.ok(migrated.drafts?.[13])
assert.equal(migrated.skillStates?.print?.mastery,.85)
assert.equal(migrated.recommendedPractice?.lessonId,getPracticeLesson('string-corrective-1')!.id)
assert.equal(migrated.recommendedPractice?.returnLessonId,13)
assert.equal(cleanProgress({version:4,completed:[],skillStates:{print:{mastery:NaN}}}).skillStates?.print?.mastery,0)
console.log('✓ All five support stages, strong/normal/struggling, fresh evidence, safety fallback, every code variant and v4 migration.')
