import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import * as ruModule from 'blockly/msg/ru'
import './blocks'
import { type Lesson, type Program, workspaceToProgram } from './learningEngine'
import { readDraft, saveDraft } from './progress'
import type { WorkspaceInfo } from './tutorial'

Blockly.setLocale(Object.fromEntries(Object.entries(ruModule).filter(([key]) => key !== 'default')) as Record<string, string>)
const theme = Blockly.Theme.defineTheme('kodik', {
  name: 'kodik', base: Blockly.Themes.Classic,
  blockStyles: {
    text_blocks: { colourPrimary: '#286a56', colourSecondary: '#205b49', colourTertiary: '#164936' },
    math_blocks: { colourPrimary: '#825a2c', colourSecondary: '#704b22', colourTertiary: '#5c3b19' },
    variable_blocks: { colourPrimary: '#73518a', colourSecondary: '#624276', colourTertiary: '#513364' },
    logic_blocks: { colourPrimary: '#4d6094', colourSecondary: '#405080', colourTertiary: '#32416c' },
    loop_blocks: { colourPrimary: '#436d35', colourSecondary: '#375c2c', colourTertiary: '#2a4b20' }
  },
  componentStyles: { workspaceBackgroundColour: '#f6f4ee', scrollbarColour: '#b7c5bf', insertionMarkerColour: '#b44f29', insertionMarkerOpacity: 0.4 },
  fontStyle: { family: 'Arial, sans-serif', weight: '600', size: 15 }
})
export type EditorHandle = { showSolution: () => void; clear: () => void; addBlock: (type: string) => void; createVariable: (name: string) => void; getProgram: () => Program }
type Props = { lesson: Lesson; onChange: (program: Program) => void; onInfo?: (info: WorkspaceInfo) => void; onAction?: (kind: string) => void; focusType?: string; hideTools?: boolean }

export const BlocklyEditor = forwardRef<EditorHandle, Props>(function BlocklyEditor({ lesson, onChange, onInfo, onAction, focusType, hideTools }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null)
  const onChangeRef = useRef(onChange)
  const infoRef = useRef(onInfo)
  infoRef.current = onInfo
  const actionRef = useRef(onAction)
  actionRef.current = onAction
  const selectedId = useRef<string | undefined>(undefined)
  const preferredVariableId = useRef<string | undefined>(undefined)
  const [selection, setSelection] = useState(false)
  const [notice, setNotice] = useState('')
  onChangeRef.current = onChange
  const report = (w: Blockly.WorkspaceSvg) => {
    const selected = Blockly.common.getSelected()
    const active = selected instanceof Blockly.BlockSvg && selected.workspace === w ? selected : null
    if (active) selectedId.current = active.id
    infoRef.current?.({ blocks: w.getAllBlocks(false).map(b => ({ id: b.id, type: b.type, fields: Object.fromEntries(b.inputList.flatMap(i => i.fieldRow.filter(f => f.name).map(f => [f.name!, String(f.getValue())]))) })), variables: w.getVariableMap().getAllVariables().map(v => v.getName()), selectedType: active?.type, selectedId: active?.id })
  }
  const publish = () => {
    if (!workspace.current) return
    onChangeRef.current(workspaceToProgram(workspace.current))
    report(workspace.current)
    saveDraft(lesson.id, Blockly.serialization.workspaces.save(workspace.current))
  }
  const load = (state: object) => {
    const w = workspace.current
    if (!w) return
    Blockly.serialization.workspaces.load(state, w)
    w.scrollCenter(); publish()
  }
  useImperativeHandle(ref, () => ({
    showSolution: () => load(lesson.solution),
    clear: () => { workspace.current?.clear(); publish() },
    createVariable: name => { preferredVariableId.current = workspace.current?.getVariableMap().createVariable(name).getId(); publish() },
    getProgram: () => workspace.current ? workspaceToProgram(workspace.current) : { statements: [] },
    addBlock: type => {
      const w = workspace.current
      if (!w || !lesson.allowed?.includes(type)) return
      Blockly.Events.setGroup(true)
      try {
        const selected = Blockly.common.getSelected()
        const anchor = selected instanceof Blockly.BlockSvg && selected.workspace === w ? selected : w.getBlockById(selectedId.current || '')
        const prior = w.getAllBlocks(false)
        const preferred = w.getVariableMap().getVariableById(preferredVariableId.current || '') || w.getVariableMap().getAllVariables()[0]
        const block = w.newBlock(type)
        if (preferred && block.getField('VAR')) block.setFieldValue(preferred.getId(), 'VAR')
        block.initSvg(); block.render()
        const candidates = anchor ? [anchor, ...anchor.getDescendants(false).filter(b => b !== anchor), ...prior.filter(b => b !== anchor)] : prior
        let connected = false
        const connection = block.outputConnection || block.previousConnection
        if (connection) {
          for (const target of candidates) {
            const input = target.inputList.find(i => i.connection && (!i.connection.isConnected() || (i.connection.targetBlock()?.isShadow() && i.connection.targetBlock()?.getFieldValue('TEXT') === '')) && w.connectionChecker.canConnect(i.connection, connection, false))
            if (input?.connection) { input.connection.connect(connection); connected = true; break }
          }
          if (!connected && block.previousConnection) {
            let last = anchor?.nextConnection ? anchor : w.getTopBlocks(true).filter(b => b !== block && b.nextConnection).at(-1)
            while (last?.getNextBlock()) last = last.getNextBlock()!
            const tail = last?.nextConnection
            if (tail && !tail.isConnected() && w.connectionChecker.canConnect(tail, block.previousConnection, false)) { tail.connect(block.previousConnection); connected = true }
          }
        }
        if (!connected) block.moveBy(24, prior.length ? Math.max(...w.getTopBlocks(false).filter(b => b !== block).map(b => b.getRelativeToSurfaceXY().y + b.getHeightWidth().height), 0) + 32 : 32)
        block.select()
        void Blockly.renderManagement.finishQueuedRenders().then(() => { if (workspace.current === w && w.getBlockById(block.id)) w.centerOnBlock(block.id, true) })
        setNotice(connected ? 'Блок добавлен в программу.' : 'Блок добавлен. Выбери его, чтобы заполнить пустые места.')
      } finally { Blockly.Events.setGroup(false); publish() }
    }
  }), [lesson])

  useEffect(() => {
    const w = workspace.current
    if (!w) return
    for (const b of w.getAllBlocks(false)) b.getSvgRoot()?.classList.toggle('tutorial-focus', b.type === focusType)
  })
  useEffect(() => {
    const w = workspace.current
    if (!w || !focusType) return
    const focus = () => { void Blockly.renderManagement.finishQueuedRenders().then(() => {
      const target = w.getAllBlocks(false).filter(b => b.type === focusType).at(-1)
      if (workspace.current === w && target) w.centerOnBlock(target.id, true)
    }) }
    const field = document.querySelector('.blocklyHtmlInput')
    if (field) { field.addEventListener('blur', focus, { once: true }); return () => field.removeEventListener('blur', focus) }
    focus()
  }, [focusType])

  useEffect(() => {
    if (!host.current) return
    const w = Blockly.inject(host.current, {
      theme, renderer: 'zelos', trashcan: false, sounds: false,
      rendererOverrides: { FIELD_BORDER_RECT_X_PADDING: 24, FIELD_BORDER_RECT_HEIGHT: 48 },
      grid: { spacing: 22, length: 2, colour: '#d9d5cb', snap: true },
      zoom: { controls: false, wheel: true, startScale: 1, maxScale: 1.5, minScale: 0.45 },
      move: { scrollbars: true, drag: true, wheel: true }
    })
    workspace.current = w
    try { Blockly.serialization.workspaces.load(readDraft(lesson.id) || lesson.starter, w) }
    catch { Blockly.serialization.workspaces.load(lesson.starter, w); setNotice('Восстановлено начало задания: сохранённые блоки не удалось открыть.') }
    onChangeRef.current(workspaceToProgram(w))
    preferredVariableId.current = w.getVariableMap().getAllVariables()[0]?.getId()
    report(w)
    void Blockly.renderManagement.finishQueuedRenders().then(() => {
      if (workspace.current !== w) return
      const target = w.getAllBlocks(false).filter(b => b.type === focusType).at(-1)
      if (target) w.centerOnBlock(target.id, true)
      else w.scrollCenter()
    })
    const changed = (event: Blockly.Events.Abstract) => {
      const selected = Blockly.common.getSelected()
      setSelection(selected instanceof Blockly.BlockSvg && selected.workspace === w)
      report(w)
      if (event.type === 'change' && event.recordUndo) actionRef.current?.('edit_value')
      if (!event.isUiEvent) { onChangeRef.current(workspaceToProgram(w)); saveDraft(lesson.id, Blockly.serialization.workspaces.save(w)) }
    }
    w.addChangeListener(changed)
    const observer = new ResizeObserver(() => Blockly.svgResize(w))
    observer.observe(host.current)
    return () => { saveDraft(lesson.id, Blockly.serialization.workspaces.save(w)); observer.disconnect(); w.dispose(); workspace.current = null }
  }, [lesson.id])

  return <>
    <div className="blockly-host" ref={host} aria-label="Редактор блоков" />
    <div className={`editor-tools ${hideTools ? 'tools-compact' : ''}`} aria-label="Управление блоками">
      <button onClick={() => workspace.current?.undo(false)} aria-label="Отменить изменение">↶</button>
      <button onClick={() => workspace.current?.zoomToFit()} aria-label="Показать все блоки">Вписать</button>
      <button onClick={() => workspace.current?.zoomCenter(1)} aria-label="Увеличить блоки">+</button>
      <button onClick={() => workspace.current?.zoomCenter(-1)} aria-label="Уменьшить блоки">−</button>
      <button disabled={!selection} onClick={() => { const b = Blockly.common.getSelected(); if (b instanceof Blockly.BlockSvg && b.workspace === workspace.current) { b.dispose(true); publish() } }}>Удалить блок</button>
    </div>
    <p className="editor-note" aria-live="polite">{notice || 'Нажми на значение, чтобы изменить его. Новые блоки заполняют свободные места.'}</p>
  </>
})
