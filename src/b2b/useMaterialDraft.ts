import { useEffect, useRef, useState } from "react";
import { api, ApiError, type Row } from "./api";

type SaveState = "saved" | "saving" | "local" | "conflict" | "error";
type Backup = {
  id: string;
  clientKey: string;
  baseRevision: number;
  content: Row;
  changedAt: string;
};
export function useMaterialDraft(
  initial: Row,
  owner: { id: string; org_id: string },
  routeId: string,
  resource='tasks',
) {
  const namespace=resource==='tasks'?'authoring':'lesson-authoring';
  const key = `kodik:${namespace}:${owner.org_id}:${owner.id}:${routeId === "new" ? `new:${initial.lesson_id}` : routeId}`;
  const read = (): Backup | null => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };
  const [backup] = useState(read);
  const [task, setTask] = useState<Row>(() => backup?.content || initial);
  const [status, setStatus] = useState<SaveState>(backup ? "local" : "saved");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<Row | null>(null);
  const state = useRef({
    id: backup?.id || initial.id || "",
    clientKey: backup?.clientKey || crypto.randomUUID(),
    revision: backup?.baseRevision ?? initial.revision ?? 0,
    content: task,
    dirty: Boolean(backup),
    generation: 0,
    blocked: false,
  });
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const mounted = useRef(true);
  const cache = () => {
    const s = state.current;
    const value: Backup = {
      id: s.id,
      clientKey: s.clientKey,
      baseRevision: s.revision,
      content: s.content,
      changedAt: new Date().toISOString(),
    };
    try {
      const canonical = s.id
        ? `kodik:${namespace}:${owner.org_id}:${owner.id}:${s.id}`
        : key;
      localStorage.setItem(canonical, JSON.stringify(value));
      if (canonical !== key) localStorage.removeItem(key);
      return true;
    } catch {
      if (mounted.current)
        setError(
          "Память браузера недоступна. Сохраните материал на сервере перед выходом.",
        );
      return false;
    }
  };
  const change = (field: string, value: unknown) => {
    const s = state.current;
    s.content = { ...s.content, [field]: value };
    s.dirty = true;
    s.generation++;
    cache();
    setTask(s.content);
    setStatus(s.blocked ? "conflict" : "local");
  };
  const persist = (): Promise<Row> => {
    const operation = queue.current
      .catch(() => {})
      .then(async () => {
        const s = state.current;
        if (s.blocked) throw new Error("Сначала разрешите конфликт версий.");
        if (!s.dirty && s.id) return { id: s.id, revision: s.revision };
        const content = { ...s.content },
          generation = s.generation;
        if (mounted.current) {
          setStatus("saving");
          setError("");
        }
        cache();
        try {
          let result = await api(
            s.id ? `/${resource}/${s.id}` : `/${resource}`,
            { ...content, revision: s.revision, client_key: s.clientKey },
            s.id ? "PUT" : "POST",
          );
          if (result.replayed) {
            s.id = result.id;
            s.revision = result.revision;
            cache();
            result = await api(
              `/${resource}/${s.id}`,
              { ...content, revision: s.revision },
              "PUT",
            );
          }
          s.id = result.id;
          s.revision = result.revision;
          if (routeId === "new" && location.hash.startsWith("#builder/new"))
            history.replaceState(null, "", `#builder/${s.id}`);
          // A response lost after a create may return an already-created revision. The
          // next edit still uses the authoritative revision and cannot overwrite a peer.
          s.dirty = s.generation !== generation;
          if (s.dirty) cache();
          else
            try {
              localStorage.removeItem(key);
              localStorage.removeItem(
                `kodik:${namespace}:${owner.org_id}:${owner.id}:${s.id}`,
              );
            } catch {}
          if (mounted.current) setStatus(s.dirty ? "local" : "saved");
          window.dispatchEvent(new Event("kodik-data-changed"));
          return result;
        } catch (e) {
          cache();
          if (e instanceof ApiError && e.status === 409 && e.details.current) {
            s.blocked = true;
            if (mounted.current) {
              setConflict({
                current: e.details.current,
                id: e.details.conflict_id,
              });
              setStatus("conflict");
            }
          } else if (mounted.current)
            setStatus(navigator.onLine ? "error" : "local");
          if (mounted.current)
            setError(
              e instanceof ApiError
                ? e.message
                : "Нет связи с сервером. Изменения сохранены на этом компьютере и будут отправлены после восстановления связи.",
            );
          throw e;
        }
      });
    queue.current = operation;
    return operation;
  };
  useEffect(() => {
    mounted.current = true;
    const retry = () => {
      if (state.current.dirty && !state.current.blocked)
        void persist().catch(() => {});
    };
    window.addEventListener("online", retry);
    const warn = (e: BeforeUnloadEvent) => {
      if (state.current.dirty && !cache()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    const timer = setInterval(retry, 15000);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", retry);
      window.removeEventListener("beforeunload", warn);
      clearInterval(timer);
      if (state.current.dirty) {
        cache();
        void persist().catch(() => {});
      }
    };
  }, []);
  useEffect(() => {
    if (!state.current.dirty || state.current.blocked) return;
    const timer = setTimeout(() => void persist().catch(() => {}), 900);
    return () => clearTimeout(timer);
  }, [task]);
  const resolveConflict = async (choice: "mine" | "server") => {
    if (!conflict) return;
    const current = conflict.current,
      s = state.current;
    s.revision = current.revision;
    s.blocked = false;
    setConflict(null);
    setError("");
    if (choice === "server") {
      s.content = current;
      s.dirty = false;
      setTask(current);
      setStatus("saved");
      try {
        localStorage.removeItem(key);
        localStorage.removeItem(
          `kodik:${namespace}:${owner.org_id}:${owner.id}:${s.id}`,
        );
      } catch {}
      return;
    }
    s.dirty = true;
    s.generation++;
    cache();
    await persist();
  };
  return {
    task,
    change,
    persist,
    status,
    error,
    conflict,
    resolveConflict,
    hasChanges: state.current.dirty,
    serverRevision:state.current.revision,
    serverId:state.current.id,
  };
}
