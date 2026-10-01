// Invalid code cannot use an AST fingerprint. Tokenize without requiring a
// complete expression, preserving strings, token boundaries and indentation.
export function normalizeInvalidPython(source: string): string {
  const lines: { indent: string; tokens: string[] }[] = []
  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    const indent = /^[ \t]*/.exec(line)![0]
    const tokens: string[] = []
    let i = indent.length
    while (i < line.length) {
      if (/\s/.test(line[i])) { i++; continue }
      if (line[i] === '#') break
      const start = i, quote = line[i] === '"' || line[i] === "'" ? line[i++] : ''
      if (quote) {
        while (i < line.length) { if (line[i] === '\\') i += Math.min(2, line.length - i); else if (line[i++] === quote) break }
      } else {
        const word = /^(?:[\p{L}_][\p{L}\p{N}_]*|\d+(?:\.\d+)?|>=|<=|==|!=|\*\*|\/\/)/u.exec(line.slice(i))
        i += word?.[0].length || 1
      }
      tokens.push(line.slice(start, i))
    }
    if (tokens.length) lines.push({ indent, tokens })
  }
  return JSON.stringify(lines)
}
