import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'
import { saveToLocal } from '@/lib/local-upload'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const store = await getSelectedStore(session.user.id)
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('logo') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 })
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'png'
    const key = `feedbites/logos/${store.id}.${ext}`
    const logoUrl = await saveToLocal(await file.arrayBuffer(), key)

    await db
      .update(stores)
      .set({ logo_url: logoUrl })
      .where(eq(stores.id, store.id))

    return NextResponse.json({ logo_url: logoUrl })
  } catch (err) {
    console.error('Logo upload error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
