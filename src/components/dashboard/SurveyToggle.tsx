'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface SurveyToggleProps {
  surveyId: string;
  initialActive: boolean;
}

export default function SurveyToggle({ surveyId, initialActive }: SurveyToggleProps) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    const newVal = !active;
    setActive(newVal);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newVal }),
      });
      if (!res.ok) setActive(!newVal);
    } catch {
      setActive(!newVal);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      disabled={loading}
      className="flex items-center gap-1.5 shrink-0"
      aria-label={active ? '停用問卷' : '啟用問卷'}
    >
      <motion.div
        className={`w-10 h-6 rounded-full relative transition-colors ${active ? 'bg-[#FF8C00]' : 'bg-[#D1C9BC]'}`}
        animate={loading ? { opacity: 0.6 } : { opacity: 1 }}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
          animate={{ left: active ? '18px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.div>
      <span className={`text-[11px] font-medium w-6 ${active ? 'text-[#FF8C00]' : 'text-[#8A8585]'}`}>
        {active ? '開啟' : '關閉'}
      </span>
    </button>
  );
}
