import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList, MessageSquare, Ticket, Plus, Star,
  TrendingUp, TrendingDown, Minus, Users, CalendarDays,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();

  const { data: store } = await adminDb
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const storeName = store?.store_name || '我的店家';
  const storeId = store?.id;

  // ── Data fetch ──
  let surveyCount = 0;
  let responseCount = 0;
  let discountUsageRate = 0;
  let todayResponses = 0;
  let weekResponses = 0;
  let prevWeekResponses = 0;
  let overallAvg: number | null = null;
  let totalCodes = 0;
  let usedCodes = 0;
  let recentResponses: Array<{
    id: string;
    respondent_name: string | null;
    submitted_at: string;
    survey_id: string;
    survey_title?: string;
    answers?: Record<string, string | string[]>;
    xp_earned?: number | null;
  }> = [];
  let activeSurveyCount = 0;

  // 7-day trend
  const dailyCounts: { label: string; count: number }[] = [];

  if (storeId) {
    const { data: surveys } = await adminDb
      .from('surveys')
      .select('id, title, is_active, questions')
      .eq('store_id', storeId);

    surveyCount = surveys?.length || 0;
    activeSurveyCount = surveys?.filter((s: { is_active: boolean }) => s.is_active).length || 0;

    if (surveys && surveys.length > 0) {
      const surveyIds = surveys.map((s: { id: string }) => s.id);
      const surveyMap = new Map(surveys.map((s: { id: string; title: string }) => [s.id, s.title]));

      // All responses for stats
      const { data: allResponses } = await adminDb
        .from('responses')
        .select('id, respondent_name, submitted_at, survey_id, answers, xp_earned')
        .in('survey_id', surveyIds)
        .order('submitted_at', { ascending: false });

      const allResp = allResponses || [];
      responseCount = allResp.length;

      // Today & week
      const todayStr = new Date().toISOString().slice(0, 10);
      todayResponses = allResp.filter(r => r.submitted_at.slice(0, 10) === todayStr).length;
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      weekResponses = allResp.filter(r => r.submitted_at >= weekAgo).length;
      const prevWeekStart = new Date(Date.now() - 14 * 86400000).toISOString();
      prevWeekResponses = allResp.filter(r => r.submitted_at >= prevWeekStart && r.submitted_at < weekAgo).length;

      // 7-day chart
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const ds = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
        dailyCounts.push({
          label: dayLabel,
          count: allResp.filter(r => r.submitted_at.slice(0, 10) === ds).length,
        });
      }

      // Overall avg rating
      const ratingQs: { id: string }[] = [];
      for (const s of surveys) {
        const qs = (s.questions || []) as Array<{ id: string; type: string }>;
        for (const q of qs) {
          if (q.type === 'rating' || q.type === 'emoji-rating') {
            ratingQs.push({ id: q.id });
          }
        }
      }
      if (ratingQs.length > 0) {
        let totalScore = 0;
        let totalVotes = 0;
        for (const q of ratingQs) {
          for (const r of allResp) {
            const v = Number(r.answers?.[q.id]);
            if (!isNaN(v) && v > 0) {
              totalScore += v;
              totalVotes++;
            }
          }
        }
        if (totalVotes > 0) overallAvg = totalScore / totalVotes;
      }

      // Discount stats
      const { count: tc } = await adminDb
        .from('discount_codes')
        .select('*', { count: 'exact', head: true })
        .in('survey_id', surveyIds);

      const { count: uc } = await adminDb
        .from('discount_codes')
        .select('*', { count: 'exact', head: true })
        .in('survey_id', surveyIds)
        .eq('is_used', true);

      totalCodes = tc || 0;
      usedCodes = uc || 0;
      if (totalCodes > 0) {
        discountUsageRate = Math.round((usedCodes / totalCodes) * 100);
      }

      // Recent responses
      recentResponses = allResp.slice(0, 8).map(r => ({
        ...r,
        survey_title: surveyMap.get(r.survey_id) || '未知問卷',
      }));
    }
  }

  const maxDailyCount = dailyCounts.length > 0 ? Math.max(...dailyCounts.map(d => d.count), 1) : 1;
  const weekTrend = weekResponses - prevWeekResponses;

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安';

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3A3A3A] font-serif">
          {greeting}，{storeName}
        </h1>
        <p className="text-sm text-[#8A8585] mt-1">
          {todayResponses > 0
            ? `今天已收到 ${todayResponses} 筆回覆`
            : '今天還沒有新的回覆，把 QR Code 放到桌上試試看'}
        </p>
      </div>

      {/* ════ KPI Cards ════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D8]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#C5A55A]/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#C5A55A]" />
            </div>
            <span className="text-xs text-[#8A8585]">總回覆</span>
          </div>
          <p className="text-3xl font-bold text-[#3A3A3A]">{responseCount}</p>
          <div className="flex items-center gap-1 mt-1">
            {weekTrend > 0 ? (
              <><TrendingUp className="w-3 h-3 text-green-500" /><span className="text-[10px] text-green-600">+{weekTrend} vs 上週</span></>
            ) : weekTrend < 0 ? (
              <><TrendingDown className="w-3 h-3 text-red-400" /><span className="text-[10px] text-red-400">{weekTrend} vs 上週</span></>
            ) : (
              <span className="text-[10px] text-[#8A8585]">本週 {weekResponses} 筆</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D8]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Star className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="text-xs text-[#8A8585]">平均評分</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-[#3A3A3A]">{overallAvg ? overallAvg.toFixed(1) : '-'}</span>
            {overallAvg && <span className="text-sm text-[#8A8585]">/ 5</span>}
          </div>
          {overallAvg && (
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={`text-xs ${s <= Math.round(overallAvg!) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D8]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#C5A55A]/10 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-[#C5A55A]" />
            </div>
            <span className="text-xs text-[#8A8585]">折扣碼使用率</span>
          </div>
          <p className="text-3xl font-bold text-[#3A3A3A]">{discountUsageRate}%</p>
          <p className="text-[10px] text-[#8A8585] mt-1">{usedCodes}/{totalCodes} 已核銷</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D8]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#C5A55A]/10 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-[#C5A55A]" />
            </div>
            <span className="text-xs text-[#8A8585]">問卷</span>
          </div>
          <p className="text-3xl font-bold text-[#3A3A3A]">{surveyCount}</p>
          <p className="text-[10px] text-[#8A8585] mt-1">{activeSurveyCount} 份啟用中</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ════ Left Column (2/3) ════ */}
        <div className="lg:col-span-2 space-y-6">
          {/* 7-day chart */}
          {dailyCounts.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[#3A3A3A]">7 日回覆趨勢</h2>
                <span className="text-xs text-[#8A8585]">本週共 {weekResponses} 筆</span>
              </div>
              <div className="flex items-end gap-2 h-28">
                {dailyCounts.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-[#C5A55A]">
                      {d.count > 0 ? d.count : ''}
                    </span>
                    <div className="w-full">
                      <div
                        className="w-full bg-gradient-to-t from-[#C5A55A] to-[#E8D5A0] rounded-t-md"
                        style={{
                          height: `${Math.max((d.count / maxDailyCount) * 70, d.count > 0 ? 8 : 2)}px`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-[#8A8585]">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent responses */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8]">
            <div className="px-5 py-4 border-b border-[#E8E2D8] flex items-center justify-between">
              <h2 className="font-bold text-[#3A3A3A]">最近回覆</h2>
              {recentResponses.length > 0 && (
                <Link
                  href="/dashboard/surveys"
                  className="text-xs text-[#C5A55A] hover:text-[#A08735] transition-colors"
                >
                  查看全部
                </Link>
              )}
            </div>
            {recentResponses.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm text-[#3A3A3A] font-medium">尚無回覆</p>
                <p className="text-xs text-[#8A8585] mt-1">建立問卷並分享給客人，回覆會顯示在這裡</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E2D8]">
                {recentResponses.map((r) => {
                  // Try to extract an overall sentiment
                  const ratingValues: number[] = [];
                  if (r.answers) {
                    for (const [, v] of Object.entries(r.answers)) {
                      const n = Number(v);
                      if (!isNaN(n) && n >= 1 && n <= 5) ratingValues.push(n);
                    }
                  }
                  const avg = ratingValues.length > 0
                    ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
                    : null;

                  return (
                    <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[#3A3A3A] font-medium">
                              {r.respondent_name || '匿名'}
                            </p>
                            {avg && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                avg >= 4 ? 'bg-green-50 text-green-600'
                                : avg >= 3 ? 'bg-yellow-50 text-yellow-600'
                                : 'bg-red-50 text-red-500'
                              }`}>
                                {avg.toFixed(1)}
                              </span>
                            )}
                            {r.xp_earned != null && r.xp_earned > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-[#FFD700]/10 text-[#A08735] rounded-full">
                                {r.xp_earned} XP
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#8A8585]">{r.survey_title}</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#8A8585] shrink-0">
                        {new Date(r.submitted_at).toLocaleDateString('zh-TW', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════ Right Column (1/3) ════ */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
            <h2 className="font-bold text-[#3A3A3A] mb-3">快速操作</h2>
            <div className="space-y-2">
              <Link
                href="/dashboard/surveys?action=create"
                className="flex items-center gap-3 w-full px-4 py-3 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors"
              >
                <Plus className="w-4 h-4" />
                建立新問卷
              </Link>
              <Link
                href="/dashboard/surveys"
                className="flex items-center gap-3 w-full px-4 py-3 bg-[#FAF7F2] text-[#3A3A3A] text-sm rounded-xl hover:bg-[#F0EBE1] transition-colors border border-[#E8E2D8]"
              >
                <ClipboardList className="w-4 h-4 text-[#C5A55A]" />
                管理問卷
              </Link>
            </div>
          </div>

          {/* Today's highlight */}
          <div className="bg-gradient-to-br from-[#C5A55A] to-[#A08735] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 opacity-80" />
              <span className="text-xs opacity-80">今日摘要</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-2xl font-bold">{todayResponses}</div>
                <div className="text-[10px] opacity-70">新回覆</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{activeSurveyCount}</div>
                <div className="text-[10px] opacity-70">進行中問卷</div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
            <h2 className="font-bold text-[#3A3A3A] mb-3">小訣竅</h2>
            <div className="space-y-3 text-xs text-[#8A8585]">
              <div className="flex gap-2">
                <span className="shrink-0">1.</span>
                <span>把 QR Code 列印出來放在<strong className="text-[#3A3A3A]">桌上立牌</strong>或<strong className="text-[#3A3A3A]">櫃台</strong>，客人掃碼即填</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0">2.</span>
                <span>啟用<strong className="text-[#3A3A3A]">折扣獎勵</strong>讓客人更有動力填寫，回覆率可提升 3 倍</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0">3.</span>
                <span>定期查看<strong className="text-[#3A3A3A]">文字回饋</strong>，這是最有價值的改進依據</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
