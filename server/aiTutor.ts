import { lessons } from '../src/course'
import { practiceLessons } from '../src/practicePool'
import { sanitizeTutorContext } from '../src/ai/aiContext'
import { makeTutorPrompt } from '../src/ai/aiPrompt'
import { validateTutorResponse } from '../src/ai/aiResponseValidator'
import type { TutorAction, TutorRequest } from '../src/ai/aiTypes'
import { configuredTutorProvider, ProviderError } from './aiProvider'
import { bucket, claim, dailyLimit, identity, type Request, type Response } from './storage'
import { apiCors } from './apiOrigin'

const actions: TutorAction[] = ['hint','error_explanation','concept','example']
const maxBody = 4096

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store')
  if (!apiCors(req,res)) return
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }) }
  const provider = configuredTutorProvider()
  if (process.env.AI_TUTOR_ENABLED !== 'true' || !provider) return res.status(503).json({ error: 'ai_unavailable' })
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
  try {
    const user = identity(req, res), day = 86400000
    const allowed = await claim([
      bucket(`ai:learner:${user.learner}:lesson:${lesson.id}`, 8, day),
      bucket(`ai:ip:${user.address}:minute`, 30, 60000),
      bucket(`ai:learner:${user.learner}:day`, dailyLimit('AI_LEARNER_DAILY_LIMIT', 80), day),
      bucket(`ai:ip:${user.address}:day`, dailyLimit('AI_IP_DAILY_LIMIT', 200), day),
      bucket('ai:global:day', dailyLimit('AI_DAILY_REQUEST_LIMIT', 1000), day),
    ])
    if (!allowed) return res.status(429).json({ error: 'rate_limit' })
  } catch { return res.status(503).json({ error: 'budget_unavailable' }) }
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
