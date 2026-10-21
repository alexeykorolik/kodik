import { useEffect, useRef, useState } from "react";
import * as Blockly from "blockly";
import * as ruModule from "blockly/msg/ru";
import { BLOCKS, nameProblem } from "../adaptive/blockProgram";
import "../adaptive/blocklyBlocks";

Blockly.setLocale(Object.fromEntries(Object.entries(ruModule).filter(([k]) => k !== "default")) as Record<string, string>);
const theme = Blockly.Theme.defineTheme("kodik-b2b", {
  name: "kodik-b2b",
  base: Blockly.Themes.Classic,
  componentStyles: { workspaceBackgroundColour: "#f8f7f2", toolboxBackgroundColour: "#edf0e8", flyoutBackgroundColour: "#fffefa", scrollbarColour: "#b7cfca", insertionMarkerColour: "#1f6f8b" },
  fontStyle: { family: "Nunito, Arial, sans-serif", weight: "600", size: 14 },
});
// An empty text field is drawn wide with a prompt, so a child sees where to type and can hit it.
const textProto = Blockly.FieldTextInput.prototype as unknown as { getDisplayText_: () => string; isBeingEdited_?: boolean; __kodik?: boolean };
if (!textProto.__kodik) {
  const original = textProto.getDisplayText_;
  textProto.getDisplayText_ = function (this: typeof textProto) { const text = original.call(this); return text.trim() === "" && !this.isBeingEdited_ ? "  впиши текст  " : text; };
  textProto.__kodik = true;
}
/** Keeps blocks readable: never larger than 100% after fitting, never smaller than the minimum. */
function fit(w: Blockly.WorkspaceSvg) {
  if (!w.getAllBlocks(false).length) { w.setScale(0.9); return; }
  w.zoomToFit();
  if (w.scale > 1) { w.setScale(1); w.scrollCenter(); }
}

/**
 * Learner (and teacher preview) block workspace. Emits the Blockly JSON serialization on every
 * real change; never emits during disposal, so switching modes cannot overwrite the saved draft.
 */
export function BlockEditor({ value, palette, onChange, onSelect, readOnly = false, label = "Рабочее поле блоков" }: {
  value: unknown;
  palette: string[];
  onChange: (workspace: object) => void;
  onSelect?: (blockId: string | null, statementId: string | null) => void;
  readOnly?: boolean;
  label?: string;
}) {
  const host = useRef<HTMLDivElement>(null), ws = useRef<Blockly.WorkspaceSvg | null>(null);
  const change = useRef(onChange), select = useRef(onSelect);
  change.current = onChange; select.current = onSelect;
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Blockly.BlockSvg[]>([]), [variable, setVariable] = useState('');
  const emitted = useRef('');
  const [rename, setRename] = useState('');
  const sync = () => { const w = ws.current; if (!w) return; const state = Blockly.serialization.workspaces.save(w); emitted.current = JSON.stringify(state); setBlocks(w.getAllBlocks(true)); setSelected(id => id && w.getBlockById(id) ? id : null); change.current(state); };

  useEffect(() => {
    if (!host.current) return;
    const w = Blockly.inject(host.current, {
      theme, readOnly, renderer: "zelos", trashcan: !readOnly, sounds: false,
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.6, minScale: 0.5 },
      grid: { spacing: 24, length: 2, colour: "#e2e5dd", snap: true },
      move: { scrollbars: true, drag: true, wheel: true },
    });
    ws.current = w;
    try { if (value && typeof value === "object") Blockly.serialization.workspaces.load(value as object, w); }
    catch { setNotice("Сохранённые блоки не удалось открыть. Начни заново — прежний вариант остался в истории черновиков."); }
    emitted.current = JSON.stringify(value);
    setBlocks(w.getAllBlocks(true));
    const initialFit=requestAnimationFrame(()=>fit(w));
    const statementOf = (id: string | null) => { let b = id ? w.getBlockById(id) : null; while (b && b.outputConnection) b = b.getParent(); return b?.id ?? null; };
    const listener = (e: Blockly.Events.Abstract) => {
      if (e.type === Blockly.Events.SELECTED) { const id = (e as Blockly.Events.Selected).newElementId ?? null; setSelected(id); select.current?.(id, statementOf(id)); return; }
      if (e.isUiEvent) return;
      sync();
    };
    w.addChangeListener(listener);
    const ro = new ResizeObserver(() => Blockly.svgResize(w));
    ro.observe(host.current);
    return () => { cancelAnimationFrame(initialFit);ro.disconnect(); w.removeChangeListener(listener); w.dispose(); ws.current = null; };
    // The workspace is created once per palette; later `value` changes come from this editor itself.
  }, [palette.join(), readOnly]);

  useEffect(() => {
    const w = ws.current;
    if (!w || JSON.stringify(value) === emitted.current) return;
    try { Blockly.serialization.workspaces.load((value ?? {}) as object, w); emitted.current = JSON.stringify(value); setBlocks(w.getAllBlocks(true)); }
    catch { setNotice('Не удалось открыть этот вариант. Прежняя работа сохранена.'); }
  }, [value]);

  /** Keyboard path: add a block and connect it to the selected block or to the end of the program. */
  function add(type: string) {
    const w = ws.current; if (!w) return;
    Blockly.Events.setGroup(true);
    try {
      const known = new Set(w.getVariableMap().getAllVariables().map(v => v.getId()));
      const block = w.newBlock(type);
      const firstVar = w.getVariableMap().getAllVariables().find(v => known.has(v.getId()));
      if (firstVar && block.getField("VAR")) {
        block.setFieldValue(firstVar.getId(), "VAR");
        // Blockly made a default variable for the new block; drop it so the learner's list stays theirs.
        for (const v of w.getVariableMap().getAllVariables()) if (!known.has(v.getId()) && !w.getVariableUsesById(v.getId()).length) w.getVariableMap().deleteVariable(v);
      }
      block.initSvg(); block.render();
      const anchor = selected ? w.getBlockById(selected) : null;
      const candidates = (anchor ? [anchor, ...anchor.getDescendants(false)] : w.getAllBlocks(true)).filter(b => b !== block);
      let connected = false;
      const own = block.outputConnection || block.previousConnection;
      for (const target of candidates) {
        const input = target.inputList.find((i) => i.connection && !i.connection.targetBlock() && own && w.connectionChecker.canConnect(i.connection, own, false));
        if (input?.connection && own) { input.connection.connect(own); connected = true; break; }
      }
      if (!connected && block.previousConnection) {
        let last = anchor?.nextConnection ? anchor : w.getTopBlocks(true).filter((b) => b !== block && b.nextConnection).at(-1);
        while (last?.getNextBlock()) last = last.getNextBlock()!;
        if (last?.nextConnection && !last.nextConnection.isConnected()) { last.nextConnection.connect(block.previousConnection); connected = true; }
      }
      if (!connected) block.moveBy(40, 40 + w.getTopBlocks(false).length * 60);
      block.select();
      // The new block is brought into view instead of appearing off-screen.
      requestAnimationFrame(() => { const r = block.getBoundingRectangle(), v = w.getMetricsManager().getViewMetrics(true); if (r.left < v.left || r.top < v.top || r.right > v.left + v.width || r.bottom > v.top + v.height) w.centerOnBlock(block.id); });
      setSelected(block.id); sync();
      setNotice(connected ? `Блок «${label_(type)}» добавлен в программу.` : `Блок «${label_(type)}» добавлен отдельно — перетащи его к программе или выбери место.`);
    } finally { Blockly.Events.setGroup(false); }
  }
  const label_ = (type: string) => BLOCKS.find((b) => b.type === type)?.label ?? type;
  function mutate(b: Blockly.BlockSvg, extra: object, removed: string) {
    const before = Blockly.Events.BlockChange.getExtraBlockState_(b), inputs = new Set(b.inputList.map(i => i.name));
    // Blockly rebuilds the inputs; children are put back into places that still exist (as its own mutator does).
    const children = b.inputList.flatMap(i => { const child = i.connection?.targetBlock(); return child ? [[i.name, child] as const] : []; });
    Blockly.Events.setGroup(true);
    try {
      b.loadExtraState?.({ ...(b.saveExtraState?.() || {}), ...extra });
      b.initSvg(); b.render();
      const after = Blockly.Events.BlockChange.getExtraBlockState_(b);
      if (before !== after) Blockly.Events.fire(new (Blockly.Events.get(Blockly.Events.BLOCK_CHANGE))(b, "mutation", null, before, after));
      for (const [name, child] of children) {
        const place = b.getInput(name)?.connection, own = child.outputConnection ?? child.previousConnection;
        if (place && own && !place.targetBlock() && !child.getParent()) place.connect(own);
      }
      const lost = children.filter(([name, child]) => inputs.has(name) && child.getParent() !== b);
      setNotice(lost.length ? `${removed} Блоки из неё лежат отдельно${lost.some(([, child]) => child.previousConnection) ? ", а отдельные команды тоже выполняются" : ""}. Вставь их снова или нажми «Отменить».` : "Форма блока изменена.");
    } finally { Blockly.Events.setGroup(false); sync(); }
  }
  function renameVariable(b: Blockly.Block) {
    const w = ws.current, model = (b.getField("VAR") as Blockly.FieldVariable | null)?.getVariable(), name = rename.trim();
    if (!w || !model) return;
    const problem = nameProblem(name) || (w.getVariableMap().getVariable(name) ? `Переменная «${name}» уже есть.` : "");
    if (problem) { setNotice(problem); return; }
    const old = model.getName();
    w.getVariableMap().renameVariable(model, name); setRename("");
    setNotice(`Переменная «${old}» теперь называется «${name}» во всей программе.`); sync();
  }
  /** Set a field and report what Blockly actually accepted (a validator may refuse the value). */
  function setField(b: Blockly.Block, name: string, value: string, fieldLabel: string): string {
    const before = b.getFieldValue(name);
    try { b.setFieldValue(value, name); } catch { /* reported below */ }
    const after = b.getFieldValue(name);
    if (String(after) !== String(value) && !(typeof after === "number" && Number(value) === after)) setNotice(`«${fieldLabel}»: значение «${value}» не подходит, оставлено «${after ?? before}».`);
    else setNotice(`«${fieldLabel}» изменено.`);
    sync();
    return String(after ?? "");
  }
  /** Put another block into an input (or empty it). On failure the previous child is restored. */
  function connectInput(input: Blockly.Input, targetId: string) {
    const c = input.connection!, previous = c.targetBlock(), other = targetId ? ws.current?.getBlockById(targetId) : null;
    Blockly.Events.setGroup(true);
    try {
      if (previous && !previous.isShadow()) c.disconnect();
      const connection = other?.outputConnection ?? other?.previousConnection;
      if (connection) { if (connection.isConnected()) connection.disconnect(); c.connect(connection); }
      if (other && c.targetBlock() !== other) throw new Error("not connected");
      setNotice(other ? `Блок «${label_(other.type)}» вставлен.` : "Место освобождено.");
    } catch {
      if (previous && !c.isConnected() && (previous.outputConnection || previous.previousConnection)) { try { c.connect((previous.outputConnection ?? previous.previousConnection)!); } catch { /* keep it detached */ } }
      setNotice("Этот блок сюда не подходит. Программа не изменена.");
    } finally { Blockly.Events.setGroup(false); sync(); }
  }

  return (
    <div className="block-editor">
      {!readOnly&&<div className="block-toolbar"><div className="block-palette" role="group" aria-label="Палитра блоков">{BLOCKS.filter(b=>palette.includes(b.type)).map(b=><button key={b.type} type="button" className={`palette-block cat-${BLOCKS.findIndex(x=>x.category===b.category)}`} onClick={()=>add(b.type)} title={`Добавить блок «${b.label}»`}>＋ {b.label}</button>)}</div></div>}
      <div className="blockly-wrap">
        <div className="blockly-host" ref={host} role="application" aria-label={label} />
        {!readOnly&&<div className="block-tools"><button type="button" className="tool" aria-label="Отменить действие" title="Отменить" onClick={() => ws.current?.undo(false)}>↶</button><button type="button" className="tool" aria-label="Вернуть действие" title="Вернуть" onClick={() => ws.current?.undo(true)}>↷</button><button type="button" className="tool wide" onClick={() => { const w = ws.current; if (w) fit(w); }}>Показать мою программу</button></div>}
        {!readOnly && blocks.length === 0 && <p className="blockly-empty" aria-hidden="true">Нажми «＋ {label_(palette[0] || "text_print")}» выше — блок появится здесь.<br/>Блоки можно перетаскивать мышкой или пальцем.</p>}
      </div>
      {!readOnly && (
        <details className="block-keyboard">
          <summary>Добавить блок с клавиатуры</summary>
          <div className="block-keyboard-list" role="group" aria-label="Блоки этого задания">
            {BLOCKS.filter((b) => palette.includes(b.type)).map((b) => (
              <button key={b.type} type="button" onClick={() => add(b.type)}>{b.label}</button>
            ))}
            <button type="button" disabled={!selected} onClick={() => { const b = selected && ws.current?.getBlockById(selected); if (b) { b.dispose(true); setSelected(null); setNotice("Блок удалён."); } }}>Удалить выбранный</button>
            <button type="button" onClick={() => ws.current?.undo(false)}>Отменить</button>
            <button type="button" onClick={() => ws.current?.undo(true)}>Вернуть</button>
            <button type="button" onClick={() => ws.current?.zoomToFit()}>Показать всю программу</button>
          </div>
          <div className="block-keyboard-fields">
            <label>Выбранный блок<select aria-label="Выбранный блок" value={selected ?? ''} onChange={e => { const b = ws.current?.getBlockById(e.target.value); setSelected(b?.id ?? null); b?.select(); }}><option value="">Конец программы</option>{blocks.map((b,i) => <option key={b.id} value={b.id}>{i+1}. {label_(b.type)}</option>)}</select></label>
            {selected && blocks.filter(b => b.id === selected).map(b => <div key={b.id}>
              {b.type==='controls_if'&&<><label className="checkbox"><input type="checkbox" checked={!!b.getInput('ELSE')} onChange={e=>mutate(b,{hasElse:e.target.checked},'Ветка «иначе» убрана.')}/>Ветка «иначе»</label><label>Дополнительных условий<input type="number" min={0} max={20} value={b.inputList.filter(i=>/^IF\d+$/.test(i.name)).length-1} onChange={e=>mutate(b,{elseIfCount:Math.max(0,Math.min(20,Number(e.target.value)||0))},'Дополнительное условие убрано.')}/></label></>}
              {b.type==='text_join'&&<label>Частей текста<input type="number" min={0} max={10} value={b.inputList.filter(i=>i.name.startsWith('ADD')).length} onChange={e=>mutate(b,{itemCount:Math.max(0,Math.min(10,Number(e.target.value)||0))},'Часть текста убрана.')}/></label>}
              {b.inputList.flatMap(input => input.fieldRow).filter(field => field.name && field.EDITABLE).map(field => {
                const fieldLabel = ({NUM:'Число',TEXT:'Текст',VAR:'Переменная',OP:'Действие',MODE:'Условие цикла',NAME:'Имя функции',BOOL:'Значение'} as Record<string,string>)[field.name!] ?? field.name!;
                const options = field instanceof Blockly.FieldDropdown ? field.getOptions(false).filter(o => typeof o[0] === 'string' && !['RENAME_VARIABLE','DELETE_VARIABLE'].includes(o[1])) : null;
                return <label key={b.id + field.name}>{fieldLabel}
                  {options ? <select value={field.getValue()} onChange={e => setField(b, field.name!, e.target.value, fieldLabel)}>{options.map(o => <option key={o[1]} value={o[1]}>{String(o[0])}</option>)}</select> : <FieldInput value={String(field.getValue() ?? '')} commit={v => setField(b, field.name!, v, fieldLabel)} />}</label>;
              })}
              {b.inputList.filter(i => i.connection).map(input => <label key={input.name}>{placeName(b.type, input.name)}<select aria-label={`Место: ${placeName(b.type, input.name)}`} value={input.connection?.targetBlock()?.id ?? ''} onChange={e => connectInput(input, e.target.value)}><option value="">Пустое место</option>{blocks.filter(other => other !== b && (!other.getParent() || other === input.connection?.targetBlock()) && !other.getDescendants(false).includes(b) && (other.outputConnection || other.previousConnection) && ws.current?.connectionChecker.canConnect(input.connection!, (other.outputConnection || other.previousConnection)!, false)).map(other => <option key={other.id} value={other.id}>{label_(other.type)} · {blocks.indexOf(other)+1}</option>)}</select></label>)}
              {b.getField("VAR") && <span className="block-rename"><label>Новое имя переменной<input value={rename} onChange={e => setRename(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); renameVariable(b); } }} /></label><button type="button" onClick={() => renameVariable(b)}>Переименовать переменную</button></span>}
              <button type="button" disabled={!b.getParent() && !b.getNextBlock()} onClick={() => { b.unplug(true); setNotice(b.outputConnection ? `Блок «${label_(b.type)}» отсоединён и лежит отдельно. Вставь его в другое место или удали.` : `Команда «${label_(b.type)}» отсоединена. Отдельно лежащие команды тоже выполняются — посмотри, где она теперь в Python.`); sync(); }}>Отсоединить блок</button>
              <button type="button" onClick={() => {const previous=b.getPreviousBlock();if(previous?.nextConnection?.targetBlock()===b&&b.previousConnection&&b.nextConnection&&previous.previousConnection){const before=previous.previousConnection.targetConnection,after=b.nextConnection.targetConnection;Blockly.Events.setGroup(true);try{b.unplug(false);b.nextConnection.disconnect();previous.unplug(false);if(before)before.connect(b.previousConnection);b.nextConnection.connect(previous.previousConnection);if(after)previous.nextConnection?.connect(after);sync();}finally{Blockly.Events.setGroup(false)}}}}>Поднять команду</button>
            </div>)}
            {palette.some(t => ['variables_set','variables_get','math_change'].includes(t)) && <form onSubmit={e => {e.preventDefault(); const problem = nameProblem(variable); if(problem){setNotice(problem);return;} if(ws.current?.getVariableMap().getVariable(variable.trim())){setNotice(`Переменная «${variable.trim()}» уже есть.`);return;} ws.current?.getVariableMap().createVariable(variable.trim());setNotice(`Переменная «${variable.trim()}» создана.`);setVariable('');sync();}}><label>Новая переменная<input value={variable} onChange={e=>setVariable(e.target.value)}/></label><button type="submit">Создать переменную</button></form>}
          </div>
        </details>
      )}
      <p className="block-notice" aria-live="polite">{notice}</p>
    </div>
  );
}

const PLACES: Record<string, string> = { VALUE: "Значение", TEXT: "Что напечатать", A: "Слева", B: "Справа", BOOL: "Условие", TIMES: "Сколько раз", DO: "Повторять", BODY: "Команды функции", ELSE: "Иначе", DELTA: "На сколько", DIVIDEND: "Делимое", DIVISOR: "Делитель", FROM: "От", TO: "До", BY: "Шаг" };
function placeName(type: string, name: string) {
  const branch = /^(IF|DO)(\d+)$/.exec(name);
  if (branch && type === "controls_if") return branch[1] === "IF" ? (branch[2] === "0" ? "Если" : `Иначе если ${branch[2]}`) : (branch[2] === "0" ? "То" : `То (условие ${Number(branch[2]) + 1})`);
  if (/^ADD\d+$/.test(name)) return `Часть ${Number(name.slice(3)) + 1}`;
  return PLACES[name] ?? name;
}

/** Text or number field: every keystroke goes to Blockly; a value Blockly refuses stays visible with
 * a notice until Enter, Escape or leaving the field, which show the value that was actually kept. */
function FieldInput({ value, commit }: { value: string; commit: (value: string) => string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <input value={draft} onChange={e => { setDraft(e.target.value); commit(e.target.value); }} onBlur={() => setDraft(value)} onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); setDraft(value); } }} />;
}
