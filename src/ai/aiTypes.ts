import type { SkillId, SupportLevel } from '../skills'
import type { ErrorType } from '../validation'

export type TutorAction = 'hint' | 'error_explanation' | 'concept' | 'example'
export type TutorResponseType = 'hint' | 'explanation' | 'example'

export type TutorContext = {
  lessonId: number
  lessonTitle: string
  skill: { id: SkillId; name: string; mastery: number }
  task: { description: string; expectedConcept: SkillId; supportLevel: SupportLevel }
  learner: { attempts: number; consecutiveErrors: number; hintsUsed: number; independentSuccesses: number }
  lastError?: { type: ErrorType; message: string; relevantFragment?: string }
  currentSolution: { representation: 'blocks' | 'code' | 'choice'; normalizedStructure: string }
  allowedConcepts: SkillId[]
}

export type TutorRequest = { action: TutorAction; hintLevel: 1 | 2 | 3; context: TutorContext }
export type TutorResponse = {
  type: TutorResponseType
  message: string
  concept?: string | null
  example?: { code?: string | null; explanation?: string | null } | null
  shouldRevealSolution: boolean
  confidence?: 'high' | 'medium' | 'low' | null
}

export type TutorResult = { response: TutorResponse; source: 'ai' | 'fallback'; provider: string; latencyMs: number; reason?: string }
