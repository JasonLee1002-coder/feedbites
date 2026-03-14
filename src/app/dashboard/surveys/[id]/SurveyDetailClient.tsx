'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Copy } from 'lucide-react';

interface Props {
  surveyId: string;
  isActive: boolean;
  hasResponses?: boolean;
}

export default function SurveyDetailClient({ surveyId, isActive: initialActive, hasResponses }: Props) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialActive);
  const [toggling, setToggling] = useState(false);
  const [cloning, setCloning] = useState(false);

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);

    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (res.ok) {
        setIsActive(!isActive);
        router.refresh();
      }
    } catch {
      // Silently fail
    } finally {
      setToggling(false);
    }
  };

  const handleClone = async () => {
    if (cloning) return;
    setCloning(true);

    try {
      const res = await fetch(`/api/surveys/${surveyId}/clone`, {
        method: 'POST',
      });

      if (res.ok) {
        const clone = await res.json();
        router.push(`/dashboard/surveys/${clone.id}`);
      }
    } catch {
      // Silently fail
    } finally {
      setCloning(false);
    }
  };

  const handleExport = () => {
    // Download as Excel file
    const link = document.createElement('a');
    link.href = `/api/surveys/${surveyId}/export?format=xlsx`;
    link.click();
  };

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      {/* Status Toggle */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full border transition-colors ${
          isActive
            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
        } disabled:opacity-50`}
      >
        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
        {toggling ? '切換中...' : isActive ? '啟用中' : '已停用'}
      </button>

      {/* Export CSV */}
      {hasResponses && (
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white/80 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          匯出 Excel
        </button>
      )}

      {/* Clone */}
      <button
        onClick={handleClone}
        disabled={cloning}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white/80 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
      >
        <Copy className="w-3.5 h-3.5" />
        {cloning ? '複製中...' : '複製'}
      </button>

      {/* Edit Button */}
      <button
        onClick={() => router.push(`/dashboard/surveys/${surveyId}/edit`)}
        className="px-4 py-2 text-xs font-medium text-[#3A3A3A] bg-[#FAF7F2] border border-[#E8E2D8] rounded-full hover:border-[#C5A55A] hover:text-[#A08735] transition-colors"
      >
        編輯
      </button>
    </div>
  );
}
