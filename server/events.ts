import { eventNames, cleanEventData } from '../src/eventSchema'
import { bucket, claim, database, digest, identity, sameOrigin, type Request, type Response } from './storage'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }) }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'forbidden' })
  let body
  try { const serialized = typeof req.body === 'string' ? req.body : JSON.stringify(req.body); if (!serialized || serialized.length > 30000) throw Error(); body = JSON.parse(serialized) } catch { return res.status(400).json({ error: 'invalid_request' }) }
  if (!Array.isArray(body.events) || body.events.length < 1 || body.events.length > 40 || !uuid.test(body.learnerId || '')) return res.status(400).json({ error: 'invalid_request' })
  const now = Date.now(), rows = []
  for (const event of body.events) {
    if (!event || !uuid.test(event.id || '') || !uuid.test(event.sessionId || '') || !eventNames.includes(event.name) || !Number.isInteger(event.lesson) || event.lesson < -1000 || event.lesson > 100 || typeof event.at !== 'number' || event.at < now - 90 * 86400000 || event.at > now + 60000) return res.status(400).json({ error: 'invalid_event' })
    rows.push({ id: event.id, learner_id: digest(body.learnerId), session_id: event.sessionId, name: event.name, lesson: event.lesson, occurred_at: new Date(event.at).toISOString(), data: cleanEventData(event.data) })
  }
  try {
    const user = identity(req, res)
    if (!await claim([bucket(`events:ip:${user.address}`, 120, 60000)])) return res.status(429).json({ error: 'rate_limit' })
    await database('learning_events?on_conflict=id', rows, 'resolution=ignore-duplicates,return=minimal')
    return res.status(200).json({ accepted: rows.map(row => row.id) })
  } catch { return res.status(503).json({ error: 'storage_unavailable' }) }
}
