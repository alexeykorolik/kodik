import { useEffect, useRef, useState, type ReactNode } from "react";

type Ask = { title: string; text?: ReactNode; confirm: string; danger?: boolean };
/**
 * A confirmation for actions that are hard to undo: it names the consequence and the exact action.
 * `ask` resolves to true only after the explicit button; Escape, «Отмена» and the backdrop cancel.
 */
export function useConfirm() {
  const [request, setRequest] = useState<(Ask & { done: (ok: boolean) => void }) | null>(null);
  const ask = (options: Ask) => new Promise<boolean>((done) => setRequest({ ...options, done }));
  const close = (ok: boolean) => { request?.done(ok); setRequest(null); };
  const element = request ? <ConfirmDialog request={request} close={close} /> : null;
  return { ask, element };
}
function ConfirmDialog({ request, close }: { request: Ask; close: (ok: boolean) => void }) {
  const cancel = useRef<HTMLButtonElement>(null), box = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(false); }
      if (e.key === "Tab") {
        const nodes = Array.from(box.current?.querySelectorAll<HTMLElement>("button") || []);
        const first = nodes[0], last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keys, true);
    return () => { document.removeEventListener("keydown", keys, true); previous?.focus(); };
  }, []);
  return (
    <div className="overlay confirm-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
      <section ref={box} className="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text">
        <h2 id="confirm-title">{request.title}</h2>
        {request.text && <div id="confirm-text" className="confirm-text">{request.text}</div>}
        <footer>
          <button ref={cancel} type="button" onClick={() => close(false)}>Отмена</button>
          <button type="button" className={request.danger ? "danger" : "primary"} onClick={() => close(true)}>{request.confirm}</button>
        </footer>
      </section>
    </div>
  );
}
