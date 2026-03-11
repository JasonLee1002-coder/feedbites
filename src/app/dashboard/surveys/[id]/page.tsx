import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { templates } from '@/lib/templates';
import { ArrowLeft } from 'lucide-react';
import type { TemplateId, Question, SurveyResponse } from '@/types/survey';
import SurveyDetailClient from './SurveyDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SurveyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();

  // Get store
  const { data: store } = await adminDb
    .from('stores')
    .select('id, store_name')
    .eq('user_id', user.id)
    .single();

  if (!store) redirect('/register');

  // Get survey
  const { data: survey } = await adminDb
    .from('surveys')
    .select('*')
    .eq('id', id)
    .eq('store_id', store.id)
    .single();

  if (!survey) notFound();

  // Get responses
  const { data: responses } = await adminDb
    .from('responses')
    .select('*')
    .eq('survey_id', id)
    .order('submitted_at', { ascending: false });

  const responseList: SurveyResponse[] = responses || [];
  const template = templates[survey.template_id as TemplateId];
  const questions: Question[] = survey.questions || [];
  const publicUrl = `https://feedbites-seven.vercel.app/s/${survey.id}`;

  // Calculate stats
  const totalResponses = responseList.length;
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

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard/surveys"
        className="inline-flex items-center gap-1.5 text-sm text-[#8A8585] hover:text-[#A08735] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回問卷列表
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#3A3A3A] font-serif mb-2">{survey.title}</h1>
            <div className="flex items-center gap-3 text-sm text-[#8A8585]">
              {template && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: template.colors.primary }}
                  />
                  {template.name}模板
                </span>
              )}
              <span>
                {new Date(survey.created_at).toLocaleDateString('zh-TW', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
          <SurveyDetailClient surveyId={survey.id} isActive={survey.is_active} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Stats */}
          <div id="stats" className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
            <h2 className="font-bold text-[#3A3A3A] mb-4">統計數據</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FAF7F2] rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-[#C5A55A]">{totalResponses}</div>
                <div className="text-xs text-[#8A8585] mt-1">總回覆數</div>
              </div>
              <div className="bg-[#FAF7F2] rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-[#C5A55A]">
                  {ratingQuestions.length > 0 && Object.keys(avgRatings).length > 0
                    ? (
                        Object.values(avgRatings).reduce((a, b) => a + b, 0) /
                        Object.values(avgRatings).length
                      ).toFixed(1)
                    : '-'}
                </div>
                <div className="text-xs text-[#8A8585] mt-1">平均評分</div>
              </div>
            </div>

            {/* Per-question ratings */}
            {ratingQuestions.length > 0 && Object.keys(avgRatings).length > 0 && (
              <div className="mt-4 space-y-2">
                {ratingQuestions.map((q) => {
                  const avg = avgRatings[q.id];
                  if (avg === undefined) return null;
                  return (
                    <div key={q.id} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-[#8A8585] truncate flex-1">{q.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20 h-1.5 bg-[#E8E2D8] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C5A55A] rounded-full"
                            style={{ width: `${(avg / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-[#3A3A3A] w-8 text-right">
                          {avg.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Discount Info */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
            <h2 className="font-bold text-[#3A3A3A] mb-3">折扣設定</h2>
            {survey.discount_enabled ? (
              <div className="space-y-2 text-sm">
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
                  <span className="text-[#3A3A3A] font-medium">{survey.discount_value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8585]">有效天數</span>
                  <span className="text-[#3A3A3A] font-medium">{survey.discount_expiry_days} 天</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#8A8585]">未啟用折扣獎勵</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* QR Code */}
          <div id="qrcode" className="bg-white rounded-2xl border border-[#E8E2D8] p-6 text-center">
            <h2 className="font-bold text-[#3A3A3A] mb-4">QR Code</h2>
            <div className="inline-block p-3 bg-white rounded-xl border border-[#E8E2D8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`}
                alt="Survey QR Code"
                width={200}
                height={200}
                className="block"
              />
            </div>
            <p className="text-xs text-[#8A8585] mt-3 mb-2">掃描 QR Code 開啟問卷</p>
            <code className="inline-block text-xs bg-[#FAF7F2] px-3 py-1.5 rounded-lg text-[#8A8585] border border-[#E8E2D8] break-all max-w-full">
              {publicUrl}
            </code>
          </div>

          {/* Questions List */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
            <h2 className="font-bold text-[#3A3A3A] mb-3">問題列表 ({questions.length})</h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-center gap-2 py-1.5">
                  <span className="w-5 h-5 rounded bg-[#C5A55A]/10 text-[#A08735] text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-[#3A3A3A] flex-1 truncate">{q.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#FAF7F2] text-[#8A8585] rounded-full shrink-0">
                    {q.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Responses */}
      <div className="mt-6 bg-white rounded-2xl border border-[#E8E2D8] p-6">
        <h2 className="font-bold text-[#3A3A3A] mb-4">回覆列表 ({totalResponses})</h2>

        {responseList.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm text-[#8A8585]">還沒有收到回覆</p>
          </div>
        ) : (
          <div className="space-y-3">
            {responseList.slice(0, 20).map((response) => {
              const submittedDate = new Date(response.submitted_at).toLocaleDateString('zh-TW', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              // Extract key ratings for display
              const ratingEntries = ratingQuestions
                .map(q => ({
                  label: q.label,
                  value: Number(response.answers[q.id]),
                }))
                .filter(e => !isNaN(e.value) && e.value > 0);

              return (
                <div key={response.id} className="border border-[#E8E2D8] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#3A3A3A]">
                        {response.respondent_name || '匿名'}
                      </span>
                      {response.discount_code && (
                        <span className="text-[10px] px-2 py-0.5 bg-[#C5A55A]/10 text-[#A08735] rounded-full font-mono">
                          {response.discount_code}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#8A8585]">{submittedDate}</span>
                  </div>
                  {ratingEntries.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {ratingEntries.slice(0, 4).map((entry, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[#8A8585]">{entry.label}</span>
                          <span className="text-xs font-bold text-[#C5A55A]">{entry.value}/5</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {responseList.length > 20 && (
              <p className="text-center text-xs text-[#8A8585] pt-2">
                僅顯示最近 20 筆，共 {totalResponses} 筆回覆
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
