import { parseCourseProgram, type Expr, type Statement, type Value, type CourseRun, type Segment } from './pythonRuntime'

export type PythonNode = Expr | Statement
type Tracked = { value: Value; trail: Set<PythonNode>; float?: boolean }
type Scope = Map<string, Tracked>
const fail = (message: string): never => { throw new Error(message) }
const number = (v: Value): number => typeof v === 'boolean' ? Number(v) : typeof v === 'number' && Number.isFinite(v) ? v : fail('Здесь нужно число. Проверь кавычки и преобразование ввода через int.')
const truth = (v: Value): boolean => Array.isArray(v) ? v.length > 0 : Boolean(v)
const equal = (a: Value,b: Value): boolean => {
  if(a===b)return true
  if((typeof a==='number'||typeof a==='boolean')&&(typeof b==='number'||typeof b==='boolean'))return Number(a)===Number(b)
  return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equal(v,b[i]))
}
const list = (v: Value): Value[] => Array.isArray(v) ? v : fail('Здесь нужен список.')
class ReturnSignal { constructor(public result: Tracked) {} }

export type PythonRun = CourseRun & { observed: Set<PythonNode>; reassigned: Set<Statement> }
// Trails track dependencies reaching an observable result, including control
// flow and return values. Dead calculations and overwritten values give no evidence.
export function runPythonAst(program: Statement[], inputs: string[] = []): PythonRun {
  const output: string[] = [], segments: Segment[] = [], observed = new Set<PythonNode>(), reassigned = new Set<Statement>()
  let operations = 0, inputCursor = 0, x = 0, y = 0, heading = 0
  let pendingOutput = ''
  const write = (text: string) => {
    pendingOutput += text
    if(pendingOutput.length+output.reduce((n,line)=>n+line.length,0)>100000)fail('Слишком много вывода.')
    let newline: number
    while((newline=pendingOutput.indexOf('\n'))>=0){if(output.length>=500)fail('Слишком много строк вывода.');output.push(pendingOutput.slice(0,newline));pendingOutput=pendingOutput.slice(newline+1)}
  }
  const flushOutput = () => {if(pendingOutput){output.push(pendingOutput);pendingOutput=''}}
  const drawingTrail = new Set<PythonNode>()
  const globals: Scope = new Map(), functions = new Map<string, Extract<Statement, { kind: 'function' }>>()
  const floats = new WeakMap<Value[], Set<number>>()
  const localNames = new WeakMap<Scope, Set<string>>()
  const display = (v: Value, floating = false, seen = new Set<Value[]>(), repr = false): string => {
    tick()
    if (Array.isArray(v)) {
      if (seen.has(v)) return '[...]'
      const nested = new Set([...seen, v])
      return `[${v.map((item, i) => display(item, floats.get(v)?.has(i), nested, true)).join(', ')}]`
    }
    if (typeof v === 'string' && repr) {
      const quote = v.includes("'") && !v.includes('"') ? '"' : "'"
      return quote + Array.from(v).map(char=>{
        if(char==='\\'||char===quote)return '\\'+char
        if(char==='\n')return '\\n';if(char==='\r')return '\\r';if(char==='\t')return '\\t'
        if(char!==' '&&/[\p{C}\p{Z}]/u.test(char)){const point=char.codePointAt(0)!;return point<=255?'\\x'+point.toString(16).padStart(2,'0'):point<=65535?'\\u'+point.toString(16).padStart(4,'0'):'\\U'+point.toString(16).padStart(8,'0')}
        return char
      }).join('') + quote
    }
    if (typeof v === 'number' && floating) {
      if (Object.is(v, -0)) return '-0.0'
      if (v !== 0 && (Math.abs(v) < 1e-4 || Math.abs(v) >= 1e16)) return v.toExponential().replace(/e([+-])(\d)$/, 'e$10$2')
      return Number.isInteger(v) ? `${v}.0` : String(v)
    }
    return typeof v === 'boolean' ? v ? 'True' : 'False' : v === null ? 'None' : String(v)
  }
  const compare = (a: Value, b: Value, operator: string): boolean => {
    if (operator === '==') return equal(a,b)
    if (operator === '!=') return !equal(a,b)
    let order: number
    if ((typeof a==='number'||typeof a==='boolean') && (typeof b==='number'||typeof b==='boolean')) order=Number(a)-Number(b)
    else if(typeof a==='string'&&typeof b==='string') {
      const lhs=Array.from(a),rhs=Array.from(b),index=lhs.findIndex((char,i)=>char!==rhs[i])
      order=index<0?lhs.length-rhs.length:index>=rhs.length?1:lhs[index].codePointAt(0)!-rhs[index].codePointAt(0)!
    } else return fail('Сравнивай два числа или две строки.')
    return operator==='<'?order<0:operator==='<='?order<=0:operator==='>'?order>0:order>=0
  }
  const tick = () => { if (++operations > 10000) fail('Программа выполняется слишком долго. Проверь условие окончания цикла.') }
  const track = (value: Value, node: PythonNode, values: Tracked[] = [], control: Set<PythonNode> = new Set()): Tracked => ({ value, trail: new Set([node, ...control, ...values.flatMap(item => [...item.trail])]) })
  const observe = (result: Tracked) => { for (const node of result.trail) observed.add(node) }
  const evaluate = (node: Expr, scope: Scope, depth: number, control: Set<PythonNode>): Tracked => {
    tick()
    const done = (value: Value, children: Tracked[] = [], floating = false): Tracked => ({...track(value, node, children, control), float:typeof value==='number'&&floating})
    if (node.kind === 'literal') return done(node.value, [], node.float)
    if (node.kind === 'name') { const value = scope.get(node.name) || (!localNames.get(scope)?.has(node.name) ? globals.get(node.name) : undefined); if (!value) return fail(`Сначала задай значение переменной «${node.name}».`); return done(value.value, [value], value.float) }
    if (node.kind === 'list') { if (node.items.length > 1000) fail('Список слишком длинный.'); const items = node.items.map(item => evaluate(item, scope, depth, control)), values=items.map(item=>item.value); floats.set(values,new Set(items.flatMap((item,i)=>item.float?[i]:[]))); return done(values, items) }
    if (node.kind === 'unary') { const child = evaluate(node.value, scope, depth, control); return done(node.operator === 'not' ? !truth(child.value) : node.operator==='+'?number(child.value):-number(child.value), [child], child.float) }
    if (node.kind === 'compare') {
      const children=[evaluate(node.operands[0],scope,depth,control)]
      for(let i=0;i<node.operators.length;i++) {
        const right=evaluate(node.operands[i+1],scope,depth,control); children.push(right)
        if(!compare(children[i].value,right.value,node.operators[i]))return done(false,children)
      }
      return done(true,children)
    }
    if (node.kind === 'index') {
      const target = evaluate(node.target, scope, depth, control), position = evaluate(node.index, scope, depth, control), values = typeof target.value === 'string' ? Array.from(target.value) : list(target.value), index = number(position.value)
      if (position.float || !Number.isInteger(index) || index < -values.length || index >= values.length) fail('Такого элемента в списке нет. Проверь индекс: первый элемент имеет индекс 0.')
      const offset=index<0?values.length+index:index
      return done(values[offset], [target, position], floats.get(values)?.has(offset))
    }
    if (node.kind === 'binary') {
      const left = evaluate(node.left, scope, depth, control)
      if (node.operator === 'and' && !truth(left.value) || node.operator === 'or' && truth(left.value)) return done(left.value, [left], left.float)
      const right = evaluate(node.right, scope, depth, control), a = left.value, b = right.value, children = [left, right]
      if (node.operator === 'and' || node.operator === 'or') return done(b, children, right.float)
      if (node.operator === '==') return done(equal(a,b), children)
      if (node.operator === '!=') return done(!equal(a,b), children)
      if (['<', '<=', '>', '>='].includes(node.operator)) {
        return done(compare(a,b,node.operator),children)
      }
      if (node.operator === '+' && typeof a === 'string' && typeof b === 'string') {if(a.length+b.length>12000)fail('Строка слишком длинная.');return done(a + b, children)}
      if(node.operator==='+'&&Array.isArray(a)&&Array.isArray(b)) {
        if(a.length+b.length>1000)fail('Список слишком длинный.')
        const result=[...a,...b];floats.set(result,new Set([...floats.get(a)||[],...[...floats.get(b)||[]].map(i=>i+a.length)]));return done(result,children)
      }
      if(node.operator==='*'&&(typeof a==='string'||Array.isArray(a)||typeof b==='string'||Array.isArray(b))) {
        const sequence=typeof a==='string'||Array.isArray(a)?left:right, count=sequence===left?right:left,n=number(count.value)
        if(count.float||!Number.isInteger(n))fail('Для повторения строки или списка нужно целое число.')
        const value=sequence.value as string|Value[], times=Math.max(0,n)
        if(times*value.length>(typeof value==='string'?12000:1000))fail('Результат повторения слишком длинный.')
        if(typeof value==='string')return done(value.repeat(times),children)
        if(!value.length)return done([],children)
        const result:Value[]=[],metadata=new Set<number>()
        for(let i=0;i<times;i++)for(let j=0;j<value.length;j++){if(floats.get(value)?.has(j))metadata.add(result.length);result.push(value[j])}
        floats.set(result,metadata);return done(result,children)
      }
      const lhs = number(a), rhs = number(b)
      if (['/', '//', '%'].includes(node.operator) && rhs === 0) fail('Делить на ноль нельзя. Проверь делитель.')
      let remainder=0,quotient=0
      if(node.operator==='//'||node.operator==='%'){
        remainder=lhs%rhs;quotient=(lhs-remainder)/rhs
        if(remainder!==0){if((remainder<0)!==(rhs<0)){remainder+=rhs;quotient--}}
        else remainder=rhs<0?-0:0
        if(quotient!==0){const floor=Math.floor(quotient);quotient=floor+(quotient-floor>0.5?1:0)}
        else quotient=lhs/rhs<0||Object.is(lhs/rhs,-0)?-0:0
      }
      const result = node.operator === '+' ? lhs + rhs : node.operator === '-' ? lhs - rhs : node.operator === '*' ? lhs * rhs : node.operator === '/' ? lhs / rhs : node.operator==='//'?quotient:node.operator === '%' ? remainder : lhs ** rhs
      if (!Number.isFinite(result) || Math.abs(result) > 1e12) fail('Результат слишком большой. Проверь вычисление.')
      return done(result, children, node.operator==='/'||left.float||right.float||node.operator==='**'&&rhs<0)
    }
    const args = node.args.map(arg => evaluate(arg, scope, depth, control)), values = args.map(arg => arg.value)
    if (node.name === 'print') { write(args.map(arg=>display(arg.value,arg.float)).join(' ')+'\n'); observe(done(null, args)); return done(null, args) }
    if (node.name === 'input') { if (args.length > 1) fail('В input достаточно одной подсказки.'); if(args.length){write(display(values[0],args[0].float));observe(done(null,args))} if (inputCursor >= inputs.length) fail('Проверь количество команд input: для этого задания ввод уже закончился.'); return done(inputs[inputCursor++], args) }
    if (['int', 'str', 'len'].includes(node.name)) {
      if (args.length===0&&node.name!=='len')return done(node.name==='int'?0:'',args)
      if (args.length !== 1) fail(`${node.name} принимает одно значение.`)
      if (node.name === 'str') return done(display(values[0],args[0].float), args)
      if (node.name === 'len') return done(typeof values[0]==='string'?Array.from(values[0]).length:list(values[0]).length, args)
      const source=values[0]
      if(typeof source==='string'&&!/^[+-]?\d(?:_?\d)*$/.test(source.trim()))fail('Не удалось превратить ввод в целое число. Проверь int(input()).')
      if(typeof source!=='number'&&typeof source!=='boolean'&&typeof source!=='string')fail('В int передай число или строку с целым числом.')
      const value = Math.trunc(typeof source==='string'?Number(source.trim().replace(/_/g,'')):Number(source)); if (!Number.isFinite(value)||!Number.isSafeInteger(value)) fail('Число выходит за пределы учебного диапазона.'); return done(value, args)
    }
    if (node.name === 'range') {
      if (args.length < 1 || args.length > 3) fail('У range нужны границы диапазона и, если нужно, шаг.')
      const numbers = values.map(number), start = numbers.length === 1 ? 0 : numbers[0], end = numbers.length === 1 ? numbers[0] : numbers[1], step = numbers[2] ?? 1
      if (args.some(arg=>arg.float) || ![start, end, step].every(Number.isInteger) || step === 0) fail('В range используй целые числа и ненулевой шаг.')
      const result: Value[] = []
      for (let current = start; step > 0 ? current < end : current > end; current += step) { if (result.length >= 1000) fail('Диапазон слишком длинный. Проверь границы range.'); result.push(current) }
      return done(result, args)
    }
    if (['forward', 'right', 'left'].includes(node.name)) {
      if (args.length !== 1) fail('Для движения или поворота укажи одно число.')
      const amount = number(values[0]); if (Math.abs(amount) > 10000) fail('Шаг или поворот слишком велик. Проверь число.')
      if (node.name === 'forward') { if (segments.length >= 500) fail('Слишком много линий. Проверь число повторений.'); const nextX = x + Math.cos(heading * Math.PI / 180) * amount, nextY = y + Math.sin(heading * Math.PI / 180) * amount; segments.push({ x1: x, y1: y, x2: nextX, y2: nextY }); x = nextX; y = nextY }
      else heading += node.name === 'left' ? amount : -amount
      const result = done(null, args); for (const part of result.trail) drawingTrail.add(part); if (node.name === "forward") observe({ value: null, trail: drawingTrail }); return result
    }
    const fn = functions.get(node.name)
    if(localNames.get(scope)?.has(node.name)||scope.has(node.name)||globals.has(node.name))fail(`Значение «${node.name}» нельзя вызвать как функцию.`)
    if (!fn) return fail(`Сначала опиши функцию «${node.name}» через def, затем вызови её.`)
    if (fn.params.length !== args.length) fail(`Эта функция принимает ${fn.params.length} аргументов. Проверь вызов и строку def.`)
    if (depth >= 40) fail('Функция вызывает себя слишком много раз. Проверь условие остановки.')
    const local: Scope = new Map(fn.params.map((name, index) => [name, args[index]])), inside = new Set([...control, node, fn])
    const names=new Set(fn.params)
    const collect=(body:Statement[])=>{for(const item of body){if(item.kind==='assign'&&!item.index||item.kind==='for')names.add(item.name);if(item.kind==='for'||item.kind==='while')collect(item.body);if(item.kind==='if'){item.branches.forEach(branch=>collect(branch.body));collect(item.otherwise)}}}
    collect(fn.body);localNames.set(local,names)
    try { execute(fn.body, local, depth + 1, inside) } catch (signal) { if (signal instanceof ReturnSignal) return done(signal.result.value, [signal.result, ...args],signal.result.float); throw signal }
    return track(null, fn, args, inside)
  }
  const execute = (items: Statement[], scope: Scope, depth: number, control: Set<PythonNode>): void => {
    for (const item of items) {
      tick()
      if (item.kind === 'pass') continue
      if (item.kind === 'function') { scope.delete(item.name); functions.set(item.name, item); continue }
      if (item.kind === 'return') { if (!depth) fail('Помести return внутрь функции с отступом.'); const result = evaluate(item.value, scope, depth, control); throw new ReturnSignal({...track(result.value, item, [result], control),float:result.float}) }
      if (item.kind === 'expression') { evaluate(item.value, scope, depth, new Set([...control, item])); continue }
      if (item.kind === 'assign') {
        const result = evaluate(item.value, scope, depth, control), assigned = {...track(result.value, item, [result], control),float:result.float}
        if (item.index) {
          const owner = scope.get(item.name) || (!localNames.get(scope)?.has(item.name)?globals.get(item.name):undefined); if (!owner) fail('Сначала создай список, затем меняй его элемент.')
          const values = list(owner!.value), position = evaluate(item.index, scope, depth, control), index = number(position.value)
          if (position.float || !Number.isInteger(index) || index < -values.length || index >= values.length) fail('Такого индекса в списке нет.')
          const offset=index<0?values.length+index:index, metadata=floats.get(values)||new Set<number>()
          values[offset] = result.value
          if(result.float)metadata.add(offset);else metadata.delete(offset)
          floats.set(values,metadata)
          for (const node of [...assigned.trail, ...position.trail]) owner!.trail.add(node)
        } else { if (scope.has(item.name)) reassigned.add(item); scope.set(item.name, assigned) }
        continue
      }
      if (item.kind === 'if') {
        const tests: Tracked[] = []; let body = item.otherwise
        for (const branch of item.branches) { const condition = evaluate(branch.condition, scope, depth, control); tests.push(condition); if (truth(condition.value)) { body = branch.body; break } }
        execute(body, scope, depth, track(null, item, tests, control).trail); continue
      }
      if (item.kind === 'for') {
        const source = evaluate(item.iterable, scope, depth, control), inside = track(null, item, [source], control).trail
        const values=typeof source.value==='string'?Array.from(source.value):list(source.value)
        for (const [index,value] of values.entries()) { tick(); scope.set(item.name, {...track(value, item, [source], control),float:floats.get(values)?.has(index)}); execute(item.body, scope, depth, inside) } continue
      }
      while (true) { const condition = evaluate(item.condition, scope, depth, control); if (!truth(condition.value)) break; tick(); execute(item.body, scope, depth, track(null, item, [condition], control).trail) }
    }
  }
  try { execute(program, globals, 0, new Set()); flushOutput(); return { output, segments, operations, observed, reassigned } }
  catch (error) { flushOutput(); return { output, segments, operations, observed, reassigned, error: error instanceof Error ? error.message : 'Проверь команды программы.' } }
}
export function runCourseProgram(source: string, inputs: string[] = []): PythonRun {
  try { return runPythonAst(parseCourseProgram(source), inputs) }
  catch (error) { return { output: [], segments: [], operations: 0, observed: new Set(), reassigned: new Set(), error: error instanceof Error ? error.message : 'Проверь запись Python.' } }
}
