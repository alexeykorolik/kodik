// Ready courses of the first Kodik version: each of its 12 chapters (100 tasks in all) becomes a
// separate school course (see chapter-courses.mjs). Data: legacy-course.json, exported from
// src/course.ts by scripts/export-legacy-course.ts.
import {readFileSync} from 'node:fs';
import {createChapterCourses,chapterTemplate} from './chapter-courses.mjs';
export const legacyCourse=JSON.parse(readFileSync(new URL('./legacy-course.json',import.meta.url),'utf8'));
export const legacyTemplate=index=>chapterTemplate(legacyCourse,index);
export function createLegacyCourse(context){
  return createChapterCourses(context,legacyCourse,{
    course:(number,chapter)=>`Kodik · ${number}. ${chapter.title}`,
    about:(number,chapter,total)=>`${chapter.description} Глава ${number} из ${total} курса первой версии Kodik, ${chapter.tasks.length} заданий.`,
    lesson:number=>`Курс первой версии Kodik, глава ${number}`,
  });
}
