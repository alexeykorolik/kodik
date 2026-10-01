import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export type Request = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }
export type Response = { status: (code: number) => Response; json: (value: unknown) => void; setHeader: (key: string, value: string) => void }
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
export const digest = (value: string) => createHmac('sha256', secret()).update(value).digest('hex')
export function identity(req: Request, res: Response) {
  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie.match(/(?:^|;\s*)kodik_learner=([a-f0-9-]+)\.([a-f0-9]{64})(?:;|$)/) : null
  let id = randomUUID() as string
  if (cookie && cookie[1].length === 36) {
    const expected = Buffer.from(digest(cookie[1]), 'hex'), actual = Buffer.from(cookie[2], 'hex')
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) id = cookie[1]
  }
  if (!cookie || id !== cookie[1]) res.setHeader('Set-Cookie', `kodik_learner=${id}.${digest(id)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`)
  // Vercel overwrites this header. Locally use the socket instead of client claims.
  const forwarded = process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] : undefined
  const address = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || 'unknown'
  return { learner: digest(id), address: digest(address) }
}
export function sameOrigin(req: Request) {
  if (typeof req.headers.origin !== 'string') return true
  try { return new URL(req.headers.origin).host === req.headers.host } catch { return false }
}
export async function database(path: string, body: unknown, prefer?: string) {
  const url = process.env.SUPABASE_URL, key = secret()
  if (!url || !key) throw Error('storage_unavailable')
  const response = await fetch(`${url}/rest/v1/${path}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(2500) })
  if (!response.ok) { console.warn('learning_storage_failed', { status: response.status }); throw Error('storage_unavailable') }
  const text = await response.text()
  return text ? JSON.parse(text) : null
}
export type Bucket = { key: string; limit: number; expires: string }
export function bucket(key: string, limit: number, windowMs: number): Bucket {
  const window = Math.floor(Date.now() / windowMs)
  return { key: `${key}:${window}`, limit, expires: new Date((window + 1) * windowMs).toISOString() }
}
export async function claim(buckets: Bucket[]) { return await database('rpc/claim_learning_budget', { p_buckets: buckets }) === true }
export function dailyLimit(name: string, fallback: number) { const n = Number(process.env[name]); return Number.isInteger(n) && n > 0 ? Math.min(n, 10000) : fallback }
