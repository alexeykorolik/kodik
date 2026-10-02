import { cleanEventData, type EventData, type EventName } from './eventSchema'
import { appVersion, curriculumVersion } from './release'
export type LearningEvent = { id: string; sessionId: string; name: EventName; lesson: number; at: number; curriculumVersion?: string; appVersion?: string; data?: EventData }
const key = 'kodik-events-v1', pendingKey = 'kodik-events-pending-v1'
export const analyticsEnabled = typeof import.meta.env !== 'undefined' && import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
const enabled = analyticsEnabled
let sending = false, timer: ReturnType<typeof setTimeout> | undefined
function stableId(storage: Storage, key: string) { let id = storage.getItem(key); if (!id) { id = crypto.randomUUID(); storage.setItem(key, id) } return id }
function read(key: string): LearningEvent[] { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] } }
export async function flushEvents() {
  if (!enabled || sending || !navigator.onLine) return
  const events = read(pendingKey).slice(0, 40)
  if (!events.length) return
  sending = true
  try {
    const response = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ learnerId: stableId(localStorage, 'kodik-learner-id-v1'), events }), keepalive: true, signal: AbortSignal.timeout(7000) })
    if (response.ok) { const result = await response.json(); const ids = new Set(result.accepted); localStorage.setItem(pendingKey, JSON.stringify(read(pendingKey).filter(event => !ids.has(event.id)))) }
  } catch { /* Keep queued events offline. Learning does not depend on analytics. */ }
  finally { sending = false; if (read(pendingKey).length && !timer) timer = setTimeout(() => { timer = undefined; void flushEvents() }, 15000) }
}
export function track(name: EventName, lesson: number, data?: EventData) {
  try {
    const event: LearningEvent = { id: crypto.randomUUID(), sessionId: stableId(sessionStorage, 'kodik-session-id-v1'), name, lesson, at: Date.now(), curriculumVersion, appVersion, data: cleanEventData(data) }
    localStorage.setItem(key, JSON.stringify([...read(key), event].slice(-500)))
    if (enabled) {
      localStorage.setItem(pendingKey, JSON.stringify([...read(pendingKey), event].slice(-5000)))
      if (!timer) timer = setTimeout(() => { timer = undefined; void flushEvents() }, 3000)
    }
    window.dispatchEvent(new CustomEvent('kodik-learning-event', { detail: event }))
  } catch { /* Analytics must never block learning. */ }
}
if (typeof window !== 'undefined' && enabled) {
  window.addEventListener('online', () => void flushEvents())
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flushEvents() })
  void flushEvents()
}
export function exportEvents() { const blob = new Blob([localStorage.getItem(key) || '[]'], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'kodik-user-testing.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
