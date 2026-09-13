// 顧客端 session：HMAC-SHA256 簽章 cookie，與店長端 NextAuth 完全分開。
import { createHmac, timingSafeEqual } from 'crypto'

export const CUSTOMER_COOKIE = 'fb_customer'
export const OAUTH_STATE_COOKIE = 'fb_oauth_state'
export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000

export type CustomerSession = { cid: string; exp: number }

export function signPayload(payload: object, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const mac = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${mac}`
}

export function verifyPayload<T extends { exp: number }>(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): T | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  const [body, mac] = parts
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T
    if (typeof payload.exp !== 'number' || payload.exp < now) return null
    return payload
  } catch {
    return null
  }
}

export function customerSecret(): string {
  const s = process.env.CUSTOMER_SESSION_SECRET || process.env.AUTH_SECRET
  if (!s) throw new Error('CUSTOMER_SESSION_SECRET is not set')
  return s
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.floor(maxAgeSeconds),
  }
}

export function readCustomerId(cookieValue: string | undefined): string | null {
  const s = verifyPayload<CustomerSession>(cookieValue, customerSecret())
  return s?.cid ?? null
}

export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/feedbites/') || next.startsWith('//')) return '/feedbites'
  return next
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(v: string | null | undefined): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}
