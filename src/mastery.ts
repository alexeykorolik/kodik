import type { SkillId, SupportLevel } from './skills'
import { supportRank } from './skills'

export type SkillState = {
  skillId: SkillId
  mastery: number
  attempts: number
  successes: number
  independentSuccesses: number
  hintsUsed: number
  lastPracticedAt?: string
  lastPracticedSequence?: number
  consecutiveErrors: number
}

export type MasteryEvent = {
  skills: SkillId[]
  success: boolean
  supportLevel: SupportLevel
  hintsUsed: number
  solutionUsed: boolean
  at: string
  sequence: number
}

export type MasteryScorer = (state: SkillState, event: MasteryEvent) => number
export const emptySkillState = (skillId: SkillId): SkillState => ({ skillId, mastery: 0, attempts: 0, successes: 0, independentSuccesses: 0, hintsUsed: 0, consecutiveErrors: 0 })

// The scorer is deliberately replaceable. Course definitions and persistence
// depend on the event contract, not on these first-version weights.
export const deterministicMasteryScorer: MasteryScorer = (state, event) => {
  const independent = event.success && !event.solutionUsed && event.hintsUsed === 0 && supportRank[event.supportLevel] >= supportRank.blocks_with_code
  const support = supportRank[event.supportLevel]
  const gain = event.success
    ? independent ? 0.18 + support * 0.035 : event.solutionUsed ? 0.035 : 0.09 + support * 0.02
    : 0
  const loss = event.success ? 0 : 0.08 + Math.min(0.06, state.consecutiveErrors * 0.02)
  return Math.max(0, Math.min(1, Number((state.mastery + gain - loss).toFixed(3))))
}

export function applyMasteryEvent(states: Partial<Record<SkillId, SkillState>>, event: MasteryEvent, scorer: MasteryScorer = deterministicMasteryScorer) {
  const next = { ...states }
  for (const skillId of event.skills) {
    const prior = next[skillId] || emptySkillState(skillId)
    const independent = event.success && !event.solutionUsed && event.hintsUsed === 0 && supportRank[event.supportLevel] >= supportRank.blocks_with_code
    const prepared = { ...prior, consecutiveErrors: event.success ? 0 : prior.consecutiveErrors + 1 }
    next[skillId] = {
      ...prepared,
      mastery: scorer(prepared, event),
      attempts: prior.attempts + 1,
      successes: prior.successes + (event.success ? 1 : 0),
      independentSuccesses: prior.independentSuccesses + (independent ? 1 : 0),
      hintsUsed: prior.hintsUsed + event.hintsUsed,
      lastPracticedAt: event.at,
      lastPracticedSequence: event.sequence
    }
  }
  return next
}

export function masteryLabel(value: number) {
  return value >= 0.72 ? 'Уверенно' : value >= 0.4 ? 'Осваивается' : 'Стоит повторить'
}
