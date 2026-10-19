/**
 * Technical proof of concept (dev only: `npm run dev` → /adaptive-poc.html).
 * Not part of the production build and not connected to the B2B API.
 * Server-side grading of block programs is proven by tests/adaptive-blockly.poc.ts.
 */
import { StrictMode, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Blockly from 'blockly'
import * as ruModule from 'blockly/msg/ru'
import { BLOCKS, translateWorkspace, type Translation } from '../blockProgram'
import { registerToolboxButtons, toolboxFor } from '../blocklyBlocks'
import { analyzeReference, skillLabel } from '../referenceAnalysis'
import { parseCourseProgram, runPythonAst } from '../../pythonRuntime'
import '../../../docs/design/prototype/tokens.css'
import './poc.css'

Blockly.setLocale(Object.fromEntries(Object.entries(ruModule).filter(([k]) => k !== 'default')) as Record<string, string>)
const theme = Blockly.Theme.defineTheme('kodik-b2b-poc', {
  name: 'kodik-b2b-poc', base: Blockly.Themes.Classic,
  componentStyles: { workspaceBackgroundColour: '#f8f7f2', toolboxBackgroundColour: '#edf0e8', flyoutBackgroundColour: '#fffefa', scrollbarColour: '#b7cfca' },
  fontStyle: { family: 'Nunito, Arial, sans-serif', weight: '600', size: 14 }
})

type Test = { inputs: string; expected: string; hidden: boolean }
type Mode = 'blocks' | 'mixed' | 'python'
const MODE_LABEL: Record<Mode, string> = { blocks: 'Блоки', mixed: 'Блоки + Python', python: 'Python' }
const store = { get: (k: string) => { try { return localStorage.getItem('kodik-poc:' + k) } catch { return null } }, set: (k: string, v: string) => { try { localStorage.setItem('kodik-poc:' + k, v) } catch { /* private mode */ } } }

function run(code: string, inputs: string[]) {
  try { const r = runPythonAst(parseCourseProgram(code), inputs); return { output: r.output.join(''), error: r.error } } catch (e) { return { output: '', error: (e as Error).message } }
}
const normalize = (s: string) => s.replace(/\r\n/g, '\n').split('\n').map(l => l.trimEnd()).join('\n').trim()
function highlight(line: string) {
  const parts: ReactNode[] = []; let rest = line, k = 0
  const re = /("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|(\b(?:if|elif|else|while|for|in|def|return|and|or|not|pass|True|False|None)\b)|(\b(?:print|input|int|str|len|range)\b)/
  while (rest) {
    const m = re.exec(rest); if (!m) { parts.push(rest); break }
    if (m.index) parts.push(rest.slice(0, m.index))
    parts.push(<span key={k++} className={m[1] ? 'st' : m[2] ? 'nm' : m[3] ? 'kw' : 'fn'}>{m[0]}</span>)
    rest = rest.slice(m.index + m[0].length)
  }
  return parts
}

function App() {
  const [reference, setReference] = useState(store.get('reference') ?? 'n = int(input())\nprint(n * 2)\n')
  const [tests, setTests] = useState<Test[]>(() => JSON.parse(store.get('tests') ?? 'null') ?? [{ inputs: '2', expected: '4', hidden: false }, { inputs: '0', expected: '0', hidden: false }, { inputs: '21', expected: '42', hidden: true }])
  const analysis = useMemo(() => analyzeReference(reference), [reference])
  const [palette, setPalette] = useState<string[]>(() => JSON.parse(store.get('palette') ?? 'null') ?? analysis.palette)
  const [mode, setMode] = useState<Mode>((store.get('mode') as Mode) ?? 'mixed')
  const [translation, setTranslation] = useState<Translation | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [pythonDraft, setPythonDraft] = useState(store.get('python') ?? '# Напиши решение здесь\n')
  const [stdin, setStdin] = useState('21')
  const [result, setResult] = useState<{ kind: 'run' | 'check'; text?: string; error?: string; cases?: { i: number; hidden: boolean; passed: boolean; inputs: string; expected: string; got: string }[] } | null>(null)
  const host = useRef<HTMLDivElement>(null), ws = useRef<Blockly.WorkspaceSvg | null>(null)

  useEffect(() => { store.set('reference', reference); store.set('tests', JSON.stringify(tests)); store.set('palette', JSON.stringify(palette)); store.set('mode', mode); store.set('python', pythonDraft) }, [reference, tests, palette, mode, pythonDraft])

  // One Blockly workspace for both visual modes: switching between them never loses blocks.
  useEffect(() => {
    if (mode === 'python' || !host.current) return
    const w = Blockly.inject(host.current, { theme, toolbox: toolboxFor(palette), renderer: 'zelos', trashcan: true, sounds: false, zoom: { controls: true, wheel: true, startScale: 0.9 }, grid: { spacing: 24, length: 2, colour: '#e2e5dd', snap: true } })
    ws.current = w; registerToolboxButtons(w)
    try { const saved = store.get('blocks'); if (saved) Blockly.serialization.workspaces.load(JSON.parse(saved), w) } catch (e) { console.warn('Черновик блоков не загружен:', e) }
    const update = (e?: Blockly.Events.Abstract) => {
      if (e?.type === Blockly.Events.SELECTED) { setSelected((e as Blockly.Events.Selected).newElementId ?? null); return }
      if (e?.isUiEvent) return
      const json = Blockly.serialization.workspaces.save(w)
      store.set('blocks', JSON.stringify(json))
      setTranslation(translateWorkspace(json, { allowed: palette }))
    }
    update(); w.addChangeListener(update)
    const ro = new ResizeObserver(() => Blockly.svgResize(w)); ro.observe(host.current)
    // Detach before dispose: disposal fires delete events that would overwrite the saved draft with an empty program.
    return () => { ro.disconnect(); w.removeChangeListener(update); w.dispose(); ws.current = null }
  }, [mode === 'python', palette.join()])

  const code = mode === 'python' ? pythonDraft : translation?.ok ? translation.python : ''
  const highlightedLines = useMemo(() => {
    if (!selected || !translation) return new Set<number>()
    let block = ws.current?.getBlockById(selected) ?? null
    while (block && !translation.lines[block.id]) block = block.getParent()
    const range = block ? translation.lines[block.id] : undefined
    return new Set(range ? Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i) : [])
  }, [selected, translation])

  const doRun = () => {
    if (mode !== 'python' && !translation?.ok) { setResult({ kind: 'run', error: translation?.errors[0]?.message ?? 'Собери программу из блоков.' }); return }
    const r = run(code, stdin === '' ? [] : stdin.split('\n'))
    setResult({ kind: 'run', text: r.output, error: r.error })
  }
  const doCheck = () => {
    if (mode !== 'python' && !translation?.ok) { setResult({ kind: 'check', error: translation?.errors[0]?.message ?? 'Собери программу из блоков.' }); return }
    const cases = tests.map((t, i) => { const r = run(code, t.inputs === '' ? [] : t.inputs.split('\n')); return { i: i + 1, hidden: t.hidden, passed: !r.error && normalize(r.output) === normalize(t.expected), inputs: t.inputs, expected: t.expected, got: r.error ? 'Ошибка: ' + r.error : r.output } })
    setResult({ kind: 'check', cases })
  }
  const selectBlock = (id?: string) => { const b = id ? ws.current?.getBlockById(id) : null; if (b && ws.current) { b.select(); ws.current.centerOnBlock(b.id) } }

  return <div className="poc">
    <header className="poc-top"><b>Kodik · технический PoC</b><span>Blockly → Python → учебный интерпретатор. Не продукт, без сервера. Серверная проверка доказана тестом <code>tests/adaptive-blockly.poc.ts</code>.</span></header>
    <div className="poc-grid">
      <aside className="teacher" aria-label="Настройки задания (как в конструкторе)">
        <h2>Задание: эталон и тесты</h2>
        <label>Эталонное решение<textarea className="mono" rows={5} value={reference} onChange={e => setReference(e.target.value)} /></label>
        <div className="tests">{tests.map((t, i) => <div key={i} className="test-row">
          <span>{i + 1}</span>
          <input aria-label={`Ввод теста ${i + 1}`} className="mono" value={t.inputs} onChange={e => setTests(tests.map((x, j) => j === i ? { ...x, inputs: e.target.value } : x))} />
          <span>→</span>
          <input aria-label={`Вывод теста ${i + 1}`} className="mono" value={t.expected} onChange={e => setTests(tests.map((x, j) => j === i ? { ...x, expected: e.target.value } : x))} />
          <label className="inline"><input type="checkbox" checked={t.hidden} onChange={e => setTests(tests.map((x, j) => j === i ? { ...x, hidden: e.target.checked } : x))} />скрыт</label>
        </div>)}<button onClick={() => setTests([...tests, { inputs: '', expected: '', hidden: true }])}>+ тест</button></div>

        <h2>Анализ эталона</h2>
        <p className={analysis.blocklyCompatible ? 'ok' : 'bad'}>{analysis.blocklyCompatible ? 'Задание можно решать блоками.' : 'Визуальный режим недоступен:'}</p>
        {!analysis.blocklyCompatible && <ul className="reasons">{analysis.reasons.map(r => <li key={r}>{r}</li>)}</ul>}
        <p className="muted">Предложенные навыки (подтверждает преподаватель):</p>
        <div className="chips">{analysis.skills.map(s => <span key={s} className="chip">{skillLabel(s)}</span>)}</div>
        <div className="row"><b>Палитра блоков</b><button onClick={() => setPalette(analysis.palette)}>Взять из эталона</button></div>
        <div className="palette">{[...new Set(BLOCKS.map(b => b.category))].map(cat => <fieldset key={cat}><legend>{cat}</legend>{BLOCKS.filter(b => b.category === cat).map(b => <label key={b.type} className="inline"><input type="checkbox" checked={palette.includes(b.type)} onChange={e => setPalette(e.target.checked ? [...palette, b.type] : palette.filter(x => x !== b.type))} />{b.label} <code>{b.python}</code></label>)}</fieldset>)}</div>
      </aside>

      <main className="student" aria-label="Среда ученика">
        <div className="mode-bar" role="tablist" aria-label="Режим решения">
          {(Object.keys(MODE_LABEL) as Mode[]).map(m => <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setResult(null) }}>{MODE_LABEL[m]}</button>)}
          <span className="muted">{mode === 'python' ? 'Свой черновик Python. Код из блоков сюда не переносится.' : `Транслятор ${translation?.version ?? ''} · блоков: ${translation?.blockCount ?? 0}`}</span>
        </div>
        <div className={`work ${mode}`}>
          {mode !== 'python' && <div className="blockly" ref={host} aria-label="Рабочее поле блоков" />}
          {mode === 'mixed' && <section className="mirror" aria-label="Python из твоих блоков" aria-live="polite">
            <h3>Python из твоих блоков</h3>
            {translation && !translation.ok ? <ul className="errors">{translation.errors.map((e, i) => <li key={i}><button className="link" onClick={() => selectBlock(e.blockId)}>{e.message}</button></li>)}</ul>
              : <pre className="code">{(translation?.python ?? '').trimEnd().split('\n').map((l, i) => <div key={i} className={highlightedLines.has(i + 1) ? 'hl' : ''}><span className="ln">{i + 1}</span>{highlight(l)}</div>)}</pre>}
            {translation?.warnings.map((w, i) => <p key={i} className="warn">{w.message}</p>)}
            <p className="muted small">Выбери блок — его строки подсветятся. Это код, собранный тобой, а не решение учителя.</p>
          </section>}
          {mode === 'python' && <textarea className="mono editor" aria-label="Редактор Python" spellCheck={false} value={pythonDraft} onChange={e => setPythonDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget, s = t.selectionStart; setPythonDraft(pythonDraft.slice(0, s) + '    ' + pythonDraft.slice(t.selectionEnd)); requestAnimationFrame(() => t.setSelectionRange(s + 4, s + 4)) } }} />}
        </div>
        <div className="run-bar">
          <button className="primary" onClick={doRun}>▶ Запустить</button>
          <button onClick={doCheck}>Проверить решение</button>
          <label className="inline">Ввод <input className="mono" value={stdin} onChange={e => setStdin(e.target.value)} aria-label="Ввод для запуска" /></label>
          {mode === 'blocks' && translation?.ok === false && <span className="bad small">{translation.errors[0].message}</span>}
        </div>
        <div className="out" aria-live="polite">
          {!result && <span className="muted">Нажми «Запустить» или «Проверить решение».</span>}
          {result?.error && <p className="bad">{result.error}</p>}
          {result?.kind === 'run' && !result.error && <pre className="mono">{result.text || '(нет вывода)'}</pre>}
          {result?.cases && <><p className={result.cases.every(c => c.passed) ? 'ok' : 'bad'}>{result.cases.every(c => c.passed) ? `Все ${result.cases.length} теста пройдены. Режим: ${MODE_LABEL[mode]}.` : `Пройдено ${result.cases.filter(c => c.passed).length} из ${result.cases.length}.`}</p>
            <table><thead><tr><th>Тест</th><th>Ввод</th><th>Ожидалось</th><th>Получено</th></tr></thead><tbody>{result.cases.map(c => <tr key={c.i} className={c.passed ? 'ok' : 'bad'}><td>{c.i}{c.hidden ? ' · скрытый' : ''} {c.passed ? '✓' : '✗'}</td>{c.hidden ? <td colSpan={3} className="muted">данные скрыты</td> : <><td className="mono">{c.inputs}</td><td className="mono">{c.expected}</td><td className="mono">{c.got}</td></>}</tr>)}</tbody></table></>}
        </div>
      </main>
    </div>
  </div>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
