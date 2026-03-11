import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, MessageSquare, Ticket, Plus } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();

  // Get store
  const { data: store } = await adminDb
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const storeName = store?.store_name || '我的店家';
  const storeId = store?.id;

  // Fetch stats
  let surveyCount = 0;
  let responseCount = 0;
  let discountUsageRate = 0;
  let recentResponses: Array<{
    id: string;
    respondent_name: string | null;
    submitted_at: string;
    survey_id: string;
    survey_title?: string;
  }> = [];

  if (storeId) {
    // Get surveys
    const { data: surveys } = await adminDb
      .from('surveys')
      .select('id, title')
      .eq('store_id', storeId);

    surveyCount = surveys?.length || 0;

    if (surveys && surveys.length > 0) {
      const surveyIds = surveys.map((s: { id: string }) => s.id);
      const surveyMap = new Map(surveys.map((s: { id: string; title: string }) => [s.id, s.title]));

      // Get total responses
      const { count: totalResponses } = await adminDb
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .in('survey_id', surveyIds);

      responseCount = totalResponses || 0;

      // Get discount usage rate
      const { count: totalCodes } = await adminDb
        .from('discount_codes')
        .select('*', { count: 'exact', head: true })
        .in('survey_id', surveyIds);

      const { count: usedCodes } = await adminDb
        .from('discount_codes')
        .select('*', { count: 'exact', head: true })
        .in('survey_id', surveyIds)
        .eq('is_used', true);

      if (totalCodes && totalCodes > 0) {
        discountUsageRate = Math.round(((usedCodes || 0) / totalCodes) * 100);
      }

      // Get recent responses
      const { data: recent } = await adminDb
        .from('responses')
        .select('id, respondent_name, submitted_at, survey_id')
        .in('survey_id', surveyIds)
        .order('submitted_at', { ascending: false })
        .limit(5);

      if (recent) {
        recentResponses = recent.map((r: { id: string; respondent_name: string | null; submitted_at: string; survey_id: string }) => ({
          ...r,
          survey_title: surveyMap.get(r.survey_id) || '未知問卷',
        }));
      }
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3A3A3A] font-serif">
          歡迎回來，{storeName}
        </h1>
        <p className="text-sm text-[#8A8585] mt-1">
          這裡是您的問卷管理儀表板
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D8]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#C5A55A]/10 flex items-center justify-center">
              <ClipboardList className="w-4.5 h-4.5 text-[#C5A55A]" />
            </div>
            <span className="text-sm text-[#8A8585]">問卷數量</span>
          </div>
          <p className="text-3xl font-bold text-[#3A3A3A]">{surveyCount}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D8]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#C5A55A]/10 flex items-center justify-center">
              <MessageSquare className="w-4.5 h-4.5 text-[#C5A55A]" />
            </div>
            <span className="text-sm text-[#8A8585]">回覆數量</span>
          </div>
          <p className="text-3xl font-bold text-[#3A3A3A]">{responseCount}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D8]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#C5A55A]/10 flex items-center justify-center">
              <Ticket className="w-4.5 h-4.5 text-[#C5A55A]" />
            </div>
            <span className="text-sm text-[#8A8585]">折扣碼使用率</span>
          </div>
          <p className="text-3xl font-bold text-[#3A3A3A]">{discountUsageRate}%</p>
        </div>
      </div>

      {/* Quick action */}
      <div className="mb-8">
        <Link
          href="/dashboard/surveys?action=create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors"
        >
          <Plus className="w-4 h-4" />
          建立新問卷
        </Link>
      </div>

      {/* Recent responses */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8]">
        <div className="px-5 py-4 border-b border-[#E8E2D8]">
          <h2 className="text-base font-bold text-[#3A3A3A]">最近回覆</h2>
        </div>
        {recentResponses.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-[#8A8585]">尚無回覆</p>
            <p className="text-xs text-[#8A8585] mt-1">建立問卷並分享給客人，回覆會顯示在這裡</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E2D8]">
            {recentResponses.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#3A3A3A] font-medium">
                    {r.respondent_name || '匿名'}
                  </p>
                  <p className="text-xs text-[#8A8585]">{r.survey_title}</p>
                </div>
                <span className="text-xs text-[#8A8585]">
                  {new Date(r.submitted_at).toLocaleDateString('zh-TW', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
