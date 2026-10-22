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
import {GroupsList,GroupPage,type GroupActions} from './Groups';
import {useConfirm} from './confirm';
import {learnerStatus} from './feedback';
import {friendlyPassword} from './passwords';
import {PythonHelp} from './PythonHelp';
import { Glyph, Icon } from "./Icon";
import { Boot } from "../Boot";
import { Practice, isPracticeMode } from "./Practice";

export { Glyph, Icon } from "./Icon";
/** Russian plural: plural(5, ["модуль", "модуля", "модулей"]) → "5 модулей". */
export function plural(n: number, [one, few, many]: [string, string, string]) {
  const t = Math.abs(n) % 100, u = t % 10;
  return `${n} ${t > 10 && t < 20 ? many : u === 1 ? one : u >= 2 && u <= 4 ? few : many}`;
}
/** Status badges carry an icon as well as colour and text. */
const STATUS_ICON: Record<string, "check" | "x" | "clock"> = { passed: "check", failed: "x", runtime_error: "x", checker_error: "x", pending_review: "clock" };
export function Badge({
  status,
  children,
}: {
  status?: string;
  children?: ReactNode;
}) {
  return (
    <span className={`badge ${status || ""}`}>
      {!children && STATUS_ICON[status || ""] && <Icon name={STATUS_ICON[status || ""]} size="sm" />}
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
export function NotFound({ title = "Страница не найдена", text = "Такого раздела нет. Возможно, ссылка устарела.", back = "overview", backLabel = "На обзор" }: { title?: string; text?: string; back?: string; backLabel?: string }) {
  return (
    <div className="empty not-found" role="status">
      <div className="empty-icon"><Glyph name="book" /></div>
      <h1>{title}</h1>
      <p>{text}</p>
      <a className="button-link primary" href={`#${back}`}>{backLabel}</a>
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
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
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
  hint?: string;
};
type Dialog = {
  title: string;
  text?: string;
  fields: Field[];
  submit: (b: Row) => Promise<unknown>;
};
/** A text field; a password field comes with a generated value the admin can show to the learner once. */
function PasswordAware({ field: f }: { field: Field }) {
  const [value, setValue] = useState(f.type === "password" ? friendlyPassword() : f.value || "");
  if (f.type !== "password")
    return <input aria-label={f.label} autoComplete="off" name={f.key} type={f.type || "text"} defaultValue={f.value} required={!f.optional} {...(f.key === "login" ? { pattern: "[A-Za-z0-9][A-Za-z0-9._\\-]{2,119}", title: "Латинские буквы, цифры, точка, дефис или «_» — без пробелов" } : {})} />;
  return (
    <span className="password-field">
      <input aria-label={f.label} autoComplete="new-password" name={f.key} type="text" value={value} onChange={(e) => setValue(e.target.value)} required={!f.optional} minLength={10} spellCheck={false} />
      <button type="button" className="small" onClick={() => setValue(friendlyPassword())}>Другой пароль</button>
    </span>
  );
}
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
              {f.hint && <small className="field-hint">{f.hint}</small>}
              {f.options ? (
                <select
                  aria-label={f.label}
                  name={f.key}
                  defaultValue={f.value ?? f.options[0]?.id}
                  required={!f.optional}
                >
                  {f.value === "" && <option value="" disabled>Выберите…</option>}
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
                <PasswordAware field={f} />
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
    const form = e.currentTarget;
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
      form.querySelector<HTMLInputElement>("input")?.focus();
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
            <div className="art-tag"><Icon name="arrow-up-right" size="sm" /> Новые навыки каждый день</div>
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
                : "Ученик? Войди с логином и паролем, которые дал учитель."}
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
                aria-label="Логин"
                autoComplete="username"
                required
                maxLength={120}
                aria-describedby={error ? "auth-error" : mode === "register" ? "login-rule" : undefined}
                aria-invalid={!!error || undefined}
                {...(mode === "register" ? { pattern: "[A-Za-z0-9._\\-]{3,120}", title: "Латинские буквы, цифры, точка, дефис или подчёркивание — без пробелов" } : {})}
              />
              {mode === "register" && <small id="login-rule" className="field-hint">Латинские буквы, цифры, точка, дефис или «_» — без пробелов. Например: anna.petrova</small>}
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
                aria-label={mode === "recover" ? "Новый пароль" : "Пароль"}
                type="password"
                required
                minLength={10}
                maxLength={128}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? "auth-error" : mode !== "login" ? "password-rule" : undefined}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
              {mode !== "login" && <small id="password-rule" className="field-hint">Не короче 10 символов.</small>}
            </label>
            {error && (
              <p className="error" role="alert" id="auth-error">
                {error}
                {mode === "login" && " Забыл пароль? Спроси учителя — он выдаст новый."}
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
              className={mode === "register" ? "link" : "secondary-action"}
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
              className="link"
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
    // Solving a task is a focus screen: no navigation on screen, the menu button opens it as a drawer.
    [drawer, setDrawer] = useState(false),
    [switched, setSwitched] = useState<{ from: Row; to?: Row; signedOut?: boolean } | null>(null);
  const refreshSequence = useRef(0), shown = useRef<Row | null>(null), switchedRef = useRef(false);
  const confirm = useConfirm();
  const [narrow, setNarrow] = useState(() => window.matchMedia?.("(max-width: 1023px)").matches ?? false);
  useEffect(() => { const q = window.matchMedia?.("(max-width: 1023px)"); if (!q) return; const on = () => setNarrow(q.matches); q.addEventListener("change", on); return () => q.removeEventListener("change", on); }, []);
  const [helpWaiting, setHelpWaiting] = useState(0), [toast, setToast] = useState<{ text: string; sticky?: boolean; action?: { label: string; path: string } } | null>(null);
  // The recovery code stays on screen (this tab only) until the administrator confirms it is saved.
  useEffect(() => { try { const kept = sessionStorage.getItem("kodik:recovery"); if (kept) setRecovery(kept); } catch { /* storage unavailable */ } }, []);
  useEffect(() => { try { if (recovery) sessionStorage.setItem("kodik:recovery", recovery); else sessionStorage.removeItem("kodik:recovery"); } catch { /* storage unavailable */ } }, [recovery]);
  useEffect(() => { setDrawer(false); }, [route]);
  useEffect(() => { window.scrollTo?.(0, 0); document.querySelector<HTMLElement>(".main-content")?.scrollTo?.(0, 0); }, [route.split("?")[0]]);
  useEffect(() => { const show = (e: Event) => setToast((e as CustomEvent).detail); window.addEventListener("kodik-toast", show); return () => window.removeEventListener("kodik-toast", show); }, []);
  useEffect(() => { if (!toast || toast.sticky) return; const t = setTimeout(() => setToast(null), 9000); return () => clearTimeout(t); }, [toast]);
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
  // Waiting help requests are counted in the navigation for teachers and administrators.
  useEffect(() => {
    if (!state?.user.id || state.user.role === "student" || state.user.platform_owner) return;
    let live = true;
    const load = () => api("/help?limit=1").then((r) => { if (live) setHelpWaiting(r.open.total); }).catch(() => {});
    void load(); const t = setInterval(load, 10000);
    return () => { live = false; clearInterval(t); };
  }, [state?.user.id, state?.user.role, refreshedAt.slice(0, 15)]);
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
  const groupActions: GroupActions = { go, mutate, act, refresh, dialog: (d) => setDialog(d), issueProgram: (g) => setProgramGroup(g), assign: (g, repeat) => setAssignmentDialog({ group: g, repeat }) };
  if (loading)
    return <Boot text="Открываем рабочее пространство…" />;
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
      text: "Передайте логин и пароль участнику лично — пароль виден только сейчас. Для ученика достаточно имени или псевдонима.",
      fields: [
        {
          key: "role",
          label: "Роль",
          value: s.user.role === "admin" ? "" : "student",
          options:
            s.user.role === "admin"
              ? [
                  { id: "student", name: "Ученик" },
                  { id: "teacher", name: "Преподаватель" },
                  { id: "admin", name: "Администратор" },
                ]
              : [{ id: "student", name: "Ученик" }],
        },
        { key: "name", label: "Имя или псевдоним" },
        { key: "login", label: "Логин", hint: "Латинские буквы, цифры, точка, дефис или «_». Например: anna.petrova" },
        { key: "password", label: "Пароль", type: "password", hint: "Сгенерирован автоматически. Запишите его — он больше не покажется." },
      ],
      submit: async (b) => { await mutate("/users", b); setToast({ text: `Участник ${b.name} добавлен. Логин: ${b.login}, пароль: ${b.password} — передайте лично.`, sticky: true }); },
    });
  // A queue (the journal's "awaiting review" page) lets the teacher go on to the next work after saving.
  const openAttempt = (aid: string, queue?: string[]) =>
    act(async () => setAttempt({ ...(await api(`/attempts/${aid}`)), queue }));
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
          <Icon name="arrow-up" size="sm" />
        </button>
        <button
          title="Опустить"
          aria-label="Опустить"
          disabled={index === rows.length - 1}
          onClick={() => move(kind, rows, index, 1)}
        >
          <Icon name="arrow-down" size="sm" />
        </button>
      </span>
    );
  }
  function taskRow(t: Row, rows?: Row[], index?: number) {
    return (
      <div key={t.assignment_id||t.id} className="task-row">
        <span className={`task-symbol ${isPassed(progressKey(t)) ? "done" : ""}`}>
          {isPassed(progressKey(t)) ? <Icon name="check" /> : <Glyph name="code" />}
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
              : `${t.check_mode === "manual" ? "Проверяет преподаватель" : "Проверяется автоматически"} · ${t.difficulty === "easy" ? "начальный" : t.difficulty === "medium" ? "средний" : "продвинутый"} уровень`}
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
              onClick={async () => {
                const unpublish = t.published && t.published_revision === t.revision;
                if (unpublish && !await confirm.ask({ title: `Снять «${t.title}» с публикации?`, text: <p>Задание нельзя будет выдать заново, пока вы его снова не опубликуете. Уже выданные классам версии и работы учеников не изменятся.</p>, confirm: "Снять с публикации", danger: true })) return;
                void act(() => mutate(`/tasks/${t.id}/publish`, { published: !unpublish, revision: t.revision }));
              }}
            >
              {t.published ? t.published_revision!==t.revision?"Обновить публикацию":"Снять с публикации…" : "Опубликовать"}
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
                <span>{tasks.some((t) => { const cfg = typeof t.learning_config === "string" ? JSON.parse(t.learning_config || "{}") : t.learning_config; return cfg?.modes?.length > 0; }) || /блок/i.test(c.title) ? "БЛОКИ → PYTHON" : "PYTHON"}</span>
                <strong>{["{ }", "</>", "( )"][i % 3]}</strong>
              </div>
              <div className="course-card-body">
                <span className="overline">
                  {plural(s.modules.filter((m) => m.course_id === c.id).length, ["модуль", "модуля", "модулей"])}
                  {" · "}{plural(tasks.length, ["задание", "задания", "заданий"])}
                </span>
                <h3>
                  <button
                    className="text-button"
                    onClick={() => go(`courses/${c.id}`)}
                  >
                    {c.title}
                  </button>
                </h3>
                <p>{c.description || (student ? "Задания от учителя" : "Описание курса пока не добавлено")}</p>
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
                    {/* A ready course needs no label; only unfinished states are worth a badge. */}
                    {!(c.import_status !== "building" && tasks.length && tasks.every((t) => t.published)) && <Badge status={c.import_status === "building" ? "pending_review" : tasks.length && tasks.every((t) => t.published) ? "passed" : ""}>
                      {c.import_status === "building" ? "Готовим курс…" : !tasks.length ? "Пустой курс" : tasks.every((t) => t.published) ? "Готов к выдаче" : `Черновик · опубликовано ${tasks.filter((t) => t.published).length} из ${tasks.length}`}
                    </Badge>}
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
  else if(page==='python-help')content=<PythonHelp/>;
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
      <NotFound
        title="Задание недоступно"
        text={matches.length>1?"Задание выдано несколько раз. Выбери нужную группу в разделе «Мои курсы».":"Возможно, учитель изменил задание. Вернись к своим курсам."}
        back="courses"
        backLabel={student ? "К моим курсам" : "К курсам"}
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
              {s.groups.some((g) => !g.archived) && taskForCourse(c.id).some((t) => t.published) && c.import_status !== "building" && (
                <button
                  className="primary"
                  onClick={() => {
                    const open = s.groups.filter((g) => !g.archived);
                    if (open.length === 1) { setProgramGroup(open[0]); return; }
                    setDialog({ title: `Выдать «${c.title}» группе`, fields: [{ key: "group", label: "Группа", options: open }], submit: async (b) => { const g = open.find((x) => x.id === b.group); if (g) setTimeout(() => setProgramGroup(g)); } });
                  }}
                >
                  Выдать группе
                </button>
              )}
              <button
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
                            title="Новое задание урока. Чтобы оно стало шагом урока, добавьте его в «Сценарии урока»."
                            onClick={() => go(`builder/new?lesson=${l.id}`)}
                          >
                            + Задание
                          </button>
                        </div>
                      )}
                    </div>
                    {(() => { let steps: Row[] = []; try { steps = typeof l.steps === "string" ? JSON.parse(l.steps) : l.steps || []; } catch { steps = []; } const outside = steps.length ? s.tasks.filter((t) => t.lesson_id === l.id && !steps.some((st) => st.task_id === t.id)) : []; return outside.length > 0 && !student ? <p className="muted inset scenario-note">Не входят в сценарий урока и выдаются отдельно: {outside.map((t) => `«${t.title}»`).join(", ")}. Чтобы задание стало шагом урока, добавьте его в «Сценарии урока».</p> : null; })()}
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
  } else if (page === "practice") {
    content = <Practice user={s.user.id} mode={isPracticeMode(id) ? id : undefined} go={go} ask={confirm.ask} />;
  } else if (page === "courses") {
    const starterInstalled = s.courses.some((c) => c.import_status && c.import_template !== "libraries/v1" && !c.import_template?.startsWith("legacy/") && !c.import_template?.startsWith("problems/"));
    const librariesInstalled = s.courses.some((c) => c.import_template === "libraries/v1");
    const readyOf = (prefix: string) => s.courses.filter((c) => c.import_template?.startsWith(prefix) && c.import_status === "ready").length;
    const legacyInstalled = readyOf("legacy/v1/") >= 12, problemsInstalled = readyOf("problems/v1/") >= 16;
    // 12 courses (one per chapter of the first version, 100 tasks) pass the quality gate one by one; the server limits checks per minute, so a
    // busy answer means "wait a little": everything already checked stays, the next call continues.
    // Course sets install one course per request through the quality gate; the server limits checks per
    // minute, so a busy answer means "wait a little": everything already checked stays, the next call continues.
    const installSet = (path: string, text: { start: string; progress: string; done: string }) => () => void act(async () => {
      setToast({ text: text.start, sticky: true });
      for (let attempt = 0; attempt < 80; attempt++) {
        let step: Row;
        try { step = await api(path, {}); }
        catch (e) {
          if (!/Слишком много запросов|уже готовится/.test((e as Error).message)) throw e;
          setToast({ text: "Проверили много заданий подряд — продолжим через 20 секунд. Готовые курсы сохранены.", sticky: true });
          await new Promise((done) => setTimeout(done, 20000));
          continue;
        }
        if (step.ready) {
          await refresh();
          setToast({ text: text.done, action: { label: "К группам", path: "groups" } });
          go("courses");
          return;
        }
        setToast({ text: `${text.progress}: готово ${step.done} из ${step.total}.`, sticky: true });
        await refresh();
      }
      throw new Error("Курсы не успели подготовиться. Нажмите кнопку ещё раз — готовые курсы сохранены.");
    });
    const installLegacy = installSet("/legacy-course/install", { start: "Готовим 12 курсов первой версии Kodik — 100 заданий. Каждое задание проходит проверку, это займёт пару минут.", progress: "Готовим курсы первой версии Kodik", done: "12 курсов первой версии Kodik готовы: 100 проверенных заданий. Выдайте нужный курс группе." });
    const installProblems = installSet("/problem-book/install", { start: "Готовим задачник Kodik: 16 тем, 114 задач. Каждая задача проходит проверку, это займёт несколько минут.", progress: "Готовим задачник Kodik", done: "Задачник Kodik готов: 16 курсов, 114 проверенных задач. Выдайте нужную тему группе." });
    const installLibraries = () => void act(async () => {
      setToast({ text: "Готовим пять уроков с черепахой, Роботом и графиками и проверяем образцы. Это может занять около минуты.", sticky: true });
      const course = await mutate("/library-course/install", {});
      setToast({ text: "Курс «Python с библиотеками» готов. Теперь выдайте его группе.", action: { label: "К группам", path: "groups" } });
      go(`courses/${course.id}`);
    });
    const installStarter = () => void act(async () => {
      setToast({ text: "Готовим шесть уроков и проверяем образцы. Это может занять около минуты.", sticky: true });
      const course = await mutate("/starter-course/install", {});
      setToast({ text: "Стартовый курс готов. Теперь выдайте его группе.", action: { label: "К группам", path: "groups" } });
      go(`courses/${course.id}`);
    });
    content = (
      <>
        <Header
          title={student ? "Мои курсы" : "Курсы"}
          text={student ? "Здесь всё, что выдал учитель." : "Готовые и свои программы. Выдают их группе на странице группы."}
        >
          {!student && s.courses.length > 0 && (!starterInstalled || !librariesInstalled || !legacyInstalled || !problemsInstalled) && (
            <details className="more-menu ready-courses">
              <summary>Готовые курсы</summary>
              <div className="more-menu-items">
                {!starterInstalled && <button onClick={installStarter}><span><b>Первые шаги: от блоков к Python</b><small>6 уроков · блоки и Python</small></span></button>}
                {!librariesInstalled && <button onClick={installLibraries}><span><b>Python с библиотеками</b><small>5 уроков · черепаха, Робот, графики</small></span></button>}
                {!legacyInstalled && <button onClick={installLegacy}><span><b>Курсы первой версии Kodik</b><small>12 курсов, 100 заданий · от первых блоков до черепашки</small></span></button>}
                {!problemsInstalled && <button onClick={installProblems}><span><b>Задачник Kodik</b><small>16 тем, 114 задач · от ввода-вывода до строк, Робота и черепахи</small></span></button>}
              </div>
            </details>
          )}
          {!student && (
            <button className="primary" onClick={createCourse}>
              <Glyph name="plus" />
              Создать курс
            </button>
          )}
        </Header>
        {s.courses.length || (student && s.programs.length) ? (
          courseCards()
        ) : student ? (
          <Empty title="Скоро здесь появится твой первый курс" text="Учитель выдаст задания твоей группе." />
        ) : (
          <section className="starter-offer panel">
            <div>
              <span className="overline">ПРОЩЕ ВСЕГО НАЧАТЬ ЗДЕСЬ</span>
              <h2>Стартовый курс «Первые шаги: от блоков к Python»</h2>
              <p>6 уроков по 40 минут, 12 проверенных практик с блоками и Python, заметки для учителя с планом урока.</p>
            </div>
            <div className="actions">
              <button className="primary" onClick={installStarter}>Добавить стартовый курс · 6 уроков</button>
              <button onClick={installLibraries}>Курс «Python с библиотеками» · 5 уроков</button>
              <button onClick={installLegacy}>Курсы первой версии Kodik · 12 курсов</button>
              <button onClick={installProblems}>Задачник Kodik · 16 тем</button>
              <button className="link" onClick={createCourse}>или создать свой курс</button>
            </div>
          </section>
        )}
      </>
    );
  } else if (page === "tasks" && !student) {
    const [, query = ""] = route.split("?");
    const filter = new URLSearchParams(query).get("status") || "";
    const statusOf = (t: Row) => (t.published ? (t.published_revision !== t.revision ? "changed" : "published") : "draft");
    const shown = s.tasks.filter((t) => !t.run_id && (!filter || statusOf(t) === filter));
    const lessonOf = (t: Row) => s.lessons.find((l) => l.id === t.lesson_id);
    const courseOf = (t: Row) => s.courses.find((c) => c.id === s.modules.find((m) => m.id === lessonOf(t)?.module_id)?.course_id);
    const byCourse = s.courses.map((c) => ({ c, tasks: shown.filter((t) => courseOf(t)?.id === c.id) })).filter((x) => x.tasks.length);
    content = (
      <>
        <Header title="Задания" text="Все задания по курсам и урокам. Новое задание создаётся внутри урока.">
          <label className="inline-filter">Показать
            <select value={filter} onChange={(e) => go(e.target.value ? `tasks?status=${e.target.value}` : "tasks")}>
              <option value="">Все</option>
              <option value="published">Опубликованные</option>
              <option value="changed">С неопубликованными правками</option>
              <option value="draft">Черновики</option>
            </select>
          </label>
          <button className="primary" disabled={!s.lessons.length} title={s.lessons.length ? undefined : "Сначала создайте курс с уроком"} onClick={() => go("builder/new")}>
            + Создать задание
          </button>
        </Header>
        {/* One line per course; a course opens to its lessons. A filter or a single course shows everything. */}
        {byCourse.map(({ c, tasks }) => (
          <details className="panel spaced task-course" key={`${c.id}:${filter}`} open={!!filter || byCourse.length === 1}>
            <summary className="panel-heading"><h2>{c.title}</h2><span className="muted">{plural(tasks.length, ["задание", "задания", "заданий"])}</span></summary>
            {[...new Set(tasks.map((t) => t.lesson_id))].map((lid) => (
              <div key={lid} className="task-group">
                <h3 className="task-group-title">{s.lessons.find((l) => l.id === lid)?.title}</h3>
                {tasks.filter((t) => t.lesson_id === lid).map((t) => taskRow(t))}
              </div>
            ))}
            <a className="link task-course-link" href={`#courses/${c.id}`}>Открыть курс →</a>
          </details>
        ))}
        {!shown.length && (s.tasks.length ? <Empty title="Нет заданий с таким статусом" text="Выберите другой фильтр."><button onClick={() => go("tasks")}>Показать все</button></Empty> : (
          <Empty
            title="Создайте первое задание"
            text="Сначала добавьте курс, модуль и урок. Затем откройте пошаговый конструктор."
          >
            <button onClick={() => go("courses")}>Перейти к курсам</button>
          </Empty>
        ))}
      </>
    );
  }
  else if (page === "groups" && !student)
    content = <GroupsList state={s} actions={groupActions}/>;
  else if (page === "group" && !student) {
    const g = s.groups.find((g) => g.id === id);
    content = g ? <GroupPage key={g.id} state={s} group={g} actions={groupActions}/> : <NotFound title="Группа не найдена" text="Возможно, у вас нет доступа к этой группе." back="groups" backLabel="К группам"/>;
  }
  else if (page === "users" && !student) {
    const [, query = ""] = route.split("?"), params = new URLSearchParams(query);
    const search = (params.get("q") || "").toLowerCase(), role = params.get("role") || "";
    const groupsOf = (uid: string) => s.members.filter((m) => m.user_id === uid).map((m) => s.groups.find((g) => g.id === m.group_id)?.title).filter(Boolean).join(", ");
    const roleName = (r: string) => (r === "student" ? "Ученик" : r === "teacher" ? "Преподаватель" : "Администратор");
    const shownUsers = s.users.filter((u) => (!role || u.role === role) && (!search || `${u.name} ${u.login} ${groupsOf(u.id)}`.toLowerCase().includes(search)));
    const setParam = (key: string, value: string) => { const next = new URLSearchParams(query); if (value) next.set(key, value); else next.delete(key); const q = next.toString(); history.replaceState(null, "", `#users${q ? "?" + q : ""}`); setRoute(`users${q ? "?" + q : ""}`); };
    content = (
      <>
        <Header title="Участники школы" text="Аккаунты учеников, преподавателей и администраторов.">
          <button className="primary" onClick={createUser}>
            + Добавить участника
          </button>
        </Header>
        <div className="actions filters">
          <label>Поиск<input type="search" defaultValue={params.get("q") || ""} placeholder="Имя, логин или группа" onChange={(e) => setParam("q", e.target.value)} /></label>
          <label>Роль<select value={role} onChange={(e) => setParam("role", e.target.value)}><option value="">Все</option><option value="student">Ученики</option><option value="teacher">Преподаватели</option><option value="admin">Администраторы</option></select></label>
        </div>
        <section className="panel">
          <div className="panel-heading"><h2 role="status">{search || role ? "Найдено: " : "Всего: "}{plural(shownUsers.length, ["участник", "участника", "участников"])}</h2></div>
          <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Участник</th>
                <th>Логин</th>
                <th>Роль</th>
                <th>Группы</th>
                <th>Доступ</th>
              </tr>
            </thead>
            <tbody>
              {shownUsers.map((u) => (
                <tr key={u.id} className={u.active ? "" : "inactive"}>
                  <td>
                    <b>{u.name}</b>
                    {!u.active && <small>Доступ отключён</small>}
                  </td>
                  <td><code>{u.login}</code></td>
                  <td>
                    <Badge>{roleName(u.role)}</Badge>
                  </td>
                  <td>{groupsOf(u.id) || <span className="muted">—</span>}</td>
                  <td className="row-actions">
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
                                hint: "Сгенерирован автоматически. Запишите его и передайте участнику.",
                              },
                            ],
                            submit: async (b) => { await mutate(`/users/${u.id}/password`, b); setToast({ text: `Новый пароль для ${u.name}: ${b.password}`, sticky: true }); },
                          })
                        }
                      >
                        Сбросить пароль
                      </button>
                    )}
                    {s.user.role === "admin" && u.id !== s.user.id && (
                      <button
                        className={`link access-toggle${u.active ? " danger-text" : ""}`}
                        onClick={async () => {
                          if (u.active && !await confirm.ask({ title: `Отключить доступ: ${u.name}?`, text: <p>Участник не сможет войти. Работы и история сохранятся, место в лицензии освободится. Доступ можно вернуть.</p>, confirm: "Отключить доступ", danger: true })) return;
                          void act(() => mutate(`/users/${u.id}/access`, { active: !u.active }));
                        }}
                      >
                        {u.active ? "Отключить доступ…" : "Вернуть доступ"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {!shownUsers.length && <p className="inset muted">Никого не нашли. Измените поиск или фильтр.</p>}
        </section>
      </>
    );
  }
  else if (page === "results" && student) {
    const lessons = s.programs.filter((r) => !r.archived).flatMap((r) => r.lessons.map((l: Row) => ({ ...l, program: r.title })));
    const passedLessons = lessons.filter((l) => l.total > 0 && l.completed === l.total);
    const solved = s.tasks.filter((t) => isPassed(progressKey(t)));
    content = (
      <>
        <Header eyebrow="" title="Мой прогресс" text="Что ты уже умеешь и что решено." />
        <div className="stats two">
          <div><span>Уроков пройдено</span><strong>{passedLessons.length}</strong><small>из {lessons.length}</small></div>
          <div><span>Задач решено</span><strong>{solved.length}</strong><small>из {s.tasks.length}</small></div>
        </div>
        {lessons.length > 0 && (
          <section className="panel spaced">
            <div className="panel-heading"><h2>Уроки</h2></div>
            <ul className="progress-list">
              {lessons.map((l) => (
                <li key={l.id} className={l.total > 0 && l.completed === l.total ? "done" : ""}>
                  <span className="progress-mark" aria-hidden="true">{l.total > 0 && l.completed === l.total ? <Icon name="check" size="sm" /> : l.state === "scheduled" ? <Icon name="lock" size="sm" /> : "•"}</span>
                  <span className="grow"><b>{l.title}</b><small>{l.program} · {l.total > 0 && l.completed === l.total ? "пройден" : l.state === "scheduled" ? "откроет учитель" : `шагов: ${l.completed} из ${l.total}`}</small></span>
                  {l.state !== "scheduled" && <a href={`#lesson-run/${l.id}`}>{l.completed === l.total ? "Повторить" : "Открыть"}</a>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="panel spaced">
          <div className="panel-heading"><h2>Задачи</h2></div>
          {s.tasks.length ? (
            <ul className="progress-list">
              {s.tasks.map((t) => {
                const done = isPassed(progressKey(t)), tries = s.attempts.filter((a) => matchesTask(a, t));
                return (
                  <li key={t.assignment_id || t.id} className={done ? "done" : ""}>
                    <span className="progress-mark" aria-hidden="true">{done ? <Icon name="check" size="sm" /> : "•"}</span>
                    <span className="grow"><b>{t.title}</b><small>{done ? "Решено" : tries.length ? "Пока не решено — можно продолжить" : "Ещё не начато"}</small></span>
                    <a href={`#${taskLink(t)}`}>{done ? "Посмотреть" : "Решать"}</a>
                  </li>
                );
              })}
            </ul>
          ) : <p className="inset muted">Задач пока нет.</p>}
        </section>
        {s.attempts.length > 0 && (
          <details className="panel all-attempts">
            <summary>Все попытки · {s.attempts.length}</summary>
            <div className="table-scroll"><table>
              <thead><tr><th>Задача</th><th>Результат</th><th>Дата</th><th /></tr></thead>
              <tbody>
                {s.attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.task_title || s.tasks.find((t) => t.id === a.task_id)?.title}</td>
                    <td><span className={`attempt-status ${a.status}`}>{learnerStatus[a.status] || a.status}</span></td>
                    <td>{new Date(a.created_at).toLocaleString("ru")}</td>
                    <td><button className="link" onClick={() => openAttempt(a.id)}>Открыть решение</button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </details>
        )}
      </>
    );
  }
  else if (page === "results")
    content = (
      <>
        <Header
          title="Результаты обучения"
          text="Прогресс каждого ученика по выданным заданиям."
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
                            : "Попыток пока нет"}
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
            <h2>{student ? "История решений" : "Последние решения"}</h2>
            {student ? <span className="muted">{plural(s.attempts.length, ["попытка", "попытки", "попыток"])}</span> : <a className="link" href="#journal">Все решения — в журнале →</a>}
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
                {/* Teachers search and grade every attempt in the journal; here the latest ten are enough. */}
                {(student ? s.attempts : s.attempts.slice(0, 10)).map((a) => (
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
  else if (page !== "overview" && page !== "")
    content = <NotFound />;
  else if (student) {
    const programs = s.programs.filter((r) => !r.archived && !r.group_archived);
    const open = programs.flatMap((r) => r.lessons.filter((l: Row) => l.state === "open" && l.completed < l.total)).at(0);
    const nextTask = s.tasks.find((t) => !isPassed(progressKey(t)) && !t.run_id);
    const lessons = programs.flatMap((r) => r.lessons), passedLessons = lessons.filter((l: Row) => l.total > 0 && l.completed === l.total).length;
    const solved = s.tasks.filter((t) => isPassed(progressKey(t))).length;
    content = (
      <>
        <Header eyebrow="" title={`Привет, ${s.user.name.split(" ")[0]}!`} text="Продолжим учиться программировать." />
        <section className="welcome-banner learner-banner">
          <div>
            <Badge>ТВОЙ СЛЕДУЮЩИЙ ШАГ</Badge>
            <h2>{open ? `${open.completed ? "Продолжить" : "Начать"} урок: ${open.title}` : nextTask ? `Задача: ${nextTask.title}` : lessons.length && passedLessons === lessons.length ? "Все уроки пройдены!" : "Следующий урок откроет учитель"}</h2>
            <p>{open ? `Шагов пройдено: ${open.completed} из ${open.total}.` : nextTask ? (nextTask.order_snapshot?.course_title ? `Курс «${nextTask.order_snapshot.course_title}»` : "Открой задачу и попробуй решить.") : "Пока можно повторить пройденное."}</p>
            {s.tasks.length > 0 && (
              <div className="banner-progress" role="img" aria-label={`Задач решено: ${solved} из ${s.tasks.length}`}>
                <span style={{ width: `${Math.round((solved / s.tasks.length) * 100)}%` }} />
                <small>Решено {solved} из {s.tasks.length}</small>
              </div>
            )}
            {open ? (
              <button className="primary big" onClick={() => go(`lesson-run/${open.id}`)}>{open.completed ? "Продолжить урок" : "Начать урок"} <Glyph name="arrow" /></button>
            ) : nextTask ? (
              <button className="primary big" onClick={() => go(taskLink(nextTask))}>Решать задачу <Glyph name="arrow" /></button>
            ) : (
              <button className="dark" onClick={() => go("results")}>Мой прогресс <Glyph name="arrow" /></button>
            )}
          </div>
        </section>
        <div className="section-title">
          <h2>Мои курсы</h2>
          <a className="link" href="#courses">Все курсы →</a>
        </div>
        {s.courses.length || s.programs.length ? courseCards() : <Empty title="Ждём первое задание" text="Когда учитель выдаст урок, он появится здесь." />}
      </>
    );
  } else {
    const admin = s.user.role === "admin", license = (s as Row).license;
    const myGroups = s.groups.filter((g) => !g.archived);
    const openLessons = s.programs.filter((r) => !r.archived && !r.group_archived).flatMap((r) => r.lessons.filter((l: Row) => l.state === "open").map((l: Row) => ({ ...l, group: r.group_title, program: r.title })));
    const pending = s.attempts.filter((a) => a.status === "pending_review").length;
    const recent = s.attempts.slice(0, 5);
    const difficult: Row[] = s.tasks
      .map((t) => ({ ...t, errors: s.attempts.filter((a) => matchesTask(a, t) && ["failed", "runtime_error"].includes(a.status)).length }))
      .filter((t) => t.errors)
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 4);
    const steps = [
      { done: s.groups.length > 0, label: "Создать группу (класс)", path: "groups" },
      { done: s.members.length > 0, label: "Добавить учеников списком", path: s.groups[0] ? `group/${s.groups[0].id}` : "groups" },
      { done: ((s as Row).group_teachers || []).length > 0, label: "Назначить преподавателя группе", path: s.groups[0] ? `group/${s.groups[0].id}` : "groups" },
      { done: s.courses.some((c) => c.import_status === "ready") || s.tasks.some((t) => t.published), label: "Добавить стартовый курс", path: "courses" },
      { done: s.programs.length > 0, label: "Выдать программу группе", path: s.groups[0] ? `group/${s.groups[0].id}` : "groups" },
    ];
    const setupLeft = steps.filter((x) => !x.done).length;
    content = (
      <>
        <Header eyebrow={s.organization.name.toUpperCase()} title={`Привет, ${s.user.name.split(" ")[0]}!`} text={openLessons.length ? "Сегодня на занятиях:" : "Вот что происходит в школе."} />
        {admin && license && (
          <p className={`license-strip${license.valid ? "" : " expired"}`} role="status">
            {license.valid ? "Лицензия" : "Лицензия истекла"}{license.expires_at ? ` до ${new Date(license.expires_at).toLocaleDateString("ru")}` : ""} · учеников: {license.used} из {license.student_limit}
            {" · "}<a href="#school">Подробнее</a>
          </p>
        )}
        {admin && setupLeft > 0 && (
          <section className="panel setup-checklist" aria-labelledby="setup-title">
            <div className="panel-heading"><div><span className="overline">ПЕРВЫЙ КЛАСС</span><h2 id="setup-title">До первого урока осталось шагов: {setupLeft}</h2></div></div>
            <ol>
              {steps.map((x, i) => (
                <li key={i} className={x.done ? "done" : steps.findIndex((y) => !y.done) === i ? "next" : ""}>
                  <span className="check" aria-hidden="true">{x.done ? <Icon name="check" size="sm" /> : i + 1}</span>
                  <span className="grow">{x.label}</span>
                  {!x.done && <a className={steps.findIndex((y) => !y.done) === i ? "button-link primary" : "link"} href={`#${x.path}`}>{steps.findIndex((y) => !y.done) === i ? "Сделать сейчас" : "Открыть"}</a>}
                  {x.done && <span className="muted">готово</span>}
                </li>
              ))}
            </ol>
          </section>
        )}
        <div className="today-grid">
          <section className="panel today-lessons">
            <div className="panel-heading"><h2>Открытые занятия</h2><a className="link" href="#groups">Все группы →</a></div>
            {openLessons.length ? openLessons.map((l) => (
              <div className="member inset" key={l.id}>
                <span><b>{l.title}</b><small>{l.group} · {l.program}</small></span>
                <button className="primary" onClick={() => go(`lesson-run/${l.id}`)}>Провести занятие</button>
              </div>
            )) : <p className="inset muted">Сейчас нет открытых занятий. {myGroups.length ? "Откройте занятие на странице группы." : "Начните с группы."}</p>}
          </section>
          <section className="panel today-attention">
            <div className="panel-heading"><h2>Требует внимания</h2></div>
            <a className={`attention-row${helpWaiting ? " hot" : ""}`} href="#classroom"><span><Icon name="hand" size="sm" /> Ждут помощи</span><b>{helpWaiting}</b></a>
            <a className={`attention-row${pending ? " hot" : ""}`} href="#journal?status=pending_review"><span>На ручной проверке</span><b>{pending}</b></a>
            <div className="attention-groups">
              <h3>Мои группы</h3>
              {myGroups.length ? myGroups.map((g) => <a key={g.id} href={`#group/${g.id}`}>{g.title} · {plural(s.members.filter((m) => m.group_id === g.id).length, ["ученик", "ученика", "учеников"])}</a>) : <a href="#groups">Создать первую группу →</a>}
            </div>
          </section>
        </div>
        <div className="overview-bottom">
          <section className="panel">
            <div className="panel-heading">
              <h2>Последние решения</h2>
              <a className="link" href="#journal">Журнал →</a>
            </div>
            {recent.length ? (
              recent.map((a) => (
                <button className="activity" key={a.id} onClick={() => openAttempt(a.id)}>
                  <span className="avatar">{s.users.find((u) => u.id === a.user_id)?.name?.slice(0, 1)}</span>
                  <span className="grow">
                    <b>{s.users.find((u) => u.id === a.user_id)?.name}</b>
                    <small>{a.task_title || s.tasks.find((t) => t.id === a.task_id)?.title}</small>
                  </span>
                  <Badge status={a.status} />
                </button>
              ))
            ) : (
              <p className="muted inset">Здесь появятся первые решения учеников.</p>
            )}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Где ученикам трудно</h2>
            </div>
            {difficult.length ? (
              difficult.map((t) => (
                <div className="member inset" key={t.assignment_id || t.id}>
                  <span>{t.title}</span>
                  <Badge>{plural(t.errors, ["ошибка", "ошибки", "ошибок"])}</Badge>
                </div>
              ))
            ) : (
              <p className="muted inset">Пока нет заданий, вызывающих затруднения.</p>
            )}
          </section>
        </div>
      </>
    );
  }
  const nav: [string, string, string, string?][] = s.user.platform_owner ? [['overview','users','Клиенты и лицензии']] : student
    ? [
        ["overview", "grid", "Обзор"],
        ["courses", "book", "Мои курсы"],
        ["practice", "terminal", "Практика"],
        ["results", "chart", "Мой прогресс"],
        ["python-help", "code", "Справка Python"],
      ]
    : [
        ["overview", "grid", "Обзор", "СЕГОДНЯ"],
        ["classroom", "help", "Запросы помощи"],
        ["groups", "users", "Учебные группы", "КЛАССЫ"],
        ["users", "person", "Участники"],
        ["courses", "book", "Курсы", "МАТЕРИАЛЫ"],
        ["tasks", "edit", "Задания"],
        ["python-help", "code", "Справка Python"],
        ["journal", "journal", "Журнал и проверка", "РЕЗУЛЬТАТЫ"],
        ["results", "chart", "Результаты"],
        ["modes", "switch", "Способы решения"],
        ...(s.user.role==='admin'?[["school","school","Управление школой","ШКОЛА"] as [string,string,string,string]]:[]),
      ];
  const focusPage = (student && ["assignment", "lesson-run"].includes(page)) || page === "preview" || (page === "practice" && isPracticeMode(id)),
    collapsed = !focusPage && compactSidebar, asDrawer = narrow || focusPage;
  const pageTitle = nav.find((n) => n[0] === page)?.[2] || ({ builder: "Конструктор задания", group: "Учебная группа", program: "Программа", "lesson-run": "Занятие", assignment: "Задание", preview: "Предпросмотр", "python-help": "Справка по Python", practice: "Практика", "lesson-editor": "Сценарий урока" } as Record<string, string>)[page] || "Kodik";
  return (
    <div className={`b2b-shell ${collapsed ? "sidebar-collapsed" : ""}${focusPage ? " focus-page" : ""}${drawer ? " drawer-open" : ""}`}>
      {drawer && <button className="drawer-backdrop" aria-label="Закрыть меню" onClick={() => setDrawer(false)} />}
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>К содержимому</a>
      <aside className="sidebar" id="sidebar">
        <a className="brand" href="#overview">
          <span className="brand-mark">k.</span>kodik
          {!student && <span className="brand-suffix">школы</span>}
        </a>
        {/* A learner belongs to one school: the card would only repeat its name. */}
        {!student && <div className="school-switch">
          <span className="school-avatar">
            {s.organization.name.slice(0, 1)}
          </span>
          <div>
            <b title={s.organization.name}>{s.organization.name}</b>
            <small>Пространство школы</small>
          </div>
        </div>}
        <nav aria-label="Разделы">
          {nav.map(([key, icon, label, section]) => (
            <span key={key} className="nav-item">
              {section && <span className="nav-caption">{section}</span>}
              <a
                className={page === key || (key === "groups" && page === "group") ? "active" : ""}
                aria-current={page === key ? "page" : undefined}
                href={`#${key}`}
                title={label}
              >
                <Glyph name={icon} />
                <span className="nav-label">{label}</span>
                {key === "classroom" && helpWaiting > 0 && (
                  <span className="nav-count hot" aria-label={`ждут помощи: ${helpWaiting}`}>{helpWaiting}</span>
                )}
              </a>
            </span>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!student && (
            <div className="legacy-link">
              <Glyph name="code" />
              <div>
                <b>Демо для самостоятельной практики</b>
                <small>Исходный курс Kodik вне школы</small>
                <a href="?legacy=1" target="_blank" rel="noreferrer">
                  Открыть демо ↗
                </a>
              </div>
            </div>
          )}
          <div className="profile">
            <span className="avatar">{s.user.name.slice(0, 1)}</span>
            <div>
              <b title={s.user.name}>{s.user.name}</b>
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
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button
            className="sidebar-toggle"
            aria-label={asDrawer ? (drawer ? "Закрыть меню" : "Открыть меню") : collapsed ? "Развернуть навигацию" : "Свернуть навигацию"}
            aria-expanded={asDrawer ? drawer : !collapsed}
            aria-controls="sidebar"
            onClick={() => (asDrawer ? setDrawer((v) => !v) : setCompactSidebar((v) => !v))}
          >
            <Icon name="menu" />
          </button>
          <nav className="crumbs" aria-label="Навигационная цепочка">
            {pageTitle}
          </nav>
          <span className="topbar-meta">
            {refreshError && <span role="status" className="sync-warning">{student ? "Нет связи с сервером — работа сохраняется на этом компьютере" : "Нет связи с сервером"}</span>}
            {!student && (
              <button
                className="link"
                onClick={() => act(refresh)}
                aria-label="Обновить данные"
              >
                Обновить
              </button>
            )}
          </span>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className={`main-content${["task","assignment","lesson-run","preview"].includes(page) ? " workspace-page" : ""}${page === "practice" && isPracticeMode(id) ? " workspace-page practice-page" : ""}`}
        >
          {notice && (
            <div className="notice" role="alert">
              {notice}
              <button onClick={() => setNotice("")}>Закрыть</button>
            </div>
          )}
          {toast && (
            <div className="toast" role="status">
              <span>{toast.text}</span>
              {toast.action && <button className="primary small" onClick={() => { go(toast.action!.path); setToast(null); }}>{toast.action.label}</button>}
              <button className="small" onClick={() => setToast(null)}>{toast.sticky ? "Готово, записано" : "Понятно"}</button>
            </div>
          )}
          {recovery && (
            <section className="recovery-notice" role="alert">
              <h3>Сохраните код восстановления</h3>
              <p>
                Он вернёт доступ к аккаунту администратора, если пароль забыт. Код показывается только здесь и
                останется на экране, пока вы не подтвердите, что сохранили его.
              </p>
              <code>{recovery}</code>
              <div className="actions">
                <button onClick={() => void navigator.clipboard?.writeText(recovery).then(() => setToast({ text: "Код скопирован. Сохраните его в надёжном месте." }))}>Скопировать</button>
                <button onClick={() => { const url = URL.createObjectURL(new Blob([`Код восстановления Kodik для «${s.organization.name}»\nЛогин: ${s.user.login}\nКод: ${recovery}\n`], { type: "text/plain;charset=utf-8" })), link = document.createElement("a"); link.href = url; link.download = "kodik-код-восстановления.txt"; link.click(); URL.revokeObjectURL(url); }}>Скачать .txt</button>
                <button className="primary" onClick={async () => { if (await confirm.ask({ title: "Код точно сохранён?", text: <p>После этого код больше не покажется. Без него восстановить доступ администратора можно будет только через поддержку.</p>, confirm: "Да, код сохранён" })) setRecovery(""); }}>Я сохранил код</button>
              </div>
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
          onReview={async (b, next) => {
            await mutate(`/attempts/${attempt.id}/review`, {...b,revision:attempt.review_revision});
            const who = s.users.find((u) => u.id === attempt.user_id)?.name || "ученику";
            setToast({ text: b.status === attempt.status ? `Комментарий для ${who} сохранён.` : b.status === "passed" ? `Работа ${who} принята.` : `Работа возвращена ${who} на доработку.` });
            const queue: string[] = (attempt.queue || []).filter((x: string) => x !== attempt.id);
            setAttempt(null);
            if (next && queue.length) openAttempt(queue[0], queue);
          }}
        />
      )}
      {confirm.element}
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
  onReview: (b: Row, next?: boolean) => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [history,setHistory]=useState<Row[]>([]);
  useEffect(()=>{api(`/attempts/${a.id}/reviews`).then(r=>setHistory(r.items)).catch(()=>{})},[a.id]);
  const staff = s.user.role !== "student", manual = a.snapshot?.check_mode === "manual";
  const learner = s.users.find((u) => u.id === a.user_id)?.name;
  const more = (a.queue || []).filter((x: string) => x !== a.id).length;
  return (
    <div className="overlay">
      <section
        className="dialog wide-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Решение ученика"
      >
        <div className="dialog-heading">
          <div>
            {staff && learner && <span className="overline">{learner}{a.group_title ? ` · ${a.group_title}` : ""}</span>}
            <h2>
              {a.snapshot?.title || a.task_title || s.tasks.find((t) => t.id === a.task_id)?.title ||
                "Решение ученика"}
            </h2>
          </div>
          <button aria-label="Закрыть" onClick={close}>
            ×
          </button>
        </div>
        <p className="attempt-meta"><Badge status={a.status} /> {new Date(a.created_at).toLocaleString("ru")} · {a.mode==='blocks'?'Блоки':a.mode==='mixed'?'Блоки + Python':'Python'}</p>
        {staff && <p className="muted">{a.context_origin==='legacy'?'Историческая попытка: назначение не восстановлено':`Версия задания ${a.snapshot?.revision||a.version_revision||''}`}</p>}
        <p>{a.result.message}</p>
        <pre className="solution-code">{a.code}</pre>
        {staff && manual && a.snapshot?.manual_criteria && <section className="criteria"><h3>Критерии проверки</h3><p className="preserve">{a.snapshot.manual_criteria}</p></section>}
        {a.feedback && <p className="feedback-note"><b>Комментарий преподавателя:</b> {a.feedback}</p>}
        {history.length>0&&<details><summary>История оценок · {history.length}</summary>{history.map(h=><p key={h.id}>{new Date(h.created_at).toLocaleString('ru')} · {h.actor_name} · {statusNames[h.before_status]} → {statusNames[h.after_status]}: {h.after_feedback}</p>)}</details>}
        {staff && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const next = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "next";
              setBusy(true);
              try {
                const body = Object.fromEntries(new FormData(e.currentTarget));
                await onReview(manual ? body : { ...body, status: a.status }, next);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              {manual ? "Комментарий" : "Комментарий ученику"}
              <textarea name="feedback" rows={3} defaultValue={a.feedback} placeholder={manual ? "Что получилось и что исправить" : "Результат проверен автоматически; комментарий увидит ученик"} />
            </label>
            {manual && (
              <label>
                Результат
                <select name="status">
                  <option value="passed">Принять решение</option>
                  <option value="failed">Вернуть на доработку</option>
                </select>
              </label>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button className="primary" disabled={busy} value="save">
                {manual ? "Сохранить проверку" : "Сохранить комментарий"}
              </button>
              {more > 0 && <button disabled={busy} value="next">Сохранить и следующая ({more})</button>}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
