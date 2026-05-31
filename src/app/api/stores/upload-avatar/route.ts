import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'
import { saveToLocal, deleteFromLocal, keyFromLocalUrl } from '@/lib/local-upload'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const store = await getSelectedStore(session.user.id)
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null
    if (!file) return NextResponse.json({ error: '請選擇圖片' }, { status: 400 })

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: '檔案太大，最大 2MB' }, { status: 400 })
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '僅支援 PNG / JPG / WebP' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'png'
    const key = `feedbites/avatars/${session.user.id}.${ext}`
    const avatarUrl = await saveToLocal(await file.arrayBuffer(), key)

    await db
      .update(stores)
      .set({ owner_avatar_url: avatarUrl })
      .where(eq(stores.id, store.id))

    return NextResponse.json({ avatar_url: avatarUrl })
  } catch (err) {
    console.error('Avatar upload error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const store = await getSelectedStore(session.user.id)
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })

    // Delete from S3 using URL stored in DB
    if (store.owner_avatar_url) {
      await deleteFromLocal(keyFromLocalUrl(store.owner_avatar_url)).catch(() => {})
    }

    await db
      .update(stores)
      .set({ owner_avatar_url: null })
      .where(eq(stores.id, store.id))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Avatar delete error:', err)
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  }
}
