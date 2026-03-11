import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { createDiscountCode, getExpiryDate } from '@/lib/discount';

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
    const { data: store } = await adminDb
      .from('stores')
      .select('id')
      .eq('user_id', user.id)
      .single();

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
    const { answers, respondent_name, phone } = body;

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
      })
      .select()
      .single();

    if (responseError) {
      return NextResponse.json({ error: responseError.message }, { status: 500 });
    }

    // Generate discount code if enabled
    let discountCode = null;
    if (survey.discount_enabled) {
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

        // Discount code is linked via response_id in discount_codes table
      }
    }

    return NextResponse.json({
      response,
      discount_code: discountCode
        ? {
            code: discountCode.code,
            discount_type: survey.discount_type,
            discount_value: survey.discount_value,
            expires_at: discountCode.expires_at,
          }
        : null,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
