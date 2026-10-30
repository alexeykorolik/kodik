// Ready courses «Практикум Kodik»: 200 original practice tasks in 18 topics, from the first block
// programs to lists, functions, the Robot and turtle patterns; tasks are solved in blocks, in blocks
// + Python or in Python. One course per topic (see chapter-courses.mjs). Data: practicum.json,
// exported and checked against CPython and real Blockly by scripts/export-problem-book.ts.
import {readFileSync} from 'node:fs';
import {createChapterCourses} from './chapter-courses.mjs';
export const practicum=JSON.parse(readFileSync(new URL('./practicum.json',import.meta.url),'utf8'));
export function createPracticum(context){
  return createChapterCourses(context,practicum,{
    course:(number,chapter)=>`Практикум · ${number}. ${chapter.title}`,
    about:(number,chapter,total)=>`${chapter.description} Тема ${number} из ${total} практикума Kodik, ${chapter.tasks.length} задач с автопроверкой.`,
    lesson:number=>`Практикум Kodik, тема ${number}`,
  });
}
