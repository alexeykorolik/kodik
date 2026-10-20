import { useEffect, useRef, useState } from "react";
import { api, ApiError, isOwnerMismatch, type Row } from "./api";

/**
 * Learner's block workspace draft for one assignment: one draft shared by «Блоки» and
 * «Блоки + Python». Safe to save while incomplete. The local copy is keyed by school,
 * learner and assignment, so a shared school computer never mixes two children's work.
 */
export function useBlockDraft(learner: { id: string; org_id: string }, task: Row, serverDraft?: Row, enabled = true) {
  // Fixed for the life of this editor (see useStudentDraft): saves name this learner only.
  const [owner] = useState(() => ({ id: learner.id, org_id: learner.org_id }));
  const key = `kodik:block-draft:${owner.org_id}:${owner.id}:${task.assignment_id || task.id}`;
  const [backup] = useState(() => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } });
  const initial = backup?.workspace ?? serverDraft?.workspace ?? task.learning?.starter_blocks ?? null;
  const [workspace, setWorkspace] = useState<unknown>(initial),
    [saved, setSaved] = useState(backup ? "Блоки восстановлены с этого компьютера" : serverDraft ? "Блоки сохранены на сервере" : "Начало задания"),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState<Row | null>(null);
  const latest = useRef<string>(JSON.stringify(initial)), lastSaved = useRef<string>(JSON.stringify(serverDraft?.workspace ?? task.learning?.starter_blocks ?? null)),
    serverRevision = useRef<number>(backup?.revision ?? serverDraft?.revision ?? 0), blocked = useRef(false), mounted = useRef(true),
    queue = useRef<Promise<boolean>>(Promise.resolve(true)), generation = useRef(0);
  const cache = () => { try { localStorage.setItem(key, JSON.stringify({ workspace: JSON.parse(latest.current), revision: serverRevision.current })); return true; } catch { if (mounted.current) setError("Не хватает памяти для локальной копии блоков. Дождитесь сохранения на сервере."); return false; } };
  const change = (value: object) => {
    const text = JSON.stringify(value);
    if (text === latest.current) return;
    latest.current = text; generation.current++;
    cache(); setWorkspace(value); setSaved("Сохранено на компьютере");
  };
  const persist = () => {
    if (!enabled) return Promise.resolve(true);
    queue.current = queue.current.catch(() => false).then(async () => {
      if (blocked.current) return false;
      const value = latest.current, gen = generation.current;
      if (value === lastSaved.current) return true;
      cache();
      if (mounted.current) setSaved("Сохраняем блоки…");
      try {
        const result = await api(`/tasks/${task.id}/draft`, { mode: "blocks", workspace: JSON.parse(value), revision: serverRevision.current, assignment_id: task.assignment_id }, "PUT", undefined, { owner });
        serverRevision.current = result.revision; lastSaved.current = value;
        if (value === latest.current) { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } } else cache();
        if (mounted.current && gen === generation.current) { setSaved("Блоки сохранены на сервере"); setError(""); }
        return true;
      } catch (e) {
        cache();
        if (isOwnerMismatch(e)) { blocked.current = true; return false; }
        if (e instanceof ApiError && e.status === 409 && e.details.current) { blocked.current = true; if (mounted.current) setConflict(e.details.current as Row); }
        if (mounted.current) {
          setSaved(blocked.current ? "Конфликт двух вкладок" : "Сохранено на компьютере");
          setError(e instanceof ApiError ? e.message : "Нет связи с сервером. Блоки сохранены только для вашего аккаунта на этом компьютере.");
        }
        return false;
      }
    });
    return queue.current;
  };
  useEffect(() => {
    if (!enabled || latest.current === lastSaved.current) return;
    const timer = setTimeout(() => void persist(), 700);
    return () => clearTimeout(timer);
  }, [workspace, enabled]);
  useEffect(() => {
    mounted.current = true;
    const retry = () => { if (latest.current !== lastSaved.current) void persist(); };
    const beforeUnload = (e: BeforeUnloadEvent) => { if (latest.current !== lastSaved.current && !cache()) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("online", retry);
    window.addEventListener("beforeunload", beforeUnload);
    const timer = setInterval(retry, 15000);
    return () => { mounted.current = false; window.removeEventListener("online", retry); window.removeEventListener("beforeunload", beforeUnload); clearInterval(timer); if (latest.current !== lastSaved.current) { cache(); void persist(); } };
  }, []);
  const resolve = async (choice: "mine" | "server") => {
    if (!conflict) return;
    serverRevision.current = conflict.revision; blocked.current = false; setConflict(null); setError("");
    if (choice === "server") {
      const text = JSON.stringify(conflict.workspace);
      latest.current = text; lastSaved.current = text; generation.current++;
      setWorkspace(conflict.workspace);
      try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
      setSaved("Блоки сохранены на сервере");
      return;
    }
    cache(); await persist();
  };
  return { workspace, change, persist, saved, error, conflict, resolve, generation };
}
