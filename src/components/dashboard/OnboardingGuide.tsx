'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Store, UtensilsCrossed, ClipboardList, QrCode,
  ChevronRight, Check, X, MessageCircle,
} from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  btnText: string;
  done: boolean;
}

interface Props {
  storeName: string;
  hasLogo: boolean;
  dishCount: number;
  surveyCount: number;
  responseCount: number;
}

const aiMessages: Array<{ check: (p: Props) => boolean; msg: (p: Props) => string }> = [
  { check: (p) => !p.hasLogo, msg: () => '先上傳你的 Logo，讓客人一眼認出你的品牌！' },
  { check: (p) => p.dishCount === 0, msg: () => '建立菜單吧！有菜單才能讓客人在問卷裡評分你的招牌菜。' },
  { check: (p) => p.surveyCount === 0, msg: () => '建立第一份問卷，5 分鐘就能上線收集客人回饋。' },
  { check: (p) => p.surveyCount > 0 && p.responseCount === 0, msg: () => '問卷已建好！把 QR Code 印出來放桌上，等回覆進來吧。' },
  { check: (p) => p.responseCount > 0, msg: (p) => `太棒了！已經收到 ${p.responseCount} 筆回覆，你的店正在進步中！` },
];

export default function OnboardingGuide(props: Props) {
  const { storeName, hasLogo, dishCount, surveyCount, responseCount } = props;
  const [dismissed, setDismissed] = useState(false);
  const [currentMsgIdx, setCurrentMsgIdx] = useState(0);
  const [displayedText, setDisplayedText] = useState('');

  const steps: Step[] = [
    {
      id: 'logo',
      title: '上傳 Logo',
      description: '讓你的品牌出現在問卷頂部',
      icon: <Store className="w-5 h-5" />,
      href: '/dashboard/settings',
      btnText: '前往設定',
      done: hasLogo,
    },
    {
      id: 'menu',
      title: '建立菜單',
      description: '新增你的招牌菜，客人可以在問卷裡評分',
      icon: <UtensilsCrossed className="w-5 h-5" />,
      href: '/dashboard/menu',
      btnText: '管理菜單',
      done: dishCount > 0,
    },
    {
      id: 'survey',
      title: '建立問卷',
      description: '選一個模板，自訂問題，3 分鐘完成',
      icon: <ClipboardList className="w-5 h-5" />,
      href: '/dashboard/surveys/new',
      btnText: '建立問卷',
      done: surveyCount > 0,
    },
    {
      id: 'qrcode',
      title: '列印 QR Code',
      description: '印出來放桌上，客人掃碼就能填寫',
      icon: <QrCode className="w-5 h-5" />,
      href: '/dashboard/surveys',
      btnText: '查看問卷',
      done: responseCount > 0,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;
  const progress = Math.round((completedCount / steps.length) * 100);

  // Find current AI message
  const matched = aiMessages.find(m => m.check(props));
  const activeMessage = matched ? matched.msg(props) : `歡迎來到 FeedBites，${storeName}！讓我帶你快速上手。`;

  // Typewriter effect
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayedText(activeMessage.slice(0, i));
      if (i >= activeMessage.length) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [activeMessage]);

  // Auto-dismiss if all done and user has seen it
  useEffect(() => {
    if (allDone) {
      const key = `onboarding_done_${storeName}`;
      if (localStorage.getItem(key)) {
        setDismissed(true);
      }
    }
  }, [allDone, storeName]);

  function handleDismiss() {
    setDismissed(true);
    if (allDone) {
      localStorage.setItem(`onboarding_done_${storeName}`, '1');
    }
  }

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-6"
    >
      <div className="bg-gradient-to-br from-[#FF8C00]/5 to-[#FF6B00]/5 rounded-2xl border border-[#FF8C00]/20 overflow-hidden">
        {/* AI Message */}
        <div className="px-6 pt-5 pb-4 flex items-start gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] flex items-center justify-center shrink-0 shadow-md shadow-[#FF8C00]/20"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#FF8C00]">FeedBites AI 嚮導</span>
              {allDone && (
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">全部完成！</span>
              )}
            </div>
            <p className="text-sm text-[#3A3A3A] leading-relaxed">
              {displayedText}
              <motion.span
                className="inline-block w-0.5 h-4 bg-[#FF8C00] ml-0.5 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-[#8A8585] hover:text-[#3A3A3A] transition-colors shrink-0"
            title="關閉嚮導"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[#8A8585]">開店進度</span>
            <span className="text-[10px] font-bold text-[#FF8C00]">{progress}%</span>
          </div>
          <div className="h-1.5 bg-[#E8E2D8] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                {step.done ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/60 rounded-xl border border-emerald-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-emerald-700 line-through opacity-70">{step.title}</div>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={step.href}
                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#E8E2D8] hover:border-[#FF8C00] hover:shadow-md hover:shadow-[#FF8C00]/10 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#FF8C00]/10 flex items-center justify-center shrink-0 text-[#FF8C00] group-hover:bg-[#FF8C00] group-hover:text-white transition-colors">
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#3A3A3A]">{step.title}</div>
                      <div className="text-[10px] text-[#8A8585]">{step.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8A8585] group-hover:text-[#FF8C00] transition-colors shrink-0" />
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
