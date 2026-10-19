import { useEffect, useRef, useState } from "react";
import * as Blockly from "blockly";
import * as ruModule from "blockly/msg/ru";
import { BLOCKS } from "../adaptive/blockProgram";
import { registerToolboxButtons, toolboxFor } from "../adaptive/blocklyBlocks";

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

  useEffect(() => {
    if (!host.current) return;
    const w = Blockly.inject(host.current, {
      theme, toolbox: readOnly ? undefined : toolboxFor(palette), readOnly, renderer: "zelos", trashcan: !readOnly, sounds: false,
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.6, minScale: 0.5 },
      grid: { spacing: 24, length: 2, colour: "#e2e5dd", snap: true },
      move: { scrollbars: true, drag: true, wheel: true },
    });
    ws.current = w;
    registerToolboxButtons(w, (message) => setNotice(message));
    try { if (value && typeof value === "object") Blockly.serialization.workspaces.load(value as object, w); }
    catch { setNotice("Сохранённые блоки не удалось открыть. Начни заново — прежний вариант остался в истории черновиков."); }
    const statementOf = (id: string | null) => { let b = id ? w.getBlockById(id) : null; while (b && b.outputConnection) b = b.getParent(); return b?.id ?? null; };
    const listener = (e: Blockly.Events.Abstract) => {
      if (e.type === Blockly.Events.SELECTED) { const id = (e as Blockly.Events.Selected).newElementId ?? null; setSelected(id); select.current?.(id, statementOf(id)); return; }
      if (e.isUiEvent) return;
      change.current(Blockly.serialization.workspaces.save(w));
    };
    w.addChangeListener(listener);
    const ro = new ResizeObserver(() => Blockly.svgResize(w));
    ro.observe(host.current);
    return () => { ro.disconnect(); w.removeChangeListener(listener); w.dispose(); ws.current = null; };
    // The workspace is created once per palette; later `value` changes come from this editor itself.
  }, [palette.join(), readOnly]);

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
      const candidates = anchor ? [anchor, ...anchor.getDescendants(false)] : w.getAllBlocks(true);
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
      setNotice(connected ? `Блок «${label_(type)}» добавлен в программу.` : `Блок «${label_(type)}» добавлен отдельно. Перетащи или выбери место.`);
    } finally { Blockly.Events.setGroup(false); }
  }
  const label_ = (type: string) => BLOCKS.find((b) => b.type === type)?.label ?? type;

  return (
    <div className="block-editor">
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
          </div>
        </details>
      )}
      <p className="block-notice" aria-live="polite">{notice}</p>
    </div>
  );
}
