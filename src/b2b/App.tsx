import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { api, isOwnerMismatch, setSessionUser, statusNames, type Row, type State } from "./api";
import { Builder } from "./Builder";
import { Workspace } from "./Workspace";
import {AssignmentDialog} from './AssignmentDialog';
import {LessonEditor} from './LessonEditor';
import {LessonRun} from './LessonRun';
import {ProgramCards,ProgramOverview,ProgramIssueDialog} from './Programs';
import {TaskPreview} from './TaskPreview';
import {ModeManagement,SchoolPanel,ClassroomPanel,Journal} from './PilotPanels';
import {Owner} from './Owner';

export function Glyph({ name = "grid" }: { name?: string }) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    book: "M4 4h6a3 3 0 0 1 2 2 3 3 0 0 1 2-2h6v16h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4z M12 6v15",
    edit: "m15 4 5 5 M4 20l5-1L21 7l-5-5L4 14z",
    users:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-4 M17 3a4 4 0 0 1 0 8",
    chart: "M4 20h17 M7 16V9 M12 16V4 M17 16v-5",
    arrow: "M5 12h14 m-6-6 6 6-6 6",
    plus: "M12 5v14 M5 12h14",
    code: "m8 6-6 6 6 6 m8-12 6 6-6 6 M14 3l-4 18",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
export function Badge({
  status,
  children,
}: {
  status?: string;
  children?: ReactNode;
}) {
  return (
    <span className={`badge ${status || ""}`}>
      {children || statusNames[status || ""] || status}
    </span>
  );
}
export function Empty({
  title,
  text: detail,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Glyph name="book" />
      </div>
      <h3>{title}</h3>
      <p>{detail}</p>
      {children}
    </div>
  );
}
export function Header({
  eyebrow,
  title,
  text: detail,
  children,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow || "РАБОЧЕЕ ПРОСТРАНСТВО"}</div>
        <h1>{title}</h1>
        {detail && <p>{detail}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: Row[];
  optional?: boolean;
  value?: string;
};
type Dialog = {
  title: string;
  text?: string;
  fields: Field[];
  submit: (b: Row) => Promise<unknown>;
};
function FormDialog({ dialog, close }: { dialog: Dialog; close: () => void }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="overlay">
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={dialog.title}
      >
        <div className="dialog-heading">
          <h2>{dialog.title}</h2>
          <button className="icon-button" aria-label="Закрыть" onClick={close}>
            ×
          </button>
        </div>
        {dialog.text && <p className="muted">{dialog.text}</p>}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await dialog.submit(
                Object.fromEntries(new FormData(e.currentTarget)),
              );
              close();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {dialog.fields.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.options ? (
                <select
                  aria-label={f.label}
                  name={f.key}
                  defaultValue={f.value || f.options[0]?.id}
                  required={!f.optional}
                >
                  {f.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title || o.name}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  aria-label={f.label}
                  name={f.key}
                  defaultValue={f.value}
                  required={!f.optional}
                  rows={3}
                />
              ) : (
                <input
                  aria-label={f.label}
                  autoComplete={f.type === "password" ? "new-password" : "off"}
                  name={f.key}
                  type={f.type || "text"}
                  defaultValue={f.value}
                  required={!f.optional}
                  minLength={f.type === "password" ? 10 : undefined}
                />
              )}
            </label>
          ))}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer>
            <button type="button" onClick={close}>
              Отмена
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Сохраняем…" : "Сохранить"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
function Auth({ onLogin }: { onLogin: (recovery?: string) => Promise<void> }) {
  const [mode, setMode] = useState("login"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api(
        `/auth/${mode}`,
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      await onLogin(result.recovery);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth">
      <section className="auth-story">
        <a className="brand" href="/" aria-label="Kodik">
          <span className="brand-mark">k.</span>kodik
          <span className="brand-suffix">школы</span>
        </a>
        <div className="auth-copy">
          <div className="eyebrow">ПРОСТРАНСТВО ДЛЯ ОБУЧЕНИЯ</div>
          <h1>
            От первой строки
            <br />
            кода — к большим
            <br />
            <em>открытиям.</em>
          </h1>
          <p>
            Ваши курсы, ученики и их маленькие победы.
            <br />
            Всё, что нужно школе программирования.
          </p>
          <div className="code-art">
            <span className="code-dots">● ● ●</span>
            <code>
              <span>def</span> начать_учиться():
              <br />　 любопытство = <i>True</i>
              <br />　 <span>while</span> любопытство:
              <br />　 　 создать_что_нибудь()
            </code>
            <div className="art-tag">↗ Новые навыки каждый день</div>
          </div>
        </div>
        <small>Создано для тех, кто учит создавать.</small>
      </section>
      <section className="auth-form">
        <div>
          <span className="badge passed">KODIK ДЛЯ ШКОЛ</span>
          <h2>
            {mode === "register"
              ? "Начнём с вашей школы"
              : mode === "recover"
                ? "Вернём доступ"
                : "Рады вас видеть"}
          </h2>
          <p className="muted">
            {mode === "register"
              ? "Создайте рабочее пространство и аккаунт администратора."
              : mode === "recover"
                ? "Используйте код, полученный при создании школы. Ученику поможет преподаватель."
                : "Войдите, чтобы продолжить обучение и работу."}
          </p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <label>
                  Название школы
                  <input
                    name="school"
                    required
                    maxLength={200}
                    placeholder="Например, Академия будущего"
                  />
                </label>
                <label>
                  Ваше имя
                  <input
                    name="name"
                    required
                    maxLength={200}
                    autoComplete="name"
                  />
                </label>
              </>
            )}
            <label>
              Логин
              <input
                name="login"
                autoComplete="username"
                required
                maxLength={120}
              />
            </label>
            {mode === "recover" && (
              <label>
                Код восстановления
                <input name="recovery" required autoComplete="off" />
              </label>
            )}
            <label>
              {mode === "recover" ? "Новый пароль" : "Пароль"}
              <input
                name="password"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? "Подождите…"
                : mode === "register"
                  ? "Создать школу"
                  : mode === "recover"
                    ? "Восстановить доступ"
                    : "Войти в Kodik"}
              <Glyph name="arrow" />
            </button>
          </form>
          <div className="auth-links">
            <button
              className="link"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setError("");
              }}
            >
              {mode === "register"
                ? "Уже есть аккаунт? Войти"
                : "Открываете школу? Создать пространство"}
            </button>
            <button
              className="link subtle"
              onClick={() => {
                setMode(mode === "recover" ? "login" : "recover");
                setError("");
              }}
            >
              {mode === "recover"
                ? "Вернуться ко входу"
                : "Восстановить доступ"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
/** Which account this browser has signed in last; other tabs compare it with the child they show. */
const SESSION_KEY = "kodik:session-user";
function announce(user: Row | null) {
  try {
    const value = user ? JSON.stringify({ id: user.id, name: user.name }) : "null";
    if (localStorage.getItem(SESSION_KEY) !== value) localStorage.setItem(SESSION_KEY, value);
  } catch { /* storage unavailable: the server still refuses another child's requests */ }
}
export default function B2BApp() {
  const [state, setState] = useState<State | null>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [notice, setNotice] = useState(""),
    [recovery, setRecovery] = useState(""),
    [route, setRoute] = useState(location.hash.slice(1) || "overview"),
    [dialog, setDialog] = useState<Dialog | null>(null),
    [assignmentDialog,setAssignmentDialog]=useState<{group:Row;repeat?:Row}|null>(null),
    [programGroup,setProgramGroup]=useState<Row|null>(null),
    [attempt, setAttempt] = useState<Row | null>(null),
    [refreshedAt, setRefreshedAt] = useState(""),
    [refreshError, setRefreshError] = useState(""),
    [compactSidebar, setCompactSidebar] = useState(false),
    [switched, setSwitched] = useState<{ from: Row; to?: Row; signedOut?: boolean } | null>(null);
  const refreshSequence = useRef(0), shown = useRef<Row | null>(null), switchedRef = useRef(false);
  shown.current = state?.user ?? null;
  switchedRef.current = !!switched;
  useEffect(()=>{
    if(!dialog&&!attempt&&!assignmentDialog&&!programGroup)return;
    const previous=document.activeElement as HTMLElement|null;
    const focusable=()=>Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled),[role="dialog"] input:not(:disabled),[role="dialog"] select:not(:disabled),[role="dialog"] textarea:not(:disabled),[role="dialog"] [tabindex="0"]')).filter(e=>e.getClientRects().length);
    const t=requestAnimationFrame(()=>focusable()[0]?.focus());
    const keys=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();setDialog(null);setAttempt(null);setAssignmentDialog(null);setProgramGroup(null)}if(e.key==='Tab'){const nodes=focusable(),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};
    document.addEventListener('keydown',keys);return()=>{cancelAnimationFrame(t);document.removeEventListener('keydown',keys);previous?.focus()};
  },[!!dialog,!!attempt,!!assignmentDialog,!!programGroup]);
  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const next = await api("/state");
      if (sequence === refreshSequence.current) {
        setSessionUser(next.user);
        announce(next.user);
        setState(next);
        setRefreshedAt(new Date().toISOString());
        setRefreshError("");
      }
    } catch (e) {
      if (sequence === refreshSequence.current && !isOwnerMismatch(e))
        setRefreshError((e as Error).message);
      throw e;
    }
  }, []);
  useEffect(() => {
    if (!state?.user.id) return;
    const update = () => {
      if (document.visibilityState === "visible" && !switchedRef.current)
        void refresh().catch(() => {});
    };
    update();
    const interval = setInterval(update, 5000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("kodik-data-changed", update);
    window.addEventListener("online", update);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("kodik-data-changed", update);
      window.removeEventListener("online", update);
    };
  }, [route, state?.user.id, refresh]);
  useEffect(() => {
    refresh()
      .catch((e) => {
        if (e.message !== "Войдите в аккаунт.") setLoadError(e.message);
      })
      .finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    const handler = () => setRoute(location.hash.slice(1) || "overview");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    const expired = () => {
      refreshSequence.current++;
      setSwitched(null);
      setState(null);
      setRecovery("");
      setAssignmentDialog(null);setProgramGroup(null);setDialog(null);setAttempt(null);
    };
    window.addEventListener("kodik-auth-expired", expired);
    // Another child signed in from a neighbouring tab: this tab stops acting for the child it shows.
    // The server refuses such requests anyway (owner_mismatch); this only makes the switch visible early.
    const mismatch = (e: Event) => {
      const from = shown.current, detail = (e as CustomEvent).detail;
      // A late answer to a request made for an earlier account of this tab changes nothing.
      if (!from || (detail?.expected && detail.expected !== from.id)) return;
      setSwitched({ from, to: (e as CustomEvent).detail?.session });
    };
    const storage = (e: StorageEvent) => {
      if (e.key !== SESSION_KEY || !shown.current) return;
      let next: Row | null = null;
      try { next = JSON.parse(e.newValue || "null"); } catch { /* unreadable: the server decides */ }
      if (!next) setSwitched({ from: shown.current, signedOut: true });
      else if (next.id !== shown.current.id) setSwitched({ from: shown.current, to: next });
      // The same child signed in again: this tab goes on with their work (and their stored operations).
      else setSwitched(null);
    };
    window.addEventListener("kodik-owner-mismatch", mismatch);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("kodik-auth-expired", expired);
      window.removeEventListener("kodik-owner-mismatch", mismatch);
      window.removeEventListener("storage", storage);
    };
  }, []);
  async function openCurrentAccount() {
    refreshSequence.current++;
    if (switched?.signedOut) { setSwitched(null); setState(null); return; }
    setSessionUser(null);
    setDialog(null);setAttempt(null);setAssignmentDialog(null);setProgramGroup(null);
    try { await refresh(); setSwitched(null); go("overview"); }
    catch (e) { if (!isOwnerMismatch(e)) { setSwitched(null); setState(null); } }
  }
  const go = (path: string) => {
    setRoute(path);
    location.hash = path;
  };
  const mutate = async (path: string, body: Row, method = "POST") => {
    const result = await api(path, body, method);
    await refresh();
    return result;
  };
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  if (loading)
    return <main className="fatal">Открываем рабочее пространство…</main>;
  if (switched)
    return (
      <main className="account-switched" data-testid="account-switched">
        <section role="alert">
          <div className="eyebrow">ДРУГОЙ АККАУНТ</div>
          <h1>{switched.signedOut ? `В этом браузере выполнен выход из аккаунта «${switched.from.name}»` : switched.to?.name ? `В этом браузере теперь открыт аккаунт «${switched.to.name}»` : "В этом браузере открыт другой аккаунт"}</h1>
          <p>
            Работа ученика «{switched.from.name}» сохранена за ним: черновик остаётся на этом компьютере, а
            отправленное решение — в Kodik. Всё продолжится, когда {switched.from.name} снова войдёт в свой аккаунт.
          </p>
          <p>Эта вкладка больше ничего не отправляет от имени «{switched.from.name}».</p>
          <button className="primary" autoFocus onClick={() => void openCurrentAccount()}>
            {switched.signedOut ? "Войти" : switched.to?.name ? `Открыть аккаунт «${switched.to.name}»` : "Открыть текущий аккаунт"}
          </button>
        </section>
      </main>
    );
  if (!state)
    return (
      <>
        {loadError && (
          <p role="alert" className="connection-error">
            {loadError} Проверьте, что сервер запущен.
          </p>
        )}
        <Auth
          onLogin={async (code) => {
            setSessionUser(null);
            await refresh();
            if (code) setRecovery(code);
            setLoadError("");
            go("overview");
          }}
        />
      </>
    );
  const s = state,
    student = s.user.role === "student",
    [page, id] = route.split("?")[0].split("/"),
    students = s.users.filter((u) => u.role === "student");
  const taskForCourse = (cid: string) =>
    s.tasks.filter(t=>!t.run_id).filter((t) => t.order_snapshot?.course_id?t.order_snapshot.course_id===cid:
      s.lessons.some(
        (l) =>
          l.id === t.lesson_id &&
          s.modules.some((m) => m.id === l.module_id && m.course_id === cid),
      ),
    );
  const isPassed = (taskId: string, uid = s.user.id) =>
    s.attempts.some(
      (a) => (a.assignment_id===taskId||!student&&a.task_id===taskId) && a.user_id === uid && a.status === "passed",
    );
  const progressKey=(t:Row)=>student?t.assignment_id:t.id;
  const matchesTask=(a:Row,t:Row)=>student?a.assignment_id===t.assignment_id:a.task_id===t.id;
  const taskLink=(t:Row)=>`assignment/${t.assignment_id}`;
  const assignedFor = (uid: string) =>
    [
      ...new Set(
        s.assignments
          .filter((a) =>
            s.members.some(
              (m) => m.group_id === a.group_id && m.user_id === uid,
            ),
          )
          .map((a) => a.id),
      ),
    ];
  const nameField = (value?: string): Field => ({
    key: "title",
    label: "Название",
    value,
  });
  const createCourse = () =>
    setDialog({
      title: "Новый курс",
      fields: [
        nameField(),
        {
          key: "description",
          label: "О курсе",
          type: "textarea",
          optional: true,
        },
      ],
      submit: async (b) => {
        const c = await mutate("/courses", b);
        go(`courses/${c.id}`);
      },
    });
  const createUser = () =>
    setDialog({
      title: "Новый участник",
      text: "Передайте логин и пароль участнику лично. Для ученика достаточно имени или псевдонима.",
      fields: [
        { key: "name", label: "Имя или псевдоним" },
        { key: "login", label: "Уникальный логин" },
        { key: "password", label: "Пароль (от 10 символов)", type: "password" },
        {
          key: "role",
          label: "Роль",
          options:
            s.user.role === "admin"
              ? [
                  { id: "student", name: "Ученик" },
                  { id: "teacher", name: "Преподаватель" },
                  { id: "admin", name: "Администратор" },
                ]
              : [{ id: "student", name: "Ученик" }],
        },
      ],
      submit: (b) => mutate("/users", b),
    });
  const openAttempt = (aid: string) =>
    act(async () => setAttempt(await api(`/attempts/${aid}`)));
  const move = (kind: string, rows: Row[], index: number, direction: number) =>
    act(async () => {
      const ids = rows.map((r) => r.id);
      [ids[index], ids[index + direction]] = [
        ids[index + direction],
        ids[index],
      ];
      await mutate("/order", { kind, ids });
    });
  function orderButtons(kind: string, rows: Row[], index: number) {
    return (
      <span className="order-controls">
        <button
          title="Поднять"
          aria-label="Поднять"
          disabled={index === 0}
          onClick={() => move(kind, rows, index, -1)}
        >
          ↑
        </button>
        <button
          title="Опустить"
          aria-label="Опустить"
          disabled={index === rows.length - 1}
          onClick={() => move(kind, rows, index, 1)}
        >
          ↓
        </button>
      </span>
    );
  }
  function taskRow(t: Row, rows?: Row[], index?: number) {
    return (
      <div key={t.assignment_id||t.id} className="task-row">
        <span className={`task-symbol ${isPassed(progressKey(t)) ? "done" : ""}`}>
          {isPassed(progressKey(t)) ? "✓" : <Glyph name="code" />}
        </span>
        <div className="grow">
          <button
            className="text-button"
            onClick={() => go(student ? taskLink(t) : `builder/${t.id}`)}
          >
            {t.title}
          </button>
          <small>
            {student
              ? `${t.group_title} · ${s.attempts.filter((a) => matchesTask(a,t)).length?`Попыток: ${s.attempts.filter((a)=>matchesTask(a,t)).length}`:"Пока не начато"}`
              : `${t.check_mode === "manual" ? "Ручная проверка" : "Автопроверка"} · ${t.difficulty === "easy" ? "Начальный" : t.difficulty === "medium" ? "Средний" : "Продвинутый"} уровень`}
          </small>
        </div>
        <Badge
          status={
            student
              ? isPassed(progressKey(t))
                ? "passed"
                : s.attempts.find((a) => matchesTask(a,t))?.status
              : t.published
                ? "passed"
                : ""
          }
        >
          {student
            ? isPassed(progressKey(t))
              ? "Выполнено"
              : statusNames[
                  s.attempts.find((a) => matchesTask(a,t))?.status
                ] || "К выполнению"
            : t.published
              ? t.published_revision!==t.revision?"Есть изменения":"Опубликовано"
              : "Черновик"}
        </Badge>
        {!student && (
          <>
            <button
              className="small"
              onClick={() => act(() => mutate(`/tasks/${t.id}/copy`, {}))}
            >
              Копия
            </button>
            <button
              className="small"
              onClick={() =>
                act(() =>
                  mutate(`/tasks/${t.id}/publish`, { published: !t.published||t.published_revision!==t.revision,revision:t.revision }),
                )
              }
            >
              {t.published ? t.published_revision!==t.revision?"Обновить публикацию":"Снять" : "Опубликовать"}
            </button>
            {rows && orderButtons("tasks", rows, index!)}
          </>
        )}
      </div>
    );
  }
  function courseCards() {
    return (
      <>{student&&<ProgramCards programs={s.programs} onGo={go}/>}<div className="course-grid">
        {s.courses.filter(c=>!student||taskForCourse(c.id).length>0).map((c, i) => {
          const tasks = taskForCourse(c.id),
            done = tasks.filter((t) => isPassed(progressKey(t))).length;
          return (
            <article className="course-card" key={c.id}>
              <div className={`course-art art-${i % 3}`}>
                <Glyph name="code" />
                <span>PYTHON</span>
                <strong>{["{ }", "</>", "( )"][i % 3]}</strong>
              </div>
              <div className="course-card-body">
                <span className="overline">
                  {s.modules.filter((m) => m.course_id === c.id).length} модулей
                  · {tasks.length} заданий
                </span>
                <h3>
                  <button
                    className="text-button"
                    onClick={() => go(`courses/${c.id}`)}
                  >
                    {c.title}
                  </button>
                </h3>
                <p>{c.description || "Программа обучения Python"}</p>
                {student ? (
                  <>
                    <div className="progress-label">
                      <span>
                        Пройдено {done} из {tasks.length}
                      </span>
                      <b>
                        {tasks.length
                          ? Math.round((done / tasks.length) * 100)
                          : 0}
                        %
                      </b>
                    </div>
                    <progress value={done} max={tasks.length || 1} />
                    <button
                      className="primary full"
                      onClick={() => {
                        const next =
                          tasks.find((t) => !isPassed(progressKey(t)));
                        go(next ? taskLink(next) : `courses/${c.id}`);
                      }}
                    >
                      {tasks.length&&done===tasks.length?"Курс завершён · посмотреть результаты":"Продолжить обучение"} <Glyph name="arrow" />
                    </button>
                  </>
                ) : (
                  <div className="card-bottom">
                    <Badge>
                      {c.import_status==='building'?'Готовим курс · пока нельзя выдать':`${tasks.filter((t) => t.published).length} опубликовано`}
                    </Badge>
                    <button
                      className="link"
                      onClick={() => go(`courses/${c.id}`)}
                    >
                      Открыть →
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div></>
    );
  }
  let content: ReactNode;
  if(s.user.platform_owner)content=<Owner/>;
  else if(page==='school'&&s.user.role==='admin')content=<SchoolPanel state={s} refresh={refresh}/>;
  else if(page==='modes'&&!student)content=<ModeManagement state={s}/>;
  else if(page==='classroom'&&!student)content=<ClassroomPanel/>;
  else if(page==='journal'&&!student)content=<Journal state={s} onAttempt={openAttempt} refreshedAt={refreshedAt}/>;
  else if(page==='preview'&&!student){const task=s.tasks.find(t=>t.id===id);content=task?<TaskPreview key={id} task={task} state={s} refresh={refresh} onBack={()=>go(`builder/${id}?step=3`)} onPublish={()=>go(`builder/${id}?step=5`)}/>:<Empty title="Черновик недоступен" text="Откройте конструктор и сохраните задание."/>}
  else if(page==='lesson-editor'&&!student&&s.lessons.some(l=>l.id===id))content=<LessonEditor key={id} state={s} lessonId={id} refresh={refresh} onBack={()=>{const lesson=s.lessons.find(l=>l.id===id),module=s.modules.find(m=>m.id===lesson?.module_id);go(`courses/${module?.course_id||''}`)}}/>;
  else if(page==='lesson-run')content=<LessonRun key={`${s.user.id}:${id}`} id={id} state={s} refresh={refresh} onBack={()=>go('courses')} onAttempt={openAttempt} refreshedAt={refreshedAt}/>;
  else if(page==='program') {const program=s.programs.find(r=>r.id===id);content=program?<ProgramOverview program={program} state={s} refresh={refresh} onGo={go}/>:<Empty title="Программа недоступна" text="Вернитесь к своим занятиям."/>}
  else if (page === "builder" && !student)
    content = (
      <Builder
        key={route}
        state={s}
        id={id}
        initialLesson={
          new URLSearchParams(route.split("?")[1]).get("lesson") || ""
        }
        onSaved={async (tid) => {
          await refresh();
          go(`builder/${tid}`);
        }}
        onBack={() => go("tasks")}
      />
    );
  else if (page === "task"||page==="assignment") {
    const matches=s.tasks.filter(t=>page==='assignment'?t.assignment_id===id:t.id===id);
    const task = matches.length===1?matches[0]:undefined;
    const nextTask=task&&s.tasks.find(t=>t.assignment_id!==task.assignment_id&&(task.run_id?t.run_id===task.run_id:!t.run_id&&t.group_id===task.group_id&&t.order_snapshot?.course_id===task.order_snapshot?.course_id)&&!isPassed(progressKey(t)));
    content = task ? (
      <Workspace
        key={`${s.user.id}:${task.assignment_id||id}`}
        task={task}
        state={s}
        refresh={refresh}
        onBack={() => go("courses")}
        nextTask={nextTask}
        onNext={nextTask?()=>go(taskLink(nextTask)):undefined}
      />
    ) : (
      <Empty
        title="Задание недоступно"
        text={matches.length>1?"Задание назначено несколько раз. Выберите нужную группу в разделе «Мои курсы».":"Возможно, преподаватель изменил назначение. Вернитесь к своим курсам."}
      />
    );
  } else if (page === "courses" && id) {
    const c = s.courses.find((c) => c.id === id);
    content = c ? (
      <>
        <button className="link breadcrumb" onClick={() => go("courses")}>
          ← Все курсы
        </button>
        <Header
          eyebrow="УЧЕБНАЯ ПРОГРАММА"
          title={c.title}
          text={c.description}
        >
          {!student && (
            <>
              <button
                onClick={() =>
                  setDialog({
                    title: "Редактировать курс",
                    fields: [
                      nameField(c.title),
                      {
                        key: "description",
                        label: "Описание",
                        type: "textarea",
                        optional: true,
                        value: c.description,
                      },
                    ],
                    submit: (b) => mutate(`/courses/${c.id}`, b, "PUT"),
                  })
                }
              >
                Редактировать
              </button>
              <button
                onClick={() =>
                  act(async () => {
                    const copy = await mutate(`/courses/${c.id}/copy`, {});
                    go(`courses/${copy.id}`);
                  })
                }
              >
                Копировать курс
              </button>
              <button
                className="primary"
                onClick={() =>
                  setDialog({
                    title: "Новый модуль",
                    fields: [nameField()],
                    submit: (b) =>
                      mutate("/modules", { ...b, course_id: c.id }),
                  })
                }
              >
                + Модуль
              </button>
            </>
          )}
        </Header>
        {s.modules
          .filter((m) => m.course_id === c.id)
          .map((m, mi, ms) => (
            <section className="module" key={m.id}>
              <div className="section-title">
                <div>
                  <span className="overline">МОДУЛЬ {mi + 1}</span>
                  <h2>{m.title}</h2>
                </div>
                {!student && (
                  <div className="actions">
                    {orderButtons("modules", ms, mi)}
                    <button
                      className="small"
                      onClick={() =>
                        setDialog({
                          title: "Название модуля",
                          fields: [nameField(m.title)],
                          submit: (b) => mutate(`/modules/${m.id}`, b, "PUT"),
                        })
                      }
                    >
                      Изменить
                    </button>
                    <button
                      className="small"
                      onClick={() =>
                        setDialog({
                          title: "Новый урок",
                          fields: [nameField()],
                          submit: (b) =>
                            mutate("/lessons", { ...b, module_id: m.id }),
                        })
                      }
                    >
                      + Урок
                    </button>
                  </div>
                )}
              </div>
              {s.lessons
                .filter((l) => l.module_id === m.id)
                .map((l, li, ls) => (
                  <div className="lesson-section" key={l.id}>
                    <div className="lesson-title">
                      <h3>
                        <span>{String(li + 1).padStart(2, "0")}</span>
                        {l.title}
                      </h3>
                      {!student && (
                        <div className="actions">
                          {orderButtons("lessons", ls, li)}
                          <button className="primary small" onClick={()=>go(`lesson-editor/${l.id}`)}>Сценарий урока</button>
                          <button
                            className="link"
                            onClick={() =>
                              setDialog({
                                title: "Название урока",
                                fields: [nameField(l.title)],
                                submit: (b) =>
                                  mutate(`/lessons/${l.id}`, {...b,revision:l.revision}, "PUT"),
                              })
                            }
                          >
                            Изменить
                          </button>
                          <button
                            className="link"
                            onClick={() => go(`builder/new?lesson=${l.id}`)}
                          >
                            + Задание
                          </button>
                        </div>
                      )}
                    </div>
                    {s.tasks
                      .filter((t) => t.lesson_id === l.id)
                      .map((t, ti, ts) => taskRow(t, ts, ti))}
                    {!s.tasks.some((t) => t.lesson_id === l.id) && (
                      <p className="muted inset">
                        В этом уроке пока нет заданий.
                      </p>
                    )}
                  </div>
                ))}
              {!s.lessons.some((l) => l.module_id === m.id) && (
                <p className="muted inset">Добавьте первый урок в модуль.</p>
              )}
            </section>
          ))}
        {!s.modules.some((m) => m.course_id === c.id) && (
          <Empty
            title="Первый модуль — начало программы"
            text="Разбейте курс на темы, затем добавьте уроки и задания."
          />
        )}
      </>
    ) : (
      <Empty title="Курс не найден" text="Вернитесь к списку курсов." />
    );
  } else if (page === "courses")
    content = (
      <>
        <Header
          title={student ? "Мои курсы" : "Курсы"}
          text={
            student
              ? "Учись в своём темпе. Каждое решение — шаг вперёд."
              : "Создавайте программы, которые растут вместе с вашими учениками."
          }
        >
          {!student && (
            <button className="primary" onClick={createCourse}>
              <Glyph name="plus" />
              Создать курс
            </button>
          )}
          {!student&&<button onClick={()=>void act(async()=>{setNotice('Готовим шесть уроков и проверяем образцы. Это может занять около минуты.');const course=await mutate('/starter-course/install',{});setNotice('Стартовый курс готов к назначению группе.');go(`courses/${course.id}`)})}>Добавить стартовый курс · 6 уроков</button>}
        </Header>
        {s.courses.length||student&&s.programs.length ? (
          courseCards()
        ) : (
          <Empty
            title={
              student
                ? "Скоро здесь появится ваш первый курс"
                : "Ваша программа начинается здесь"
            }
            text={
              student
                ? "Преподаватель назначит задания вашей группе."
                : "Создайте курс, добавьте модуль и первый урок."
            }
          >
            {!student && (
              <button className="primary" onClick={createCourse}>
                Создать первый курс
              </button>
            )}
          </Empty>
        )}
      </>
    );
  else if (page === "tasks" && !student)
    content = (
      <>
        <Header title="Задания" text="От идеи до первого решения ученика.">
          <button
            className="primary"
            disabled={!s.lessons.length}
            onClick={() => go("builder/new")}
          >
            + Создать задание
          </button>
        </Header>
        {s.tasks.length ? (
          <section className="panel">{s.tasks.map((t) => taskRow(t))}</section>
        ) : (
          <Empty
            title="Создайте первое задание"
            text="Сначала добавьте курс, модуль и урок. Затем откройте пошаговый конструктор."
          >
            <button onClick={() => go("courses")}>Перейти к курсам</button>
          </Empty>
        )}
      </>
    );
  else if (page === "groups" && !student)
    content = (
      <>
        <Header
          title="Учебные группы"
          text="Объединяйте учеников и назначайте им практику."
        >
          <button
            className="primary"
            onClick={() =>
              setDialog({
                title: "Новая группа",
                fields: [nameField()],
                submit: (b) => mutate("/groups", b),
              })
            }
          >
            + Создать группу
          </button>
        </Header>
        {!s.groups.length && (
          <Empty
            title="Учиться вместе интереснее"
            text="Создайте группу, добавьте учеников и назначьте опубликованные задания."
          />
        )}
        <div className="groups-grid">
          {s.groups.map((g) => {
            const members = s.members.filter((m) => m.group_id === g.id),
              assignments = s.assignments.filter((a) => a.group_id === g.id&&!a.run_id);
            return (
              <section className="panel group-card" key={g.id}>
                <div className="section-title">
                  <div>
                    <div className="overline">УЧЕБНАЯ ГРУППА</div>
                    <h2>{g.title}</h2>
                  </div>
                  <div className="round-icon">
                    <Glyph name="users" />
                  </div>
                </div>
                <h4>Ученики · {members.length}</h4>
                {members.map((m) => (
                  <div className="member" key={m.user_id}>
                    <span>
                      {students.find((u) => u.id === m.user_id)?.name}
                    </span>
                    <button
                      className="link subtle"
                      aria-label="Убрать ученика"
                      onClick={() =>
                        act(() =>
                          mutate(
                            `/groups/${g.id}/members`,
                            { user_id: m.user_id },
                            "DELETE",
                          ),
                        )
                      }
                    >
                      Убрать
                    </button>
                  </div>
                ))}
                <button
                  className="link"
                  disabled={
                    !students.some(
                      (u) => !members.some((m) => m.user_id === u.id),
                    )
                  }
                  onClick={() =>
                    setDialog({
                      title: `Добавить в «${g.title}»`,
                      fields: [
                        {
                          key: "user_id",
                          label: "Ученик",
                          options: students.filter(
                            (u) => !members.some((m) => m.user_id === u.id),
                          ),
                        },
                      ],
                      submit: (b) => mutate(`/groups/${g.id}/members`, b),
                    })
                  }
                >
                  + Добавить ученика
                </button>
                <hr />
                <h4>Учебные программы</h4>{s.programs.filter(r=>r.group_id===g.id&&!r.archived).map(r=><p key={r.id}><button className="link" onClick={()=>go(`program/${r.id}`)}>{r.title} · {r.lessons.length} занятий</button></p>)}<button className="primary full" onClick={()=>setProgramGroup(g)}>Выдать учебную программу</button>
                <h4>Назначено · {assignments.length}</h4>
                {assignments.map((a) => (
                  <div className="member" key={a.id}>
                    <span>
                      {a.title||s.tasks.find((t) => t.id === a.task_id)?.title}
                      <small>Версия {a.version_revision} · отдельное прохождение</small>
                      {a.due_at && (
                        <small>
                          до {new Date(a.due_at).toLocaleDateString("ru")}
                        </small>
                      )}
                    </span>
                    <button className="link" onClick={()=>setDialog({title:'Изменить срок',fields:[{key:'due_at',label:'Срок (необязательно)',type:'date',optional:true,value:a.due_at?.slice(0,10)||''}],submit:b=>mutate(`/assignments/${a.id}`,{...b,revision:a.revision},'PUT')})}>Срок</button>
                    <button className="link" disabled={!s.tasks.some(t=>t.id===a.task_id&&t.published)} onClick={()=>setAssignmentDialog({group:g,repeat:a})}>Назначить повторно</button>
                    <button
                      className="link subtle"
                      onClick={() =>
                        act(() => mutate(`/assignments/${a.id}`, {}, "DELETE"))
                      }
                    >
                      Снять
                    </button>
                  </div>
                ))}
                <button
                  className="primary full"
                  disabled={!s.tasks.some((t) => t.published)}
                  onClick={() =>setAssignmentDialog({group:g})}
                >
                  + Назначить задание
                </button>
              </section>
            );
          })}
        </div>
      </>
    );
  else if (page === "users" && !student)
    content = (
      <>
        <Header
          title="Участники школы"
          text="Личные кабинеты и доступ к обучению."
        >
          <button className="primary" onClick={createUser}>
            + Добавить участника
          </button>
        </Header>
        <section className="panel">
          <table>
            <thead>
              <tr>
                <th>Участник</th>
                <th>Логин</th>
                <th>Роль</th>
                <th>Доступ</th>
              </tr>
            </thead>
            <tbody>
              {s.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                  </td>
                  <td>{u.login}</td>
                  <td>
                    <Badge>
                      {u.role === "student"
                        ? "Ученик"
                        : u.role === "teacher"
                          ? "Преподаватель"
                          : "Администратор"}
                    </Badge>
                  </td>
                  <td>
                    {(s.user.role === "admin" || u.role === "student") && (
                      <button
                        className="link"
                        onClick={() =>
                          setDialog({
                            title: `Новый пароль: ${u.name}`,
                            text: "Все текущие сессии участника будут завершены.",
                            fields: [
                              {
                                key: "password",
                                label: "Новый пароль",
                                type: "password",
                              },
                            ],
                            submit: (b) => mutate(`/users/${u.id}/password`, b),
                          })
                        }
                      >
                        Сбросить пароль
                      </button>
                    )}
                    {s.user.role === "admin" && u.id !== s.user.id && (
                      <button
                        className="link access-toggle"
                        onClick={() =>
                          act(() =>
                            mutate(`/users/${u.id}/access`, {
                              active: !u.active,
                            }),
                          )
                        }
                      >
                        {u.active ? "Отключить доступ" : "Вернуть доступ"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </>
    );
  else if (page === "results")
    content = (
      <>
        <Header
          title={student ? "Мой прогресс" : "Результаты обучения"}
          text="Реальные решения, попытки и движение вперёд."
        />
        {!student && (
          <section className="panel spaced">
            <div className="panel-heading">
              <h2>Прогресс учеников</h2>
            </div>
            {students.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Ученик</th>
                    <th>Пройдено</th>
                    <th>Прогресс</th>
                    <th>Попытки</th>
                    <th>Успешность</th>
                    <th>Последняя активность</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((u) => {
                    const ids = assignedFor(u.id),
                      done = ids.filter((t) => isPassed(t, u.id)).length,
                      attempts = s.attempts.filter((a) => a.user_id === u.id),
                      graded = attempts.filter((a) =>
                        ["passed", "failed", "runtime_error"].includes(
                          a.status,
                        ),
                      );
                    return (
                      <tr key={u.id}>
                        <td>
                          <b>{u.name}</b>
                        </td>
                        <td>
                          {done} / {ids.length}
                        </td>
                        <td>
                          <progress value={done} max={ids.length || 1} />
                          <small>
                            {ids.length
                              ? Math.round((done / ids.length) * 100)
                              : 0}
                            % · осталось {ids.length - done}
                          </small>
                        </td>
                        <td>{attempts.length}</td>
                        <td>
                          {graded.length
                            ? Math.round(
                                (graded.filter((a) => a.status === "passed")
                                  .length /
                                  graded.length) *
                                  100,
                              ) + "%"
                            : "—"}
                        </td>
                        <td>
                          {attempts[0]
                            ? new Date(attempts[0].created_at).toLocaleString(
                                "ru",
                              )
                            : "Пока не начинал"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="inset muted">
                Добавьте учеников, чтобы отслеживать обучение.
              </p>
            )}
          </section>
        )}
        <section className="panel">
          <div className="panel-heading">
            <h2>История решений</h2>
            <span className="muted">{s.attempts.length} попыток</span>
          </div>
          {s.attempts.length ? (
            <table>
              <thead>
                <tr>
                  {!student && <th>Ученик</th>}
                  <th>Задание</th>
                  <th>Результат</th>
                  <th>Дата</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {s.attempts.map((a) => (
                  <tr key={a.id}>
                    {!student && (
                      <td>{s.users.find((u) => u.id === a.user_id)?.name}</td>
                    )}
                    <td>{a.task_title||s.tasks.find((t) => t.id === a.task_id)?.title}</td>
                    <td>
                      <Badge status={a.status} />
                    </td>
                    <td>{new Date(a.created_at).toLocaleString("ru")}</td>
                    <td>
                      <button
                        className="link"
                        onClick={() => openAttempt(a.id)}
                      >
                        Открыть решение
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              title="Всё начинается с первой попытки"
              text="Когда ученик отправит решение, оно появится здесь."
            />
          )}
        </section>
      </>
    );
  else {
    const completed = student
        ? s.tasks.filter((t) => isPassed(progressKey(t))).length
        : s.attempts.filter((a) => a.status === "passed").length,
      recent = s.attempts.slice(0, 5),
      difficult: Row[] = s.tasks
        .map((t) => ({
          ...t,
          errors: s.attempts.filter(
            (a) =>
              matchesTask(a,t) &&
              ["failed", "runtime_error"].includes(a.status),
          ).length,
        }))
        .filter((t) => t.errors)
        .sort((a, b) => b.errors - a.errors)
        .slice(0, 4);
    content = (
      <>
        <Header
          eyebrow={
            student
              ? "СЕГОДНЯ ХОРОШИЙ ДЕНЬ, ЧТОБЫ НАУЧИТЬСЯ НОВОМУ"
              : "ВАША ШКОЛА В KODIK"
          }
          title={`Привет, ${s.user.name.split(" ")[0]}!`}
          text={
            student
              ? "Продолжим путь от идеи к работающему коду."
              : "Всё готово для новых открытий ваших учеников."
          }
        />
        <section className="welcome-banner">
          <div>
            <Badge>
              {student ? "ТВОЙ СЛЕДУЮЩИЙ ШАГ" : "ОТ ЗНАНИЙ К ПРАКТИКЕ"}
            </Badge>
            <h2>
              {student
                ? "Маленькие шаги. Большие возможности."
                : "Обучение начинается с хорошей идеи."}
            </h2>
            <p>
              {student
                ? "Открой задание, попробуй решение и не бойся ошибаться."
                : "Соберите свой курс, добавьте практику и наблюдайте за ростом учеников."}
            </p>
            <button
              className="dark"
              onClick={() =>
                student
                  ? go("courses")
                  : s.courses.length
                    ? go("tasks")
                    : createCourse()
              }
            >
              {student
                ? "К моим курсам"
                : s.courses.length
                  ? "Открыть задания"
                  : "Создать первый курс"}
              <Glyph name="arrow" />
            </button>
          </div>
          <div className="banner-art" aria-hidden="true">
            <span>↗</span>
            <code>{"{ учимся }"}</code>
            <small>код · практика · рост</small>
          </div>
        </section>
        <div className="stats">
          <div>
            <span>{student ? "Мои курсы" : "Курсы"}</span>
            <strong>{s.courses.length}</strong>
            <small>Программы обучения</small>
          </div>
          <div>
            <span>{student ? "Задания" : "Ученики"}</span>
            <strong>{student ? s.tasks.length : students.length}</strong>
            <small>
              {student ? "Назначено преподавателем" : "В вашей школе"}
            </small>
          </div>
          <div>
            <span>{student ? "Выполнено" : "Успешные решения"}</span>
            <strong>{completed}</strong>
            <small>Результат реальной практики</small>
          </div>
          <div>
            <span>{student ? "Попытки" : "На проверке"}</span>
            <strong>
              {student
                ? s.attempts.length
                : s.attempts.filter((a) => a.status === "pending_review")
                    .length}
            </strong>
            <small>
              {student ? "Каждая попытка учит" : "Ждут вашего внимания"}
            </small>
          </div>
        </div>
        <div className="section-title">
          <h2>{student ? "Продолжить обучение" : "Ваши курсы"}</h2>
          <button className="link" onClick={() => go("courses")}>
            Все курсы →
          </button>
        </div>
        {s.courses.length||student&&s.programs.length ? (
          courseCards()
        ) : (
          <Empty
            title={
              student
                ? "Ждём первое назначение"
                : "Создайте пространство для знаний"
            }
            text={
              student
                ? "После назначения задания появятся в вашем кабинете."
                : "Начните с курса. Дальше добавьте уроки, задания и учеников."
            }
          >
            {!student && (
              <button className="primary" onClick={createCourse}>
                + Создать курс
              </button>
            )}
          </Empty>
        )}
        {!student && (
          <div className="overview-bottom">
            <section className="panel">
              <div className="panel-heading">
                <h2>Последняя активность</h2>
                <button className="link" onClick={() => go("results")}>
                  Все результаты →
                </button>
              </div>
              {recent.length ? (
                recent.map((a) => (
                  <button
                    className="activity"
                    key={a.id}
                    onClick={() => openAttempt(a.id)}
                  >
                    <span className="avatar">
                      {s.users
                        .find((u) => u.id === a.user_id)
                        ?.name?.slice(0, 1)}
                    </span>
                    <span className="grow">
                      <b>{s.users.find((u) => u.id === a.user_id)?.name}</b>
                      <small>
                        {a.task_title||s.tasks.find((t) => t.id === a.task_id)?.title}
                      </small>
                    </span>
                    <Badge status={a.status} />
                  </button>
                ))
              ) : (
                <p className="muted inset">
                  Здесь появятся первые решения учеников.
                </p>
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Нужна поддержка</h2>
              </div>
              {difficult.length ? (
                difficult.map((t) => (
                  <div className="member inset" key={t.assignment_id||t.id}>
                    <span>{t.title}</span>
                    <Badge>{t.errors} ошибок</Badge>
                  </div>
                ))
              ) : (
                <p className="muted inset">
                  Пока нет заданий, вызывающих затруднения.
                </p>
              )}
            </section>
          </div>
        )}
      </>
    );
  }
  const nav = s.user.platform_owner ? [['overview','users','Клиенты и лицензии']] : student
    ? [
        ["overview", "grid", "Обзор"],
        ["courses", "book", "Мои курсы"],
        ["results", "chart", "Мой прогресс"],
      ]
    : [
        ["overview", "grid", "Обзор"],
        ["courses", "book", "Курсы"],
        ["tasks", "edit", "Задания"],
        ["groups", "users", "Учебные группы"],
        ["users", "users", "Участники"],
        ["results", "chart", "Результаты"],
        ["journal", "chart", "Журнал и проверка"],
        ["classroom", "users", "Запросы помощи"],
        ["modes", "code", "Способы решения"],
        ...(s.user.role==='admin'?[["school","users","Управление школой"]]:[]),
      ];
  return (
    <div className={`b2b-shell ${compactSidebar ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <a className="brand" href="#overview">
          <span className="brand-mark">k.</span>kodik
          <span className="brand-suffix">школы</span>
        </a>
        <div className="school-switch">
          <span className="school-avatar">
            {s.organization.name.slice(0, 1)}
          </span>
          <div>
            <b>{s.organization.name}</b>
            <small>Пространство школы</small>
          </div>
        </div>
        <span className="nav-caption">ОБУЧЕНИЕ</span>
        <nav>
          {nav.map(([key, icon, label]) => (
            <a
              key={key}
              className={page === key ? "active" : ""}
              href={`#${key}`}
            >
              <Glyph name={icon} />
              {label}
              {key === "tasks" && (
                <span className="nav-count">{s.tasks.length}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="legacy-link">
            <Glyph name="code" />
            <div>
              <b>Лаборатория Kodik</b>
              <small>Исходный курс и Blockly</small>
              <a href="?legacy=1" target="_blank" rel="noreferrer">
                Открыть практику ↗
              </a>
            </div>
          </div>
          <div className="profile">
            <span className="avatar">{s.user.name.slice(0, 1)}</span>
            <div>
              <b>{s.user.name}</b>
              <small>
                {student
                  ? "Ученик"
                  : s.user.role === "admin"
                    ? "Администратор"
                    : "Преподаватель"}
              </small>
            </div>
            <button
              className="icon-button"
              title="Выйти"
              aria-label="Выйти"
              onClick={() =>
                act(async () => {
                  await api("/auth/logout", {});
                  setSessionUser(null);
                  announce(null);
                  setState(null);
                  setRecovery("");
                  go("overview");
                })
              }
            >
              ↪
            </button>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button
            className="sidebar-toggle"
            aria-label={
              compactSidebar ? "Развернуть навигацию" : "Свернуть навигацию"
            }
            aria-pressed={compactSidebar}
            onClick={() => setCompactSidebar((v) => !v)}
          >
            ☰
          </button>
          <span>
            {s.organization.name}
            <span className="topbar-divider">/</span>
            {nav.find((n) => n[0] === page)?.[2] ||
              (page === "builder" ? "Конструктор задания" : "Учебная практика")}
          </span>
          <span className="topbar-meta">
            <span role="status" className={refreshError ? "sync-warning" : ""}>
              {refreshError
                ? "Нет связи с сервером"
                : refreshedAt
                  ? `Обновлено в ${new Date(refreshedAt).toLocaleTimeString("ru")}`
                  : "Обновляем…"}
            </span>
            <button
              className="link"
              onClick={() => act(refresh)}
              aria-label="Обновить данные"
            >
              Обновить
            </button>
            <span className="live-dot" />
            Учимся создавать <span className="topbar-divider">|</span>
            {new Date().toLocaleDateString("ru", {
              day: "numeric",
              month: "long",
            })}
          </span>
        </header>
        <main
          className={`main-content ${["task","assignment","lesson-run","preview"].includes(page) ? "workspace-page" : ""}`}
        >
          {notice && (
            <div className="notice" role="alert">
              {notice}
              <button onClick={() => setNotice("")}>Закрыть</button>
            </div>
          )}
          {recovery && (
            <section className="recovery-notice">
              <h3>Сохраните код восстановления</h3>
              <p>
                Он позволит вернуть доступ к аккаунту администратора. После
                использования вы получите новый код.
              </p>
              <code>{recovery}</code>
              <button onClick={() => setRecovery("")}>Я сохранил код</button>
            </section>
          )}
          {content}
        </main>
      </div>
      {dialog && <FormDialog dialog={dialog} close={() => setDialog(null)} />}
      {assignmentDialog&&<AssignmentDialog key={`${assignmentDialog.group.id}:${assignmentDialog.repeat?.id||'new'}`} state={s} group={assignmentDialog.group} repeat={assignmentDialog.repeat} refresh={refresh} close={()=>setAssignmentDialog(null)}/>}
      {programGroup&&<ProgramIssueDialog key={`${s.user.id}:${programGroup.id}`} state={s} group={programGroup} close={()=>setProgramGroup(null)} refresh={refresh}/>}
      {attempt && (
        <AttemptDialog
          attempt={attempt}
          state={s}
          close={() => setAttempt(null)}
          onReview={async (b) => {
            await mutate(`/attempts/${attempt.id}/review`, {...b,revision:attempt.review_revision});
            setAttempt(null);
          }}
        />
      )}
    </div>
  );
}
function AttemptDialog({
  attempt: a,
  state: s,
  close,
  onReview,
}: {
  attempt: Row;
  state: State;
  close: () => void;
  onReview: (b: Row) => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [history,setHistory]=useState<Row[]>([]);
  useEffect(()=>{api(`/attempts/${a.id}/reviews`).then(r=>setHistory(r.items)).catch(()=>{})},[a.id]);
  return (
    <div className="overlay">
      <section
        className="dialog wide-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Решение ученика"
      >
        <div className="dialog-heading">
          <h2>
            {a.snapshot?.title || a.task_title || s.tasks.find((t) => t.id === a.task_id)?.title ||
              "Решение ученика"}
          </h2>
          <button aria-label="Закрыть" onClick={close}>
            ×
          </button>
        </div>
        <Badge status={a.status} />
        <p>Способ решения: {a.mode==='blocks'?'Блоки':a.mode==='mixed'?'Блоки + Python':'Python'}</p>
        <p className="muted">{a.context_origin==='legacy'?'Историческая попытка: назначение не восстановлено':`Версия задания ${a.snapshot?.revision||a.version_revision||''}`}</p>
        <p>{a.result.message}</p>
        <pre className="solution-code">{a.code}</pre>
        <p className="muted">{a.feedback}</p>
        {history.length>0&&<details><summary>История оценок · {history.length}</summary>{history.map(h=><p key={h.id}>{new Date(h.created_at).toLocaleString('ru')} · {h.actor_name} · {statusNames[h.before_status]} → {statusNames[h.after_status]}: {h.after_feedback}</p>)}</details>}
        {s.user.role !== "student" && a.snapshot?.check_mode === "manual" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await onReview(
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Комментарий
              <textarea name="feedback" rows={3} defaultValue={a.feedback} />
            </label>
            <label>
              Результат
              <select name="status">
                <option value="passed">Принять решение</option>
                <option value="failed">Вернуть на доработку</option>
              </select>
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              Сохранить проверку
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
