import assert from 'node:assert/strict'
import { cloudProgressRow, readCloudProgressRow, toCloudProgress, mergeCloudAndLocal } from '../src/cloudProgress'
import { cleanProgress } from '../src/progress'
import { emptySkillState } from '../src/mastery'
import { curriculumVersion } from '../src/release'
const privateText='PRIVATE_student@example.test'
const local={version:4,completed:[1,13],currentLesson:14,started:true,bestStars:{13:3},attempts:{13:2},hintsUsed:{13:1},introducedConcepts:['print'],
 profile:{displayName:privateText},sessions:{13:{attempts:2,hintsUsed:1,solutionUsed:false,startedAt:1000,answer:privateText,tokens:[1],lastCheck:{passed:false,message:privateText,output:[privateText],code:privateText},supportMessage:privateText}},
 drafts:{13:{text:privateText}},errorHistory:[{id:'13-1000-1',lessonId:13,type:'wrong_value',message:privateText,skills:['print'],occurredAt:1000,attempt:1}],
 skillStates:{print:{...emptySkillState('print'),mastery:.6,attempts:2,successes:1,lastPracticedAt:'2026-10-02T00:00:00.000Z',extra:privateText}},
 skillSupport:{print:'guided_code'},supportOverrides:{13:'guided_code'},scaffoldSkills:{13:'print'},supportCheckpoint:{successes:{print:1},errors:{print:2}},
 practiceSequence:3,completedPracticeIds:['print-review-1'],firstAttemptResults:{13:{stars:0,passed:false,at:1000}},futurePrivateField:privateText}
const before=JSON.stringify(local),dto=toCloudProgress(local)
assert.equal(JSON.stringify(local),before,'Serializing must not alter the local profile, draft or history')
assert.equal(JSON.stringify(dto).includes(privateText),false)
for(const forbidden of ['profile','sessions','drafts','errorHistory','futurePrivateField']) assert.ok(!(forbidden in dto))
assert.deepEqual(dto.completed,[1,13]);assert.equal(dto.bestStars![13],3);assert.equal(dto.currentLesson,14)
assert.equal(dto.skillStates!.print!.mastery,.6);assert.equal(dto.skillStates!.print!.lastPracticedAt,'2026-10-02T00:00:00.000Z')
assert.equal(dto.skillSupport!.print,'guided_code');assert.equal(dto.supportOverrides![13],'guided_code');assert.equal(dto.scaffoldSkills![13],'print')
assert.deepEqual(dto.firstAttemptResults,local.firstAttemptResults);assert.equal(dto.curriculumVersion,curriculumVersion)
const row=cloudProgressRow('00000000-0000-4000-8000-000000000001',local)
assert.equal(JSON.stringify(row).includes(privateText),false,'The actual Supabase row is content-free')
assert.deepEqual(row.completed_lesson_ids,['1','13'])
assert.deepEqual(readCloudProgressRow(row),dto)
const restored=cleanProgress(readCloudProgressRow({learning_state:local,completed_lesson_ids:['1','13','not-a-number'],current_lesson:14,started:true}))
assert.equal(restored.profile!.displayName,'');assert.deepEqual(restored.sessions,{});assert.deepEqual(restored.errorHistory,[])
assert.deepEqual(restored.completed,[1,13]);assert.equal(restored.bestStars![13],3);assert.equal(restored.skillStates!.print!.mastery,.6)
const emptyDevice=cleanProgress(null),merged=mergeCloudAndLocal(restored,emptyDevice)
assert.equal(merged.skillStates!.print!.mastery,.6,'Fresh device restores actual mastery, not defaults')
assert.equal(merged.supportOverrides![13],'guided_code');assert.equal(merged.scaffoldSkills![13],'print')
assert.equal(merged.attempts![13],2);assert.equal(merged.currentLesson,14)
const localState=cleanProgress({...local,skillStates:{print:{...emptySkillState('print'),mastery:.2,consecutiveErrors:2}}})
const active=mergeCloudAndLocal(restored,localState)
assert.equal(active.profile!.displayName,privateText);assert.equal(active.sessions![13].answer,privateText)
assert.equal(active.errorHistory![0].message,privateText);assert.equal(active.skillStates!.print!.mastery,.2,'Local later errors are not replaced by stronger old cloud evidence')
const poisoned=toCloudProgress({...local,completed:[1,privateText,9999],currentLesson:privateText,attempts:{[privateText]:2,13:privateText},introducedConcepts:[privateText],
 skillStates:{print:{...local.skillStates.print,lastPracticedAt:privateText,mastery:NaN},[privateText]:local.skillStates.print},skillSupport:{print:privateText},
 supportOverrides:{13:privateText,[privateText]:'guided_code'},scaffoldSkills:{13:privateText},firstAttemptResults:{13:{stars:privateText,at:privateText}},completedPracticeIds:[privateText]})
assert.equal(JSON.stringify(poisoned).includes(privateText),false,'Private strings hidden in metadata must also be dropped')
assert.deepEqual(poisoned.completed,[1]);assert.equal(poisoned.skillStates!.print!.mastery,0)
assert.deepEqual(toCloudProgress(null).completed,[])
console.log('✓ Cloud privacy: outbound Supabase row, legacy restore, field injection, adaptation/ratings preserved, local name/code/history unchanged.')
