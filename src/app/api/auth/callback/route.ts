import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const inviteToken = searchParams.get('invite');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const adminDb = createServiceSupabase();

        // Process pending invites for this user's email
        if (user.email) {
          const { data: pendingInvites } = await adminDb
            .from('store_invites')
            .select('id, store_id, invited_by')
            .eq('email', user.email.toLowerCase());

          if (pendingInvites && pendingInvites.length > 0) {
            for (const invite of pendingInvites) {
              await adminDb.from('store_members').upsert({
                store_id: invite.store_id,
                user_id: user.id,
                invited_by: invite.invited_by,
              }, { onConflict: 'store_id,user_id' });
            }
            // Clean up processed invites
            await adminDb
              .from('store_invites')
              .delete()
              .eq('email', user.email.toLowerCase());
          }
        }

        // Process invite token (from LINE shared link)
        if (inviteToken) {
          const { data: inviteStore } = await adminDb
            .from('stores')
            .select('id, user_id')
            .eq('invite_token', inviteToken)
            .single();

          if (inviteStore && inviteStore.user_id !== user.id) {
            await adminDb.from('store_members').upsert({
              store_id: inviteStore.id,
              user_id: user.id,
              invited_by: inviteStore.user_id,
            }, { onConflict: 'store_id,user_id' });
          }
        }

        const { data: stores } = await adminDb
          .from('stores')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        // Also check member stores
        const { data: memberStores } = await adminDb
          .from('store_members')
          .select('store_id')
          .eq('user_id', user.id);

        const hasAnyStore = (stores && stores.length > 0) || (memberStores && memberStores.length > 0);

        if (!hasAnyStore) {
          // No stores yet → redirect to create first store
          const redirectUrl = new URL('/dashboard/new-store', origin);
          return NextResponse.redirect(redirectUrl);
        }

        // Auto-select first store if no cookie set
        const cookieStore = await cookies();
        const currentStoreId = cookieStore.get('feedbites_store_id')?.value;

        const allStoreIds = [
          ...(stores || []).map(s => s.id),
          ...(memberStores || []).map(s => s.store_id),
        ];
        const validStore = allStoreIds.includes(currentStoreId!);

        if (!validStore && allStoreIds.length > 0) {
          cookieStore.set('feedbites_store_id', allStoreIds[0], {
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
