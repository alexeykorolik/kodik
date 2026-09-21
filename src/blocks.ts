import * as Blockly from 'blockly'
import 'blockly/blocks'

Blockly.common.defineBlocksWithJsonArray([
  { type: 'kodik_define', message0: 'функция %1 %2 %3', args0: [{ type: 'field_input', name: 'NAME', text: 'приветствие' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'BODY' }], previousStatement: null, nextStatement: null, colour: 280, tooltip: 'Запомнить действия под одним именем' },
  { type: 'kodik_call', message0: 'вызвать %1', args0: [{ type: 'field_input', name: 'NAME', text: 'приветствие' }], previousStatement: null, nextStatement: null, colour: 280, tooltip: 'Выполнить команды функции' }
])

