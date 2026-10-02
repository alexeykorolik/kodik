import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'
import { useAndroidBack } from './useAndroidBack'
export function Modal({ title, onClose, children, success }: { title: string; onClose: () => void; children: ReactNode; success?: boolean }) {
  useAndroidBack(()=>{ onClose(); return true },100)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; const d = dialog.current!; d.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { d.close(); document.body.style.overflow = overflow; previous?.focus() } }, [])
  return <dialog ref={dialog} className={`sheet native-dialog ${success ? 'is-success' : ''}`} onCancel={e => { e.preventDefault(); onClose() }} aria-labelledby="dialog-title"><header className="sheet-heading">{success && <div className="result-mark"><Icon name="check" /></div>}<h2 id="dialog-title">{title}</h2><button className="sheet-close" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button></header><div className="sheet-body">{children}</div></dialog>
}
export function Stars({ value, total = 3 }: { value: number; total?: number }) { return <span className="stars" aria-label={`${value} из ${total} звёзд`}>{Array.from({ length: total }, (_,i) => <span aria-hidden="true" key={i} className={i < value ? 'earned' : ''}><Icon name="star" size={18} style={i < value ? { fill: "currentColor" } : undefined} /></span>)}</span> }
export function DrawingPreview({ segments }: { segments: { x1: number; y1: number; x2: number; y2: number }[] }) {
  if (!segments.length) return null
  const values = segments.flatMap(segment => [segment.x1, segment.x2, segment.y1, segment.y2])
  const xs = segments.flatMap(segment => [segment.x1, segment.x2]), ys = segments.flatMap(segment => [segment.y1, segment.y2])
  const minX = Math.min(...xs) - 20, minY = Math.min(...ys) - 20
  const width = Math.max(90, Math.max(...xs) - Math.min(...xs) + 40), height = Math.max(90, Math.max(...ys) - Math.min(...ys) + 40)
  if (!values.every(Number.isFinite)) return null
  return <div className="drawing-preview"><strong>Твой рисунок</strong><svg role="img" aria-label="Рисунок программы" viewBox={`${minX} ${minY} ${width} ${height}`} preserveAspectRatio="xMidYMid meet">{segments.map((line, index) => <line key={index} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />)}</svg></div>
}
export function CodePreview({ code, highlights = [], sourceIds = [], onLineSelect }: { code: string; highlights?: number[]; sourceIds?: Array<string | undefined>; onLineSelect?: (sourceId: string) => void }) {
  return <pre className={`python-code ${onLineSelect ? 'interactive-code' : ''}`}><code>{code.split('\n').map((line, index) => {
    const sourceId = sourceIds[index], interactive = !!sourceId && !!onLineSelect
    const select = () => { if (sourceId) onLineSelect?.(sourceId) }
    return <span className={`code-line ${highlights.includes(index) ? 'code-highlight' : ''}`} key={index} data-source-id={sourceId} role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined} aria-label={interactive ? `Строка ${index + 1}. Показать соответствующий блок` : undefined} onClick={interactive ? select : undefined} onKeyDown={interactive ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select() } } : undefined}><span className="line-number" aria-hidden="true">{index + 1}</span><span>{line.split(/("(?:\\.|[^"\\])*"|\b(?:print|if|else|for|in|range|def|pass|True|False)\b|\b\d+\b)/g).map((token, i) => <span key={i} className={token.startsWith('"') ? 'syntax-string' : /^(print|if|else|for|in|range|def|pass|True|False)$/.test(token) ? 'syntax-keyword' : /^\d+$/.test(token) ? 'syntax-number' : ''}>{token}</span>)}</span></span>
  })}</code></pre>
}
