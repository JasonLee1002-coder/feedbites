import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { surveys, responses, discount_codes } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'
import * as XLSX from 'xlsx'

// GET: Export survey responses as Excel or CSV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const format = request.nextUrl.searchParams.get('format') || 'xlsx'

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const store = await getSelectedStore(session.user.id)
    if (!store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 })
    }

    // Get survey with questions (must belong to this store)
    const [survey] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, id), eq(surveys.store_id, store.id)))
      .limit(1)

    if (!survey) {
      return NextResponse.json({ error: '找不到問卷' }, { status: 404 })
    }

    // Get responses
    const responseList = await db
      .select()
      .from(responses)
      .where(eq(responses.survey_id, id))
      .orderBy(desc(responses.submitted_at))

    // Get discount codes
    const discountCodeList = await db
      .select({
        response_id: discount_codes.response_id,
        code: discount_codes.code,
        is_used: discount_codes.is_used,
        expires_at: discount_codes.expires_at,
      })
      .from(discount_codes)
      .where(eq(discount_codes.survey_id, id))

    const codeMap = new Map(discountCodeList.map(c => [c.response_id, c]))

    const questions: Array<{ id: string; title?: string; label?: string; type: string }> =
      (survey.questions as Array<{ id: string; title?: string; label?: string; type: string }>) || []

    const filteredQuestions = questions.filter(q => q.type !== 'section-header')

    // Build headers
    const headers = [
      '回覆時間',
      '回覆者',
      '手機',
      'XP',
      ...filteredQuestions.map(q => q.title || q.label || q.id),
      '折扣碼',
      '折扣碼已使用',
      '折扣碼到期日',
    ]

    // Build rows
    const rows = responseList.map(r => {
      const code = codeMap.get(r.id)
      const answers = r.answers as Record<string, unknown>
      return [
        r.submitted_at ? new Date(r.submitted_at).toLocaleString('zh-TW') : '',
        r.respondent_name || '匿名',
        r.phone || '',
        r.xp_earned ?? '',
        ...filteredQuestions.map(q => {
          const val = answers?.[q.id]
          if (Array.isArray(val)) return val.join('; ')
          return val ?? ''
        }),
        code?.code || '',
        code?.is_used ? '是' : '否',
        code?.expires_at ? new Date(code.expires_at).toLocaleDateString('zh-TW') : '',
      ]
    })

    const filename = `${survey.title}_回覆匯出`

    // Excel format
    if (format === 'xlsx') {
      const wsData = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length * 2, 12) }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '問卷回覆')
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.xlsx"`,
        },
      })
    }

    // CSV format (fallback)
    function csvEscape(val: unknown): string {
      const s = String(val ?? '')
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const bom = '\uFEFF'
    const csv = bom + [
      headers.map(csvEscape).join(','),
      ...rows.map(row => row.map(csvEscape).join(',')),
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.csv"`,
      },
    })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
