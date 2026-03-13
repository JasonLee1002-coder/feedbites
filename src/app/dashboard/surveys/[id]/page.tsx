import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { templates } from '@/lib/templates';
import { ArrowLeft, TrendingUp, TrendingDown, Flame, Zap, Crown, Target, BarChart3, MessageCircle, Printer, Download, Copy } from 'lucide-react';
import type { TemplateId, Question, SurveyResponse, DiscountTier } from '@/types/survey';
import SurveyDetailClient from './SurveyDetailClient';
import { getSelectedStore } from '@/lib/store-context';

interface PageProps {
  params: Promise<{ id: string }>;
}

/* ── emoji helpers ── */
const ratingEmoji = (v: number) =>
  v >= 4.5 ? '😍' : v >= 3.5 ? '😊' : v >= 2.5 ? '😐' : v >= 1.5 ? '😕' : '😢';

const ratingColor = (v: number) =>
  v >= 4 ? { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: '#22c55e' }
  : v >= 3 ? { bg: 'bg-amber-50', text: 'text-amber-600', bar: '#f59e0b' }
  : { bg: 'bg-red-50', text: 'text-red-500', bar: '#ef4444' };

export default async function SurveyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();

  const store = await getSelectedStore(user.id);
  if (!store) redirect('/register?setup=true');

  const { data: survey } = await adminDb
    .from('surveys')
    .select('*')
    .eq('id', id)
    .eq('store_id', store.id)
    .single();

  if (!survey) notFound();

  const { data: responses } = await adminDb
    .from('responses')
    .select('*')
    .eq('survey_id', id)
    .order('submitted_at', { ascending: false });

  const responseList: SurveyResponse[] = responses || [];
  const template = templates[survey.template_id as TemplateId];
  const questions: Question[] = survey.questions || [];
  const publicUrl = `https://feedbites-seven.vercel.app/s/${survey.id}`;

  const { data: discountCodes } = await adminDb
    .from('discount_codes')
    .select('is_used, created_at, expires_at')
    .eq('survey_id', id);

  // ── Stats ──
  const totalResponses = responseList.length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayResponses = responseList.filter(r => r.submitted_at.slice(0, 10) === todayStr).length;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const weekResponses = responseList.filter(r => r.submitted_at >= weekAgo).length;
  const prevWeekStart = new Date(Date.now() - 14 * 86400000).toISOString();
  const prevWeekResponses = responseList.filter(r => r.submitted_at >= prevWeekStart && r.submitted_at < weekAgo).length;

  const totalCodes = discountCodes?.length || 0;
  const usedCodes = discountCodes?.filter(c => c.is_used).length || 0;
  const codeUsageRate = totalCodes > 0 ? Math.round((usedCodes / totalCodes) * 100) : 0;
  const weekTrend = weekResponses - prevWeekResponses;

  // ── Ratings ──
  const avgRatings: Record<string, number> = {};
  const ratingQuestions = questions.filter(q => q.type === 'rating' || q.type === 'emoji-rating');
  for (const q of ratingQuestions) {
    const values = responseList
      .map(r => Number(r.answers[q.id]))
      .filter(v => !isNaN(v) && v > 0);
    if (values.length > 0) {
      avgRatings[q.id] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  const overallAvg = Object.keys(avgRatings).length > 0
    ? Object.values(avgRatings).reduce((a, b) => a + b, 0) / Object.values(avgRatings).length
    : null;

  // ── Radio answer distribution ──
  const radioQuestions = questions.filter(q => q.type === 'radio' || q.type === 'radio-with-reason');
  const radioStats: Record<string, { label: string; options: { name: string; count: number; pct: number }[] }> = {};
  for (const q of radioQuestions) {
    if (!q.options || q.options.length === 0) continue;
    const counts: Record<string, number> = {};
    q.options.forEach(o => { counts[o] = 0; });
    for (const r of responseList) {
      const val = r.answers[q.id] as string;
      if (val && counts[val] !== undefined) counts[val]++;
    }
    const totalForQ = Object.values(counts).reduce((a, b) => a + b, 0);
    radioStats[q.id] = {
      label: q.title || q.label || '',
      options: q.options.map(o => ({
        name: o,
        count: counts[o],
        pct: totalForQ > 0 ? Math.round((counts[o] / totalForQ) * 100) : 0,
      })),
    };
  }

  // ── 7-day trend ──
  const dailyCounts: { label: string; count: number; weekday: string }[] = [];
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    dailyCounts.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: weekdayNames[d.getDay()],
      count: responseList.filter(r => r.submitted_at.slice(0, 10) === ds).length,
    });
  }
  const maxDailyCount = Math.max(...dailyCounts.map(d => d.count), 1);

  // ── XP / Tier distribution ──
  const isAdvancedDiscount = survey.discount_mode === 'advanced' && survey.discount_tiers;
  const tiers: DiscountTier[] = isAdvancedDiscount ? survey.discount_tiers : [];
  const tierStats = tiers.map(tier => {
    const count = responseList.filter(r => {
      const xp = r.xp_earned || 0;
      if (tier.max_xp === null) return xp >= tier.min_xp;
      return xp >= tier.min_xp && xp <= tier.max_xp;
    }).length;
    return { ...tier, count, pct: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0 };
  });

  // ── Completion rate ──
  const requiredQs = questions.filter(q => q.required);
  const completedResponses = responseList.filter(r =>
    requiredQs.every(q => {
      const val = r.answers[q.id];
      return val !== undefined && val !== null && val !== '';
    })
  ).length;
  const completionRate = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;

  // ── Rating distribution ──
  const ratingDistribution = [0, 0, 0, 0, 0];
  for (const q of ratingQuestions) {
    for (const r of responseList) {
      const v = Number(r.answers[q.id]);
      if (v >= 1 && v <= 5) ratingDistribution[v - 1]++;
    }
  }
  const totalRatingVotes = ratingDistribution.reduce((a, b) => a + b, 0);

  // ── Top keyword from text feedback ──
  const allTextAnswers: string[] = [];
  const textQs = questions.filter(q => q.type === 'text' || q.type === 'textarea');
  for (const r of responseList) {
    for (const q of textQs) {
      const v = r.answers[q.id] as string;
      if (v && v.trim()) allTextAnswers.push(v.trim());
    }
    // reasons too
    for (const [k, v] of Object.entries(r.answers)) {
      if (k.endsWith('_reason') && v && typeof v === 'string' && v.trim()) {
        allTextAnswers.push(v.trim());
      }
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard/surveys"
        className="inline-flex items-center gap-1.5 text-sm text-[#8A8585] hover:text-[#A08735] mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回問卷列表
      </Link>

      {/* ════ Hero Header ════ */}
      <div className="relative bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 lg:p-8 mb-6 overflow-hidden">
        {/* decorative circles */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#C5A55A]/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-20 w-24 h-24 bg-[#C5A55A]/5 rounded-full translate-y-1/2" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white font-serif mb-2">{survey.title}</h1>
            <div className="flex items-center gap-3 text-sm text-white/50">
              {template && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: template.colors.primary }} />
                  {template.name}
                </span>
              )}
              <span>{new Date(survey.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              <span>{questions.length} 題</span>
            </div>

            {/* Hero stats row */}
            {totalResponses > 0 && (
              <div className="flex items-center gap-5 mt-5">
                <div>
                  <div className="text-3xl font-black text-white">{totalResponses}</div>
                  <div className="text-[10px] text-white/40 tracking-wide uppercase">回覆</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-3xl font-black text-[#FFD700]">{overallAvg ? overallAvg.toFixed(1) : '-'}</span>
                    {overallAvg && <span className="text-2xl">{ratingEmoji(overallAvg)}</span>}
                  </div>
                  <div className="text-[10px] text-white/40 tracking-wide uppercase">平均評分</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-3xl font-black text-emerald-400">{todayResponses}</span>
                    {weekTrend > 0 && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    {weekTrend < 0 && <TrendingDown className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="text-[10px] text-white/40 tracking-wide uppercase">今日</div>
                </div>
              </div>
            )}
          </div>
          <SurveyDetailClient
            surveyId={survey.id}
            isActive={survey.is_active}
            hasResponses={totalResponses > 0}
          />
        </div>
      </div>

      {/* ════ Mini KPI Strips ════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[#E8E2D8] px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#3A3A3A]">{completionRate}%</div>
            <div className="text-[10px] text-[#8A8585]">完成率</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E8E2D8] px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#3A3A3A]">{weekResponses}</div>
            <div className="text-[10px] text-[#8A8585]">本週回覆</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E8E2D8] px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#3A3A3A]">{codeUsageRate}%</div>
            <div className="text-[10px] text-[#8A8585]">折扣核銷率</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E8E2D8] px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#3A3A3A]">{allTextAnswers.length}</div>
            <div className="text-[10px] text-[#8A8585]">文字回饋</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ════ Left Column (2/3) ════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* 7-Day Trend */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#3A3A3A] flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                7 日回覆趨勢
              </h2>
              {weekTrend !== 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  weekTrend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                }`}>
                  {weekTrend > 0 ? '+' : ''}{weekTrend} vs 上週
                </span>
              )}
            </div>
            <div className="flex items-end gap-1.5 h-36">
              {dailyCounts.map((d, i) => {
                const isToday = i === dailyCounts.length - 1;
                const pct = (d.count / maxDailyCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-xs font-bold ${isToday ? 'text-[#C5A55A]' : 'text-[#8A8585]'}`}>
                      {d.count > 0 ? d.count : ''}
                    </span>
                    <div className="w-full flex justify-center">
                      <div
                        className={`w-full max-w-[36px] rounded-lg transition-all ${
                          isToday
                            ? 'bg-gradient-to-t from-[#C5A55A] to-[#FFD700] shadow-md shadow-[#C5A55A]/20'
                            : 'bg-gradient-to-t from-[#E8E2D8] to-[#F3F0E8]'
                        }`}
                        style={{
                          height: `${Math.max(pct, d.count > 0 ? 10 : 4)}px`,
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className={`text-[10px] font-medium ${isToday ? 'text-[#C5A55A]' : 'text-[#8A8585]'}`}>
                        {d.label}
                      </div>
                      <div className="text-[9px] text-[#8A8585]/60">({d.weekday})</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-question Ratings — visual cards */}
          {ratingQuestions.length > 0 && Object.keys(avgRatings).length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h2 className="font-bold text-[#3A3A3A] mb-4">各項評分</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {ratingQuestions.map((q) => {
                  const avg = avgRatings[q.id];
                  if (avg === undefined) return null;
                  const rc = ratingColor(avg);
                  return (
                    <div key={q.id} className={`${rc.bg} rounded-xl p-4 border border-transparent`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#3A3A3A]">{q.title || q.label}</span>
                        <span className="text-xl">{ratingEmoji(avg)}</span>
                      </div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className={`text-2xl font-black ${rc.text}`}>{avg.toFixed(1)}</span>
                        <span className="text-xs text-[#8A8585]">/ 5</span>
                      </div>
                      <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(avg / 5) * 100}%`, backgroundColor: rc.bar }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rating Distribution */}
          {totalRatingVotes > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h2 className="font-bold text-[#3A3A3A] mb-4">評分分佈</h2>
              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = ratingDistribution[star - 1];
                  const pct = totalRatingVotes > 0 ? Math.round((count / totalRatingVotes) * 100) : 0;
                  const emoji = star === 5 ? '😍' : star === 4 ? '😊' : star === 3 ? '😐' : star === 2 ? '😕' : '😢';
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-base w-6 text-center">{emoji}</span>
                      <span className="text-xs w-6 text-right text-[#8A8585] font-medium">{star}</span>
                      <div className="flex-1 h-4 bg-[#F3F0E8] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: star >= 4 ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                              : star === 3 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                              : 'linear-gradient(90deg, #ef4444, #f87171)',
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#8A8585] w-20 text-right font-medium">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Radio Answer Distribution */}
          {Object.keys(radioStats).length > 0 && totalResponses > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h2 className="font-bold text-[#3A3A3A] mb-4">選項統計</h2>
              <div className="space-y-6">
                {Object.entries(radioStats).map(([qId, stat]) => {
                  const sorted = [...stat.options].sort((a, b) => b.count - a.count);
                  const topOption = sorted[0];
                  return (
                    <div key={qId}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-[#3A3A3A]">{stat.label}</h3>
                        {topOption && topOption.count > 0 && (
                          <span className="text-[10px] px-2 py-0.5 bg-[#C5A55A]/10 text-[#A08735] rounded-full font-medium">
                            TOP: {topOption.name}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {sorted.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {i === 0 && opt.count > 0 && <Crown className="w-3.5 h-3.5 text-[#C5A55A] shrink-0" />}
                            {(i > 0 || opt.count === 0) && <div className="w-3.5 shrink-0" />}
                            <span className="text-xs text-[#3A3A3A] w-32 shrink-0 truncate">{opt.name}</span>
                            <div className="flex-1 h-3 bg-[#F3F0E8] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${opt.pct}%`,
                                  background: i === 0 ? 'linear-gradient(90deg, #C5A55A, #E8D5A0)' : '#D4C48A',
                                }}
                              />
                            </div>
                            <span className="text-xs text-[#3A3A3A] w-16 text-right shrink-0 font-medium">
                              {opt.count} <span className="text-[#8A8585] font-normal">({opt.pct}%)</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ════ Right Column (1/3) ════ */}
        <div className="space-y-6">

          {/* QR Code */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 text-center">
            <h2 className="font-bold text-[#3A3A3A] mb-4">QR Code</h2>
            <div className="inline-block p-3 bg-white rounded-xl border-2 border-dashed border-[#E8E2D8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`}
                alt="Survey QR Code"
                width={200}
                height={200}
                className="block"
              />
            </div>
            <p className="text-xs text-[#8A8585] mt-3 mb-2">列印放在桌上，客人掃碼即填</p>
            <code className="inline-block text-[10px] bg-[#FAF7F2] px-3 py-1.5 rounded-lg text-[#8A8585] border border-[#E8E2D8] break-all max-w-full mb-3">
              {publicUrl}
            </code>
            <Link
              href={`/dashboard/surveys/${survey.id}/qrcode`}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-[#C5A55A] to-[#E8D5A0] text-white text-sm font-bold rounded-xl hover:shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              精美花框列印
            </Link>
          </div>

          {/* ── Discount Section ── */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
            <h2 className="font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              折扣獎勵
            </h2>
            {survey.discount_enabled ? (
              <>
                {isAdvancedDiscount ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-[#C5A55A] to-[#FFD700] text-white rounded-full font-bold shadow-sm">
                        進階分層
                      </span>
                      <span className="text-[10px] text-[#8A8585]">有效 {survey.discount_expiry_days} 天</span>
                    </div>
                    <div className="space-y-2">
                      {tierStats.map((tier, i) => {
                        const tierBgs = [
                          'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100',
                          'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200',
                          'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200',
                          'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200',
                        ];
                        return (
                          <div key={i} className={`rounded-xl p-3 border ${tierBgs[i] || 'bg-[#FAF7F2]'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xl">{tier.emoji}</span>
                                <span className="text-sm font-bold text-[#3A3A3A]">{tier.name}</span>
                              </div>
                              {totalResponses > 0 && (
                                <span className="text-xs font-bold text-[#C5A55A]">{tier.count}人</span>
                              )}
                            </div>
                            <div className="text-sm font-bold text-[#3A3A3A] mb-1">
                              {tier.discount_value}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#8A8585]">
                                {tier.min_xp}{tier.max_xp !== null ? `–${tier.max_xp}` : '+'} XP
                              </span>
                              {totalResponses > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="w-16 h-1.5 bg-white/80 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#C5A55A] rounded-full"
                                      style={{ width: `${tier.pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-[#8A8585]">{tier.pct}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#FAF7F2] rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#8A8585]">類型</span>
                      <span className="text-[#3A3A3A] font-medium">
                        {survey.discount_type === 'percentage' && '百分比折扣'}
                        {survey.discount_type === 'fixed' && '固定金額'}
                        {survey.discount_type === 'freebie' && '免費贈品'}
                        {survey.discount_type === 'custom_text' && '自訂'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A8585]">內容</span>
                      <span className="text-[#3A3A3A] font-bold">{survey.discount_value}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A8585]">有效天數</span>
                      <span className="text-[#3A3A3A] font-medium">{survey.discount_expiry_days} 天</span>
                    </div>
                  </div>
                )}

                {totalCodes > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#E8E2D8]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#8A8585]">核銷率</span>
                      <span className="text-sm font-bold text-[#C5A55A]">{codeUsageRate}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#F3F0E8] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C5A55A] to-[#FFD700]"
                        style={{ width: `${codeUsageRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-[#8A8585]">已發 {totalCodes} 張</span>
                      <span className="text-[10px] text-emerald-600 font-medium">已核銷 {usedCodes} 張</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[#8A8585]">未啟用折扣獎勵</p>
            )}
          </div>

          {/* Questions List */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
            <h2 className="font-bold text-[#3A3A3A] mb-3">問題列表 ({questions.length})</h2>
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {questions.map((q, i) => {
                const typeLabels: Record<string, string> = {
                  radio: '單選', checkbox: '多選', rating: '評分', text: '文字',
                  textarea: '長文', number: '數字', 'emoji-rating': '表情',
                  'radio-with-reason': '單選+原因', 'rating-with-reason': '評分+原因',
                  'section-header': '分類', 'dish-group': '菜色',
                };
                const typeColors: Record<string, string> = {
                  'emoji-rating': 'bg-yellow-50 text-yellow-700',
                  radio: 'bg-blue-50 text-blue-700',
                  'radio-with-reason': 'bg-purple-50 text-purple-700',
                  textarea: 'bg-emerald-50 text-emerald-700',
                };
                return (
                  <div key={q.id} className="flex items-center gap-2 py-1.5">
                    <span className="w-5 h-5 rounded-md bg-[#C5A55A] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-[#3A3A3A] flex-1 truncate">{q.title || q.label || q.dishName || '—'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${
                      typeColors[q.type] || 'bg-[#FAF7F2] text-[#8A8585]'
                    }`}>
                      {typeLabels[q.type] || q.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ════ Responses Section ════ */}
      <div className="mt-6 bg-white rounded-2xl border border-[#E8E2D8] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[#3A3A3A] text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#C5A55A]" />
            客人回饋 ({totalResponses})
          </h2>
        </div>

        {responseList.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-base text-[#3A3A3A] font-medium">還沒有收到回覆</p>
            <p className="text-sm text-[#8A8585] mt-1">把 QR Code 放在桌上或櫃台，客人掃描就能填寫問卷</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {responseList.slice(0, 30).map((response) => {
              const submittedDate = new Date(response.submitted_at).toLocaleDateString('zh-TW', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const ratingEntries = ratingQuestions
                .map(q => ({
                  label: q.title || q.label || '評分',
                  value: Number(response.answers[q.id]),
                }))
                .filter(e => !isNaN(e.value) && e.value > 0);

              const textFeedback = textQs
                .map(q => ({
                  label: q.title || q.label || '回饋',
                  value: response.answers[q.id] as string,
                }))
                .filter(e => e.value && e.value.trim().length > 0);

              const reasonEntries = Object.entries(response.answers)
                .filter(([k, v]) => k.endsWith('_reason') && v && typeof v === 'string' && v.trim().length > 0)
                .map(([, v]) => v as string);

              const radioAnswers = radioQuestions
                .map(q => ({
                  label: q.title || q.label || '',
                  value: response.answers[q.id] as string,
                }))
                .filter(e => e.value && e.value.trim().length > 0);

              const avgScore = ratingEntries.length > 0
                ? (ratingEntries.reduce((a, e) => a + e.value, 0) / ratingEntries.length)
                : null;

              const initials = response.respondent_name
                ? response.respondent_name.slice(0, 1)
                : '?';

              const hasFeedback = textFeedback.length > 0 || reasonEntries.length > 0;

              return (
                <div key={response.id} className={`rounded-xl p-4 border transition-all hover:shadow-md ${
                  avgScore && avgScore >= 4.5
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : avgScore && avgScore < 2.5
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-[#E8E2D8] bg-white'
                }`}>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                      avgScore && avgScore >= 4 ? 'bg-emerald-400'
                      : avgScore && avgScore >= 3 ? 'bg-amber-400'
                      : avgScore ? 'bg-red-400'
                      : 'bg-[#C5A55A]'
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#3A3A3A] truncate">
                          {response.respondent_name || '匿名'}
                        </span>
                        {avgScore && (
                          <span className="text-sm">{ratingEmoji(avgScore)}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#8A8585]">{submittedDate}</span>
                    </div>
                    {avgScore && (
                      <div className={`text-lg font-black shrink-0 ${ratingColor(avgScore).text}`}>
                        {avgScore.toFixed(1)}
                      </div>
                    )}
                  </div>

                  {/* Star ratings visual */}
                  {ratingEntries.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {ratingEntries.map((entry, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className="text-[10px] text-[#8A8585] w-16 shrink-0 truncate">{entry.label}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <span key={s} className={`text-[10px] ${s <= entry.value ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {radioAnswers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {radioAnswers.map((entry, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-[#C5A55A]/10 text-[#A08735] rounded-full font-medium">
                          {entry.value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Text feedback — highlight box */}
                  {hasFeedback && (
                    <div className="mt-2 bg-white/80 rounded-lg p-2.5 border border-[#E8E2D8]/50">
                      {textFeedback.map((entry, i) => (
                        <p key={i} className="text-xs text-[#3A3A3A] leading-relaxed">
                          {entry.value}
                        </p>
                      ))}
                      {reasonEntries.map((reason, i) => (
                        <p key={`r-${i}`} className="text-xs text-[#8A8585] italic mt-0.5">
                          「{reason}」
                        </p>
                      ))}
                    </div>
                  )}

                  {/* XP badge */}
                  {response.xp_earned != null && response.xp_earned > 0 && (
                    <div className="flex justify-end mt-2">
                      <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-[#FFD700]/20 to-[#C5A55A]/20 text-[#A08735] rounded-full font-bold">
                        +{response.xp_earned} XP
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {responseList.length > 30 && (
          <p className="text-center text-xs text-[#8A8585] pt-4">
            僅顯示最近 30 筆，共 {totalResponses} 筆回覆
          </p>
        )}
      </div>
    </div>
  );
}
