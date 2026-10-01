import type { TutorRequest, TutorResponse } from './aiTypes'

export interface AIProvider { readonly name: string; generate(request: TutorRequest, signal: AbortSignal): Promise<TutorResponse> }

export class HttpAIProvider implements AIProvider {
  readonly name = 'server'
  async generate(request: TutorRequest, signal: AbortSignal): Promise<TutorResponse> {
    const response = await fetch('/api/ai/tutor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal })
    if (!response.ok) throw new Error(`provider_${response.status}`)
    return (await response.json()) as TutorResponse
  }
}
