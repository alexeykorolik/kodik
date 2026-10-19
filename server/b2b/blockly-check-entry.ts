/**
 * Publication-time check that a teacher's workspace (block solution or starter) loads into
 * REAL Blockly and that Blockly's own re-serialization translates to the same program.
 * Runs in a separate process with the same Node permission restrictions as the executor.
 * stdin: {"workspaces":[...], "palette":[...]}  stdout: {"results":[{ok, message, python}]}
 */
import * as Blockly from 'blockly'
import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom'
import '../../src/adaptive/blocklyBlocks'
import { translateWorkspace, validateWorkspaceShape } from '../../src/adaptive/blockProgram'

// Blockly keeps shadow blocks as XML internally; a small XML DOM replaces jsdom here.
Blockly.utils.xml.injectDependencies({ document: new DOMImplementation().createDocument(null, "xml", null), DOMParser, XMLSerializer } as never)
// Events are not needed for a load/save check and would serialize to XML (no DOM here).
Blockly.Events.disable()

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { input += chunk; if (input.length > 400_000) process.exit(2) })
process.stdin.on('end', () => {
  try {
    const { workspaces, palette } = JSON.parse(input) as { workspaces: unknown[]; palette: string[] }
    if (!Array.isArray(workspaces) || workspaces.length > 3 || !Array.isArray(palette)) process.exit(2)
    const results = workspaces.map(ws => {
      if (ws === null) return { ok: true, empty: true }
      const shape = validateWorkspaceShape(ws)
      if (!shape.ok) return { ok: false, message: shape.errors[0].message }
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(ws as object, workspace)
        const again = Blockly.serialization.workspaces.save(workspace)
        const before = translateWorkspace(ws, { allowed: palette }), after = translateWorkspace(again, { allowed: palette })
        if (before.python !== after.python || before.ok !== after.ok) return { ok: false, message: 'Blockly загружает эти блоки иначе, чем они сохранены. Откройте их в редакторе и сохраните заново.' }
        return { ok: true, translatable: after.ok, python: after.python, errors: after.errors.slice(0, 5) }
      } catch (e) {
        if (process.env.KODIK_DEBUG_BLOCKLY) process.stderr.write(String((e as Error).stack).slice(0, 1500))
        return { ok: false, message: 'Blockly не может открыть эти блоки. Соберите их заново в редакторе.' }
      } finally { workspace.dispose() }
    })
    process.stdout.write(JSON.stringify({ results }))
  } catch (e) { process.stderr.write(String(e && (e as Error).stack || e).slice(0, 2000)); process.exit(2) }
})
