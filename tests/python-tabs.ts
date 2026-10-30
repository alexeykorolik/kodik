// Tabs in the learner's Python: only leading indentation is expanded; a tab inside a string stays one
// character, so a real tab and its escape give the same value, and four spaces stay a different value.
import assert from 'node:assert/strict'
import { parseCourseProgram, runCourseProgram } from '../src/pythonRuntime'
import { sameProgram, isUnchangedStart } from '../src/adaptive/evidence'

const TAB = String.fromCharCode(9), BS = String.fromCharCode(92)
const realTab = `print(len("a${TAB}b"))`, escaped = `print(len("a${BS}tb"))`, spaces = `print(len("a    b"))`
assert.equal(realTab.split(TAB).length, 2, 'the test program really contains a tab character')
assert.ok(!escaped.includes(TAB) && escaped.includes(BS + 't'), 'the escaped form really contains backslash-t')

assert.deepEqual(runCourseProgram(realTab).output, ['3'], 'a + real tab + b has length 3')
assert.deepEqual(runCourseProgram(escaped).output, ['3'])
assert.deepEqual(runCourseProgram(spaces).output, ['6'])
assert.deepEqual(runCourseProgram(`print("a${TAB}b")`).output, [`a${TAB}b`], 'the printed value keeps the tab')

// Indentation with tabs keeps working as before (one tab = one nesting level of four spaces).
assert.deepEqual(runCourseProgram(`for i in range(2):\n${TAB}print(i)`).output, ['0', '1'])
assert.deepEqual(runCourseProgram(`if True:\n${TAB}if True:\n${TAB}${TAB}print("x${TAB}y")`).output, [`x${TAB}y`])
assert.throws(() => parseCourseProgram('if True:\n  print(1)'), /4 пробела/, 'the indentation message is unchanged')

// Comparison of start and solution through the same parser.
assert.ok(sameProgram(realTab, escaped), 'real tab and its escape: same tree')
assert.ok(!sameProgram(realTab, spaces), 'tab and four spaces: different values')
assert.ok(sameProgram(`if True:\n${TAB}print(1)`, 'if True:\n    print(1)'), 'tab indentation is cosmetic')
assert.equal(isUnchangedStart(escaped, 'python', realTab, null), true)
assert.equal(isUnchangedStart(spaces, 'python', realTab, null), false)
console.log('✓ 13 проверок табуляции в учебном Python')
