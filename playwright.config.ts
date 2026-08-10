import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    // 注意：basePath 是 /feedbites，baseURL 必須包含它
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000/feedbites',
  },
})
