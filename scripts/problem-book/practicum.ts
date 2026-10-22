// «Практикум Kodik»: 200 original practice tasks in a second ready set, from the first block
// programs to lists, functions, the Robot and turtle patterns. Every chapter lives in its own file
// in practicum/; this list is the order of the courses. Blocks chapters come first: a child starts
// with blocks, then sees the same ideas as Python. Exported and checked by
// scripts/export-problem-book.ts → server/b2b/practicum.json.
import type { Chapter } from "./tasks";
import { blocksStart } from "./practicum/blocks-start";
import { blocksCalc } from "./practicum/blocks-calc";
import { blocksIf } from "./practicum/blocks-if";
import { blocksLoops } from "./practicum/blocks-loops";
import { blocksFunc } from "./practicum/blocks-func";
import { mixedAlgo } from "./practicum/mixed-algo";
import { pyFormat } from "./practicum/py-format";
import { pyBranch } from "./practicum/py-branch";
import { pyFor } from "./practicum/py-for";
import { pyWhile } from "./practicum/py-while";
import { pyDivisors } from "./practicum/py-divisors";
import { pyNested } from "./practicum/py-nested";
import { pyStrings } from "./practicum/py-strings";
import { pyFunctions } from "./practicum/py-functions";
import { pyLists } from "./practicum/py-lists";
import { pyMath } from "./practicum/py-math";
import { robotFunc } from "./practicum/robot-func";
import { turtlePatterns } from "./practicum/turtle-patterns";

export const chapters: Chapter[] = [
  blocksStart, blocksCalc, blocksIf, blocksLoops, blocksFunc, mixedAlgo,
  pyFormat, pyBranch, pyFor, pyWhile, pyDivisors, pyNested, pyStrings, pyFunctions, pyLists, pyMath, robotFunc, turtlePatterns,
];
