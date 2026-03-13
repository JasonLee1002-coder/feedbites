import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminDb = createServiceSupabase();

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Validate file
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `logos/${store.id}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await adminDb.storage
      .from('store-assets')
      .upload(filePath, bytes, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = adminDb.storage
      .from('store-assets')
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    // Update store
    await adminDb
      .from('stores')
      .update({ logo_url: logoUrl })
      .eq('id', store.id);

    return NextResponse.json({ logo_url: logoUrl });
  } catch (err) {
    console.error('Logo upload error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
