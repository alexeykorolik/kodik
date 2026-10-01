import type { TutorRequest } from './aiTypes'
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
export function makeTutorPrompt(request: TutorRequest) {
  return { instructions: instructionFor(request), input: JSON.stringify(request) }
}
