// What counts as a change of the start for learning conclusions: formatting does not, content does.
// Programs are compared through the same parser that grades them; unparsable starts are never guessed.
import assert from 'node:assert/strict'
import { sameProgram, programShape, isUnchangedStart } from '../src/adaptive/evidence'

const bs = String.fromCharCode(92), q = "'", dq = '"'
const same: [string, string, string][] = [
  ['spacing', 'print(42)', 'print( 42 )'],
  ['space before call', 'print(42)', 'print (42)'],
  ['comments and blank lines', 'print(42)', '# мой вариант\nprint(42)  # готово\n\n'],
  ['tab instead of four spaces, same nesting', 'if x > 1:\n    print("a")', 'if x>1 :\n\tprint( "a" )'],
  ['quotes around the same value', `print(${q}a${bs}nb${q})`, `print(${dq}a${bs}nb${dq})`],
  ['escaped quote vs other quote style', `print(${q}it${bs}${q}s${q})`, `print(${dq}it${q}s${dq})`],
  ['backslash value', `print(${q}${bs}${bs}${q})`, `print(${dq}${bs}${bs}${dq})`],
]
const different: [string, string, string][] = [
  ['number value', 'print(42)', 'print(43)'],
  ['string value', 'print("a b")', 'print("ab")'],
  ['newline escape vs letters', `print(${q}a${bs}nb${q})`, `print(${q}a${bs}${bs}nb${q})`],
  ['int vs float literal', 'x = 1\nprint(x)', 'x = 1.0\nprint(x)'],
  ['nesting', 'if a > 1:\n    print(1)\nprint(2)', 'if a > 1:\n    print(1)\n    print(2)'],
  ['order', 'print(1)\nprint(2)', 'print(2)\nprint(1)'],
  ['operator', 'print(7 / 2)', 'print(7 // 2)'],
  ['added command', 'x = 1', 'x = 1\nprint(x)'],
  ['return x vs returnx', 'def f(x):\n    return x\nprint(f(1))', 'def f(x):\n    returnx\nprint(f(1))'],
  // Audit: separated signs must not be glued into another operator; fixing them is a change.
  ['fixed / / into //', 'print(1 / / 2)', 'print(1 // 2)'],
  ['fixed * * into **', 'print(2 * * 3)', 'print(2 ** 3)'],
  ['fixed = = into ==', 'if 1 = = 1:\n    print(1)', 'if 1 == 1:\n    print(1)'],
  // Incomplete starts: completing them is a change.
  ['incomplete call', 'print(', 'print(1)'],
  ['empty body', 'for i in range(3):', 'for i in range(3):\n    print(i)'],
]
for (const [name, a, b] of same) assert.ok(sameProgram(a, b), `same: ${name}`)
for (const [name, a, b] of different) assert.ok(!sameProgram(a, b), `different: ${name}`)

// Unparsable programs are handled explicitly: no crash, compared only as exact text.
const broken = programShape('print(1 / / 2)')
assert.equal(broken.parsed, false)
assert.ok(sameProgram('print(1 / / 2)', 'print(1 / / 2)  \n\n'), 'the same broken start sent back unchanged is unchanged')
assert.ok(!sameProgram('print(1 / / 2)', 'print(1 /  / 2)'), 'a broken program is never reinterpreted')

// The classification used by learning conclusions.
assert.equal(isUnchangedStart('print( 42 )', 'python', 'print(42)', null), true)
assert.equal(isUnchangedStart('print(1 // 2)', 'python', 'print(1 / / 2)', null), false)
assert.equal(isUnchangedStart(`print(${dq}a${bs}nb${dq})`, 'python', `print(${q}a${bs}nb${q})`, null), true)
assert.equal(isUnchangedStart('print(42)', 'python', '', null), false, 'no start, nothing to compare')
assert.equal(isUnchangedStart('', 'python', 'print(42)', null), false)
console.log(`✓ ${same.length + different.length + 8} проверок сравнения заготовки и решения`)
