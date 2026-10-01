export const eventNames = ['lesson_open','first_action','block_added','check','hint','tutorial_step','python_view','replay','adaptive_decision','support_changed','corrective_inserted','corrective_completed','ai_hint_requested','ai_hint_generated','ai_hint_fallback','ai_explanation_requested','ai_example_requested','ai_response_failed','ai_hint_outcome','lesson_completed','theory_open'] as const
export type EventName = typeof eventNames[number]
export type EventData = Record<string, string | number | boolean>
const numbers = new Set(['elapsedMs','completionMs','attempt','stars','level','latencyMs','nextAttempt','returnLessonId','meaningfulErrors','hintsUsed','runStartedAt'])
const booleans = new Set(['passed','first','solution','independent'])
const words = new Set(['kind','type','step','skillId','supportLevel','previousSupport','nextSupport','reason','practiceId','provider','action','errorType'])
const categories: Record<string, Set<string>> = {
  kind: new Set(['interaction','open_picker','create_variable','edit_value','edit_text']),
  type: new Set(['text_print','text','math_number','variables_set','variables_get','math_arithmetic','logic_compare','controls_if','controls_repeat_ext','kodik_define','kodik_call']),
  step: new Set(['command','value','greeting','second-command','second-value','finish','number-value','seven','store','stored-text','mira','read-command','read-value','sum','operator','condition','comparison','score','threshold','ten','at-least','action','message','congratulation','otherwise','otherwise-text','otherwise-message','loop-body','loop-text','loop-message','call']),
  skillId: new Set(['','print','string','number','sequence','variable','assignment','arithmetic','comparison','if','loop','function','indentation','text_syntax','list','input','drawing']),
  supportLevel: new Set(['','blocks','blocks_with_code','guided_code','code_tokens','free_code']),
  reason: new Set(['initial','keep','advance','restore','fallback','corrective','review','disabled','rate_limit','timeout','provider_error','invalid_response','unknown','provider_429','provider_502','provider_503','provider_403','provider_400']),
  provider: new Set(['server','groq','openai','mock']),
  action: new Set(['hint','error_explanation','concept','example']),
  errorType: new Set(['','wrong_order','wrong_value','missing_block','wrong_structure','syntax_error','wrong_indentation','wrong_condition','loop_error','wrong_function_call','runtime_error']),
}
categories.previousSupport = categories.nextSupport = categories.supportLevel
const practiceIds = new Set(['print-review-1','string-corrective-1','number-review-1','sequence-review-1','variable-review-1','assignment-corrective-1','arithmetic-review-1','comparison-review-1','if-corrective-1','loop-review-1','comparison-if-review','function-review-1','text-syntax-review-1','code-string-fix','code-arithmetic-fix','code-variable-fix','code-assignment-fix','code-if-fix','code-comparison-fix','code-loop-fix','code-function-fix','list-index-fix','list-loop-fix','list-review','input-fix','input-number-fix','input-review','drawing-fix','drawing-loop-fix','drawing-review',...['arithmetic','variable','if','comparison','loop','function','string','assignment'].map(id => `code-${id}-review`)])
categories.practiceId = practiceIds
// Values are categorical identifiers, never prose, names or user code.
export function cleanEventData(raw: unknown): EventData {
  const result: EventData = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result
  for (const [key, value] of Object.entries(raw)) {
    if (numbers.has(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= (key === 'runStartedAt' ? 1e13 : 365 * 86400000)) result[key] = value
    if (booleans.has(key) && typeof value === 'boolean') result[key] = value
    if (words.has(key) && typeof value === 'string' && categories[key]?.has(value)) result[key] = value
  }
  return result
}
