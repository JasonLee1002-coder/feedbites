import { test, expect } from '@playwright/test'

// 執行前提：
//   1. npm run dev 已啟動（http://localhost:3000/feedbites）
//   2. 測試資料庫內存在兩份 is_active=true 的問卷
//   3. 以環境變數提供這兩份問卷的 id
const SURVEY_A = process.env.TEST_SURVEY_A_ID
const SURVEY_B = process.env.TEST_SURVEY_B_ID

test.skip(!SURVEY_A || !SURVEY_B, '需設定 TEST_SURVEY_A_ID 與 TEST_SURVEY_B_ID')

async function submitTo(request: import('@playwright/test').APIRequestContext, surveyId: string) {
  const res = await request.post(`/feedbites/api/surveys/${surveyId}/responses`, {
    data: { answers: { q1: 'test' }, xp_earned: 10, skip_discount: true },
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  return body.response.id as string
}

test('PATCH 拒絕跨問卷的 response_id', async ({ request }) => {
  const responseIdA = await submitTo(request, SURVEY_A!)
  const res = await request.patch(`/feedbites/api/surveys/${SURVEY_B}/responses`, {
    data: { response_id: responseIdA, phone: '0912345678' },
  })
  expect(res.status()).toBe(404)
})

test('PATCH 在時間窗內允許補填電話', async ({ request }) => {
  const responseId = await submitTo(request, SURVEY_A!)
  const res = await request.patch(`/feedbites/api/surveys/${SURVEY_A}/responses`, {
    data: { response_id: responseId, phone: '0912345678' },
  })
  expect(res.status()).toBe(200)
})

test('PATCH 對不存在的 response_id 回 404', async ({ request }) => {
  const res = await request.patch(`/feedbites/api/surveys/${SURVEY_A}/responses`, {
    data: { response_id: '00000000-0000-0000-0000-000000000001', phone: '0912345678' },
  })
  expect(res.status()).toBe(404)
})
