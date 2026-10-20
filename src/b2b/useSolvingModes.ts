import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type Row, type State } from "./api";
import { useBlockDraft } from "./useBlockDraft";
import { translateWorkspace, TRANSLATOR_VERSION } from "../adaptive/blockProgram";
import { MODE_LABEL, canSelfSwitch, type Effective, type Mode } from "../adaptive/modePolicy";

/**
 * Solving modes in the learner workspace. The server is the authority (task.modes); the page never
 * switches the editor by itself while the child is working — a teacher's change shows as a notice.
 */
export function useSolvingModes(task: Row, state: State, refresh: () => Promise<void>, preview?: {workspace:unknown;change:(w:object)=>void;persist:()=>Promise<boolean>}) {
  const modes = task.modes as (Effective & { supported: Mode[] }) | undefined;
  const hasBlocks = !!modes?.supported?.some((m) => m !== "python");
  const [mode, setMode] = useState<Mode>(modes?.current ?? "python");
  const [notice, setNotice] = useState("");
  const [recommendation,setRecommendation]=useState<Row|null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const serverDraft = (state as Row).block_drafts?.find((d: Row) => d.assignment_id === task.assignment_id);
  const stored = useBlockDraft(state.user as { id: string; org_id: string }, task, serverDraft, hasBlocks && !preview);
  const blocks = preview ? {...stored,workspace:preview.workspace,change:preview.change,persist:preview.persist,saved:'Пробная работа автора'} : stored;
  const palette: string[] = task.learning?.palette ?? [];
  // The mirror shows the Python of the learner's own current blocks — never the teacher's solution.
  const mirror = useMemo(() => translateWorkspace(blocks.workspace ?? { blocks: { blocks: [] } }, { allowed: palette }), [blocks.workspace, palette.join()]);
  const serverCurrent = modes?.current ?? "python";
  useEffect(()=>{if(preview||!task.assignment_id||!modes?.offered){setRecommendation(null);return;}let live=true;api(`/recommendations?assignment_id=${encodeURIComponent(task.assignment_id)}&limit=1`).then(r=>{if(live)setRecommendation(r.active.items.find((r:Row)=>r.status==='offered'&&r.target_mode===modes.offered)??null)}).catch(()=>{});return()=>{live=false}},[task.assignment_id,modes?.offered]);
  useEffect(() => {
    if (!modes) return;
    if (!modes.allowed.includes(mode)) setNotice(`Учитель изменил способ решения. Сейчас доступно: ${modes.allowed.map((m) => `«${MODE_LABEL[m]}»`).join(", ")}. Твоя работа сохранена.`);
    else if (serverCurrent !== mode && modes.switching !== "free") setNotice(`Учитель перевёл задание в режим «${MODE_LABEL[serverCurrent]}». Перейди, когда будешь готов — работа сохранится.`);
  }, [serverCurrent, modes?.allowed.join(), modes?.switching]);

  async function switchTo(next: Mode, decline = false) {
    if (!modes || (!task.assignment_id && !preview)) return;
    setNotice("");
    try {
      if (!decline && mode !== 'python' && !await blocks.persist()) return;
      if (!preview && (next !== serverCurrent || decline)) await api(`/assignments/${task.assignment_id}/mode`, decline ? { mode: next, decline: true } : { mode: next });
      if (!decline) {
        setMode(next);
      }
      await refresh();
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "Не удалось сменить режим. Работа сохранена.");
    }
  }
  const available = (modes?.allowed ?? ["python"]) as Mode[];
  return {
    enabled: hasBlocks || available.length > 1,
    mode, setMode, modes, available, palette, blocks, mirror, selected, setSelected, notice, setNotice,
    canSwitch: (m: Mode) => m === mode ? false : m === serverCurrent ? available.includes(m) : !!modes && canSelfSwitch(modes, m),
    switchTo,
    offered: modes?.offered ?? null,recommendation,
    requestBody: () => mode === "python" ? null : { mode, workspace: JSON.parse(JSON.stringify(blocks.workspace ?? { blocks: { blocks: [] } })), client_translator: TRANSLATOR_VERSION },
  };
}
export type SolvingModes = ReturnType<typeof useSolvingModes>;
