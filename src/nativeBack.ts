type BackAction = { priority: number; handle: () => boolean }
const actions: BackAction[] = []
export function registerBackAction(handle: () => boolean, priority = 0) {
  const action = { handle, priority }; actions.push(action)
  return () => { const index = actions.indexOf(action); if (index >= 0) actions.splice(index,1) }
}
export function handleAndroidBack() {
  return [...actions].reverse().sort((a,b)=>b.priority-a.priority).some(action=>action.handle())
}
