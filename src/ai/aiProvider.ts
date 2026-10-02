import type { TutorRequest, TutorResponse } from './aiTypes'
import { postApi } from '../api'

export interface AIProvider { readonly name: string; generate(request: TutorRequest, signal: AbortSignal): Promise<TutorResponse> }

export class HttpAIProvider implements AIProvider {
  readonly name = 'server'
  async generate(request: TutorRequest, signal: AbortSignal): Promise<TutorResponse> {
    const response = await postApi('/ai/tutor', request, signal)
    if (!response.ok) throw new Error(`provider_${response.status}`)
    return response.data as TutorResponse
  }
}
