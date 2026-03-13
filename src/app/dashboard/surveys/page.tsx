import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { templates } from '@/lib/templates';
import { Plus } from 'lucide-react';
import type { TemplateId } from '@/types/survey';
import { getSelectedStore } from '@/lib/store-context';

export default async function SurveysPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();

  const store = await getSelectedStore(user.id);
  if (!store) redirect('/register?setup=true');

  // Get all surveys for this store
  const { data: surveys } = await adminDb
    .from('surveys')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });

  // Get response counts for each survey
  const surveyIds = (surveys || []).map(s => s.id);
  let responseCounts: Record<string, number> = {};

  if (surveyIds.length > 0) {
    const { data: responses } = await adminDb
      .from('responses')
      .select('survey_id')
      .in('survey_id', surveyIds);

    if (responses) {
      for (const r of responses) {
        responseCounts[r.survey_id] = (responseCounts[r.survey_id] || 0) + 1;
      }
    }
  }

  const surveyList = surveys || [];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#3A3A3A] font-serif">問卷管理</h1>
          <p className="text-sm text-[#8A8585] mt-1">管理你的所有問卷</p>
        </div>
        <Link
          href="/dashboard/surveys/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors"
        >
          <Plus className="w-4 h-4" />
          建立新問卷
        </Link>
      </div>

      {/* Survey List */}
      {surveyList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E2D8] text-center py-20 px-6">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">還沒有問卷</h2>
          <p className="text-sm text-[#8A8585] mb-6">建立你的第一份問卷，開始收集顧客回饋</p>
          <Link
            href="/dashboard/surveys/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors"
          >
            <Plus className="w-4 h-4" />
            建立新問卷
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {surveyList.map((survey) => {
            const template = templates[survey.template_id as TemplateId];
            const count = responseCounts[survey.id] || 0;
            const createdDate = new Date(survey.created_at).toLocaleDateString('zh-TW', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={survey.id}
                className="bg-white rounded-2xl border border-[#E8E2D8] p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-[#3A3A3A] truncate">{survey.title}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                          survey.is_active
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-50 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {survey.is_active ? '啟用中' : '已停用'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#8A8585]">
                      {template && (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: template.colors.primary }}
                          />
                          {template.name}
                        </span>
                      )}
                      <span>{count} 則回覆</span>
                      <span>{createdDate}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/dashboard/surveys/${survey.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-[#3A3A3A] bg-[#FAF7F2] border border-[#E8E2D8] rounded-lg hover:border-[#C5A55A] hover:text-[#A08735] transition-colors"
                    >
                      編輯
                    </Link>
                    <Link
                      href={`/dashboard/surveys/${survey.id}#qrcode`}
                      className="px-3 py-1.5 text-xs font-medium text-[#3A3A3A] bg-[#FAF7F2] border border-[#E8E2D8] rounded-lg hover:border-[#C5A55A] hover:text-[#A08735] transition-colors"
                    >
                      QR Code
                    </Link>
                    <Link
                      href={`/dashboard/surveys/${survey.id}#stats`}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-[#C5A55A] rounded-lg hover:bg-[#A08735] transition-colors"
                    >
                      查看統計
                    </Link>
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
