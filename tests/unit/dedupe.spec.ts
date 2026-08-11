import { test, expect } from '@playwright/test'
import { dedupeByDevice } from '../../src/lib/dedupe'

type Row = { id: string; device_key?: string | null; submitted_at?: string | null }

test('同一裝置只保留最新一筆', () => {
  const rows: Row[] = [
    { id: 'a', device_key: 'dev-1', submitted_at: '2026-08-01T10:00:00Z' },
    { id: 'b', device_key: 'dev-1', submitted_at: '2026-08-03T10:00:00Z' },
    { id: 'c', device_key: 'dev-1', submitted_at: '2026-08-02T10:00:00Z' },
  ]
  const out = dedupeByDevice(rows)
  expect(out).toHaveLength(1)
  expect(out[0].id).toBe('b')
})

test('不同裝置各自保留', () => {
  const rows: Row[] = [
    { id: 'a', device_key: 'dev-1', submitted_at: '2026-08-01T10:00:00Z' },
    { id: 'b', device_key: 'dev-2', submitted_at: '2026-08-02T10:00:00Z' },
  ]
  expect(dedupeByDevice(rows)).toHaveLength(2)
})

test('device_key 為 null 的舊資料各自獨立，不被合併', () => {
  const rows: Row[] = [
    { id: 'a', device_key: null, submitted_at: '2026-08-01T10:00:00Z' },
    { id: 'b', device_key: null, submitted_at: '2026-08-02T10:00:00Z' },
    { id: 'c', device_key: undefined, submitted_at: '2026-08-03T10:00:00Z' },
  ]
  expect(dedupeByDevice(rows)).toHaveLength(3)
})

test('輸出依 submitted_at 由新到舊排序', () => {
  const rows: Row[] = [
    { id: 'old', device_key: 'dev-1', submitted_at: '2026-08-01T10:00:00Z' },
    { id: 'new', device_key: 'dev-2', submitted_at: '2026-08-05T10:00:00Z' },
    { id: 'mid', device_key: null, submitted_at: '2026-08-03T10:00:00Z' },
  ]
  expect(dedupeByDevice(rows).map(r => r.id)).toEqual(['new', 'mid', 'old'])
})

test('空陣列不炸', () => {
  expect(dedupeByDevice([])).toEqual([])
})
