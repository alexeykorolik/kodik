// Ready courses of the first Kodik version: each of its 12 chapters (100 tasks in all) becomes a
// separate school course with one lesson whose practice steps are the chapter's tasks.
// Data: legacy-course.json (scripts/export-legacy-course.ts). Every task passes the same quality
// gates as teacher materials (reference passes, the wrong example fails, the start does not pass,
// block solutions load and translate). One course per request, so a teacher sees progress and an
// interrupted install continues where it stopped; each course has its own import record.
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
export const legacyCourse=JSON.parse(readFileSync(new URL('./legacy-course.json',import.meta.url),'utf8'));
export const legacyTemplate=index=>`${legacyCourse.template}/${index+1}`;
const active=new Set();
export function createLegacyCourse({db,teacher,invoke,fail,tx}){
  return async function install(u){
    teacher(u);if(active.has(u.org_id))fail(409,'Курс уже готовится. Подождите и повторите.');active.add(u.org_id);
    const get=(q,...a)=>db.prepare(q).get(...a),total=legacyCourse.chapters.length;
    const record=index=>get('SELECT * FROM course_imports WHERE org_id=? AND template=?',u.org_id,legacyTemplate(index));
    try{
      const index=legacyCourse.chapters.findIndex((_,i)=>record(i)?.status!=='ready');
      if(index>=0){
        const chapter=legacyCourse.chapters[index],template=legacyTemplate(index),number=index+1;
        const imported=record(index);
        let c=imported?get('SELECT * FROM courses WHERE id=?',imported.course_id):null;
        if(!c){const id=randomUUID(),at=new Date().toISOString();tx(()=>{db.prepare('INSERT INTO courses VALUES(?,?,?,?,?)').run(id,u.org_id,`Kodik · ${number}. ${chapter.title}`,`${chapter.description} Глава ${number} из ${total} курса первой версии Kodik, ${chapter.tasks.length} заданий.`,at);db.prepare("INSERT INTO course_imports VALUES(?,?,?,'building',?)").run(u.org_id,template,id,at)});c={id}}
        let module=get('SELECT * FROM modules WHERE course_id=? ORDER BY position LIMIT 1',c.id);if(!module)module=await invoke('/api/modules',{course_id:c.id,title:chapter.title});
        let l=get('SELECT * FROM lessons WHERE module_id=? ORDER BY position LIMIT 1',module.id);
        if(!l)l=await invoke('/api/lessons',{module_id:module.id,title:chapter.title});
        l=get('SELECT * FROM lessons WHERE id=?',l.id);
        if(!l.published_version_id){
          const ids=[];
          for(const [k,m] of chapter.tasks.entries()){
            let task=get('SELECT * FROM tasks WHERE lesson_id=? AND position=?',l.id,k);
            if(!task){
              const blocks=m.blocks?{learning_config:{modes:['blocks','mixed'],palette:m.blocks.palette,...(m.blocks.starter?{starter_blocks:m.blocks.starter}:{})},block_solution:m.blocks.solution}:{learning_config:{modes:[]}};
              const created=await invoke('/api/tasks',{client_key:`legacy-v1-${l.id}-${m.key.replace(/[^a-zA-Z0-9_-]/g,'-')}`.slice(0,100),lesson_id:l.id,title:m.title,description:'',goal:m.goal,theory:m.theory,instruction:m.instruction,difficulty:'easy',starter:m.starter,hints:m.hints,check_mode:'tests',tests:m.tests,reference_solution:m.code,wrong_solutions:m.wrong,learning_rules:m.rules,...blocks});
              db.prepare('UPDATE tasks SET position=? WHERE id=?').run(k,created.id);task=get('SELECT * FROM tasks WHERE id=?',created.id);
            }
            if(!task.published){const proof=await invoke(`/api/tasks/${task.id}/verify`,{revision:task.revision});if(proof.status!=='approved')fail(409,`Курс «${chapter.title}», задание «${m.title}»: ${proof.message}`);await invoke(`/api/tasks/${task.id}/publish`,{revision:task.revision,published:true})}
            ids.push(task.id);
          }
          const first=chapter.tasks[0],last=ids.length-1;
          const steps=[
            {id:'theory',type:'text',title:'О чём занятие',body:`${chapter.description}\n\n${first.theory||first.instruction}`},
            {id:'example',type:'code',title:'Пример',body:'Прочитай программу и подумай, что она сделает. Затем нажми «Запустить пример».',code:first.code},
            ...ids.slice(0,last).map((id,i)=>({id:`practice-${i+1}`,type:'practice',title:chapter.tasks[i].title,body:chapter.tasks[i].aim,task_id:id})),
            {id:'question',type:'question',title:'Проверь понимание',body:chapter.question,choices:chapter.choices,correct_index:chapter.correct,explanation:chapter.explanation},
            {id:'final',type:'final',title:chapter.tasks[last].title,body:chapter.tasks[last].aim,task_id:ids[last]},
            {id:'summary',type:'summary',title:'Итог',body:'Что ты теперь умеешь:\n'+[...new Set(chapter.tasks.map(t=>t.goal))].slice(0,5).map(x=>'• '+x).join('\n')},
          ];
          const saved=await invoke(`/api/lesson-content/${l.id}`,{title:l.title,goal:chapter.description,description:`Курс первой версии Kodik, глава ${number}`,duration:40,teacher_notes:`«${chapter.title}»: ${chapter.tasks.length} заданий. Сначала пример и обсуждение, затем практика по порядку; вопрос перед итоговой работой проверяет понимание. Ученики, закончившие раньше, могут вернуться к заданиям с подсказками.`,steps,revision:l.revision},'PUT');
          await invoke(`/api/lesson-content/${l.id}/publish`,{revision:saved.revision});
        }
        db.prepare('UPDATE course_imports SET status=?,updated_at=? WHERE org_id=? AND template=?').run('ready',new Date().toISOString(),u.org_id,template);
      }
      const ids=legacyCourse.chapters.map((_,i)=>record(i)).filter(r=>r?.status==='ready').map(r=>r.course_id);
      return {ids,id:ids[0]||null,done:ids.length,total,ready:ids.length===total};
    }finally{active.delete(u.org_id)}
  };
}
