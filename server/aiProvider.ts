import { tutorResponseSchema } from '../src/ai/aiPrompt'

export type Prompt = { instructions: string; input: string }
export type ServerAIProvider = { name: 'groq' | 'openai'; generate: (prompt: Prompt, signal: AbortSignal) => Promise<unknown> }

export class ProviderError extends Error {
  constructor(readonly status: number) { super(status === 429 ? 'rate_limit' : 'provider_error') }
}

async function post(url: string, key: string, payload: object, signal: AbortSignal) {
  const response = await fetch(url, { method: 'POST', signal,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!response.ok) throw new ProviderError(response.status === 429 ? 429 : 502)
  return response.json()
}

function groqProvider(key: string): ServerAIProvider {
  return { name: 'groq', async generate(prompt, signal) {
    const data = await post('https://api.groq.com/openai/v1/chat/completions', key, {
      model: process.env.GROQ_TUTOR_MODEL || 'openai/gpt-oss-20b',
      messages: [{ role: 'system', content: prompt.instructions }, { role: 'user', content: prompt.input }],
      response_format: { type: 'json_schema', json_schema: { name: 'tutor_response', strict: true, schema: tutorResponseSchema } },
      reasoning_effort: 'low', max_completion_tokens: 500,
    }, signal) as { choices?: { message?: { content?: string | null } }[] }
    const content = data.choices?.[0]?.message?.content
    return typeof content === 'string' ? JSON.parse(content) : null
  } }
}

function openAIProvider(key: string, model: string): ServerAIProvider {
  return { name: 'openai', async generate(prompt, signal) {
    const data = await post('https://api.openai.com/v1/responses', key, {
      model, store: false, ...prompt,
      text: { format: { type: 'json_schema', name: 'tutor_response', strict: true, schema: tutorResponseSchema } },
      max_output_tokens: 300,
    }, signal) as { output?: { content?: { type?: string; text?: string }[] }[] }
    const content = data.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text
    return content ? JSON.parse(content) : null
  } }
}

export function configuredTutorProvider(): ServerAIProvider | null {
  if (process.env.GROQ_API_KEY) return groqProvider(process.env.GROQ_API_KEY)
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_TUTOR_MODEL) return openAIProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_TUTOR_MODEL)
  return null
}
