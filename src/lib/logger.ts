// src/lib/logger.ts
// 單行 JSON 輸出到 stdout/stderr，由 Docker/journald 收集即可，不引入外部服務。
// 嚴禁記錄完整電話、email 或問卷答案內容 —— 一律先遮罩。

type Level = 'info' | 'warn' | 'error'

export type LogContext = {
  request_id?: string
  store_id?: string
  survey_id?: string
  response_id?: string
  [key: string]: unknown
}

export function newRequestId(): string {
  return crypto.randomUUID()
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 5) return '***'
  return `${digits.slice(0, 2)}**-***-${digits.slice(-3)}`
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const at = email.indexOf('@')
  if (at < 1 || at === email.length - 1) return '***'
  return `${email.slice(0, 1)}***@${email.slice(at + 1)}`
}

function emit(level: Level, event: string, ctx: LogContext, msg: string): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...ctx,
    msg,
  })
  if (level === 'error') console.error(line)
  else console.log(line)
}

export const logger = {
  info: (event: string, ctx: LogContext, msg: string) => emit('info', event, ctx, msg),
  warn: (event: string, ctx: LogContext, msg: string) => emit('warn', event, ctx, msg),
  error: (event: string, ctx: LogContext, err: unknown) =>
    emit('error', event, ctx, err instanceof Error ? `${err.name}: ${err.message}` : String(err)),
}
