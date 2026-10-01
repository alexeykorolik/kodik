import { useState } from 'react'

export function MinimalCodeEditor({ value, onChange, rows = 3 }: { value: string; onChange: (value: string) => void; rows?: number }) {
  const [focused, setFocused] = useState(false)
  const [cursor, setCursor] = useState(0)
  const numbers = Array.from({ length: Math.max(rows, value.split('\n').length) }, (_, index) => index + 1).join('\n')
  const activeLine = value.slice(0, cursor).split('\n').length - 1
  return <div className={`minimal-code-editor ${focused ? 'is-typing' : ''}`}>
    {focused && <span className="editor-active-line" aria-hidden="true" style={{ top: `calc(${16 + activeLine * 25.6}px + var(--editor-scroll, 0px))` }} />}
    <pre className="editor-line-numbers" aria-hidden="true">{numbers}</pre>
    <textarea id="python-answer" spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" value={value} rows={rows} placeholder="Напиши команду здесь"
      onChange={event => { setCursor(event.target.selectionStart); onChange(event.target.value) }}
      onFocus={event => { setFocused(true); setCursor(event.target.selectionStart) }}
      onBlur={() => setFocused(false)}
      onSelect={event => setCursor(event.currentTarget.selectionStart)}
      onScroll={event => event.currentTarget.parentElement?.style.setProperty('--editor-scroll', `${-event.currentTarget.scrollTop}px`)}
      onKeyDown={event => {
        if (event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
        event.preventDefault()
        const input = event.currentTarget, start = input.selectionStart
        onChange(value.slice(0, start) + '    ' + value.slice(input.selectionEnd))
        requestAnimationFrame(() => { if (input.isConnected) input.selectionStart = input.selectionEnd = start + 4 })
      }} />
  </div>
}
