import type { Lesson } from '../learningEngine'
import { fallbackResponse } from './aiFallback'
import { maxTutorRequestsPerLesson, tutorTimeoutMs } from './aiPolicy'
import type { AIProvider } from './aiProvider'
import { validateTutorResponse } from './aiResponseValidator'
import type { TutorRequest, TutorResult } from './aiTypes'

export class AITutor {
  private readonly cache = new Map<string, TutorResult>()
  private readonly count = new Map<number, number>()
  constructor(private readonly provider: AIProvider, private readonly enabled: boolean, private readonly timeoutMs = tutorTimeoutMs) {}
  async respond(request: TutorRequest, lesson: Lesson): Promise<TutorResult> {
    const start = Date.now()
    const fallback = (reason: string): TutorResult => ({ response: fallbackResponse(request, lesson), source: 'fallback', provider: this.provider.name, latencyMs: Date.now() - start, reason })
    if (!this.enabled) return fallback('disabled')
    const key = JSON.stringify(request)
    const cached = this.cache.get(key)
    if (cached) return { ...cached, latencyMs: 0 }
    const countKey = `kodik-ai-count:${Math.floor(Date.now() / 86400000)}:${lesson.id}`
    let count = this.count.get(lesson.id) || 0
    try { if (typeof localStorage !== 'undefined') count = Math.max(count, Number(localStorage.getItem(countKey)) || 0) } catch { /* Server quota remains authoritative. */ }
    if (count >= maxTutorRequestsPerLesson) return fallback('rate_limit')
    this.count.set(lesson.id, count + 1)
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(countKey, String(count + 1)) } catch { /* Local quota is only a convenience. */ }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const raw = await this.provider.generate(request, controller.signal)
      const response = validateTutorResponse(raw, request, lesson)
      if (!response) return fallback('invalid_response')
      const result: TutorResult = { response, source: 'ai', provider: this.provider.name, latencyMs: Date.now() - start }
      this.cache.set(key, result)
      return result
    } catch (error) { return fallback(controller.signal.aborted ? 'timeout' : error instanceof Error ? error.message.slice(0, 40) : 'provider_error') }
    finally { clearTimeout(timer) }
  }
}
