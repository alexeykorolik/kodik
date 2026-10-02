import { Capacitor, CapacitorHttp } from '@capacitor/core'

export function abortable<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return request
  return new Promise((resolve,reject)=>{
    const abort = () => reject(signal.reason || new DOMException('Aborted','AbortError'))
    signal.addEventListener('abort',abort,{once:true})
    if (signal.aborted) abort()
    request.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort))
  })
}

export function resolveApiBaseUrl(native: boolean, configured?: string) {
  if (!native) return configured?.replace(/\/$/, '') || '/api'
  if (!configured || new URL(configured).protocol !== 'https:') throw new Error('Native API requires HTTPS configuration')
  return configured.replace(/\/$/, '')
}
export function getApiBaseUrl() {
  const configured = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_API_BASE_URL as string | undefined : undefined
  return resolveApiBaseUrl(Capacitor.isNativePlatform(), configured)
}

export async function postApi(path: string, body: unknown, signal?: AbortSignal, timeout = 10000) {
  if (!/^\/[a-z/]+$/.test(path)) throw new Error('Invalid API path')
  const url = `${getApiBaseUrl()}${path}`
  if (!Capacitor.isNativePlatform()) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body:JSON.stringify(body), signal, keepalive:path === '/events' })
    return { ok:response.ok, status:response.status, data:await response.json() }
  }
  // Native HTTP preserves the server's signed HttpOnly quota cookie. WebView
  // third-party cookie policy must not reset the learner quota on every request.
  signal?.throwIfAborted()
  const result = await abortable(CapacitorHttp.post({ url, headers:{ 'Content-Type':'application/json', Origin:'https://localhost' }, data:body, responseType:'json', connectTimeout:timeout, readTimeout:timeout, disableRedirects:true }),signal)
  signal?.throwIfAborted()
  return { ok:result.status >= 200 && result.status < 300, status:result.status, data:result.data }
}
