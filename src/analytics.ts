export type LearningEvent = { name: 'lesson_open'|'first_action'|'block_added'|'check'|'hint'|'tutorial_step'|'python_view'|'replay'; lesson: number; at: number; data?: Record<string, string|number|boolean> }
const key = 'kodik-events-v1'
export function track(name: LearningEvent['name'], lesson: number, data?: LearningEvent['data']) {
  const event = { name, lesson, at: Date.now(), data }
  try { const prior = JSON.parse(localStorage.getItem(key) || '[]'); localStorage.setItem(key, JSON.stringify([...(Array.isArray(prior) ? prior : []), event].slice(-500))) } catch { /* Analytics must never block learning. */ }
  window.dispatchEvent(new CustomEvent('kodik-learning-event', { detail: event }))
}
export function exportEvents() { const blob = new Blob([localStorage.getItem(key) || '[]'], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'kodik-user-testing.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
