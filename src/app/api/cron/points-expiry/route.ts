import { NextRequest, NextResponse } from 'next/server'
import { runExpiry } from '@/lib/ledger/service'
import { logger } from '@/lib/logger'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const inserted = await runExpiry()
    logger.info('cron.points_expiry', {}, `expired rows inserted: ${inserted}`)
    return NextResponse.json({ ok: true, inserted })
  } catch (err) {
    logger.error('cron.points_expiry.failed', {}, err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
