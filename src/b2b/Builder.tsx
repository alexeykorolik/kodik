import { useEffect, useState } from "react";
import { api, type Row, type State } from "./api";
import { MinimalCodeEditor } from "../MinimalCodeEditor";
import { Badge, Glyph, Header } from "./App";
import { useMaterialDraft } from "./useMaterialDraft";
import { learningRules } from './learningRules';
import { BlockEditor } from './BlockEditor';
import { BLOCKS } from '../adaptive/blockProgram';
import { EMPTY_CONFIG, SKILLS } from '../adaptive/learningConfig';
import {analyzeReference,skillLabel} from '../adaptive/referenceAnalysis';
const steps = [
  "Основная информация",
  "Содержимое",
  "Редактор",
  "Проверка",
  "Предпросмотр",
  "Публикация",
];
const signature=(t:Row)=>JSON.stringify([t.lesson_id,t.title,t.description,t.goal,t.theory,t.instruction,t.difficulty,t.starter,t.hints,t.check_mode,t.tests,t.reference_solution,t.wrong_solutions,t.manual_criteria,t.preview_solution,t.template_id,t.learning_rules||[],t.learning_config,t.block_solution]);
export function Builder({
  state: s,
  id,
  initialLesson,
  onSaved,
  onBack,
}: {
  state: State;
  id: string;
  initialLesson: string;
  onSaved: (id: string) => Promise<void>;
  onBack: () => void;
}) {
  const original = s.tasks.find((t) => t.id === id);
  const initial:Row = original
    ? { ...original }
    : {
        title: "",
        description: "",
        goal: "",
        theory: "",
        instruction: "",
        difficulty: "easy",
        lesson_id: initialLesson || s.lessons[0]?.id || "",
        starter: "# Напиши решение здесь\n",
        hints: [],
        check_mode: "output",
        tests: [{ inputs: [], expected: "", hidden: false }],
        reference_solution:"",wrong_solutions:[],manual_criteria:"",preview_solution:"",template_id:"",
        learning_rules:[],learning_config:EMPTY_CONFIG,block_solution:null,
      };
  const draft = useMaterialDraft(
    initial,
    s.user as { id: string; org_id: string },
    id,
  );
  const { task, change: set } = draft;
  const config = task.learning_config || EMPTY_CONFIG;
  const setConfig = (field:string,value:unknown) => set('learning_config',{...config,[field]:value});
  const analysis=analyzeReference(task.reference_solution||'');
  const [familySource,setFamilySource]=useState('');
  const [templates,setTemplates]=useState<Row[]>([]),[selectedTemplate,setSelectedTemplate]=useState(''),[verification,setVerification]=useState<Row|null>(initial.verification?{...initial.verification,signature:signature(initial)}:null);
  const [verificationHistory,setVerificationHistory]=useState<Row[]|null>(null);
  useEffect(()=>{let active=true;api('/task-templates').then(r=>{if(active)setTemplates(r.items)}).catch(e=>setError(e.message));return()=>{active=false}},[]);
  const requested=Number(new URLSearchParams(location.hash.split("?")[1]).get("step")||0);
  const [step, setStep] = useState([0,1,2,3,5].includes(requested)?requested:0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const approved=verification?.status==='approved'&&verification.signature===signature(task)&&verification.revision===draft.serverRevision&&!draft.hasChanges;
  const issues:[number,string][]=[];
  if(!task.title.trim())issues.push([0,'Заполните название задания.']);
  if(!task.instruction.trim())issues.push([1,'Добавьте понятное условие.']);
  if(task.check_mode==='manual'){if(!task.manual_criteria.trim())issues.push([3,'Добавьте критерии ручной оценки.'])}
  else {if(!task.reference_solution.trim())issues.push([3,'Сохраните закрытый эталон.']);if(!task.wrong_solutions.length||task.wrong_solutions.some((s:string)=>!s.trim()))issues.push([3,'Подготовьте характерный неправильный пример.']);if(!task.tests.length)issues.push([3,'Добавьте тесты.'])}
  if(!approved)issues.push([3,'Подтвердите проверку текущей ревизии.']);
  async function gotoStep(index:number){setError('');if(index!==4){setStep(index);return}setBusy(true);try{const saved=await draft.persist();location.hash=`preview/${saved.id}`}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function verify(){setBusy(true);setError('');try{const saved=await draft.persist();const proof=await api(`/tasks/${saved.id}/verify`,{revision:saved.revision});setVerification({...proof,signature:signature(task)});setError(proof.message)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function loadHistory(){try{const id=draft.serverId||(await draft.persist()).id;setVerificationHistory((await api(`/tasks/${id}/verifications`)).items)}catch(e){setError((e as Error).message)}}
  async function replayProof(record:Row){setBusy(true);try{const result=await api(`/tasks/${draft.serverId}/verify`,{revision:record.revision,verification_id:record.id});if(result.publication_eligible)setVerification({...result,signature:signature(task)});setError(`Повторная проверка ревизии ${record.revision}: ${result.message}${result.publication_eligible?'':' Текущая ревизия этим результатом не подтверждена.'}`);await loadHistory()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  const courseOf = (lid: string) => {
    const l = s.lessons.find((l) => l.id === lid),
      m = s.modules.find((m) => m.id === l?.module_id),
      c = s.courses.find((c) => c.id === m?.course_id);
    return `${c?.title} / ${m?.title} / ${l?.title}`;
  };
  async function save(publish = false) {
    setBusy(true);
    setError("");
    try {
      const result = await draft.persist();
      const tid = result.id;
      if (publish) await api(`/tasks/${tid}/publish`, { published: true,revision:result.revision });
      await onSaved(tid);
      if (!publish) setError("Черновик сохранён.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function changeTest(i: number, key: string, value: unknown) {
    set(
      "tests",
      task.tests.map((t: Row, n: number) =>
        n === i ? { ...t, [key]: value } : t,
      ),
    );
  }
  return (
    <>
      <button className="link breadcrumb" onClick={onBack}>
        ← Все задания
      </button>
      <Header
        eyebrow="КОНСТРУКТОР ЗАДАНИЙ"
        title={original ? "Редактирование задания" : "От идеи — к практике"}
        text="Шесть шагов, чтобы создать полезное учебное задание."
      >
        <Badge>
          {{
                saved: "Сохранено на сервере",
                saving: "Сохраняем…",
                local: "Сохранено на компьютере",
                conflict: "Конфликт версий",
                error: "Нужна синхронизация",
              }[draft.status]}
        </Badge>
        <button disabled={busy} onClick={() => save()}>
          Сохранить черновик
        </button>
      </Header>
      {step===0&&<section className="panel task-template-picker"><label>Начать с шаблона<select value={selectedTemplate} onChange={e=>setSelectedTemplate(e.target.value)} aria-label="Начать с шаблона"><option value="">Выберите пример</option>{templates.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label><button disabled={busy||!selectedTemplate} onClick={async()=>{setBusy(true);try{await draft.persist();const template=templates.find(t=>t.id===selectedTemplate)!;for(const [field,value] of Object.entries({...template.task,template_id:template.id}))set(field,value);setVerification(null)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>Применить шаблон к черновику</button><p>Шаблон заполняет цель, условие, объяснение и проверку. Измените их под свой урок; перед публикацией нужна проверка.</p></section>}
      {draft.error && (
        <div className="notice" role="status">
          {draft.error}
        </div>
      )}
      {draft.conflict && (
        <section
          className="panel conflict-panel"
          aria-label="Разрешение конфликта"
        >
          <h2>Сохранены две версии материала</h2>
          <p>
            Ваш текст сохранён отдельно. Сравните его с последним серверным
            вариантом; история обеих правок останется доступна.
          </p>
          <div className="form-columns">
            <div>
              <h3>Моя версия</h3>
              <MaterialSummary task={task}/>
            </div>
            <div>
              <h3>Последняя версия школы</h3>
              <MaterialSummary task={draft.conflict.current}/>
            </div>
          </div>
          <div className="actions">
            <button onClick={() => void draft.resolveConflict("server")}>
              Продолжить с серверной версией
            </button>
            <button
              className="primary"
              onClick={() => void draft.resolveConflict("mine").catch(() => {})}
            >
              Применить мою версию с сохранением истории
            </button>
          </div>
        </section>
      )}
      {original?.published && (
        <div className="notice">
          Изменения сохраняются в черновик. Публикация создаст новую версию для будущих назначений; текущие группы продолжат прежнюю.
        </div>
      )}
      <div className="builder-steps">
        {steps.map((name, i) => (
          <button
            key={name}
            className={step === i ? "active" : step > i ? "complete" : ""}
            onClick={() => {
              void gotoStep(i);
            }}
          >
            <span>{step > i ? "✓" : i + 1}</span>
            {name}
          </button>
        ))}
      </div>
      <section className="panel builder-panel">
        <div className="builder-heading">
          <span className="overline">ШАГ {step + 1} ИЗ 6</span>
          <h2>{steps[step]}</h2>
          <p className="muted">
            {
              [
                "Дайте заданию имя и найдите ему место в программе.",
                "Объясните идею, добавьте теорию и понятные инструкции.",
                "Подготовьте место, в котором ученик начнёт своё решение.",
                "Определите, как ученик узнает, что справился.",
                "Посмотрите на задание глазами ученика.",
                "Осталось сохранить и открыть задание для назначения группам.",
              ][step]
            }
          </p>
        </div>
        <fieldset disabled={busy} className="builder-fields">
          {step === 0 && (
            <>
              <label>
                Название задания
                <input
                  value={task.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={200}
                  placeholder="Например, Поздороваемся с миром"
                />
              </label>
              <label>
                Место в программе
                <select
                  aria-label="Место в программе"
                  value={task.lesson_id}
                  onChange={(e) => set("lesson_id", e.target.value)}
                >
                  <option value="" disabled>
                    Выберите урок
                  </option>
                  {s.lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {courseOf(l.id)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-columns">
                <label>
                  Уровень сложности
                  <select
                    aria-label="Уровень сложности"
                    value={task.difficulty}
                    onChange={(e) => set("difficulty", e.target.value)}
                  >
                    <option value="easy">Начальный</option>
                    <option value="medium">Средний</option>
                    <option value="hard">Продвинутый</option>
                  </select>
                </label>
                <label>
                  Тип задания
                  <input value="Практика Python" readOnly />
                </label>
              </div>
              <label>
                Краткое описание
                <textarea
                  value={task.description}
                  rows={3}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="О чём это задание?"
                />
              </label>
              <label>
                Учебная цель
                <input
                  value={task.goal}
                  onChange={(e) => set("goal", e.target.value)}
                  placeholder="Чему научится ученик?"
                />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <label>
                Теория перед заданием
                <textarea
                  rows={7}
                  value={task.theory}
                  onChange={(e) => set("theory", e.target.value)}
                  placeholder="Коротко объясните новую тему. Материал отображается как обычный текст."
                />
              </label>
              <label>
                Инструкция для ученика
                <textarea
                  rows={6}
                  value={task.instruction}
                  onChange={(e) => set("instruction", e.target.value)}
                  placeholder="Что нужно сделать и какой результат получить?"
                />
              </label>
              <label>
                Подсказки <span className="muted">— по одной на строку</span>
                <textarea
                  rows={4}
                  value={task.hints.join("\n")}
                  onChange={(e) => set("hints", e.target.value.split("\n"))}
                />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <section aria-label="Способы решения"><h3>Способы решения</h3><p>Python поддерживается платформой. При выдаче вы выберете, что разрешено группе.</p>
              {(['blocks','mixed'] as const).map(mode=><label className="checkbox" key={mode}><input type="checkbox" disabled={task.check_mode==='manual'} checked={config.modes.includes(mode)} onChange={e=>set('learning_config',{...config,modes:e.target.checked?[...config.modes,mode]:config.modes.filter((m:string)=>m!==mode),palette:config.palette.length?config.palette:BLOCKS.map(b=>b.type)})}/>{mode==='blocks'?'Блоки':'Блоки + Python'}</label>)}</section>
              <details><summary>Целевые навыки и набор блоков</summary><p>Отметьте цели сами: готовая конструкция в заготовке не доказывает навык ученика.</p>
              <p>Копии и версии одного упражнения считаются одним семейством. Если создаёте похожий вариант заново, свяжите его с исходным упражнением до первой публикации.</p><label>Вариант существующего задания<select value={familySource} onChange={e=>setFamilySource(e.target.value)} disabled={!!task.published_version_id}><option value="">Отдельное упражнение</option>{s.tasks.filter(t=>t.id!==task.id).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><button type="button" disabled={!familySource||!!task.published_version_id} onClick={async()=>{try{const saved=await draft.persist();await api(`/tasks/${saved.id}/family`,{source_task_id:familySource},'PUT');setError('Вариант связан с семейством исходного задания.')}catch(e){setError((e as Error).message)}}}>Связать с исходным упражнением</button>
              <p>В эталоне обнаружено: {analysis.skills.map(skillLabel).join(', ')||'пока ничего'}. Это предложения для автора.</p><button type="button" disabled={!analysis.skills.length} onClick={()=>setConfig('skills',analysis.skills)}>Подтвердить обнаруженное как цели задания</button><button type="button" disabled={!analysis.palette.length} onClick={()=>setConfig('palette',analysis.palette)}>Предложить палитру по эталону</button>{analysis.reasons.map(r=><p key={r}>{r} Можно подготовить другой эквивалентный блоковый образец.</p>)}
              {SKILLS.map(skill=><label className="checkbox" key={skill.id}><input type="checkbox" checked={config.skills.includes(skill.id)} onChange={e=>setConfig('skills',e.target.checked?[...config.skills,skill.id]:config.skills.filter((s:string)=>s!==skill.id))}/>{skill.label}</label>)}
              {config.modes.length>0&&<fieldset><legend>Блоки этого задания</legend>{BLOCKS.map(b=><label className="checkbox" key={b.type}><input type="checkbox" checked={config.palette.includes(b.type)} onChange={e=>setConfig('palette',e.target.checked?[...config.palette,b.type]:config.palette.filter((t:string)=>t!==b.type))}/>{b.label}</label>)}</fieldset>}</details>
              {config.modes.length>0&&<><details open><summary>Стартовые блоки ученика</summary><p>Можно оставить незаполненные места. Закрытый образец ниже хранится отдельно.</p><div className="author-blocks"><BlockEditor value={config.starter_blocks} palette={config.palette} onChange={w=>setConfig('starter_blocks',w)}/></div></details>
              <details><summary>Закрытый блоковый образец</summary><p>Соберите полное решение. Оно должно пройти те же тесты и учебные правила. Ученик его не увидит.</p><div className="author-blocks"><BlockEditor value={task.block_solution} palette={config.palette} onChange={w=>set('block_solution',w)} label="Закрытый блоковый образец"/></div></details></>}
              <label>Стартовый код</label>
              <MinimalCodeEditor
                value={task.starter}
                onChange={(v) => set("starter", v)}
                rows={12}
              />
              <details className="runtime-info">
                <summary>Возможности учебного Python</summary>
                <p>
                  print, input, int, str, len (списки), range, переменные,
                  списки, if/else, for/while и функции. Используйте отступы в 4
                  пробела. Импорты, файлы, сеть, классы и внешние библиотеки
                  недоступны. Это учебное подмножество Python.
                </p>
              </details>
            </>
          )}
          {step === 3 && (
            <>
              {task.check_mode==='manual'?<label>Критерии ручной проверки<textarea aria-label="Критерии ручной проверки" rows={4} value={task.manual_criteria} onChange={e=>set('manual_criteria',e.target.value)} placeholder="Что должно быть в работе и по каким признакам она будет принята?"/></label>:<><label>Эталонное решение · только преподавателю<textarea aria-label="Эталонное решение · только преподавателю" className="code-field" rows={7} value={task.reference_solution} onChange={e=>set('reference_solution',e.target.value)} placeholder="Правильная программа для всех открытых и скрытых тестов"/></label><h3>Характерные неправильные решения · закрытые примеры</h3>{task.wrong_solutions.map((code:string,i:number)=><div className="test-card" key={i}><label>Неправильный пример {i+1}<textarea aria-label={'Неправильный пример '+(i+1)} rows={4} className="code-field" value={code} onChange={e=>set('wrong_solutions',task.wrong_solutions.map((v:string,j:number)=>i===j?e.target.value:v))}/></label><button onClick={()=>set('wrong_solutions',task.wrong_solutions.filter((_:string,j:number)=>j!==i))}>Удалить неправильный пример</button></div>)}<button disabled={task.wrong_solutions.length>=6} onClick={()=>set('wrong_solutions',[...task.wrong_solutions,''])}>Добавить неправильный пример</button></>}
              <div className="verification-panel"><button className="primary" disabled={busy} onClick={()=>void verify()}>{busy?'Проверяем…':task.check_mode==='manual'?'Подтвердить критерии':'Проверить эталон и неправильные примеры'}</button><p role="status">{approved?'Текущая ревизия подтверждена.':'После изменений нужна новая проверка перед публикацией.'}</p>{verification&&<p>{verification.message||`Подтверждена ревизия ${verification.revision}`}</p>}</div>
              <button onClick={()=>void loadHistory()}>История проверок качества</button>{verificationHistory&&<section className="quality-history"><h3>Сохранённые проверки</h3>{verificationHistory.length?verificationHistory.map(v=><article key={v.id}><b>Ревизия {v.revision} · {v.status==='approved'?'Подтверждена':v.status==='weak_tests'?'Нужны сильнее тесты':v.status==='bad_reference'?'Эталон не прошёл':'Техническая ошибка'}</b><p>{new Date(v.created_at).toLocaleString('ru')} · {s.users.find(u=>u.id===v.author_id)?.name||'Преподаватель'}</p><button disabled={busy} onClick={()=>void replayProof(v)}>Повторить проверку ревизии {v.revision}</button></article>):<p>Проверок пока нет.</p>}</section>}
              <label>
                Способ проверки
                <select
                  aria-label="Способ проверки"
                  value={task.check_mode}
                  onChange={(e) => {set("check_mode", e.target.value);if(e.target.value==='manual')set('learning_rules',[])}}
                >
                  <option value="output">Ожидаемый вывод</option>
                  <option value="tests">Входные данные и тест-кейсы</option>
                  <option value="manual">Ручная проверка преподавателем</option>
                </select>
              </label>
              {task.check_mode === "manual" ? (
                <div className="info-box">
                  Решение сохранится со статусом «На проверке». Преподаватель
                  сможет прочитать код, принять его или вернуть с комментарием.
                </div>
              ) : (
                <>
                  <section aria-label="Учебные приёмы" className="info-box">
                    <h3>Что нужно применить в решении</h3>
                    <p>Выберите приёмы, которые входят в цель задания. Они должны влиять на результат программы; комментарии и неиспользуемый код не засчитываются. Пустой выбор проверяет только результат.</p>
                    {learningRules.map(rule=><label className="checkbox" key={rule.id}><input type="checkbox" checked={(task.learning_rules||[]).includes(rule.id)} onChange={e=>set('learning_rules',e.target.checked?[...(task.learning_rules||[]),rule.id]:(task.learning_rules||[]).filter((id:string)=>id!==rule.id))}/>{rule.label}</label>)}
                  </section>
                  <p className="muted">
                    Вывод сравнивается точно, без учёта завершающих пробелов и
                    переносов. Для input укажите каждую строку ввода отдельно.
                    Скрытые данные остаются на сервере.
                  </p>
                  {task.tests.map((t: Row, i: number) => (
                    <div className="test-card" key={i}>
                      <div className="section-title">
                        <h3>Тест {i + 1}</h3>
                        <button
                          type="button"
                          className="link subtle"
                          disabled={task.tests.length === 1}
                          onClick={() =>
                            set(
                              "tests",
                              task.tests.filter((_: Row, n: number) => n !== i),
                            )
                          }
                        >
                          Удалить
                        </button>
                      </div>
                      <div className="form-columns">
                        <label>
                          Входные данные
                          <textarea
                            rows={3}
                            value={t.inputs.join("\n")}
                            onChange={(e) =>
                              changeTest(
                                i,
                                "inputs",
                                e.target.value === ""
                                  ? []
                                  : e.target.value.split("\n"),
                              )
                            }
                            placeholder="Каждый input — новая строка"
                          />
                        </label>
                        <label>
                          Ожидаемый вывод
                          <textarea
                            rows={3}
                            value={t.expected}
                            onChange={(e) =>
                              changeTest(i, "expected", e.target.value)
                            }
                          />
                        </label>
                      </div>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={t.hidden}
                          onChange={(e) =>
                            changeTest(i, "hidden", e.target.checked)
                          }
                        />
                        Скрытый тест
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={task.tests.length >= 12}
                    onClick={() =>
                      set("tests", [
                        ...task.tests,
                        { inputs: [], expected: "", hidden: false },
                      ])
                    }
                  >
                    + Добавить тест
                  </button>
                </>
              )}
            </>
          )}
        </fieldset>
        {step === 5 && (
          <div className="publish-summary">
            <span className="publish-icon">
              <Glyph name="book" />
            </span>
            <h2>{task.title || "Ваше новое задание"}</h2>
            <p>{courseOf(task.lesson_id)}</p>
            <div className="summary-tags">
              <Badge>{['Python',...config.modes.map((m:string)=>m==='blocks'?'Блоки':'Блоки + Python')].join(' · ')}</Badge>
              <Badge>
                {task.check_mode === "manual"
                  ? "Ручная проверка"
                  : `${task.tests.length} тестов`}
              </Badge>
              <Badge>{task.hints.filter(Boolean).length} подсказок</Badge>
            </div>
            <p>Набор: {config.palette.length} блоков. Цели: {config.skills.map((id:string)=>SKILLS.find(s=>s.id===id)?.label).join(', ')||'не выбраны'}. {original?.published?'Новая публикация сохранит прежние назначения без изменений.':''}</p>
            <p className="muted">
              После публикации назначьте задание группе в разделе «Учебные
              группы». Ученики других групп его не увидят.
            </p>
            {issues.length>0&&<section className="publication-issues"><h3>Что ещё подготовить</h3><ul>{issues.map(([index,message])=><li key={message}><button className="link" onClick={()=>void gotoStep(index)}>{message}</button></li>)}</ul></section>}
            <button
              className="primary"
              disabled={busy||issues.length>0}
              onClick={() => save(true)}
            >
              {busy ? "Публикуем…" : "Сохранить и опубликовать"}
              <Glyph name="arrow" />
            </button>
          </div>
        )}
        {error && (
          <p
            role="status"
            className={
              error === "Черновик сохранён." ? "success-message" : "error"
            }
          >
            {error}
          </p>
        )}
        <div className="builder-footer">
          <button
            disabled={step === 0}
            onClick={() => {
              setStep(step - 1);
              setError("");
            }}
          >
            ← Назад
          </button>
          <span className="muted">{step + 1} / 6</span>
          {step < 5 ? (
            <button
              className="primary"
              onClick={() => {
                void gotoStep(step + 1);
              }}
            >
              Продолжить
              <Glyph name="arrow" />
            </button>
          ) : (
            <button disabled={busy} onClick={() => save()}>
              Оставить в черновиках
            </button>
          )}
        </div>
      </section>
    </>
  );
}

function MaterialSummary({task}:{task:Row}){return <><h4>{task.title||'Без названия'}</h4><p>{task.instruction||'Условие пока пустое'}</p><details><summary>Теория и стартовое состояние</summary><p>{task.theory}</p><pre>{task.starter}</pre><p>Способы: {['Python',...(task.learning_config?.modes||[]).map((m:string)=>m==='blocks'?'Блоки':'Блоки + Python')].join(', ')}</p></details></>}
