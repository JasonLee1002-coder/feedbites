import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user already has a store, if not create one
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const adminDb = createServiceSupabase();
        const { data: existingStore } = await adminDb
          .from('stores')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!existingStore) {
          // First-time Google login → redirect to store setup
          const redirectUrl = new URL('/register?setup=true', origin);
          return NextResponse.redirect(redirectUrl);
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
