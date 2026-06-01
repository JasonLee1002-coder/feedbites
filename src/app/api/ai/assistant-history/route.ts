import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { assistant_chat_history } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ history: [] });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ history: [] });

    const data = await db
      .select({
        role: assistant_chat_history.role,
        content: assistant_chat_history.content,
        created_at: assistant_chat_history.created_at,
      })
      .from(assistant_chat_history)
      .where(eq(assistant_chat_history.store_id, store.id))
      .orderBy(asc(assistant_chat_history.created_at))
      .limit(20);

    return NextResponse.json({ history: data });
  } catch {
    return NextResponse.json({ history: [] });
  }
}
