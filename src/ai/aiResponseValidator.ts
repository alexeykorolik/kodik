import type { Lesson } from '../learningEngine'
import type { TutorRequest, TutorResponse } from './aiTypes'

const unsafe = /<\/?[a-z][^>]*>|https?:\/\/|www\.|\b(?:system|developer)\s*(?:prompt|message|instruction)|(?:игнорируй|забудь)\s+(?:предыдущие|инструкции)/i
const code = /\b(?:print|if|else|for|while|def|return|input|import|class)\s*\(|[{};]|\b(?:if|for|def)\s+\w+.*:/i
const python = /\b(?:while|import|class|try|except|lambda|input|return)\b/i
const normalize = (s: string) => s.replace(/\s+/g, '').replace(/['"`]/g, '').toLowerCase()
const cleanText = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !unsafe.test(value)

export function validateTutorResponse(value: unknown, request: TutorRequest, lesson?: Lesson): TutorResponse | null {
  if (!value || typeof value !== 'object') return null
  const result = value as Partial<TutorResponse>
  if (Object.keys(result).some(key => !['type','message','concept','example','shouldRevealSolution','confidence'].includes(key))) return null
  const expected = request.action === 'hint' ? 'hint' : request.action === 'example' ? 'example' : 'explanation'
  if (result.type !== expected || result.shouldRevealSolution !== false || !cleanText(result.message, 280)) return null
  if (result.concept != null && !cleanText(result.concept, 80)) return null
  if (result.concept && !request.context.allowedConcepts.some(id => result.concept!.toLowerCase().includes(id) || result.concept!.toLowerCase().includes(request.context.skill.name.toLowerCase()))) return null
  if (result.example != null && (typeof result.example !== 'object' || Object.keys(result.example).some(key => !['code','explanation'].includes(key)) ||
    (result.example.code != null && !cleanText(result.example.code, 100)) ||
    (result.example.explanation != null && !cleanText(result.example.explanation, 160)))) return null
  const message = result.message!
  const exampleCode = result.example?.code || ''
  if (python.test(`${message}\n${exampleCode}`)) return null
  if (request.hintLevel < 3 && request.action === 'hint' && (code.test(message) || exampleCode)) return null
  if (request.context.task.supportLevel === 'blocks' && (code.test(message) || exampleCode)) return null
  if (lesson) {
    const answer = lesson.answer || lesson.codeAnswer || ''
    const merged = normalize(message + exampleCode + (result.example?.explanation || ''))
    if (answer.length >= 6 && merged.includes(normalize(answer))) return null
    if (lesson.expectedOutput.some(output => output.length >= 5 && merged.includes(normalize(output)))) return null
  }
  return { type: result.type, message, concept: result.concept || null,
    example: result.example ? { code: result.example.code || null, explanation: result.example.explanation || null } : null,
    shouldRevealSolution: false, confidence: result.confidence || null }
}
