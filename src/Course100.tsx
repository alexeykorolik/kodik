import { useEffect, useMemo, useState } from 'react'
import course from './course100.json'
import { solutionReferences } from './course100Solutions'
import { checkCourseTask, fixtureFor, runCourseProgram, type CourseCheck, type Segment } from './course100Runtime'
import './course100.css'

type Support = 'blocks' | 'blocks_with_code' | 'guided_code' | 'code_tokens' | 'free_code'
type Task = (typeof course.tasks)[number]
type Mastery = { score: number; independentSuccesses: number }
type CourseProgress = {
  version: 1
  completed: number[]
  stars: Record<number, number>
  attempts: Record<number, number>
  hints: Record<number, number>
  drafts: Record<number, string>
  support: Record<number, Support>
  errors: Record<number, number>
  mastery: Record<string, Mastery>
  referenceUsed: Record<number, boolean>
  currentTask: number
}
const storageKey = 'kodik-course-100-v1'
const supportSteps: Support[] = ['blocks', 'blocks_with_code', 'guided_code', 'code_tokens', 'free_code']
const supportNames: Record<Support, string> = { blocks: 'Блоки', blocks_with_code: 'Блоки и код', guided_code: 'Код с опорой', code_tokens: 'Собери код', free_code: 'Свой код' }
const questionTasks: Record<number, { source: string; answer: string }> = {
  23: { source: 'x = 2\nx = x + 3\nx = x * 2\nprint(x)', answer: '10' },
  30: { source: 'x = 1\ny = 3\nx = y + 2\ny = 10\nprint(x)', answer: '5' },
  39: { source: 'print(5 == 5)\nprint(2 > 9)\nprint(7 != 7)', answer: 'True\nFalse\nFalse' },
  40: { source: 'temperature __ 0', answer: '<' },
}
const repairStarters: Record<number, string> = {
  7: 'print("Привет"', 26: 'name = "Аня"\nprint(Name)', 27: 'city = "Минск',
  28: 'print(2 + 3', 31: 'Name = "Кодик"\nscore = "5\nprint(name + score)',
  49: 'age = 20\nif age >= 18:\nprint("Можно")',
  58: 'for i in range(1, 5):\n    print(i)',
  77: 'def square(x)\nreturn x * x\nprint(square(4))',
}
const blank = (): CourseProgress => ({ version: 1, completed: [], stars: {}, attempts: {}, hints: {}, drafts: {}, support: {}, errors: {}, mastery: {}, referenceUsed: {}, currentTask: 1 })
function readProgress(): CourseProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || 'null') as Partial<CourseProgress> | null
    if (!raw || raw.version !== 1 || !Array.isArray(raw.completed)) return blank()
    return { ...blank(), ...raw, completed: raw.completed.filter(id => Number.isInteger(id) && id >= 1 && id <= 100), stars: raw.stars || {}, attempts: raw.attempts || {}, hints: raw.hints || {}, drafts: raw.drafts || {}, support: raw.support || {}, errors: raw.errors || {}, mastery: raw.mastery || {}, referenceUsed: raw.referenceUsed || {} }
  } catch { return blank() }
}
function writeProgress(value: CourseProgress) { try { localStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* The course remains usable in this tab. */ } }
function taskAccessible(id: number, progress: CourseProgress) { return id === 1 || progress.completed.includes(id - 1) || progress.completed.includes(id) }
function taskSupport(task: Task, progress: CourseProgress): Support {
  if (progress.support[task.id]) return progress.support[task.id]
  const start = task.supportLevel as Support
  const mastered = task.skills.some(skill => (progress.mastery[skill]?.score || 0) >= 0.72 && (progress.mastery[skill]?.independentSuccesses || 0) >= 2)
  const index = supportSteps.indexOf(start)
  return mastered && index < supportSteps.length - 1 ? supportSteps[index + 1] : start
}
function snippetSet(task: Task) {
  if (task.id >= 93) return ['forward(100)', 'right(90)', 'left(120)', 'for i in range(4):\n    forward(60)']
  if (task.id >= 87) return ['name = input("Имя: ")', 'number = int(input("Число: "))', 'print(name)', 'if number >= 18:\n    print("Да")']
  if (task.id >= 79) return ['items = [1, 2, 3]', 'print(items[0])', 'for item in items:\n    print(item)', 'print(len(items))']
  if (task.id >= 69) return ['def hello():\n    print("Привет!")', 'hello()', 'return value', 'print(result)']
  if (task.id >= 51) return ['for i in range(3):\n    print(i)', 'while i < 3:\n    i = i + 1', 'print(i)', 'if i > 0:\n    print(i)']
  if (task.id >= 41) return ['if value > 0:\n    print("Да")', 'else:\n    print("Нет")', 'value = 0', 'print(value)']
  if (task.id >= 33) return ['print(8 > 5)', 'print(3 < 1)', 'print(a == b)', 'print(a != b)']
  if (task.id >= 17) return ['name = "Аня"', 'age = 12', 'print(name)', 'print(age)']
  if (task.id >= 9) return ['print(7 + 5)', 'print(20 - 8)', 'print(6 * 4)', 'print((2 + 3) * 4)']
  return ['print("Привет!")', 'print("Текст")', 'print("Код" + "ик")', 'print(1)']
}
function Drawing({ segments }: { segments: Segment[] }) {
  if (!segments.length) return null
  const points = segments.flatMap(item => [[item.x1, item.y1], [item.x2, item.y2]])
  const xs = points.map(point => point[0]), ys = points.map(point => point[1])
  const minX = Math.min(...xs), minY = Math.min(...ys), width = Math.max(1, Math.max(...xs) - minX), height = Math.max(1, Math.max(...ys) - minY)
  const scale = Math.min(280 / width, 180 / height, 3)
  const x = (value: number) => 20 + (value - minX) * scale
  const y = (value: number) => 210 - (20 + (value - minY) * scale)
  return <div className="course100-drawing"><strong>Рисунок программы</strong><svg role="img" aria-label="Результат движения черепашки" viewBox="0 0 320 220">{segments.map((segment, index) => <line key={index} x1={x(segment.x1)} y1={y(segment.y1)} x2={x(segment.x2)} y2={y(segment.y2)} />)}</svg></div>
}

export function Course100({ onExit }: { onExit: () => void }) {
  const [progress, setProgress] = useState(readProgress)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<CourseCheck | null>(null)
  const [showReference, setShowReference] = useState(false)
  const [testInputs, setTestInputs] = useState('')
  const [practiceReturn, setPracticeReturn] = useState<number | null>(null)
  const task = activeId ? course.tasks[activeId - 1] : null
  const chapter = task ? course.chapters[task.chapterId - 1] : null
  const support = task ? taskSupport(task, progress) : 'blocks'
  const chapterCompleted = (id: number) => course.tasks.filter(item => item.chapterId === id && progress.completed.includes(item.id)).length
  const save = (next: CourseProgress) => { writeProgress(next); setProgress(next) }
  const open = (id: number, returnId: number | null = null) => {
    if (!taskAccessible(id, progress)) return
    const selected = course.tasks[id - 1]
    const replay = progress.completed.includes(id) && returnId === null
    const nextProgress = replay ? { ...progress, attempts: { ...progress.attempts, [id]: 0 }, hints: { ...progress.hints, [id]: 0 }, errors: { ...progress.errors, [id]: 0 }, drafts: { ...progress.drafts, [id]: '' }, referenceUsed: { ...progress.referenceUsed, [id]: false } } : progress
    setActiveId(id); setCode(nextProgress.drafts[id] ?? repairStarters[id] ?? ''); setResult(null); setShowReference(false)
    setTestInputs(fixtureFor(id).join(', ')); setPracticeReturn(returnId)
    save({ ...nextProgress, currentTask: id, support: { ...nextProgress.support, [id]: taskSupport(selected, nextProgress) } })
    window.scrollTo(0, 0)
  }
  const updateCode = (value: string) => {
    setCode(value); setResult(null)
    if (task) save({ ...progress, drafts: { ...progress.drafts, [task.id]: value } })
  }
  const insert = (snippet: string) => updateCode(`${code.trimEnd()}${code.trim() ? '\n' : ''}${snippet}`)
  const showHint = () => {
    if (!task) return
    const next = Math.min(3, (progress.hints[task.id] || 0) + 1)
    save({ ...progress, hints: { ...progress.hints, [task.id]: next } })
  }
  const verify = () => {
    if (!task) return
    const question = questionTasks[task.id]
    const answer = code.trim().replace(/\r/g, '').replace(/[ \t]+\n/g, '\n')
    const verdict: CourseCheck = question ? { output: answer ? answer.split('\n') : [], segments: [], operations: 0, passed: answer === question.answer, message: !answer ? 'Введи ответ, затем проверь его.' : answer === question.answer ? 'Верно! Ты проследил выполнение программы.' : 'Ответ отличается. Проследи каждую строку по порядку.' } : checkCourseTask(task.id, code)
    setResult(verdict)
    const attempts = (progress.attempts[task.id] || 0) + 1
    const previousErrors = progress.errors[task.id] || 0
    const errors = verdict.passed ? 0 : previousErrors + 1
    const mastery = { ...progress.mastery }
    const affected = verdict.error && /скоб|синтакс|отступ|фрагмент|ожидается|строка/i.test(verdict.error) ? ['text_syntax'] : task.skills
    for (const skill of affected) {
      const prior = mastery[skill] || { score: 0, independentSuccesses: 0 }
      const independent = verdict.passed && (progress.hints[task.id] || 0) === 0 && attempts === 1
      mastery[skill] = { score: Math.max(0, Math.min(1, prior.score + (verdict.passed ? independent ? 0.22 : 0.09 : -0.05))), independentSuccesses: prior.independentSuccesses + (independent ? 1 : 0) }
    }
    const completed = verdict.passed ? [...new Set([...progress.completed, task.id])] : progress.completed
    const usedHints = progress.hints[task.id] || 0
    const stars = verdict.passed ? { ...progress.stars, [task.id]: Math.max(progress.stars[task.id] || 0, progress.referenceUsed[task.id] || usedHints > 1 || attempts > 2 ? 1 : usedHints === 1 || attempts === 2 ? 2 : 3) } : progress.stars
    let nextSupport = support
    if (!verdict.passed && errors >= 2) nextSupport = supportSteps[Math.max(0, supportSteps.indexOf(support) - 1)]
    save({ ...progress, attempts: { ...progress.attempts, [task.id]: attempts }, errors: { ...progress.errors, [task.id]: errors }, completed, stars, mastery, support: { ...progress.support, [task.id]: nextSupport } })
  }
  const tryRun = () => {
    if (!task) return
    const inputs = task.id >= 87 && task.id <= 92 ? testInputs.split(',').map(value => value.trim()) : []
    const trial = runCourseProgram(code, inputs)
    setResult({ ...trial, passed: false, message: trial.error || 'Пробный запуск готов. Нажми «Проверить», чтобы сверить с заданием.' })
  }
  const next = () => {
    if (!task) return
    if (practiceReturn && progress.completed.includes(task.id)) { const target = practiceReturn; setPracticeReturn(null); open(target); return }
    if (task.id < 100 && taskAccessible(task.id + 1, progress)) open(task.id + 1)
    else setActiveId(null)
  }
  const recentPractice = task && task.id > 1 ? [...course.tasks.slice(0, task.id - 1)].reverse().find(item => progress.completed.includes(item.id) && item.skills.some(skill => task.skills.includes(skill))) : undefined
  const tokens = useMemo(() => task && support === 'code_tokens' ? solutionReferences[task.id].split('\n').filter(Boolean).reverse() : [], [task, support])
  useEffect(() => { document.title = activeId ? `${task?.title} · Кодик 100` : '100 заданий · Кодик'; return () => { document.title = 'Кодик' } }, [activeId, task])

  if (!task) return <section className="course100-shell course100-map"><div className="course100-top"><button onClick={onExit}>← На главную</button><span>Кодик · 100 заданий</span></div><div className="course100-hero"><p className="eyebrow">12 глав · от команд к Python</p><h1>100 заданий для практики</h1><p>От первых строк до списков, ввода и рисунков. Проходи по порядку; звёзды показывают результат, а освоение навыков сохраняется отдельно.</p><button className="primary-button" onClick={() => open(progress.completed.includes(progress.currentTask) ? Math.min(100, progress.currentTask + 1) : progress.currentTask)}>Продолжить с задания {progress.completed.includes(progress.currentTask) ? Math.min(100, progress.currentTask + 1) : progress.currentTask} →</button><p className="course100-total">Выполнено {progress.completed.length} из 100 · {Object.values(progress.stars).reduce((sum, value) => sum + value, 0)} ★</p></div><div className="course100-chapters">{course.chapters.map(item => <section key={item.id} className="course100-chapter"><div><span>Глава {item.id} · {chapterCompleted(item.id)}/{course.tasks.filter(task => task.chapterId === item.id).length}</span><h2>{item.title}</h2><p>{item.goal}</p><details><summary>Материал главы</summary><ul>{item.theory.map((line, index) => <li key={index}>{line}</li>)}</ul></details></div><ol>{course.tasks.filter(task => task.chapterId === item.id).map(entry => <li key={entry.id}><button disabled={!taskAccessible(entry.id, progress)} onClick={() => open(entry.id)}><span>{progress.completed.includes(entry.id) ? '✓' : entry.id}</span><strong>{entry.title}</strong><small>{progress.stars[entry.id] ? `${progress.stars[entry.id]} ★` : supportNames[entry.supportLevel as Support]}</small></button></li>)}</ol></section>)}</div></section>

  return <section className="course100-shell course100-lesson" data-course-task={task.id}><div className="course100-top"><button onClick={() => setActiveId(null)}>← Карта курса</button><span>Задание {task.id} из 100</span><button onClick={onExit}>Главная</button></div><div className="course100-content"><div className="course100-work"><p className="eyebrow">Глава {chapter?.id} · {chapter?.title}</p><h1>{task.title}</h1><p className="course100-goal">{task.prompt}</p><div className="course100-facts"><span>{supportNames[support as Support]}</span><span>≈ {Math.round(task.estimatedSeconds / 60)} мин</span><span>{progress.stars[task.id] ? `${progress.stars[task.id]} ★ лучший результат` : 'До 3 ★'}</span></div><details className="course100-theory"><summary>Почему так?</summary><p>{task.theory}</p><p>{task.inputData}</p></details>{practiceReturn && <p className="course100-practice">Короткое повторение. После решения вернёшься к заданию {practiceReturn}.</p>}
    {questionTasks[task.id] && <div className="course100-question"><h2>{task.id === 40 ? 'Заполни пропуск' : 'Прочитай программу'}</h2><pre>{questionTasks[task.id].source}</pre></div>}
    {!questionTasks[task.id] && (support === 'blocks' || support === 'blocks_with_code' || support === 'guided_code') && <div className="course100-palette"><h2>{support === 'guided_code' ? 'Примеры конструкций' : 'Блоки команд'}</h2><p>Нажми пример, чтобы добавить его в программу, затем измени значения под условие.</p><div>{snippetSet(task).map((snippet, index) => <button key={index} onClick={() => insert(snippet)}><code>{snippet.replaceAll('\n', ' ↵ ')}</code><span aria-hidden="true">＋</span></button>)}</div></div>}
    {!questionTasks[task.id] && support === 'code_tokens' && <div className="course100-palette"><h2>Строки кода</h2><p>Добавляй строки, меняй порядок и редактируй итоговую программу.</p><div>{tokens.map((token, index) => <button key={index} onClick={() => insert(token)}><code>{token}</code><span aria-hidden="true">＋</span></button>)}</div></div>}
    <label className="course100-editor-label" htmlFor="course100-code">{questionTasks[task.id] ? 'Твой ответ' : 'Твоя программа на Python'}</label><textarea id="course100-code" spellCheck={false} value={code} onChange={event => updateCode(event.target.value)} onKeyDown={event => { if (event.key === 'Tab' && !questionTasks[task.id]) { event.preventDefault(); const node = event.currentTarget, start = node.selectionStart, end = node.selectionEnd; updateCode(`${code.slice(0, start)}    ${code.slice(end)}`); requestAnimationFrame(() => { node.selectionStart = node.selectionEnd = start + 4 }) } }} placeholder={questionTasks[task.id] ? task.id === 40 ? 'Напиши знак сравнения…' : 'Напиши строки вывода по порядку…' : support === 'free_code' ? 'Напиши программу здесь…' : 'Добавь блок или напиши код…'} rows={questionTasks[task.id] ? task.id === 39 ? 4 : 2 : Math.max(8, Math.min(18, code.split('\n').length + 3))} /><div className="course100-editor-actions"><button onClick={() => updateCode('')} disabled={!code}>Очистить</button>{!questionTasks[task.id] && <button onClick={tryRun} disabled={!code.trim()}>Пробный запуск</button>}<button className="course100-check" onClick={verify}>Проверить</button></div>
    {task.id >= 87 && task.id <= 92 && <label className="course100-inputs">Ввод для пробного запуска<input value={testInputs} onChange={event => setTestInputs(event.target.value)} aria-label="Ввод для пробного запуска" /><small>Если значений несколько, раздели их запятыми. Проверка задания использует данные из условия.</small></label>}
    {result && <div className={`course100-result ${result.passed ? 'passed' : ''}`} role="status"><h2>{result.passed ? 'Получилось!' : result.error ? 'Проверь код' : 'Результат запуска'}</h2><p>{result.message}</p>{result.output.length > 0 && <pre>{result.output.join('\n')}</pre>}<Drawing segments={result.segments} />{result.passed && <button className="primary-button" onClick={next}>{practiceReturn ? 'Вернуться к заданию' : task.id < 100 ? 'Следующее задание' : 'К карте курса'} →</button>}{!result.passed && (progress.errors[task.id] || 0) >= 2 && recentPractice && <button onClick={() => open(recentPractice.id, task.id)}>Закрепить на примере: {recentPractice.title}</button>}</div>}
  </div><aside className="course100-side"><h2>О задании</h2><p>{task.goal}</p><h3>Ожидаемый результат</h3><p>{task.expectedResult}</p><h3>Подсказки</h3><p>Открывай по одной, когда понадобится.</p>{task.hints.slice(0, progress.hints[task.id] || 0).map((hint, index) => <p className="course100-hint" key={index}><strong>{index + 1}.</strong> {hint}</p>)}{(progress.hints[task.id] || 0) < 3 && <button onClick={showHint}>Показать подсказку {(progress.hints[task.id] || 0) + 1} из 3</button>}{(progress.hints[task.id] || 0) >= 3 && <button onClick={() => { if (!showReference) save({ ...progress, referenceUsed: { ...progress.referenceUsed, [task.id]: true } }); setShowReference(value => !value) }}>{showReference ? 'Скрыть' : 'Показать'} пример решения</button>}{showReference && <pre className="course100-reference">{questionTasks[task.id]?.answer || solutionReferences[task.id]}</pre>}<h3>Навыки</h3><div className="course100-skills">{task.skills.map(skill => <span key={skill}>{skill}</span>)}</div></aside></div></section>
}
