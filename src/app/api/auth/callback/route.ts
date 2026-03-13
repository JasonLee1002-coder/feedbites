import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const adminDb = createServiceSupabase();
        const { data: stores } = await adminDb
          .from('stores')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (!stores || stores.length === 0) {
          // First-time login → redirect to store setup
          const redirectUrl = new URL('/register?setup=true', origin);
          return NextResponse.redirect(redirectUrl);
        }

        // Auto-select first store if no cookie set
        const cookieStore = await cookies();
        const currentStoreId = cookieStore.get('feedbites_store_id')?.value;
        const validStore = stores.find(s => s.id === currentStoreId);

        if (!validStore) {
          cookieStore.set('feedbites_store_id', stores[0].id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
          });
        }
      }

      const redirectUrl = new URL(next, origin);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Auth error → redirect to login with error
  const redirectUrl = new URL('/login?error=auth', origin);
  return NextResponse.redirect(redirectUrl);
}
