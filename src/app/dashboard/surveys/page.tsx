export const dynamic = "force-dynamic";
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { templates } from '@/lib/templates';
import { Plus } from 'lucide-react';
import SurveyDeleteButton from './SurveyDeleteButton';
import type { TemplateId, Question } from '@/types/survey';
import { getSelectedStore } from '@/lib/store-context';

const ratingEmoji = (v: number) =>
  v >= 4.5 ? '😍' : v >= 3.5 ? '😊' : v >= 2.5 ? '😐' : v >= 1.5 ? '😕' : '😢';

export default async function SurveysPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();

  const store = await getSelectedStore(user.id);
  if (!store) redirect('/dashboard/new-store');

  const { data: surveys } = await adminDb
    .from('surveys')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });

  const surveyIds = (surveys || []).map(s => s.id);

  // Fetch recent responses with answers
  let allResponses: Array<{
    id: string;
    survey_id: string;
    respondent_name: string | null;
    submitted_at: string;
    answers: Record<string, string | string[]>;
    xp_earned?: number | null;
  }> = [];

  if (surveyIds.length > 0) {
    const { data } = await adminDb
      .from('responses')
      .select('id, survey_id, respondent_name, submitted_at, answers, xp_earned')
      .in('survey_id', surveyIds)
      .order('submitted_at', { ascending: false })
      .limit(50);
    allResponses = data || [];
  }

  // Group responses by survey
  const responsesBySurvey: Record<string, typeof allResponses> = {};
  for (const r of allResponses) {
    if (!responsesBySurvey[r.survey_id]) responsesBySurvey[r.survey_id] = [];
    responsesBySurvey[r.survey_id].push(r);
  }

  const surveyList = surveys || [];

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#3A3A3A] font-serif flex items-center gap-2">
            💬 顧客心聲
          </h1>
          <p className="text-sm text-[#8A8585] mt-1">看看客人怎麼說你的店</p>
        </div>
        <Link
          href="/dashboard/surveys/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C5A55A] text-white text-sm font-bold rounded-xl hover:bg-[#A08735] transition-colors"
        >
          <Plus className="w-4 h-4" />
          新問卷
        </Link>
      </div>

      {surveyList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E2D8] text-center py-16 px-6">
          <div className="text-5xl mb-4 yuzu-float">📋</div>
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">還沒有問卷</h2>
          <p className="text-sm text-[#8A8585] mb-6">建立第一份問卷，開始聽顧客的聲音</p>
          <Link
            href="/dashboard/surveys/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A55A] text-white text-sm font-bold rounded-xl hover:bg-[#A08735] transition-colors"
          >
            <Plus className="w-4 h-4" />
            建立問卷
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {surveyList.map((survey) => {
            const template = templates[survey.template_id as TemplateId];
            const responses = responsesBySurvey[survey.id] || [];
            const recentResponses = responses.slice(0, 3);
            const questions = (survey.questions || []) as Question[];
            const ratingQIds = questions.filter(q => q.type === 'rating' || q.type === 'emoji-rating').map(q => q.id);

            return (
              <div key={survey.id} className="bg-white rounded-2xl border border-[#E8E2D8] overflow-hidden yuzu-health-card">
                {/* Survey header — compact */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-[#E8E2D8]/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: template?.colors.primary || '#C5A55A' }}
                    />
                    <h3 className="font-bold text-[#3A3A3A] truncate">{survey.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      survey.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {survey.is_active ? '啟用中' : '停用'}
                    </span>
                  </div>

                  <span className="text-xs text-[#8A8585]">{responses.length} 則回覆</span>
                </div>

                {/* Customer voices — the main content */}
                {recentResponses.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <div className="text-3xl mb-2">📭</div>
                    <p className="text-sm text-[#8A8585]">還沒有回覆，分享 QR Code 給客人吧</p>
                    <Link
                      href={`/dashboard/surveys/${survey.id}/qrcode`}
                      className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-[#C5A55A]/10 text-[#A08735] text-xs font-medium rounded-lg hover:bg-[#C5A55A]/20 transition-colors"
                    >
                      列印 QR Code →
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E8E2D8]/50">
                    {recentResponses.map((r) => {
                      // Calculate avg rating
                      const ratingValues = ratingQIds
                        .map(qId => Number(r.answers?.[qId]))
                        .filter(v => !isNaN(v) && v > 0);
                      const avg = ratingValues.length > 0
                        ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
                        : null;

                      // Find a text answer to show
                      const textAnswer = Object.values(r.answers || {}).find(
                        v => typeof v === 'string' && v.length > 3 && isNaN(Number(v))
                      ) as string | undefined;

                      const timeAgo = (() => {
                        const diff = Date.now() - new Date(r.submitted_at).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 60) return `${mins} 分鐘前`;
                        const hours = Math.floor(mins / 60);
                        if (hours < 24) return `${hours} 小時前`;
                        const days = Math.floor(hours / 24);
                        return `${days} 天前`;
                      })();

                      return (
                        <div key={r.id} className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            {/* Rating emoji — big and prominent */}
                            {avg != null && (
                              <div className="text-center shrink-0">
                                <div className="text-3xl">{ratingEmoji(avg)}</div>
                                <div className={`text-xs font-bold mt-0.5 ${
                                  avg >= 4 ? 'text-green-600' : avg >= 3 ? 'text-yellow-600' : 'text-red-500'
                                }`}>
                                  {avg.toFixed(1)}
                                </div>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-[#3A3A3A]">
                                  {r.respondent_name || '匿名顧客'}
                                </span>
                                <span className="text-[10px] text-[#8A8585]">{timeAgo}</span>
                              </div>
                              {textAnswer && (
                                <p className="text-sm text-[#3A3A3A] leading-relaxed bg-[#FAF7F2] rounded-lg px-3 py-2 italic">
                                  &ldquo;{textAnswer}&rdquo;
                                </p>
                              )}
                              {!textAnswer && avg != null && (
                                <p className="text-xs text-[#8A8585]">
                                  {avg >= 4.5 ? '超滿意的回覆！' : avg >= 3.5 ? '正面回饋' : avg >= 2.5 ? '普通評價' : '需要關注'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {responses.length > 3 && (
                      <Link
                        href={`/dashboard/surveys/${survey.id}`}
                        className="block px-5 py-3 text-center text-xs text-[#C5A55A] font-medium hover:bg-[#FAF7F2] transition-colors"
                      >
                        查看全部 {responses.length} 則回覆 →
                      </Link>
                    )}
                  </div>
                )}

                {/* Action bar — always visible */}
                <div className="px-4 py-3 bg-[#FAF7F2]/50 border-t border-[#E8E2D8]/50 flex items-center gap-2 flex-wrap">
                  <a
                    href={`/s/${survey.id}?preview=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    👁️ 體驗問卷
                  </a>
                  <Link
                    href={`/dashboard/surveys/${survey.id}/qrcode`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#FF8C00] rounded-lg hover:bg-[#E07800] transition-colors"
                  >
                    📱 QR Code
                  </Link>
                  <Link
                    href={`/dashboard/surveys/${survey.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3A3A3A] bg-white border border-[#E8E2D8] rounded-lg hover:border-[#C5A55A] transition-colors"
                  >
                    ✏️ 編輯問卷
                  </Link>
                  <Link
                    href={`/dashboard/surveys/${survey.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3A3A3A] bg-white border border-[#E8E2D8] rounded-lg hover:border-[#C5A55A] transition-colors"
                  >
                    📊 統計
                  </Link>
                  <div className="ml-auto">
                    <SurveyDeleteButton surveyId={survey.id} surveyTitle={survey.title} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
