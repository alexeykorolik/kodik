import type { Request, Response } from './storage'

const androidOrigin = 'https://localhost'
export function trustedApiOrigin(req: Request) {
  const origin = req.headers.origin
  if (origin === undefined) return true // Native clients and existing server QA.
  if (typeof origin !== 'string') return false
  if (origin === androidOrigin) return true
  try { const url = new URL(origin); return ['https:','http:'].includes(url.protocol) && url.host === req.headers.host && url.origin === origin } catch { return false }
}
export function apiCors(req: Request, res: Response) {
  if (!trustedApiOrigin(req)) { res.status(403).json({ error:'forbidden' }); return false }
  if (req.headers.origin === androidOrigin) {
    res.setHeader('Access-Control-Allow-Origin', androidOrigin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.status(200).json({}); return false
  }
  return true
}
