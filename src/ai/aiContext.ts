import type { Lesson, Program, Expr, Stmt } from '../learningEngine'
import type { Session } from '../achievement'
import type { Progress } from '../progress'
import { skills, type SkillId } from '../skills'
import type { ErrorType } from '../validation'
import type { TutorContext } from './aiTypes'

const errorLabels: Record<ErrorType, string> = {
  wrong_order: 'Неверный порядок действий', wrong_value: 'Неверное значение', missing_block: 'Не хватает команды',
  wrong_structure: 'Неверная структура', syntax_error: 'Синтаксическая ошибка', wrong_indentation: 'Ошибка отступа',
  wrong_condition: 'Ошибка условия', loop_error: 'Ошибка цикла', wrong_function_call: 'Ошибка вызова функции',
  runtime_error: 'Ошибка выполнения',
}
const expr = (value: Expr): string => value.kind === 'binary' || value.kind === 'comparison'
  ? `${value.kind}(${value.operator},${expr(value.left)},${expr(value.right)})` : value.kind
const stmt = (value: Stmt): string => {
  if (value.kind === 'define' || value.kind === 'repeat') return `${value.kind}(${value.body.map(stmt).join(',')})`
  if (value.kind === 'if') return `if(${value.then.map(stmt).join(',')}:${value.otherwise.map(stmt).join(',')})`
  return value.kind === 'call' ? 'call' : `${value.kind}(${expr(value.value)})`
}
const bounded = (value: number, max: number) => Math.min(max, Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)))

export function buildTutorContext(lesson: Lesson, progress: Progress, session: Session, program: Program, errorType?: ErrorType): TutorContext {
  const allowedConcepts = [...new Set([...(lesson.skills?.teaches || []), ...(lesson.skills?.practices || [])])]
  const skillId: SkillId = allowedConcepts[0] || 'print'
  const state = progress.skillStates?.[skillId]
  const representation = lesson.mode === 'blocks' ? 'blocks' : lesson.mode === 'text' ? 'code' : 'choice'
  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    skill: { id: skillId, name: skills[skillId].title, mastery: Math.max(0, Math.min(1, state?.mastery || 0)) },
    task: { description: lesson.goal, expectedConcept: skillId, supportLevel: lesson.supportLevel || 'blocks_with_code' },
    learner: { attempts: bounded(session.attempts, 100), consecutiveErrors: bounded(state?.consecutiveErrors || 0, 100), hintsUsed: bounded(session.hintsUsed, 3), independentSuccesses: bounded(state?.independentSuccesses || 0, 100) },
    ...(errorType ? { lastError: { type: errorType, message: errorLabels[errorType] } } : {}),
    currentSolution: { representation, normalizedStructure: representation === 'choice' ? 'not_shared' : program.statements.slice(0, 12).map(stmt).join(',').slice(0, 160) || 'empty' },
    allowedConcepts,
  }
}

// The API rebuilds curriculum fields from its own copy of the lesson. It never
// forwards arbitrary client text or a student's code to the model.
export function sanitizeTutorContext(lesson: Lesson, raw: TutorContext): TutorContext {
  const safeSession = { attempts: bounded(raw?.learner?.attempts, 100), hintsUsed: bounded(raw?.learner?.hintsUsed, 3) } as Session
  const skillId = lesson.skills?.teaches[0] || lesson.skills?.practices[0] || 'print'
  const progress = { skillStates: { [skillId]: { mastery: Number.isFinite(raw?.skill?.mastery) ? Math.max(0, Math.min(1, raw.skill.mastery)) : 0,
    consecutiveErrors: bounded(raw?.learner?.consecutiveErrors, 100), independentSuccesses: bounded(raw?.learner?.independentSuccesses, 100) } } } as Progress
  const errorType = raw?.lastError?.type
  const validErrors: ErrorType[] = ['wrong_order','wrong_value','missing_block','wrong_structure','syntax_error','wrong_indentation','wrong_condition','loop_error','wrong_function_call','runtime_error']
  const clean = buildTutorContext(lesson, progress, safeSession, { statements: [] }, errorType && validErrors.includes(errorType) ? errorType : undefined)
  clean.task.description = lesson.goal.replace(/[«“"][^»”"]+[»”"]/g, '«значение из задания»')
  for (const output of lesson.expectedOutput) if (output.length >= 3) clean.task.description = clean.task.description.replaceAll(output, 'значение из задания')
  const structure = raw?.currentSolution?.normalizedStructure
  const tokens = typeof structure === 'string' ? structure.match(/[a-z_]+/g) || [] : []
  const safeKinds = ['empty','not_shared','print','assign','call','define','repeat','if','binary','comparison','string','number','variable','missing']
  if (clean.currentSolution.representation !== 'choice' && typeof structure === 'string' && structure.length <= 160 &&
    /^[a-z0-9_,:() +*<>=!-]+$/.test(structure) && tokens.every(token => safeKinds.includes(token))) clean.currentSolution.normalizedStructure = structure
  return clean
}
