export const dynamic = "force-dynamic";
import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { surveys, responses } from '@/lib/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { templates } from '@/lib/templates';
import { Plus } from 'lucide-react';
import SurveyDeleteButton from './SurveyDeleteButton';
import SurveyToggle from '@/components/dashboard/SurveyToggle';
import type { TemplateId, Question } from '@/types/survey';
import { getSelectedStore } from '@/lib/store-context';

const ratingEmoji = (v: number) =>
  v >= 4.5 ? '😍' : v >= 3.5 ? '😊' : v >= 2.5 ? '😐' : v >= 1.5 ? '😕' : '😢';

export default async function SurveysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const store = await getSelectedStore(session.user.id);
  if (!store) redirect('/dashboard/new-store');

  const surveyList = await db
    .select()
    .from(surveys)
    .where(eq(surveys.store_id, store.id))
    .orderBy(desc(surveys.created_at));

  const surveyIds = surveyList.map(s => s.id);

  // Fetch recent responses
  let allResponses: Array<{
    id: string;
    survey_id: string;
    respondent_name: string | null;
    submitted_at: Date | null;
    answers: unknown;
    xp_earned: number | null;
  }> = [];

  if (surveyIds.length > 0) {
    allResponses = await db
      .select({
        id: responses.id,
        survey_id: responses.survey_id,
        respondent_name: responses.respondent_name,
        submitted_at: responses.submitted_at,
        answers: responses.answers,
        xp_earned: responses.xp_earned,
      })
      .from(responses)
      .where(inArray(responses.survey_id, surveyIds))
      .orderBy(desc(responses.submitted_at))
      .limit(50);
  }

  // Group responses by survey
  const responsesBySurvey: Record<string, typeof allResponses> = {};
  for (const r of allResponses) {
    if (!responsesBySurvey[r.survey_id]) responsesBySurvey[r.survey_id] = [];
    responsesBySurvey[r.survey_id].push(r);
  }

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="text-2xl">💬</span> 顧客心聲
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">看看客人怎麼說你的店</p>
        </div>
        <Link
          href="/dashboard/surveys/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 active:scale-[0.97] transition-all shadow-md shadow-orange-500/25"
        >
          <Plus className="w-4 h-4" />
          新問卷
        </Link>
      </div>

      {surveyList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-16 px-6 shadow-sm">
          <div className="text-5xl mb-4 yuzu-float">📋</div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">還沒有問卷</h2>
          <p className="text-sm text-slate-500 mb-6">建立第一份問卷，開始聽顧客的聲音</p>
          <Link
            href="/dashboard/surveys/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/25"
          >
            <Plus className="w-4 h-4" />
            建立問卷
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {surveyList.map((survey) => {
            const template = templates[survey.template_id as TemplateId];
            const accentColor = template?.colors.primary || '#f97316';
            const surveyResponses = responsesBySurvey[survey.id] || [];
            const recentResponses = surveyResponses.slice(0, 3);
            const questions = (survey.questions || []) as Question[];
            const ratingQIds = questions.filter(q => q.type === 'rating' || q.type === 'emoji-rating').map(q => q.id);

            return (
              <div key={survey.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Accent top bar */}
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)` }} />

                {/* Survey header */}
                <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-black shadow-md"
                        style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
                        {survey.title.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate leading-tight">{survey.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400 font-medium">
                            {surveyResponses.length > 0 ? `${surveyResponses.length} 則回覆` : '尚無回覆'}
                          </span>
                          {surveyResponses.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                              ● 收集中
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <SurveyToggle surveyId={survey.id} initialActive={survey.is_active ?? false} />
                    </div>
                  </div>
                </div>

                {/* Customer voices */}
                {recentResponses.length === 0 ? (
                  <div className="px-5 py-7 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">📭</div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">還沒有回覆</p>
                    <p className="text-xs text-slate-400 mb-3">把 QR Code 放到桌上，客人掃一掃就能留回饋</p>
                    <Link href={`/dashboard/surveys/${survey.id}/qrcode`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 text-xs font-bold rounded-lg hover:bg-orange-100 transition-colors border border-orange-200">
                      取得 QR Code →
                    </Link>
                  </div>
                ) : (
                  <div>
                    {recentResponses.map((r) => {
                      const answers = r.answers as Record<string, unknown>;
                      const ratingValues = ratingQIds
                        .map(qId => Number(answers?.[qId]))
                        .filter(v => !isNaN(v) && v > 0);
                      const avg = ratingValues.length > 0
                        ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
                        : null;
                      const textAnswer = Object.values(answers || {}).find(
                        v => typeof v === 'string' && v.length > 3 && isNaN(Number(v))
                      ) as string | undefined;
                      const submittedAt = r.submitted_at ? new Date(r.submitted_at).getTime() : Date.now();
                      const diff = Date.now() - submittedAt;
                      const mins = Math.floor(diff / 60000);
                      const timeAgo = mins < 60 ? `${mins} 分前`
                        : mins < 1440 ? `${Math.floor(mins / 60)} 小時前`
                        : `${Math.floor(mins / 1440)} 天前`;

                      return (
                        <div key={r.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                          {avg != null ? (
                            <div className="shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center text-center"
                              style={{ background: avg >= 4 ? '#f0fdf4' : avg >= 3 ? '#fefce8' : '#fef2f2', border: `1.5px solid ${avg >= 4 ? '#bbf7d0' : avg >= 3 ? '#fef08a' : '#fecaca'}` }}>
                              <span className="text-lg leading-none">{ratingEmoji(avg)}</span>
                              <span className={`text-[9px] font-black leading-none mt-0.5 ${avg >= 4 ? 'text-green-600' : avg >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
                                {avg.toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                              <span className="text-slate-400 text-xs font-bold">匿</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-slate-800">{r.respondent_name || '匿名顧客'}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{timeAgo}</span>
                            </div>
                            {textAnswer ? (
                              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                &ldquo;{textAnswer}&rdquo;
                              </p>
                            ) : avg != null ? (
                              <p className="text-xs text-slate-400 font-medium">
                                {avg >= 4.5 ? '⭐ 超滿意的回覆！' : avg >= 3.5 ? '👍 正面回饋' : avg >= 2.5 ? '😐 普通評價' : '⚠️ 需要關注'}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    {surveyResponses.length > 3 && (
                      <Link href={`/dashboard/surveys/${survey.id}`}
                        className="flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors border-t border-slate-100">
                        查看全部 {surveyResponses.length} 則回覆 →
                      </Link>
                    )}
                  </div>
                )}

                {/* Action bar */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                  <a href={`/s/${survey.id}?preview=1`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 active:scale-[0.97] transition-all shadow-sm">
                    👁️ 體驗
                  </a>
                  <Link href={`/dashboard/surveys/${survey.id}/qrcode`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600 active:scale-[0.97] transition-all shadow-sm">
                    📱 QR Code
                  </Link>
                  <Link href={`/dashboard/surveys/${survey.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-900 active:scale-[0.97] transition-all">
                    ✏️ 編輯
                  </Link>
                  <Link href={`/dashboard/surveys/${survey.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-900 active:scale-[0.97] transition-all">
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
