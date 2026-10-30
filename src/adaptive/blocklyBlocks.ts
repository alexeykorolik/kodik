/**
 * Blockly side of Kodik B2B blocks: two input blocks the B2C course never had, a toolbox
 * built only from the task palette, and variable naming with the same rules as the
 * translator and the interpreter. Reuses the B2C function blocks (src/blocks.ts) unchanged.
 */
import * as Blockly from 'blockly'
import '../blocks'
import { BLOCKS, nameProblem } from './blockProgram'

Blockly.common.defineBlocksWithJsonArray([
  { type: 'kodik_input_int', message0: 'ввести целое число', output: 'Number', colour: 160, tooltip: 'Прочитать строку ввода и превратить её в целое число: int(input())' },
  { type: 'kodik_input_text', message0: 'ввести текст', output: 'String', colour: 160, tooltip: 'Прочитать строку ввода: input()' }
])

// Shadows are editable literals that belong to their parent block. Only numbers and text
// are used as shadows, so an allowed block never brings a forbidden block with it.
const shadowNumber = (n: number) => ({ shadow: { type: 'math_number', fields: { NUM: n } } })
const presets: Record<string, object> = {
  math_arithmetic: { kind: 'block', type: 'math_arithmetic', inputs: { A: shadowNumber(1), B: shadowNumber(2) } },
  math_modulo: { kind: 'block', type: 'math_modulo', inputs: { DIVIDEND: shadowNumber(7), DIVISOR: shadowNumber(2) } },
  controls_repeat_ext: { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: shadowNumber(3) } },
  math_change: { kind: 'block', type: 'math_change', inputs: { DELTA: shadowNumber(1) } }
}

/** Category toolbox limited to the task's palette. Blocks only — never a ready-made solution. */
export function toolboxFor(allowed: Iterable<string>) {
  const set = new Set(allowed)
  const categories = [...new Set(BLOCKS.map(b => b.category))]
  return {
    kind: 'categoryToolbox',
    contents: categories.map(name => ({
      kind: 'category',
      name,
      contents: [
        ...(name === 'Переменные' && set.has('variables_set') ? [{ kind: 'button', text: 'Создать переменную', callbackKey: 'KODIK_CREATE_VARIABLE' }] : []),
        ...BLOCKS.filter(b => b.category === name && set.has(b.type)).map(b => presets[b.type] ?? { kind: 'block', type: b.type })
      ]
    })).filter(c => c.contents.some(item => (item as { kind: string }).kind === 'block'))
  }
}

/**
 * Toolbox button: create a variable, but only with a name the interpreter accepts.
 * `onProblem` receives the exact reason so the UI can explain it in plain words.
 */
export function registerToolboxButtons(workspace: Blockly.WorkspaceSvg, onProblem: (message: string) => void = message => void Blockly.dialog.alert(message)) {
  workspace.registerButtonCallback('KODIK_CREATE_VARIABLE', button => {
    const target = button.getTargetWorkspace()
    Blockly.dialog.prompt('Имя новой переменной:', '', name => {
      if (name === null) return
      const trimmed = name.trim()
      const problem = nameProblem(trimmed)
      if (problem) { onProblem(problem); return }
      if (target.getVariableMap().getVariable(trimmed)) { onProblem(`Переменная «${trimmed}» уже есть.`); return }
      target.getVariableMap().createVariable(trimmed)
    })
  })
}

/** Russian default name instead of Blockly's English "item" for a dragged-in variable block. */
export function useRussianDefaultVariable() {
  Blockly.Msg['VARIABLES_DEFAULT_NAME'] = 'число'
}
