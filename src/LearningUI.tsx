import { useEffect, useRef, type ReactNode } from 'react'
export function Modal({ title, onClose, children, success }: { title: string; onClose: () => void; children: ReactNode; success?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; const d = dialog.current!; d.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { d.close(); document.body.style.overflow = overflow; previous?.focus() } }, [])
  return <dialog ref={dialog} className={`sheet native-dialog ${success ? 'is-success' : ''}`} onCancel={e => { e.preventDefault(); onClose() }} aria-labelledby="dialog-title"><button className="sheet-close" onClick={onClose} aria-label="Закрыть">×</button>{success && <div className="result-mark">✓</div>}<h2 id="dialog-title">{title}</h2>{children}</dialog>
}
export function Stars({ value, total = 3 }: { value: number; total?: number }) { return <span className="stars" aria-label={`${value} из ${total} звёзд`}>{Array.from({ length: total }, (_,i) => <span aria-hidden="true" key={i} className={i < value ? 'earned' : ''}>{i < value ? '★' : '☆'}</span>)}</span> }
export function CodePreview({ code, highlights = [], sourceIds = [], onLineSelect }: { code: string; highlights?: number[]; sourceIds?: Array<string | undefined>; onLineSelect?: (sourceId: string) => void }) {
  return <pre className={`python-code ${onLineSelect ? 'interactive-code' : ''}`}><code>{code.split('\n').map((line, index) => {
    const sourceId = sourceIds[index], interactive = !!sourceId && !!onLineSelect
    const select = () => { if (sourceId) onLineSelect?.(sourceId) }
    return <span className={`code-line ${highlights.includes(index) ? 'code-highlight' : ''}`} key={index} data-source-id={sourceId} role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined} aria-label={interactive ? `Строка ${index + 1}. Показать соответствующий блок` : undefined} onClick={interactive ? select : undefined} onKeyDown={interactive ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select() } } : undefined}><span className="line-number" aria-hidden="true">{index + 1}</span><span>{line.split(/("(?:\\.|[^"\\])*"|\b(?:print|if|else|for|in|range|def|pass|True|False)\b|\b\d+\b)/g).map((token, i) => <span key={i} className={token.startsWith('"') ? 'syntax-string' : /^(print|if|else|for|in|range|def|pass|True|False)$/.test(token) ? 'syntax-keyword' : /^\d+$/.test(token) ? 'syntax-number' : ''}>{token}</span>)}</span></span>
  })}</code></pre>
}
