// src/lib/auth-canonical-url.ts
// 組 Auth.js route handler 用的請求 URL。純函式，方便單元測試。
//
// 為什麼不直接用 req.url 的 origin：正式站前面的 nginx 有一層是 server_name _ 的預設 server，
// 會把任意 Host 標頭原樣轉給 app，req.url 的 host 可以被偽造，
// 用它組出來的 redirect／callback 網址就可能指到別的網域。
// 所以 origin 一律取固定設定：AUTH_URL → PUBLIC_BASE_URL → （都沒有才）req.url（本機開發）。
// 只沿用 req.url 的 pathname 與 query。

export function resolveCanonicalOrigin(
  reqUrl: string,
  env: { AUTH_URL?: string; PUBLIC_BASE_URL?: string },
): string {
  for (const candidate of [env.AUTH_URL, env.PUBLIC_BASE_URL]) {
    if (!candidate) continue
    try {
      return new URL(candidate).origin
    } catch {
      // 設定值不是合法 URL：換下一個來源
    }
  }
  return new URL(reqUrl).origin
}

/**
 * Next 交給 route handler 的 req.url 不含 basePath（/api/auth/...），
 * 但 Auth.js 的 basePath 取自 AUTH_URL（/eatagain/api/auth），這裡把 basePath 補回去。
 */
export function buildCanonicalAuthUrl(
  reqUrl: string,
  env: { AUTH_URL?: string; PUBLIC_BASE_URL?: string },
  basePath: string,
): URL {
  const incoming = new URL(reqUrl)
  const url = new URL(resolveCanonicalOrigin(reqUrl, env))
  const needsBasePath =
    basePath && incoming.pathname !== basePath && !incoming.pathname.startsWith(`${basePath}/`)
  url.pathname = needsBasePath ? `${basePath}${incoming.pathname}` : incoming.pathname
  url.search = incoming.search
  return url
}
