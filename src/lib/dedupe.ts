// src/lib/dedupe.ts
// 供 AI 意見分析使用：把同一裝置的多筆回應收斂成最新一筆。
//
// 為什麼需要：重複填寫是刻意允許的（行銷策略），但同一人填十次不能在 AI 報告裡
// 讀成十個人的共識，否則店長會照著被放大的單一意見改菜單。
//
// 只取最新一筆，不做合併 —— 合併同一人前後矛盾的答案會拼出實際上不存在的意見。
// device_key 為空的舊資料一律各自視為獨立填答。

export function dedupeByDevice<
  T extends { device_key?: string | null; submitted_at?: Date | string | null }
>(rows: T[]): T[] {
  const latestByDevice = new Map<string, T>()
  const legacy: T[] = []

  const timeOf = (r: T): number =>
    r.submitted_at ? new Date(r.submitted_at).getTime() : 0

  for (const row of rows) {
    const key = row.device_key
    if (!key) {
      legacy.push(row)
      continue
    }
    const existing = latestByDevice.get(key)
    if (!existing || timeOf(row) > timeOf(existing)) {
      latestByDevice.set(key, row)
    }
  }

  return [...latestByDevice.values(), ...legacy].sort((a, b) => timeOf(b) - timeOf(a))
}
