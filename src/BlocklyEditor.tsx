import { Icon } from './Icon'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import * as ruModule from 'blockly/msg/ru'
import './blocks'
import { type Lesson, type Program, workspaceToProgram } from './learningEngine'
import { readDraft, saveDraft } from './progress'
import { KodikKeyboard } from './KodikKeyboard'
import type { WorkspaceInfo } from './tutorial'
import { useAndroidBack } from './useAndroidBack'

Blockly.setLocale(Object.fromEntries(Object.entries(ruModule).filter(([key]) => key !== 'default')) as Record<string, string>)
type EditableField = Blockly.FieldTextInput | Blockly.FieldNumber
let mobileFieldEditor: ((field: EditableField) => void) | null = null
const inputPrototype = Object.getPrototypeOf(Blockly.FieldTextInput.prototype) as { showEditor_: (event?: Event, quiet?: boolean, focus?: boolean) => void }
const originalFieldEditor = inputPrototype.showEditor_
inputPrototype.showEditor_ = function(this: EditableField, event?: Event, quiet?: boolean, focus?: boolean) {
  if (mobileFieldEditor && window.matchMedia('(max-width: 767px)').matches && navigator.maxTouchPoints > 0) {
    mobileFieldEditor(this)
    return
  }
  originalFieldEditor.call(this, event, quiet, focus)
}
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
  fontStyle: { family: 'Nunito, Arial, sans-serif', weight: '600', size: 15 }
})
export type EditorHandle = { showSolution: () => void; clear: () => void; addBlock: (type: string) => void; createVariable: (name: string) => void; focusBlock: (id: string) => void; getProgram: () => Program }
type Props = { lesson: Lesson; onChange: (program: Program) => void; onInfo?: (info: WorkspaceInfo) => void; onAction?: (kind: string) => void; onReady?: () => void; focusType?: string; hideTools?: boolean }

export const BlocklyEditor = forwardRef<EditorHandle, Props>(function BlocklyEditor({ lesson, onChange, onInfo, onAction, onReady, focusType, hideTools }, ref) {
  useAndroidBack(()=>{
    if (Blockly.DropDownDiv.isVisible()) { Blockly.DropDownDiv.hideWithoutAnimation(); return true }
    if (Blockly.WidgetDiv.isVisible()) { Blockly.WidgetDiv.hide(); return true }
    return false
  },150)
  const host = useRef<HTMLDivElement>(null)
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null)
  const onChangeRef = useRef(onChange)
  const infoRef = useRef(onInfo)
  infoRef.current = onInfo
  const actionRef = useRef(onAction)
  actionRef.current = onAction
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  const selectedId = useRef<string | undefined>(undefined)
  const preferredVariableId = useRef<string | undefined>(undefined)
  const [selection, setSelection] = useState(false)
  const [notice, setNotice] = useState('')
  const [fieldEdit, setFieldEdit] = useState<{ field: EditableField; value: string; numeric: boolean; error?: string } | null>(null)
  mobileFieldEditor = field => {
    const value = String(field.getValue())
    setFieldEdit({ field, value, numeric: field instanceof Blockly.FieldNumber })
    const block = field.getSourceBlock()
    if (block) requestAnimationFrame(() => workspace.current?.centerOnBlock(block.id, true))
  }
  onChangeRef.current = onChange
  const report = (w: Blockly.WorkspaceSvg, explicitId?: string | null) => {
    const selected = Blockly.common.getSelected()
    const active = explicitId !== undefined ? (explicitId ? w.getBlockById(explicitId) : null) : selected instanceof Blockly.BlockSvg && selected.workspace === w ? selected : null
    if (active) selectedId.current = active.id
    infoRef.current?.({ blocks: w.getAllBlocks(false).map(b => ({ id: b.id, type: b.type, fields: Object.fromEntries(b.inputList.flatMap(i => i.fieldRow.filter(f => f.name).map(f => [f.name!, String(f.getValue())]))) })), variables: w.getVariableMap().getAllVariables().map(v => v.getName()), selectedType: active?.type, selectedId: active?.id })
  }
  const serialize = (w: Blockly.WorkspaceSvg) => {
    const saved = Blockly.serialization.workspaces.save(w)
    const topBlocks = w.getTopBlocks(true)
    const savedBlocks = (saved.blocks as { blocks?: unknown[] } | undefined)?.blocks
    // Blockly can emit a create event before its workspace serializer sees the
    // new root. Build the same portable shape directly so an immediate reload
    // can never replace the learner's work with an empty draft.
    if (topBlocks.length && (!Array.isArray(savedBlocks) || savedBlocks.length === 0)) {
      const blocks = topBlocks.map(block => Blockly.serialization.blocks.save(block, { addCoordinates: true, addInputBlocks: true, addNextBlocks: true, saveIds: true })).filter(Boolean)
      saved.blocks = { languageVersion: 0, blocks }
      const variables = w.getVariableMap().getAllVariables()
      if (variables.length) saved.variables = variables.map(variable => ({ name: variable.getName(), id: variable.getId(), type: variable.getType() }))
    }
    return saved
  }
  const publish = () => {
    if (!workspace.current) return
    onChangeRef.current(workspaceToProgram(workspace.current))
    report(workspace.current)
    saveDraft(lesson.id, serialize(workspace.current))
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
    focusBlock: id => {
      const w = workspace.current, block = w?.getBlockById(id)
      if (!w || !block) return
      Blockly.getFocusManager().focusNode(block)
      block.select(); w.centerOnBlock(id, true); report(w)
      block.getSvgRoot()?.classList.add('python-focus')
      window.setTimeout(() => block.getSvgRoot()?.classList.remove('python-focus'), 650)
    },
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
        void Blockly.renderManagement.finishQueuedRenders().then(() => {
          if (workspace.current !== w || !w.getBlockById(block.id)) return
          if (window.matchMedia('(max-width: 767px)').matches) {
            const width = Math.max(...w.getTopBlocks(false).map(item => item.getHeightWidth().width), 1)
            const fittingScale = Math.min(w.scale, ((host.current?.clientWidth || 350) - 48) / width)
            w.setScale(Math.max(0.45, fittingScale))
            w.scrollCenter()
          } else w.centerOnBlock(block.id, true)
          publish()
        })
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
    readyRef.current?.()
    void Blockly.renderManagement.finishQueuedRenders().then(() => {
      if (workspace.current !== w) return
      if (window.matchMedia('(max-width: 767px)').matches) {
        const width = Math.max(...w.getTopBlocks(false).map(item => item.getHeightWidth().width), 1)
        w.setScale(Math.max(0.45, Math.min(w.scale, ((host.current?.clientWidth || 350) - 48) / width)))
      }
      const target = w.getAllBlocks(false).filter(b => b.type === focusType).at(-1)
      if (target) w.centerOnBlock(target.id, true)
      else w.scrollCenter()
    })
    const changed = (event: Blockly.Events.Abstract) => {
      const eventSelection = event.type === 'selected' ? (event as Blockly.Events.Selected).newElementId : undefined
      const selected = eventSelection !== undefined ? (eventSelection ? w.getBlockById(eventSelection) : null) : Blockly.common.getSelected()
      setSelection(selected instanceof Blockly.BlockSvg && selected.workspace === w)
      report(w, eventSelection)
      // Blockly applies selection after dispatching some UI events. Report once
      // more on the next frame so the Python mirror always receives the exact id.
      window.requestAnimationFrame(() => { if (workspace.current === w) report(w) })
      if (event.type === 'change' && event.recordUndo) actionRef.current?.('edit_value')
      if (!event.isUiEvent) { onChangeRef.current(workspaceToProgram(w)); saveDraft(lesson.id, serialize(w)) }
    }
    w.addChangeListener(changed)
    const observer = new ResizeObserver(() => {
      Blockly.svgResize(w)
      if (document.activeElement?.matches('.blocklyHtmlInput')) Blockly.WidgetDiv.repositionForWindowResize()
    })
    observer.observe(host.current)
    const saveBeforeUnload = () => saveDraft(lesson.id, serialize(w))
    window.addEventListener('pagehide', saveBeforeUnload)
    return () => { saveBeforeUnload(); window.removeEventListener('pagehide', saveBeforeUnload); observer.disconnect(); w.dispose(); workspace.current = null; mobileFieldEditor = null }
  }, [lesson.id])

  return <>
    <div className="blockly-host" ref={host} aria-label="Редактор блоков" />
    <div className={`editor-tools ${hideTools ? 'tools-compact' : ''}`} aria-label="Управление блоками">
      <button className="undo-button" onClick={() => workspace.current?.undo(false)} aria-label="Отменить изменение"><Icon name="undo" size={20} /> <span>Отменить</span></button>
      <details className="editor-menu"><summary aria-label="Другие действия"><Icon name="more" /></summary><div>
        <button onClick={() => workspace.current?.zoomToFit()}>Показать все блоки</button>
        <button disabled={!selection} onClick={() => { const b = Blockly.common.getSelected(); if (b instanceof Blockly.BlockSvg && b.workspace === workspace.current) { b.dispose(true); publish() } }}>Удалить выбранный блок</button>
      </div></details>
    </div>
    <p className="editor-note" aria-live="polite">{notice || 'Нажми на значение, чтобы изменить его. Новые блоки заполняют свободные места.'}</p>
    {fieldEdit && <KodikKeyboard value={fieldEdit.value} numeric={fieldEdit.numeric} error={fieldEdit.error} onChange={value => setFieldEdit(current => current ? { ...current, value, error: undefined } : null)} onCancel={() => setFieldEdit(null)} onDone={() => {
      const value = fieldEdit.value.trim()
      if (fieldEdit.numeric && (value === '' || !Number.isFinite(Number(value)))) { setFieldEdit(current => current ? { ...current, error: 'Введи число, например 7.' } : null); return }
      fieldEdit.field.setValue((fieldEdit.numeric ? Number(value) : fieldEdit.value) as never)
      setFieldEdit(null)
      publish()
    }} />}
  </>
})
