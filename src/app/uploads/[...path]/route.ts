import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/uploads';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = join(UPLOADS_DIR, ...path);

  // Prevent path traversal
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const data = await readFile(filePath);
    const mime = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    return new NextResponse(data, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=2592000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}
