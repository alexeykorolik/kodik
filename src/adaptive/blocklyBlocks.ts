/**
 * Blockly side of the B2B proof of concept: two input blocks the B2C course
 * never had, plus a toolbox built only from blocks the translator accepts.
 * Reuses the B2C function blocks (src/blocks.ts) without changing them.
 */
import * as Blockly from 'blockly'
import '../blocks'
import { BLOCKS } from './blockProgram'

Blockly.common.defineBlocksWithJsonArray([
  { type: 'kodik_input_int', message0: 'ввести целое число', output: 'Number', colour: 160, tooltip: 'Прочитать строку ввода и превратить её в целое число: int(input())' },
  { type: 'kodik_input_text', message0: 'ввести текст', output: 'String', colour: 160, tooltip: 'Прочитать строку ввода: input()' }
])

const shadowNumber = (n: number) => ({ shadow: { type: 'math_number', fields: { NUM: n } } })
const presets: Record<string, object> = {
  text_print: { kind: 'block', type: 'text_print' },
  math_arithmetic: { kind: 'block', type: 'math_arithmetic', inputs: { A: shadowNumber(1), B: shadowNumber(2) } },
  math_modulo: { kind: 'block', type: 'math_modulo', inputs: { DIVIDEND: shadowNumber(7), DIVISOR: shadowNumber(2) } },
  controls_repeat_ext: { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: shadowNumber(3) } },
  math_change: { kind: 'block', type: 'math_change', inputs: { DELTA: shadowNumber(1) } },
  controls_whileUntil: { kind: 'block', type: 'controls_whileUntil' }
}

/** Category toolbox limited to the task's palette. Blocks only — never a ready-made solution. */
export function toolboxFor(allowed: string[]) {
  const set = new Set(allowed)
  const categories = [...new Set(BLOCKS.map(b => b.category))]
  return {
    kind: 'categoryToolbox',
    contents: categories.map(name => ({
      kind: 'category',
      name,
      contents: [...(name === 'Переменные' && set.has('variables_set') ? [{ kind: 'button', text: 'Создать переменную', callbackKey: 'KODIK_CREATE_VARIABLE' }] : []), ...BLOCKS.filter(b => b.category === name && set.has(b.type)).map(b => presets[b.type] ?? { kind: 'block', type: b.type })]
    })).filter(c => c.contents.some(item => (item as { kind: string }).kind === 'block'))
  }
}

/** Toolbox button: create a variable through Blockly's own dialog. */
export function registerToolboxButtons(workspace: Blockly.WorkspaceSvg) {
  workspace.registerButtonCallback('KODIK_CREATE_VARIABLE', button => Blockly.Variables.createVariableButtonHandler(button.getTargetWorkspace()))
}
