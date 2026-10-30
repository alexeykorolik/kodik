// Builds the Blockly workspace (Blockly 12 JSON, the school block editor's format) for a reference
// program written in the block subset of Python: print, input, variables, + - * / ** %, text joins,
// len, comparisons, and/or/not, if/elif/else, repeat N times (a for over range whose counter is not
// used), while, and functions without parameters. Anything else is an error: the task then cannot
// offer blocks. The export translates the workspace back (src/adaptive/blockProgram.ts) and checks
// that it passes the same tests as the reference.
import { parseCourseProgram, type Expr, type Statement } from "../../src/pythonRuntime";

type Block = Record<string, unknown>;
export type BlockWorkspace = { variables: { name: string; id: string }[]; blocks: { languageVersion: 0; blocks: Block[] } };

const ARITH: Record<string, string> = { "+": "ADD", "-": "MINUS", "*": "MULTIPLY", "/": "DIVIDE", "**": "POWER" };
const COMPARE: Record<string, string> = { "==": "EQ", "!=": "NEQ", "<": "LT", "<=": "LTE", ">": "GT", ">=": "GTE" };

export function toBlocks(code: string): { workspace: BlockWorkspace; palette: string[] } {
  const program = parseCourseProgram(code);
  const variables = new Map<string, string>(), used = new Set<string>(), functions = new Set<string>();
  let next = 0;
  const block = (type: string, rest: Block = {}): Block => { used.add(type); return { type, id: `b${++next}`, ...rest }; };
  const variable = (name: string) => { if (!variables.has(name)) variables.set(name, `v-${name}`); return { id: variables.get(name)! }; };
  const fail = (what: string): never => { throw new Error(`no block for ${what}`); };
  const isText = (e: Expr): boolean => (e.kind === "literal" && typeof e.value === "string") || (e.kind === "call" && e.name === "str" && !e.callee);
  // a + b + c is one chain; it becomes a text join when any part is text or str(...).
  const chain = (e: Expr): Expr[] => (e.kind === "binary" && e.operator === "+" ? [...chain(e.left), ...chain(e.right)] : [e]);
  const join = (parts: Expr[]): Block => {
    if (parts.length > 10) fail("a join of more than 10 parts");
    return block("text_join", { extraState: { itemCount: parts.length }, inputs: Object.fromEntries(parts.map((p, i) => [`ADD${i}`, { block: value(p.kind === "call" && p.name === "str" && !p.callee ? p.args[0] : p) }])) });
  };
  const value = (e: Expr): Block => {
    switch (e.kind) {
      case "literal":
        if (typeof e.value === "string") return block("text", { fields: { TEXT: e.value } });
        if (typeof e.value === "boolean") return block("logic_boolean", { fields: { BOOL: e.value ? "TRUE" : "FALSE" } });
        if (typeof e.value === "number" && !e.float) return block("math_number", { fields: { NUM: e.value } });
        return fail(`the literal ${JSON.stringify(e.value)}`);
      case "name":
        if (!variables.has(e.name)) fail(`the variable ${e.name} used before it is set`);
        return block("variables_get", { fields: { VAR: variable(e.name) } });
      case "unary":
        if (e.operator === "not") return block("logic_negate", { inputs: { BOOL: { block: value(e.value) } } });
        if (e.operator === "-" && e.value.kind === "literal" && typeof e.value.value === "number") return block("math_number", { fields: { NUM: -e.value.value } });
        return fail(`unary ${e.operator}`);
      case "binary": {
        if (e.operator === "+" && chain(e).some(isText)) return join(chain(e));
        if (ARITH[e.operator]) return block("math_arithmetic", { fields: { OP: ARITH[e.operator] }, inputs: { A: { block: value(e.left) }, B: { block: value(e.right) } } });
        if (e.operator === "%") return block("math_modulo", { inputs: { DIVIDEND: { block: value(e.left) }, DIVISOR: { block: value(e.right) } } });
        if (COMPARE[e.operator]) return block("logic_compare", { fields: { OP: COMPARE[e.operator] }, inputs: { A: { block: value(e.left) }, B: { block: value(e.right) } } });
        if (e.operator === "and" || e.operator === "or") return block("logic_operation", { fields: { OP: e.operator.toUpperCase() }, inputs: { A: { block: value(e.left) }, B: { block: value(e.right) } } });
        return fail(`the operator ${e.operator}`);
      }
      case "compare":
        if (e.operators.length !== 1 || !COMPARE[e.operators[0]]) return fail("a chained comparison");
        return block("logic_compare", { fields: { OP: COMPARE[e.operators[0]] }, inputs: { A: { block: value(e.operands[0]) }, B: { block: value(e.operands[1]) } } });
      case "call":
        if (e.callee) return fail(`the method ${e.name}`);
        if (e.name === "input" && !e.args.length) return block("kodik_input_text");
        if (e.name === "int" && e.args.length === 1 && e.args[0].kind === "call" && e.args[0].name === "input" && !e.args[0].args.length) return block("kodik_input_int");
        if (e.name === "len" && e.args.length === 1) return block("text_length", { inputs: { VALUE: { block: value(e.args[0]) } } });
        if (e.name === "str" && e.args.length === 1) return join([e]);
        return fail(`the call ${e.name}()`);
    }
    return fail(`the expression ${e.kind}`);
  };
  const sequence = (body: Statement[]): Block | undefined => {
    const list = body.map(statement);
    for (let i = list.length - 2; i >= 0; i--) list[i].next = { block: list[i + 1] };
    return list[0];
  };
  const statement = (s: Statement): Block => {
    switch (s.kind) {
      case "expression": {
        const e = s.value;
        if (e.kind === "call" && !e.callee && e.name === "print") {
          if (e.args.length !== 1 || e.keywords?.length) fail("print with several values or sep/end");
          return block("text_print", { inputs: { TEXT: { block: value(e.args[0]) } } });
        }
        if (e.kind === "call" && !e.callee && functions.has(e.name) && !e.args.length) return block("kodik_call", { fields: { NAME: e.name } });
        return fail("this expression statement");
      }
      case "assign": {
        if (s.index) fail("an assignment to an element");
        const v = s.value;
        // x = x + d (also x += d) is the "change by" block, unless it joins text.
        if (variables.has(s.name) && v.kind === "binary" && v.operator === "+" && v.left.kind === "name" && v.left.name === s.name && !chain(v).some(isText))
          return block("math_change", { fields: { VAR: variable(s.name) }, inputs: { DELTA: { block: value(v.right) } } });
        const computed = value(v);
        return block("variables_set", { fields: { VAR: variable(s.name) }, inputs: { VALUE: { block: computed } } });
      }
      case "if": {
        const inputs: Record<string, { block: Block }> = {};
        s.branches.forEach((b, i) => { inputs[`IF${i}`] = { block: value(b.condition) }; const body = sequence(b.body); if (body) inputs[`DO${i}`] = { block: body }; });
        const otherwise = sequence(s.otherwise);
        if (otherwise) inputs.ELSE = { block: otherwise };
        return block("controls_if", { ...(s.branches.length > 1 || s.otherwise.length ? { extraState: { ...(s.branches.length > 1 ? { elseIfCount: s.branches.length - 1 } : {}), ...(s.otherwise.length ? { hasElse: true } : {}) } } : {}), inputs });
      }
      case "for": {
        const it = s.iterable;
        if (!(it.kind === "call" && it.name === "range" && it.args.length === 1)) fail("a for loop over anything but range(n)");
        if (JSON.stringify(s.body).includes(`"name":"${s.name}"`)) fail(`a for loop that uses its counter ${s.name}`);
        const body = sequence(s.body);
        return block("controls_repeat_ext", { inputs: { TIMES: { block: value((it as { args: Expr[] }).args[0]) }, ...(body ? { DO: { block: body } } : {}) } });
      }
      case "while": {
        const body = sequence(s.body);
        return block("controls_whileUntil", { fields: { MODE: "WHILE" }, inputs: { BOOL: { block: value(s.condition) }, ...(body ? { DO: { block: body } } : {}) } });
      }
      case "pass": return fail("pass");
    }
    return fail(`the statement ${s.kind}`);
  };
  const roots: Block[] = [];
  const main: Statement[] = [];
  for (const s of program) {
    if (s.kind === "function") {
      if (s.params.length || s.decorators?.length) fail("a function with parameters");
      if (JSON.stringify(s.body).includes('"kind":"return"')) fail("return");
      functions.add(s.name);
      const body = sequence(s.body);
      roots.push(block("kodik_define", { fields: { NAME: s.name }, ...(body ? { inputs: { BODY: { block: body } } } : {}) }));
    } else main.push(s);
  }
  const program_ = sequence(main);
  if (program_) roots.push(program_);
  // The translator orders top blocks by position: functions first, then the program.
  roots.forEach((r, i) => { r.x = 24; r.y = 24 + i * 160; });
  return {
    workspace: { variables: [...variables].map(([name, id]) => ({ name, id })), blocks: { languageVersion: 0, blocks: roots } },
    palette: [...used].sort(),
  };
}
