/**
 * Solving-mode model shared by the B2B client and server (docs/adaptive/MODE_MODEL.md).
 * Pure functions only: the server is the authority, the client uses the same rules to explain them.
 */
export const MODES = ['blocks', 'mixed', 'python'] as const
export type Mode = (typeof MODES)[number]
export const SWITCHING = ['free', 'teacher', 'locked'] as const
export type Switching = (typeof SWITCHING)[number]
export type ModePolicy = { allowed: Mode[]; start: Mode; switching: Switching }
export type ModeOverride = Partial<ModePolicy> | null
export type ModeState = { mode?: Mode | null; offered?: Mode | null }

export const MODE_LABEL: Record<Mode, string> = { blocks: 'Блоки', mixed: 'Блоки + Python', python: 'Python' }
export const isMode = (value: unknown): value is Mode => typeof value === 'string' && (MODES as readonly string[]).includes(value)
const isSwitching = (value: unknown): value is Switching => typeof value === 'string' && (SWITCHING as readonly string[]).includes(value)

/** Modes a published version supports. Python is the product baseline and the only mode of legacy tasks. */
export function supportedModes(learningConfig: unknown): Mode[] {
  const modes = (learningConfig && typeof learningConfig === 'object' ? (learningConfig as { modes?: unknown }).modes : undefined)
  const listed = Array.isArray(modes) ? modes.filter(isMode) : []
  return MODES.filter(m => m === 'python' || listed.includes(m))
}

/** Default assignment policy: every supported mode, start from the most supported one, free switching. */
export function defaultPolicy(supported: Mode[]): ModePolicy {
  if (supported.length === 1) return { allowed: [...supported], start: supported[0], switching: 'locked' }
  return { allowed: [...supported], start: supported.includes('blocks') ? 'blocks' : supported[0], switching: 'free' }
}

export type PolicyError = { code: 'invalid_policy'; message: string }
/** Validates a teacher-supplied policy (or override) against the version's supported modes. */
export function validatePolicy(input: unknown, supported: Mode[], partial = false): { policy?: Partial<ModePolicy>; error?: PolicyError } {
  const fail = (message: string) => ({ error: { code: 'invalid_policy' as const, message } })
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('Укажите настройки режимов.')
  const raw = input as Record<string, unknown>
  const unknownKeys = Object.keys(raw).filter(k => !['allowed', 'start', 'switching'].includes(k))
  if (unknownKeys.length) return fail('Неизвестные поля настроек режимов.')
  const out: Partial<ModePolicy> = {}
  if (raw.allowed !== undefined) {
    if (!Array.isArray(raw.allowed) || !raw.allowed.every(isMode) || new Set(raw.allowed).size !== raw.allowed.length) return fail('Разрешённые режимы указаны неверно.')
    if (!raw.allowed.length) return fail('Разрешите хотя бы один способ решения.')
    const extra = raw.allowed.filter(m => !supported.includes(m))
    if (extra.length) return fail(`Задание нельзя решать в режиме «${MODE_LABEL[extra[0] as Mode]}».`)
    out.allowed = MODES.filter(m => (raw.allowed as Mode[]).includes(m))
  } else if (!partial) return fail('Укажите разрешённые режимы.')
  if (raw.start !== undefined) { if (!isMode(raw.start)) return fail('Стартовый режим указан неверно.'); out.start = raw.start } else if (!partial) return fail('Укажите стартовый режим.')
  if (raw.switching !== undefined) { if (!isSwitching(raw.switching)) return fail('Способ переключения указан неверно.'); out.switching = raw.switching } else if (!partial) return fail('Укажите, кто разрешает переход.')
  if (out.start && out.allowed && !out.allowed.includes(out.start)) return fail('Стартовый режим должен быть среди разрешённых.')
  if (out.start && !supported.includes(out.start)) return fail(`Задание нельзя решать в режиме «${MODE_LABEL[out.start]}».`)
  return { policy: out }
}

/** Reads a stored policy defensively; falls back to the default for the version. */
export function storedPolicy(raw: unknown, supported: Mode[]): ModePolicy {
  let value: unknown = raw
  if (typeof raw === 'string') { try { value = JSON.parse(raw) } catch { value = null } }
  const checked = validatePolicy(value, supported)
  return checked.policy ? (checked.policy as ModePolicy) : defaultPolicy(supported)
}

export type Effective = ModePolicy & { current: Mode; offered: Mode | null }
export function effectivePolicy(policy: ModePolicy, override: ModeOverride, state: ModeState | null, supported: Mode[]): Effective {
  const allowed = (override?.allowed ?? policy.allowed).filter(m => supported.includes(m))
  const safeAllowed = allowed.length ? allowed : policy.allowed
  const start = override?.start && safeAllowed.includes(override.start) ? override.start : safeAllowed.includes(policy.start) ? policy.start : safeAllowed[0]
  const switching = override?.switching ?? policy.switching
  const current = state?.mode && safeAllowed.includes(state.mode) ? state.mode : start
  const offered = state?.offered && safeAllowed.includes(state.offered) && state.offered !== current ? state.offered : null
  return { allowed: safeAllowed, start, switching, current, offered }
}

export type ModeDecision = { ok: true } | { ok: false; status: 409; code: 'mode_not_supported' | 'mode_not_allowed' | 'mode_switch_required'; message: string }
/** Server table of allowed combinations for draft / run / submit (MODE_MODEL.md §4–5). */
export function checkMode(action: 'draft' | 'run' | 'submit', mode: unknown, eff: Effective, supported: Mode[]): ModeDecision {
  if (!isMode(mode) || !supported.includes(mode)) return { ok: false, status: 409, code: 'mode_not_supported', message: 'Это задание нельзя решать в этом режиме.' }
  // A learner may always keep saving their own safe draft of a mode they already worked in.
  if (action === 'draft') return { ok: true }
  if (!eff.allowed.includes(mode)) return { ok: false, status: 409, code: 'mode_not_allowed', message: `Учитель не открыл режим «${MODE_LABEL[mode]}». Твоя работа сохранена; продолжи в режиме «${MODE_LABEL[eff.current]}».` }
  if (eff.switching !== 'free' && mode !== eff.current) return { ok: false, status: 409, code: 'mode_switch_required', message: `Сейчас твой режим — «${MODE_LABEL[eff.current]}». Переход открывает учитель.` }
  return { ok: true }
}

/** Whether the learner may switch to `mode` themselves right now. */
export function canSelfSwitch(eff: Effective, mode: Mode): boolean {
  if (!eff.allowed.includes(mode) || mode === eff.current) return false
  return eff.switching === 'free' || (eff.switching === 'teacher' && eff.offered === mode)
}
