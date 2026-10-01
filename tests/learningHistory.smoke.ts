import assert from 'node:assert/strict'
import { recordLearningCheck, firstAttemptSummary, mergeLearningRecords } from '../src/learningHistory'
import { cleanProgress, type Progress } from '../src/progress'
import { newSession } from '../src/achievement'

const check = { lessonId: 23, passed: false, message: 'Ожидалось другое слово', errorType: 'wrong_value' as const, skills: ['print'] as const, attempt: 1, tutorial: false, practice: false, at: 100 }
let p: Progress = { completed: [], ...recordLearningCheck({ completed: [] }, { ...check, skills: [...check.skills] }) }
assert.equal(p.errorHistory?.length, 1)
assert.equal(firstAttemptSummary(p).average, 0)
p = { ...p, attempts: { 23: 1 }, ...recordLearningCheck(p, { ...check, skills: [...check.skills], passed: true, stars: 2, attempt: 2, at: 200 }) }
assert.equal(p.errorHistory?.length, 1)
assert.equal(p.errorHistory?.[0].resolvedAt, 200)
assert.equal(p.firstAttemptResults?.['23'].stars, 0)
p = { ...p, completed: [23], ...recordLearningCheck(p, { ...check, skills: [...check.skills], passed: true, stars: 3, at: 300 }) }
assert.equal(p.firstAttemptResults?.['23'].stars, 0, 'Replay cannot replace first result')
const firstSuccess = recordLearningCheck({ completed: [] }, { ...check, skills: [...check.skills], passed: true, stars: 2 })
assert.equal(firstSuccess.firstAttemptResults?.['23'].stars, 2)
assert.deepEqual(recordLearningCheck({ completed: [] }, { ...check, skills: [...check.skills], tutorial: true }).firstAttemptResults, {})
assert.deepEqual(recordLearningCheck({ completed: [] }, { ...check, skills: [...check.skills], practice: true }).firstAttemptResults, {})
const roundtrip = cleanProgress(JSON.parse(JSON.stringify({ ...p, profile: { displayName: ' Мира ' } })))
assert.equal(roundtrip.errorHistory?.[0].resolvedAt, 200)
assert.equal(roundtrip.firstAttemptResults?.['23'].stars, 0)
assert.equal(roundtrip.profile?.displayName, 'Мира')
const merged = mergeLearningRecords(roundtrip, { completed: [], errorHistory: [{ ...roundtrip.errorHistory![0], resolvedAt: undefined }], firstAttemptResults: { 23: { passed: true, stars: 3, at: 500 } } })
assert.equal(merged.errorHistory?.[0].resolvedAt, 200)
assert.equal(merged.firstAttemptResults?.['23'].stars, 0)
const legacy = cleanProgress({ completed: [], attempts: { 23: 1 }, sessions: { 23: { ...newSession(), attempts: 1, lastCheck: { passed: false, message: 'Ошибка', output: [], code: '', errorType: 'wrong_value' } } } })
assert.equal(legacy.errorHistory?.[0].imported, true)
assert.equal(legacy.firstAttemptResults?.['23'].stars, 0)
assert.equal(cleanProgress({ ...legacy, firstAttemptResults: undefined, attempts: { 23: 2 } }).firstAttemptResults?.['23'], undefined)
console.log('✓ Error history, resolution, immutable first scores and legacy migration.')
