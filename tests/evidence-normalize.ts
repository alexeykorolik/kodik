// What counts as a change of the start for learning conclusions: formatting does not, content does.
import assert from 'node:assert/strict'
import { normalizeProgram as n, isUnchangedStart } from '../src/adaptive/evidence'
const bs = String.fromCharCode(92)
const same: [string, string][] = [
  ['print(42)', 'print( 42 )'], ['print(42)', 'print (42)'], ['print(42)', '# мой\nprint(42)  # да\n\n'],
  ['if x > 1:\n    print("a")\nelse:\n    print("b")', "if x>1 :\n  print( 'a' )\nelse:\n\tprint(\"b\")"],
  ['total = sum([1, 2, 3])', 'total = sum([\n  1,\n  2,\n  3\n])'], ['x = 1 + 2', `x = 1 + ${bs}\n 2`],
]
const different: [string, string][] = [
  ['print(42)', 'print(43)'], ['print("a b")', 'print("ab")'], ['return x', 'returnx'],
  ['if a:\n    b()\nc()', 'if a:\n    b()\n    c()'], ['print("#")', 'print("")'], ['x = 1', 'x = 1\nprint(x)'],
]
for (const [a, b] of same) assert.equal(n(a), n(b), `${JSON.stringify(a)} ~ ${JSON.stringify(b)}`)
for (const [a, b] of different) assert.notEqual(n(a), n(b), `${JSON.stringify(a)} != ${JSON.stringify(b)}`)
assert.equal(isUnchangedStart('print( 42 )', 'python', 'print(42)', null), true)
assert.equal(isUnchangedStart('print(42 + 1)', 'python', 'print(42)', null), false)
console.log(`✓ ${same.length + different.length + 2} проверок нормализации заготовки`)
