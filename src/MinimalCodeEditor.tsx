import { useRef, useState } from 'react'

export function MinimalCodeEditor({ value, onChange, rows = 3 }: { value: string; onChange: (value: string) => void; rows?: number }) {
  const [focused, setFocused] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const numbers = Array.from({ length: Math.max(rows, value.split('\n').length) }, (_, index) => index + 1).join('\n')
  const activeLine = value.slice(0, cursor).split('\n').length - 1
  const insert = (text: string, position = text.length) => {
    const input = inputRef.current; if (!input) return
    const start = input.selectionStart, end = input.selectionEnd
    onChange(value.slice(0, start) + text + value.slice(end))
    requestAnimationFrame(() => { input.focus({ preventScroll: true }); input.selectionStart = input.selectionEnd = start + position; setCursor(start + position) })
  }
  const tokens = value.split(/(#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:print|if|elif|else|for|while|in|range|def|return|input|int|str|len|pass|True|False|and|or|not)\b|\b\d+(?:\.\d+)?\b)/g)
  return <div className={`minimal-code-editor ${focused ? 'is-typing' : ''}`}>
    {focused && <span className="editor-active-line" aria-hidden="true" style={{ top: `calc(${16 + activeLine * 25.6}px + var(--editor-scroll, 0px))` }} />}
    <pre className="editor-line-numbers" aria-hidden="true">{numbers}</pre>
    <div className="editor-highlight" aria-hidden="true"><pre>{tokens.map((token, index) => <span key={index} className={token.startsWith('#') ? 'syntax-comment' : /^['"]/.test(token) ? 'syntax-string' : /^\d/.test(token) ? 'syntax-number' : /^(print|if|elif|else|for|while|in|range|def|return|input|int|str|len|pass|True|False|and|or|not)$/.test(token) ? 'syntax-keyword' : ''}>{token}</span>)}{'\n'}</pre></div>
    <textarea ref={inputRef} id="python-answer" spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" value={value} rows={rows} placeholder="Напиши команду здесь"
      onChange={event => { setCursor(event.target.selectionStart); onChange(event.target.value) }}
      onFocus={event => { setFocused(true); setCursor(event.target.selectionStart) }}
      onBlur={() => setFocused(false)}
      onSelect={event => setCursor(event.currentTarget.selectionStart)}
      onScroll={event => { event.currentTarget.parentElement?.style.setProperty('--editor-scroll', `${-event.currentTarget.scrollTop}px`); event.currentTarget.parentElement?.style.setProperty('--editor-scroll-x', `${-event.currentTarget.scrollLeft}px`) }}
      onKeyDown={event => {
        if (event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
        event.preventDefault()
        const input = event.currentTarget, start = input.selectionStart
        onChange(value.slice(0, start) + '    ' + value.slice(input.selectionEnd))
        requestAnimationFrame(() => { if (input.isConnected) input.selectionStart = input.selectionEnd = start + 4 })
      }} />
    <div className="code-accessory" aria-label="Символы Python">{([['Отступ', '    ', 4], ['Скобки', '()', 1], ['Двоеточие', ':', 1], ['Кавычки', '""', 1]] as const).map(([label, text, position]) => <button key={label} type="button" aria-label={label} onPointerDown={event => event.preventDefault()} onClick={() => insert(text, position)}>{label === 'Отступ' ? 'Tab' : label === 'Скобки' ? '( )' : label === 'Кавычки' ? '" "' : ':'}</button>)}</div>
  </div>
}
