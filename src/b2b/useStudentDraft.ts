import { useEffect, useRef, useState } from "react";
import { api, ApiError, type Row } from "./api";
export function useStudentDraft(
  owner: { id: string; org_id: string },
  task: Row,
  serverDraft?: Row,
) {
  const key = `kodik:student-draft:${owner.org_id}:${owner.id}:${task.assignment_id||task.id}`;
  const [backup] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  });
  const [code, setCode] = useState<string>(
      backup?.code ?? serverDraft?.code ?? task.starter,
    ),
    [saved, setSaved] = useState(
      backup
        ? "Восстановлено с этого компьютера"
        : serverDraft
          ? "Черновик сохранён на сервере"
          : "Стартовый код",
    ),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState<Row | null>(null);
  const latest = useRef(code),
    lastSaved = useRef(serverDraft?.code ?? task.starter),
    revision = useRef(0),
    serverRevision = useRef<number>(
      backup?.revision ?? serverDraft?.revision ?? 0,
    ),
    blocked = useRef(false),
    mounted = useRef(true),
    queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const cache = () => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          code: latest.current,
          revision: serverRevision.current,
        }),
      );
      return true;
    } catch {
      if (mounted.current)
        setError(
          "Не хватает памяти для локальной копии. Сохраните код на сервере перед выходом.",
        );
      return false;
    }
  };
  const change = (value: string) => {
    latest.current = value;
    revision.current++;
    cache();
    setCode(value);
    setSaved("Сохранено на компьютере");
  };
  const persist = (value = latest.current, generation = revision.current) => {
    queue.current = queue.current
      .catch(() => false)
      .then(async () => {
        if (blocked.current) return false;
        if (value === lastSaved.current) return true;
        cache();
        if (mounted.current) setSaved("Сохраняем…");
        try {
          const result = await api(
            `/tasks/${task.id}/draft`,
            { code: value, revision: serverRevision.current,assignment_id:task.assignment_id },
            "PUT",
          );
          serverRevision.current = result.revision;
          lastSaved.current = value;
          if (value === latest.current) {
            try {
              localStorage.removeItem(key);
            } catch {}
          } else cache();
          if (mounted.current && generation === revision.current) {
            setSaved("Сохранено на сервере");
            setError("");
          }
          return true;
        } catch (e) {
          cache();
          if (e instanceof ApiError && e.status === 409 && e.details.current) {
            blocked.current = true;
            if (mounted.current) setConflict(e.details.current as Row);
          }
          if (mounted.current) {
            setSaved(
              blocked.current
                ? "Конфликт двух вкладок"
                : "Сохранено на компьютере",
            );
            setError(
              e instanceof ApiError
                ? e.message
                : "Нет связи с сервером. Код сохранён только для вашего аккаунта на этом компьютере.",
            );
          }
          return false;
        }
      });
    return queue.current;
  };
  useEffect(() => {
    if (code === lastSaved.current) return;
    const timer = setTimeout(() => void persist(code, revision.current), 600);
    return () => clearTimeout(timer);
  }, [code]);
  useEffect(() => {
    mounted.current = true;
    const retry = () => {
      if (latest.current !== lastSaved.current) void persist();
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (latest.current !== lastSaved.current && !cache()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("online", retry);
    window.addEventListener("beforeunload", beforeUnload);
    const timer = setInterval(retry, 15000);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", retry);
      window.removeEventListener("beforeunload", beforeUnload);
      clearInterval(timer);
      if (latest.current !== lastSaved.current) {
        cache();
        void persist();
      }
    };
  }, []);
  const resolve = async (choice: "mine" | "server") => {
    if (!conflict) return;
    serverRevision.current = conflict.revision;
    blocked.current = false;
    setConflict(null);
    setError("");
    if (choice === "server") {
      latest.current = conflict.code;
      lastSaved.current = conflict.code;
      setCode(conflict.code);
      try {
        localStorage.removeItem(key);
      } catch {}
      setSaved("Сохранено на сервере");
      return;
    }
    cache();
    await persist();
  };
  return {
    code,
    change,
    persist,
    saved,
    error,
    conflict,
    resolve,
    lastSaved,
    revision,
  };
}
