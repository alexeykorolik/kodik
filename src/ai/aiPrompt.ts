import type { TutorAction, TutorRequest, TutorResponseType } from './aiTypes'
import { instructionFor } from './aiPolicy'

export const tutorResponseSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['hint', 'explanation', 'example'] },
    message: { type: 'string' }, concept: { type: ['string', 'null'] },
    example: { type: ['object', 'null'], additionalProperties: false, properties: { code: { type: ['string','null'] }, explanation: { type: ['string','null'] } }, required: ['code','explanation'] },
    shouldRevealSolution: { type: 'boolean' }, confidence: { type: ['string','null'], enum: ['high','medium','low',null] },
  }, required: ['type','message','concept','example','shouldRevealSolution','confidence'],
}
export const responseTypeFor = (action: TutorAction): TutorResponseType => action === 'hint' ? 'hint' : action === 'example' ? 'example' : 'explanation'
export function tutorResponseSchemaFor(type: TutorResponseType) {
  return { ...tutorResponseSchema, properties: { ...tutorResponseSchema.properties, type: { type: 'string', enum: [type] } } }
}
export function makeTutorPrompt(request: TutorRequest) {
  const responseType = responseTypeFor(request.action)
  return { instructions: `${instructionFor(request)}\nПоле type в ответе: ${responseType}.`, input: JSON.stringify(request), responseType }
}
