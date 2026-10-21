// Ready courses «Задачник Kodik»: original practice problems in the order of a school problem book,
// one course per topic (see chapter-courses.mjs). Data: problem-book.json, exported and checked
// against CPython by scripts/export-problem-book.ts.
import {readFileSync} from 'node:fs';
import {createChapterCourses} from './chapter-courses.mjs';
export const problemBook=JSON.parse(readFileSync(new URL('./problem-book.json',import.meta.url),'utf8'));
export function createProblemBook(context){
  return createChapterCourses(context,problemBook,{
    course:(number,chapter)=>`Задачник · ${number}. ${chapter.title}`,
    about:(number,chapter,total)=>`${chapter.description} Тема ${number} из ${total} задачника Kodik, ${chapter.tasks.length} задач с автопроверкой.`,
    lesson:number=>`Задачник Kodik, тема ${number}`,
  });
}
