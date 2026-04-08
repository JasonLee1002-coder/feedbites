import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { createDiscountCode, getExpiryDate } from '@/lib/discount';
import { getSelectedStore } from '@/lib/store-context';
import { Resend } from 'resend';

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
        phone: phone || null,
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

// PATCH: Update phone/email on an existing response (public, best-effort)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = createServiceSupabase();
    const body = await request.json();
    const { response_id, phone, email, prize_label, prize_emoji } = body;

    if (!response_id) {
      return NextResponse.json({ error: '缺少參數' }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (phone) updates.phone = phone;
    if (email) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有要更新的欄位' }, { status: 400 });
    }

    const { error } = await adminDb
      .from('responses')
      .update(updates)
      .eq('id', response_id)
      .eq('survey_id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send discount code email if email provided and Resend key exists
    if (email && process.env.RESEND_API_KEY) {
      try {
        // Fetch discount code + survey + store info
        const { data: dcRow } = await adminDb
          .from('discount_codes')
          .select('code, expires_at')
          .eq('response_id', response_id)
          .maybeSingle();

        const { data: survey } = await adminDb
          .from('surveys')
          .select('title, discount_value, stores(store_name)')
          .eq('id', id)
          .single();

        if (dcRow && survey) {
          const storesData = survey.stores as unknown as { store_name: string } | { store_name: string }[] | null;
          const storeName = (Array.isArray(storesData) ? storesData[0]?.store_name : storesData?.store_name) ?? '餐廳';
          const expiryDate = new Date(dcRow.expires_at).toLocaleDateString('zh-TW');

          const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
          const prizeSection = prize_label ? `
            <tr>
              <td style="padding:0 32px 8px;text-align:center">
                <div style="display:inline-block;background:linear-gradient(135deg,#FF8C00,#FF6B00);border-radius:50px;padding:10px 24px;color:#fff;font-size:15px;font-weight:700;letter-spacing:1px">
                  ${prize_emoji ?? '🎰'} 你抽到：${prize_label}
                </div>
              </td>
            </tr>` : '';

          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(dcRow.code)}&bgcolor=FFF8F0&color=CC5500&qzone=2`;

          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: process.env.EMAIL_FROM ?? 'FeedBites <noreply@feedbites.app>',
            to: email,
            subject: `${storeName} 🎰 抽獎優惠券 · ${today}`,
            html: `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${storeName} 抽獎優惠券</title>
</head>
<body style="margin:0;padding:0;background:#f5f0ea;font-family:'Helvetica Neue',Arial,'PingFang TC','Microsoft JhengHei',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ea;padding:32px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12)">

        <!-- ── Header gradient ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#FF8C00 0%,#FF5F00 50%,#E84000 100%);padding:40px 32px 32px;text-align:center">
            <div style="font-size:52px;line-height:1;margin-bottom:12px">🎰</div>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1px">恭喜您中獎了！</h1>
            <p style="margin:0;color:rgba(255,255,255,0.88);font-size:14px">${storeName} · 感謝您填寫問卷</p>
          </td>
        </tr>

        <!-- ── Prize badge ── -->
        ${prizeSection}

        <!-- ── Divider with scissors ── -->
        <tr><td style="padding:24px 32px 0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-top:2px dashed #FFD4A0;width:46%"></td>
              <td style="text-align:center;padding:0 8px;color:#FF8C00;font-size:18px;white-space:nowrap">✂ 優惠券</td>
              <td style="border-top:2px dashed #FFD4A0;width:46%"></td>
            </tr>
          </table>
        </td></tr>

        <!-- ── QR Code + Code ── -->
        <tr>
          <td style="padding:24px 32px;text-align:center">
            <p style="margin:0 0 16px;color:#777;font-size:13px">掃描 QR Code 或出示優惠碼即可使用</p>

            <!-- QR Code -->
            <div style="display:inline-block;background:#FFF8F0;border-radius:16px;padding:16px;border:2px solid #FFD4A0;margin-bottom:20px">
              <img src="${qrUrl}" width="160" height="160" alt="優惠碼 QR Code"
                   style="display:block;border-radius:8px" />
            </div>

            <!-- Discount Code -->
            <div style="background:#FFF3E0;border:2px dashed #FF8C00;border-radius:14px;padding:16px 32px;margin:0 auto;display:inline-block">
              <div style="font-family:Courier,'Courier New',monospace;font-size:30px;font-weight:900;color:#CC5500;letter-spacing:8px;line-height:1">${dcRow.code}</div>
              <div style="margin-top:10px;font-size:16px;font-weight:700;color:#FF6B00">${survey.discount_value}</div>
            </div>

            <p style="margin:16px 0 0;color:#aaa;font-size:12px">⏰ 有效期至 ${expiryDate}</p>
          </td>
        </tr>

        <!-- ── How to use ── -->
        <tr>
          <td style="padding:0 32px 28px">
            <div style="background:#f9f5f0;border-radius:14px;padding:18px 22px;border-left:4px solid #FF8C00">
              <p style="margin:0 0 10px;font-weight:800;color:#333;font-size:14px">📌 如何使用</p>
              <table cellpadding="0" cellspacing="0">
                <tr><td style="color:#666;font-size:13px;line-height:2">
                  <span style="color:#FF8C00;font-weight:700">①</span> 下次光臨 <strong>${storeName}</strong><br>
                  <span style="color:#FF8C00;font-weight:700">②</span> 結帳時讓店員掃 QR Code 或輸入優惠碼<br>
                  <span style="color:#FF8C00;font-weight:700">③</span> 立即享受 <strong>${survey.discount_value}</strong> 好康 🎁
                </td></tr>
              </table>
            </div>
          </td>
        </tr>

        <!-- ── Divider ── -->
        <tr><td style="padding:0 32px"><div style="border-top:1px solid #f0ebe5"></div></td></tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="background:#faf7f4;padding:20px 32px;text-align:center;border-radius:0 0 24px 24px">
            <p style="margin:0 0 4px;color:#bbb;font-size:11px">此優惠券由 <strong style="color:#FF8C00">FeedBites</strong> 系統產生</p>
            <p style="margin:0;color:#ccc;font-size:10px">Bite · Rate · Save &nbsp;|&nbsp; ${today}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
          });
        }
      } catch (emailErr) {
        // Email failure is non-critical — log but don't fail the request
        console.error('Email send error:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
