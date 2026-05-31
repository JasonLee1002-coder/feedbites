// src/lib/local-upload.ts
// Replaces S3 uploads with local filesystem storage.
// EC2: files saved to UPLOADS_DIR, served by nginx at UPLOADS_BASE_URL.
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join, dirname } from 'path'

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/uploads'
const UPLOADS_BASE_URL = (process.env.UPLOADS_BASE_URL ?? 'https://poc.mcstation.ai/feedbites/uploads').replace(/\/$/, '')

export async function saveToLocal(
  buffer: ArrayBuffer | Uint8Array,
  key: string,
): Promise<string> {
  const filePath = join(UPLOADS_DIR, key)
  await mkdir(dirname(filePath), { recursive: true })
  const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer
  await writeFile(filePath, data)
  return `${UPLOADS_BASE_URL}/${key}`
}

export async function deleteFromLocal(key: string): Promise<void> {
  try {
    await unlink(join(UPLOADS_DIR, key))
  } catch {
    // ignore missing file
  }
}

export function keyFromLocalUrl(url: string): string {
  return url.replace(`${UPLOADS_BASE_URL}/`, '')
}
