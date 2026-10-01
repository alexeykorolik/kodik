// Bump whenever tasks, checks or pedagogical support rules change.
export const curriculumVersion = '2026-10-01.2'
declare const __KODIK_APP_VERSION__: string
export const appVersion = typeof __KODIK_APP_VERSION__ === 'string' ? __KODIK_APP_VERSION__ : 'development'
export function eventRelease(raw: { curriculumVersion?: unknown; appVersion?: unknown }) {
  // Queued events created before versioning belong to a separate historical cohort.
  if (raw.curriculumVersion === undefined && raw.appVersion === undefined) return { curriculumVersion: 'legacy', appVersion: 'legacy' }
  if (raw.curriculumVersion !== curriculumVersion && raw.curriculumVersion !== 'legacy') return null
  if (typeof raw.appVersion !== 'string' || !/^(?:[0-9a-f]{7,40}|development|legacy)$/.test(raw.appVersion)) return null
  return { curriculumVersion: raw.curriculumVersion as string, appVersion: raw.appVersion }
}
