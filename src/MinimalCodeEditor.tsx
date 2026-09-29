export function MinimalCodeEditor({ value, onChange, rows = 3 }: { value: string; onChange: (value: string) => void; rows?: number }) {
  const numbers = Array.from({ length: Math.max(rows, value.split('\n').length) }, (_, index) => index + 1).join('\n')
  return <div className="minimal-code-editor">
    <pre className="editor-line-numbers" aria-hidden="true">{numbers}</pre>
    <textarea id="python-answer" spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" value={value} rows={rows} placeholder="Напиши команду здесь"
      onChange={event => onChange(event.target.value)}
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
