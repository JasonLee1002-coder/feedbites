// src/lib/auth-allowlist.ts
// 後台登入白名單。純函式、無 DB 依賴，可在 Edge Runtime（middleware）使用。
//
// Fail-closed：白名單為空時拒絕所有人。若有人忘記設定 ALLOWED_LOGIN_EMAILS，
// 結果是全部鎖在門外，而不是全部放行。

export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0)
}

export function isEmailAllowed(
  email: string | null | undefined,
  raw: string | undefined | null,
): boolean {
  const list = parseAllowlist(raw)
  if (list.length === 0) return false

  const normalized = (email || '').trim().toLowerCase()
  if (!normalized) return false

  return list.includes(normalized)
}
