import { NextRequest, NextResponse } from 'next/server'

// Force-clear all auth cookies and redirect to login
// Visit /feedbites/api/auth/clear to reset session
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/feedbites/login', req.url))

  const cookieNames = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
    '__Host-authjs.csrf-token',
    '__Secure-authjs.callback-url',
    'authjs.csrf-token',
    'authjs.callback-url',
    'feedbites_store_id',
    // Legacy next-auth cookies
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
    '__Host-next-auth.csrf-token',
    'next-auth.csrf-token',
  ]

  for (const name of cookieNames) {
    res.cookies.set(name, '', { maxAge: 0, path: '/' })
    res.cookies.set(name, '', { maxAge: 0, path: '/feedbites' })
  }

  return res
}
