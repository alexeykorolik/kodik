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
  const [newType,setNewType]=useState(palette[0]||'text_print');
  const emitted = useRef('');
  const sync = () => { const w = ws.current; if (!w) return; const state = Blockly.serialization.workspaces.save(w); emitted.current = JSON.stringify(state); setBlocks(w.getAllBlocks(true)); change.current(state); };

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
    const initialFit=requestAnimationFrame(()=>{if(w.getAllBlocks(false).length)w.zoomToFit()});
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
      const block = w.newBlock(type);
      const firstVar = w.getVariableMap().getAllVariables()[0];
      if (firstVar && block.getField("VAR")) block.setFieldValue(firstVar.getId(), "VAR");
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
      setSelected(block.id); sync();
      setNotice(connected ? `Блок «${label_(type)}» добавлен в программу.` : `Блок «${label_(type)}» добавлен отдельно. Перетащи или выбери место.`);
    } finally { Blockly.Events.setGroup(false); }
  }
  const label_ = (type: string) => BLOCKS.find((b) => b.type === type)?.label ?? type;

  return (
    <div className="block-editor">
      {!readOnly&&<div className="compact-palette"><label>Новый блок<select value={palette.includes(newType)?newType:palette[0]||''} onChange={e=>setNewType(e.target.value)}>{BLOCKS.filter(b=>palette.includes(b.type)).map(b=><option key={b.type} value={b.type}>{b.label}</option>)}</select></label><button type="button" disabled={!palette.length} onClick={()=>add(palette.includes(newType)?newType:palette[0])}>Добавить</button></div>}
      <div className="blockly-host" ref={host} role="application" aria-label={label} />
      {!readOnly && (
        <details className="block-keyboard">
          <summary>Добавить блок с клавиатуры</summary>
          <div className="block-keyboard-list" role="group" aria-label="Блоки этого задания">
            {BLOCKS.filter((b) => palette.includes(b.type)).map((b) => (
              <button key={b.type} type="button" onClick={() => add(b.type)}>{b.label}</button>
            ))}
            <button type="button" disabled={!selected} onClick={() => { const b = selected && ws.current?.getBlockById(selected); if (b) { b.dispose(true); setSelected(null); setNotice("Блок удалён."); } }}>Удалить выбранный</button>
            <button type="button" onClick={() => ws.current?.undo(false)}>Отменить</button>
            <button type="button" onClick={() => ws.current?.zoomToFit()}>Показать всю программу</button>
          </div>
          <div className="block-keyboard-fields">
            <label>Выбранный блок<select aria-label="Выбранный блок" value={selected ?? ''} onChange={e => { const b = ws.current?.getBlockById(e.target.value); setSelected(b?.id ?? null); b?.select(); }}><option value="">Конец программы</option>{blocks.map((b,i) => <option key={b.id} value={b.id}>{i+1}. {label_(b.type)}</option>)}</select></label>
            {selected && blocks.filter(b => b.id === selected).map(b => <div key={b.id}>
              {b.type==='controls_if'&&<><label className="checkbox"><input type="checkbox" checked={!!b.getInput('ELSE')} onChange={e=>{const extra=b.saveExtraState?.()||{};b.loadExtraState?.({...extra,hasElse:e.target.checked});sync();}}/>Ветка «иначе»</label><label>Дополнительных условий<input type="number" min={0} max={20} value={b.inputList.filter(i=>/^IF\d+$/.test(i.name)).length-1} onChange={e=>{const n=Math.max(0,Math.min(20,Number(e.target.value)));const extra=b.saveExtraState?.()||{};b.loadExtraState?.({...extra,elseIfCount:n});sync();}}/></label></>}
              {b.type==='text_join'&&<label>Частей текста<input type="number" min={0} max={10} value={b.inputList.filter(i=>i.name.startsWith('ADD')).length} onChange={e=>{b.loadExtraState?.({itemCount:Math.max(0,Math.min(10,Number(e.target.value)))});sync();}}/></label>}
              {b.inputList.flatMap(input => input.fieldRow).filter(field => field.name && field.EDITABLE).map(field => {
                const options = field instanceof Blockly.FieldDropdown ? field.getOptions(false).filter(o => typeof o[0] === 'string' && !['RENAME_VARIABLE','DELETE_VARIABLE'].includes(o[1])) : null;
                return <label key={field.name}>{({NUM:'Число',TEXT:'Текст',VAR:'Переменная',OP:'Действие',MODE:'Условие цикла',NAME:'Имя функции'} as Record<string,string>)[field.name!] ?? field.name}
                  {options ? <select value={field.getValue()} onChange={e => { b.setFieldValue(e.target.value,field.name!); sync(); }}>{options.map(o => <option key={o[1]} value={o[1]}>{String(o[0])}</option>)}</select> : <input value={String(field.getValue() ?? '')} onChange={e => { b.setFieldValue(e.target.value,field.name!); sync(); }}/>}</label>;
              })}
              {b.inputList.filter(i => i.connection).map(input => <label key={input.name}>Место {input.name}<select aria-label={`Соединение ${input.name}`} value={input.connection?.targetBlock()?.id ?? ''} onChange={e => {const c=input.connection!; c.disconnect(); const other=ws.current?.getBlockById(e.target.value); const connection=other?.outputConnection ?? other?.previousConnection; if(connection)c.connect(connection);sync();}}><option value="">Пустое место</option>{blocks.filter(other => other !== b && !other.getDescendants(false).includes(b) && (other.outputConnection || other.previousConnection) && ws.current?.connectionChecker.canConnect(input.connection!, (other.outputConnection || other.previousConnection)!, false)).map(other => <option key={other.id} value={other.id}>{label_(other.type)} · {blocks.indexOf(other)+1}</option>)}</select></label>)}
              <button type="button" onClick={() => { b.unplug(true); sync(); }}>Отсоединить блок</button>
              <button type="button" onClick={() => {const previous=b.getPreviousBlock();if(previous?.nextConnection?.targetBlock()===b&&b.previousConnection&&b.nextConnection&&previous.previousConnection){const before=previous.previousConnection.targetConnection,after=b.nextConnection.targetConnection;Blockly.Events.setGroup(true);try{b.unplug(false);b.nextConnection.disconnect();previous.unplug(false);if(before)before.connect(b.previousConnection);b.nextConnection.connect(previous.previousConnection);if(after)previous.nextConnection?.connect(after);sync();}finally{Blockly.Events.setGroup(false)}}}}>Поднять команду</button>
            </div>)}
            {palette.some(t => ['variables_set','variables_get','math_change'].includes(t)) && <form onSubmit={e => {e.preventDefault(); const problem = nameProblem(variable); if(problem){setNotice(problem);return;} ws.current?.getVariableMap().createVariable(variable);setVariable('');sync();}}><label>Новая переменная<input value={variable} onChange={e=>setVariable(e.target.value)}/></label><button type="submit">Создать переменную</button></form>}
          </div>
        </details>
      )}
      <p className="block-notice" aria-live="polite">{notice}</p>
    </div>
  );
}
