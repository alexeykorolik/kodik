// One definition of "the program printed the expected text", shared by the school grader
// (server/b2b/grader.mjs) and every client view (preview, PoC). Rules:
//  - the interpreter returns output as lines; they are joined with "\n";
//  - Windows line endings are equivalent to "\n";
//  - trailing whitespace at the very end of the whole output is ignored
//    (a final newline from print() must not matter);
//  - trailing spaces INSIDE the output are significant;
//  - empty output equals an empty expected value.
// A run that ended with an error is never compared: it is a runtime error, not a wrong answer.
export const joinOutput = (lines) => lines.join("\n");
export const normalizeOutput = (text) => String(text).replace(/\r\n/g, "\n").trimEnd();
export const outputMatches = (lines, expected) => normalizeOutput(joinOutput(lines)) === normalizeOutput(expected);
