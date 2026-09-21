import assert from 'node:assert/strict'
import { starsFor, newSession, chapterStars, chapterMax, gate, isUnlocked } from '../src/achievement'
import { chapters, lessons, chapterLessons } from '../src/course'
import { checkTextLesson, parsePrintProgram } from '../src/textLearning'
import { runProgram } from '../src/learningEngine'
import { emptySkillState } from '../src/mastery'
const s = newSession()
assert.equal(starsFor({...s,attempts:1}),3)
for(const attempts of [2,3]) assert.equal(starsFor({...s,attempts}),2)
assert.equal(starsFor({...s,attempts:4}),1)
assert.equal(starsFor({...s,attempts:1,hintsUsed:1}),2)
assert.equal(starsFor({...s,attempts:1,hintsUsed:2}),1)
assert.equal(starsFor({...s,attempts:1,solutionUsed:true}),1)
for(const chapter of chapters.filter(c=>c.required)) {
  assert.ok(chapter.required/chapterMax(chapter.id)>=.6 && chapter.required/chapterMax(chapter.id)<=.7)
  assert.ok(chapterLessons(chapter.id).some(l=>l.review))
}
const completed=chapterLessons(1).map(l=>l.id)
const poor={completed,bestStars:{13:1,14:1,22:1}}
assert.equal(chapterStars(1,poor),3);assert.equal(gate(2,poor).open,false);assert.ok(gate(2,poor).missingSkills.includes('print'))
assert.equal(isUnlocked(13,poor),true);assert.equal(isUnlocked(6,poor),false)
const learned={print:{...emptySkillState('print'),mastery:.6},string:{...emptySkillState('string'),mastery:.6},sequence:{...emptySkillState('sequence'),mastery:.4}}
assert.equal(gate(2,{completed,bestStars:{13:1,14:1,22:1},skillStates:learned}).open,true)
assert.equal(gate(3,{completed,bestStars:{13:3,14:3,22:3}}).open,false)
for(const lesson of lessons.filter(l=>l.mode!=='blocks')) assert.equal(checkTextLesson(lesson,lesson.answer!).passed,true,lesson.title)
assert.deepEqual(runProgram(parsePrintProgram("print ( 'Привет!' )")).output,['Привет!'])
assert.deepEqual(runProgram(parsePrintProgram('print("a")\nprint("b")')).output,['a','b'])
assert.deepEqual(runProgram(parsePrintProgram('имя = "Мира"\nprint(имя)')).output,['Мира'])
assert.deepEqual(runProgram(parsePrintProgram('for i in range(2):\n    print("да")')).output,['да','да'])
assert.deepEqual(runProgram(parsePrintProgram('def привет():\n    print("да")\nпривет()')).output,['да'])
assert.ok(runProgram(parsePrintProgram('print(x)')).error)
for(const code of ['eval("x")','import os','print("x"); alert(1)','print("a"b")']) assert.throws(()=>parsePrintProgram(code))
console.log('✓ Stars, chapter gates, progression, text modes and safe parsing.')
