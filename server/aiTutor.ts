import { lessons } from '../src/course'
import { practiceLessons } from '../src/practicePool'
import { sanitizeTutorContext } from '../src/ai/aiContext'
import { makeTutorPrompt } from '../src/ai/aiPrompt'
import { validateTutorResponse } from '../src/ai/aiResponseValidator'
import type { TutorAction, TutorRequest } from '../src/ai/aiTypes'
import { configuredTutorProvider, ProviderError } from './aiProvider'

type Request = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }
type Response = { status: (code: number) => Response; json: (value: unknown) => void; setHeader: (key: string, value: string) => void }
const hits = new Map<string, { count: number; expires: number }>()
const actions: TutorAction[] = ['hint','error_explanation','concept','example']
const maxBody = 4096

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }) }
  const origin = req.headers.origin
  const host = req.headers.host
  if (typeof origin === 'string') {
    try { if (new URL(origin).host !== host) return res.status(403).json({ error: 'forbidden' }) }
    catch { return res.status(403).json({ error: 'forbidden' }) }
  }
  const provider = configuredTutorProvider()
  if (process.env.AI_TUTOR_ENABLED !== 'true' || !provider) return res.status(503).json({ error: 'ai_unavailable' })
  const address = req.socket?.remoteAddress || 'unknown'
  const now = Date.now()
  const hit = hits.get(address) || { count: 0, expires: now + 60_000 }
  if (now >= hit.expires) { hit.count = 0; hit.expires = now + 60_000 }
  if (++hit.count > 30) return res.status(429).json({ error: 'rate_limit' })
  hits.set(address, hit)
  if (hits.size > 1000) for (const [key, value] of hits) if (value.expires < now) hits.delete(key)
  let body: TutorRequest
  try {
    const serialized = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (!serialized || serialized.length > maxBody) throw Error('bad_body')
    body = JSON.parse(serialized) as TutorRequest
  } catch { return res.status(400).json({ error: 'invalid_request' }) }
  if (!actions.includes(body?.action) || ![1,2,3].includes(body?.hintLevel)) return res.status(400).json({ error: 'invalid_request' })
  if (body.action === 'example' && process.env.AI_EXAMPLES_ENABLED !== 'true') return res.status(503).json({ error: 'ai_unavailable' })
  if ((body.action === 'concept' || body.action === 'error_explanation') && process.env.AI_EXPLANATIONS_ENABLED !== 'true') return res.status(503).json({ error: 'ai_unavailable' })
  const lesson = [...lessons, ...practiceLessons].find(item => item.id === body.context?.lessonId)
  if (!lesson) return res.status(400).json({ error: 'unknown_lesson' })
  const request = { action: body.action, hintLevel: body.hintLevel, context: sanitizeTutorContext(lesson, body.context) }
  const prompt = makeTutorPrompt(request)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 7000)
  try {
    const raw = await provider.generate(prompt, controller.signal)
    const validated = validateTutorResponse(raw, request, lesson, reason => console.warn('ai_tutor_invalid_response', { provider: provider.name, action: request.action, reason }))
    if (!validated) return res.status(502).json({ error: 'invalid_response' })
    return res.status(200).json(validated)
  } catch (error) { return res.status(error instanceof ProviderError && error.status === 429 ? 429 : 502).json({ error: error instanceof ProviderError && error.status === 429 ? 'rate_limit' : 'provider_error' }) }
  finally { clearTimeout(timer) }
}
