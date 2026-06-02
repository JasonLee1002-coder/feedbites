import { auth } from "@/auth"
import { NextResponse } from "next/server"

export const proxy = auth(function(req) {
  const nextUrl = req.nextUrl
  const isLoggedIn = !!req.auth?.user

  const isPublic = nextUrl.pathname.startsWith('/s/') ||
                   nextUrl.pathname.startsWith('/m/') ||
                   nextUrl.pathname.startsWith('/invite/') ||
                   nextUrl.pathname === '/login' ||
                   nextUrl.pathname === '/register' ||
                   nextUrl.pathname.startsWith('/api/auth/')

  if (isPublic) return NextResponse.next()

  if (nextUrl.pathname.startsWith('/dashboard') && !isLoggedIn) {
    return NextResponse.redirect(new URL('/feedbites/login', req.url))
  }

  if ((nextUrl.pathname === '/login' || nextUrl.pathname === '/register') && isLoggedIn) {
    return NextResponse.redirect(new URL('/feedbites/dashboard', req.url))
  }

  return NextResponse.next()
})

export const proxyConfig = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
