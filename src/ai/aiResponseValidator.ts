import type { Lesson } from '../learningEngine'
import type { TutorRequest, TutorResponse } from './aiTypes'

const unsafe = /<\/?[a-z][^>]*>|https?:\/\/|www\.|\b(?:system|developer)\s*(?:prompt|message|instruction)|(?:игнорируй|забудь)\s+(?:предыдущие|инструкции)/i
const code = /\b(?:print|if|else|for|while|def|return|input|import|class)\s*\(|[{};]|\b(?:if|for|def)\s+\w+.*:/i
const executableCode = (value: string) => code.test(value.replace(/\bprint\s*\(\s*(?:\.{3})?\s*\)/gi, '')) || /[\p{L}_][\p{L}\p{N}_]*\s*=\s*(?!=)/u.test(value)
const python = /\b(?:while|import|class|try|except|lambda|input|return)\b/i
const normalize = (s: string) => s.replace(/\s+/g, '').replace(/['"`]/g, '').toLowerCase()
const cleanText = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !unsafe.test(value)

export function validateTutorResponse(value: unknown, request: TutorRequest, lesson?: Lesson, onReject?: (reason: string) => void): TutorResponse | null {
  const reject = (reason: string) => { onReject?.(reason); return null }
  if (!value || typeof value !== 'object') return reject('shape')
  const result = value as Partial<TutorResponse>
  if (Object.keys(result).some(key => !['type','message','concept','example','shouldRevealSolution','confidence'].includes(key))) return reject('extra_fields')
  const expected = request.action === 'hint' ? 'hint' : request.action === 'example' ? 'example' : 'explanation'
  if (result.type !== expected) return reject('type')
  if (result.shouldRevealSolution !== false) return reject('reveal')
  if (!cleanText(result.message, 280)) return reject('message')
  if (result.concept != null && !cleanText(result.concept, 80)) return reject('concept_shape')
  if (result.concept && !request.context.allowedConcepts.some(id => result.concept!.toLowerCase().includes(id) || result.concept!.toLowerCase().includes(request.context.skill.name.toLowerCase()))) return reject('concept_boundary')
  if (result.example != null && (typeof result.example !== 'object' || Object.keys(result.example).some(key => !['code','explanation'].includes(key)) ||
    (result.example.code != null && !cleanText(result.example.code, 100)) ||
    (result.example.explanation != null && !cleanText(result.example.explanation, 160)))) return reject('example_shape')
  const message = result.message!
  const exampleCode = result.example?.code || ''
  const combined = `${message}\n${exampleCode}`
  if (/\b(?:import|class|try|except|lambda)\b/i.test(combined)) return reject('unsupported_python')
  if (python.test(combined) && (!lesson?.extended || /\bwhile\b/i.test(combined) && !request.context.allowedConcepts.includes('loop') || /\binput\b/i.test(combined) && !request.context.allowedConcepts.includes('input') || /\breturn\b/i.test(combined) && !request.context.allowedConcepts.includes('function'))) return reject('unsupported_python')
  if (request.hintLevel < 3 && request.action === 'hint' && (executableCode(message) || exampleCode)) return reject('hint_code')
  if (request.action === 'hint' && exampleCode && (request.hintLevel < 3 || !exampleCode.includes('...') || exampleCode.includes('\n'))) return reject('hint_full_code')
  if (request.context.task.supportLevel === 'blocks' && (code.test(message) || exampleCode)) return reject('blocks_code')
  if (lesson) {
    const answer = lesson.answer || lesson.codeAnswer || ''
    const merged = normalize(message + exampleCode + (result.example?.explanation || ''))
    if (answer.length >= 6 && merged.includes(normalize(answer))) return reject('exact_answer')
    if (lesson.expectedOutput.some(output => output.length >= 3 && merged.includes(normalize(output)))) return reject('expected_output')
  }
  return { type: result.type, message, concept: result.concept || null,
    example: result.example ? { code: result.example.code || null, explanation: result.example.explanation || null } : null,
    shouldRevealSolution: false, confidence: result.confidence || null }
}
