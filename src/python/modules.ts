// The libraries a Kodik program may import. Each run gets its own fresh modules (random state,
// turtle screen, Robot field, open figures), so a new run never sees what the previous one left.
import { mathModule, randomModule, timeModule } from './libBasic'
import { numpyModule } from './libNumpy'
import { pyplotModule } from './libPlot'
import { pyrobModules } from './libRobot'
import { turtleModule } from './libTurtle'
import { PyModule, type Ctx } from './values'

export const SUPPORTED_MODULES = ['math', 'random', 'time', 'turtle', 'numpy', 'matplotlib.pyplot', 'pyrob.api']

export function moduleLoader(ctx: Ctx) {
  const loaded = new Map<string, PyModule>()
  const create = (name: string): PyModule | undefined => {
    switch (name) {
      case 'math': return mathModule()
      case 'random': return randomModule()
      case 'time': return timeModule(ctx)
      case 'turtle': return turtleModule(ctx)
      case 'numpy': return numpyModule()
      case 'matplotlib': case 'pyrob': return new PyModule(name, new Map(), [])
      case 'matplotlib.pyplot': return pyplotModule(ctx).pyplot
      case 'pyrob.api': return pyrobModules(ctx).api
    }
    return undefined
  }
  /** import a.b.c: loads a, a.b and a.b.c, links each child as an attribute of its parent. */
  return function load(path: string): { root: PyModule; leaf: PyModule } {
    const parts = path.split('.')
    let parent: PyModule | undefined, root: PyModule | undefined
    for (let i = 0; i < parts.length; i++) {
      const name = parts.slice(0, i + 1).join('.')
      let mod = loaded.get(name)
      if (!mod) {
        mod = create(name)
        if (!mod) {
          const known = SUPPORTED_MODULES.join(', ')
          return ctx.fail(i === 0 ? `Модуль «${name}» в Kodik недоступен. Можно подключить: ${known}.` : `В пакете «${parts.slice(0, i).join('.')}» нет модуля «${parts[i]}». Можно подключить: ${known}.`)
        }
        loaded.set(name, mod)
      }
      if (parent) parent.attrs.set(parts[i], { value: mod })
      if (!root) root = mod
      parent = mod
    }
    return { root: root!, leaf: parent! }
  }
}
