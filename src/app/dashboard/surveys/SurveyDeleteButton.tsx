'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SurveyDeleteButton({ surveyId, surveyTitle }: { surveyId: string; surveyTitle: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`確定要刪除「${surveyTitle}」？\n\n所有回覆和折扣碼也會一起刪除，無法復原。`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      }
    } catch { /* ignore */ } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      title="刪除問卷"
    >
      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}
