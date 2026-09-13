import { NextRequest } from 'next/server'
import { googleConfig, googleProfileFromCode } from '@/lib/google-login'
import { finishLogin } from '@/lib/customer-login'

export async function GET(req: NextRequest) {
  return finishLogin(req, 'google', (code, nonce) => googleProfileFromCode(code, nonce, googleConfig()))
}
