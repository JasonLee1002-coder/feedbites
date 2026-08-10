import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    // baseURL 不含 basePath —— 測試路徑一律自己帶 /feedbites 前綴。
    // 原因：以 '/' 開頭的路徑依 WHATWG URL 規範會覆蓋掉 base 的整個 path，
    // 把 basePath 放進 baseURL 會被靜默丟棄（new URL('/api/x', 'http://h/feedbites')
    // → 'http://h/api/x'）。這也與前端呼叫方式一致（SurveyClient 用 /feedbites/api/...）。
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  },
})
