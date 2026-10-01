import type { Statement, Expr } from './pythonRuntime'
import type { PythonRun } from './pythonExecution'

const children = (node: Statement | Expr): (Statement | Expr)[] => {
  switch (node.kind) {
    case 'assign': return [node.value, ...(node.index ? [node.index] : [])]
    case 'expression': case 'return': case 'unary': return [node.value]
    case 'if': return [...node.branches.flatMap(branch => [branch.condition, ...branch.body]), ...node.otherwise]
    case 'for': return [node.iterable, ...node.body]
    case 'while': return [node.condition, ...node.body]
    case 'function': return node.body
    case 'list': return node.items
    case 'binary': return [node.left, node.right]
    case 'call': return node.args
    case 'index': return [node.target, node.index]
    default: return []
  }
}
export function walkPython(program: (Statement | Expr)[]): (Statement | Expr)[] { return program.flatMap(node => [node, ...walkPython(children(node))]) }
export function structureError(program: Statement[], run: PythonRun, rules: string[]): string | undefined {
  const relevant = [...run.observed]
  for (const rule of rules) {
    const [type, value] = rule.split(':'); let valid = false
    if (type === 'kind') valid = relevant.some(node => node.kind === value)
    if (type === 'op') valid = relevant.some(node => node.kind === 'binary' && node.operator === value)
    if (type === 'call') valid = relevant.some(node => node.kind === 'call' && node.name === value)
    if (type === 'assign') valid = relevant.filter(node => node.kind === 'assign').length >= Number(value)
    if (type === 'print' || type === 'input') valid = relevant.filter(node => node.kind === 'call' && node.name === type).length >= Number(value)
    if (type === 'params') valid = relevant.some(node => node.kind === 'function' && node.params.length === Number(value))
    if (type === 'branches') valid = relevant.some(node => node.kind === 'if' && node.branches.length >= Number(value))
    if (type === 'else') valid = relevant.some(node => node.kind === 'if' && node.otherwise.length > 0)
    if (type === 'mutate_index') valid = relevant.some(node => node.kind === 'assign' && node.index)
    if (type === 'reassign') valid = [...run.reassigned].some(node => run.observed.has(node))
    if (type === 'sum_product') valid = relevant.some(node => node.kind === 'binary' && node.operator === '*' && [node.left, node.right].some(part => part.kind === 'binary' && part.operator === '+'))
    if (type === 'nested_loop') {
      valid = relevant.some(node => (node.kind === 'for' || node.kind === 'while') && walkPython(node.body).some(child => (child.kind === 'for' || child.kind === 'while') && run.observed.has(child)))
      // A called drawing function containing a loop is also an actual nested repetition.
      if (!valid) valid = relevant.some(node => (node.kind === 'for' || node.kind === 'while') && walkPython(node.body).some(child => {
        if (child.kind !== 'call' || !run.observed.has(child)) return false
        const fn = program.find(item => item.kind === 'function' && item.name === child.name)
        return fn?.kind === 'function' && walkPython(fn.body).some(item => (item.kind === 'for' || item.kind === 'while') && run.observed.has(item))
      }))
    }
    if (!valid) {
      const messages: Record<string, string> = { op: `Используй ${value} в вычислении, которое влияет на результат.`, assign: 'Сохрани данные в переменных и используй их в результате.', reassign: 'Измени сохранённую переменную и используй новое значение.', else: 'Добавь ветку else для второго случая.', branches: 'Проверь несколько случаев через if и elif.', params: `В этой задаче функция принимает ${value} аргументов. Проверь строку def и вызов.`, mutate_index: 'Измени элемент списка по индексу.', nested_loop: 'Одно повторение должно выполняться внутри другого.', sum_product: 'Сначала получи сумму, затем умножь её. Проверь скобки.', print: 'Используй отдельные команды print в нужном порядке.', input: 'Получи каждое значение отдельной командой input.' }
      return messages[type] || `Используй ${value || type} так, чтобы эта команда участвовала в результате программы.`
    }
  }
  // Program is intentionally supplied separately: checks do not inspect source text.
  void program
}

// Only bounded, public vocabulary is exported to AI. No literals, variable
// names, function names, inputs or source lines can appear in this summary.
export function summarizePython(program: Statement[]): string {
  let budget = 48
  const describe = (node: Statement | Expr): string => {
    if (--budget < 0) return 'more'
    if (node.kind === 'literal') return Array.isArray(node.value) ? 'list' : typeof node.value === 'string' ? 'string' : typeof node.value === 'boolean' ? 'boolean' : 'number'
    if (node.kind === 'name') return 'variable'
    if (node.kind === 'function') return `function(params_${node.params.length},${node.body.map(describe).join(',')})`
    if (node.kind === 'call') return `${['print','input','int','str','len','range','forward','right','left'].includes(node.name) ? node.name : 'call'}(${node.args.map(describe).join(',')})`
    if (node.kind === 'binary') return `binary(${describe(node.left)},${describe(node.right)})`
    return `${node.kind}(${children(node).map(describe).join(',')})`
  }
  return program.slice(0, 16).map(describe).join(',').slice(0, 512) || 'empty'
}
