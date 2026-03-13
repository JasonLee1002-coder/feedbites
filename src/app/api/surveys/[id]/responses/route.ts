import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { createDiscountCode, getExpiryDate } from '@/lib/discount';
import { getSelectedStore } from '@/lib/store-context';

// GET: List responses (owner only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const adminDb = createServiceSupabase();

    // Verify ownership
    const store = await getSelectedStore(user.id);
    if (!store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 });
    }

    const { data: survey } = await adminDb
      .from('surveys')
      .select('store_id')
      .eq('id', id)
      .single();

    if (!survey || survey.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 });
    }

    const { data: responses, error } = await adminDb
      .from('responses')
      .select('*')
      .eq('survey_id', id)
      .order('submitted_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(responses);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Submit response (public) + generate discount code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = createServiceSupabase();

    // Get the survey (must be active)
    const { data: survey, error: surveyError } = await adminDb
      .from('surveys')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (surveyError || !survey) {
      return NextResponse.json({ error: '找不到問卷或問卷已關閉' }, { status: 404 });
    }

    const body = await request.json();
    const { answers, respondent_name, phone, xp_earned, skip_discount } = body;

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: '缺少回答內容' }, { status: 400 });
    }

    // Create response
    const { data: response, error: responseError } = await adminDb
      .from('responses')
      .insert({
        survey_id: id,
        answers,
        respondent_name: respondent_name || null,
        xp_earned: typeof xp_earned === 'number' ? xp_earned : null,
      })
      .select()
      .single();

    if (responseError) {
      return NextResponse.json({ error: responseError.message }, { status: 500 });
    }

    // Generate discount code if enabled (and user didn't skip)
    let discountCode = null;
    if (survey.discount_enabled && !skip_discount) {
      // Determine discount based on mode
      let selectedDiscountType = survey.discount_type;
      let selectedDiscountValue = survey.discount_value;
      let tierName: string | null = null;
      let tierEmoji: string | null = null;

      if (survey.discount_mode === 'advanced' && Array.isArray(survey.discount_tiers) && survey.discount_tiers.length > 0) {
        // Resolve tier from XP — pick the highest tier the user qualifies for
        const xp = typeof xp_earned === 'number' ? xp_earned : 0;
        const sorted = [...survey.discount_tiers].sort((a: { min_xp: number }, b: { min_xp: number }) => b.min_xp - a.min_xp);
        const tier = sorted.find((t: { min_xp: number }) => xp >= t.min_xp) || survey.discount_tiers[0];
        selectedDiscountType = tier.discount_type;
        selectedDiscountValue = tier.discount_value;
        tierName = tier.name;
        tierEmoji = tier.emoji;
      }

      const code = createDiscountCode();
      const expiresAt = getExpiryDate(survey.discount_expiry_days);

      const { data: codeData, error: codeError } = await adminDb
        .from('discount_codes')
        .insert({
          survey_id: id,
          response_id: response.id,
          code,
          is_used: false,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (codeError) {
        console.error('Failed to create discount code:', codeError);
      } else {
        discountCode = codeData;
      }

      return NextResponse.json({
        response,
        discount_code: discountCode
          ? {
              code: discountCode.code,
              discount_type: selectedDiscountType,
              discount_value: selectedDiscountValue,
              expires_at: discountCode.expires_at,
              tier_name: tierName,
              tier_emoji: tierEmoji,
            }
          : null,
      }, { status: 201 });
    }

    return NextResponse.json({
      response,
      discount_code: null,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
