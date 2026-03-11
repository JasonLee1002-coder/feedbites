'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  surveyId: string;
  isActive: boolean;
}

export default function SurveyDetailClient({ surveyId, isActive: initialActive }: Props) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialActive);
  const [toggling, setToggling] = useState(false);

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

  return (
    <div className="flex items-center gap-3 shrink-0">
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
