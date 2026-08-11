import { test, expect } from '@playwright/test'
import { maskPhone, maskEmail } from '../../src/lib/logger'

test('maskPhone 只保留前 2 碼與後 3 碼', () => {
  expect(maskPhone('0912345678')).toBe('09**-***-678')
  expect(maskPhone('09-1234-5678')).toBe('09**-***-678')
})

test('maskPhone 處理空值與過短輸入', () => {
  expect(maskPhone(null)).toBeNull()
  expect(maskPhone(undefined)).toBeNull()
  expect(maskPhone('')).toBeNull()
  expect(maskPhone('12')).toBe('***')
})

test('maskEmail 只保留首字與網域', () => {
  expect(maskEmail('jason@gmail.com')).toBe('j***@gmail.com')
  expect(maskEmail('a@b.co')).toBe('a***@b.co')
})

test('maskEmail 處理空值與無效格式', () => {
  expect(maskEmail(null)).toBeNull()
  expect(maskEmail('not-an-email')).toBe('***')
})
