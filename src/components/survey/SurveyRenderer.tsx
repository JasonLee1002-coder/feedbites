'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Question, ThemeColors, DiscountTier } from '@/types/survey';
import { getFrame } from '@/lib/qr-frames';

const EMOJI_LABELS = ['😫', '😕', '😐', '😊', '🤩'];
const EMOJI_TEXTS = ['不太行', '還好', '普通', '不錯', '超讚！'];
const EMOJI_COLORS = ['#FF6B6B', '#FFB74D', '#90A4AE', '#66BB6A', '#FFD700'];

/* Rating faces (used for 1-5 rating type) */
const RATING_FACES = ['😣', '😕', '😐', '🙂', '😄'];
const RATING_LABELS = ['1', '2', '3', '4', '5'];

interface SurveyRendererProps {
  questions: Question[];
  colors: ThemeColors;
  storeName: string;
  surveyTitle: string;
  logoUrl?: string | null;
  frameId?: string | null;
  discountEnabled: boolean;
  discountValue: string;
  onSubmit: (answers: Record<string, string | string[]>, xpEarned: number) => void;
  isSubmitting: boolean;
  discountMode?: 'basic' | 'advanced';
  discountTiers?: DiscountTier[] | null;
}

/* ───── spring presets ───── */
const springBounce = { type: 'spring' as const, stiffness: 400, damping: 17 };
const springSmooth = { type: 'spring' as const, stiffness: 300, damping: 24 };

/* ───── XP (點數) config ───── */
const XP_MAP: Record<string, number> = {
  radio: 10,
  checkbox: 10,
  'radio-with-reason': 10,
  rating: 15,
  'rating-with-reason': 15,
  'emoji-rating': 15,
  text: 20,
  textarea: 20,
  number: 15,
};

const LEVEL_THRESHOLDS = [0, 50, 120, 200];

/* ───── Default display tiers ───── */
const DEFAULT_DISPLAY_TIERS = [
  { name: '銅牌', emoji: '🥉', min_xp: 0, color: '#CD7F32', colorDark: '#8B5A2B' },
  { name: '銀牌', emoji: '🥈', min_xp: 51, color: '#C0C0C0', colorDark: '#808080' },
  { name: '金牌', emoji: '🥇', min_xp: 121, color: '#FFD700', colorDark: '#DAA520' },
  { name: '鑽石', emoji: '💎', min_xp: 201, color: '#B9F2FF', colorDark: '#5BC0DE' },
];

function buildDisplayTiers(discountMode?: string, discountTiers?: DiscountTier[] | null) {
  if (discountMode === 'advanced' && discountTiers && discountTiers.length > 0) {
    return discountTiers.map((t, i) => ({
      name: DEFAULT_DISPLAY_TIERS[i]?.name || `Lv.${i + 1}`,
      emoji: DEFAULT_DISPLAY_TIERS[i]?.emoji || '⭐',
      min_xp: t.min_xp ?? DEFAULT_DISPLAY_TIERS[i]?.min_xp ?? i * 50,
      color: DEFAULT_DISPLAY_TIERS[i]?.color || '#FFD700',
      colorDark: DEFAULT_DISPLAY_TIERS[i]?.colorDark || '#DAA520',
    }));
  }
  return DEFAULT_DISPLAY_TIERS;
}

function getCurrentTierIndex(xp: number, tiers: typeof DEFAULT_DISPLAY_TIERS) {
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (xp >= tiers[i].min_xp) return i;
  }
  return 0;
}

function getLevel(xp: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}
function getLevelXpRange(level: number) {
  const min = LEVEL_THRESHOLDS[level - 1] || 0;
  const max = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 100;
  return { min, max };
}

/* ───── Achievement definitions ───── */
interface Achievement {
  id: string;
  icon: string;
  title: string;
  condition: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'streak3', icon: '🔥', title: '連答達人', condition: '連續快速回答 3 題' },
  { id: 'speed5', icon: '⚡', title: '閃電手', condition: '30 秒內回答 5 題' },
  { id: 'perfect', icon: '🎯', title: '滿分評價', condition: '給出 5/5 滿分' },
  { id: 'writer', icon: '📝', title: '認真回饋', condition: '文字回饋超過 20 字' },
  { id: 'complete', icon: '🏆', title: '問卷達人', condition: '完成 100% 問卷' },
];

/* ───── AI Companion messages ───── */
interface CompanionMessage {
  text: string;
  priority: number; // higher = more important
}

function miniConfetti(colors: ThemeColors) {
  confetti({
    particleCount: 40,
    spread: 55,
    origin: { y: 0.65 },
    colors: [colors.primary, colors.primaryLight, colors.accent, '#FFD700'],
  });
}

function megaConfetti(colors: ThemeColors) {
  confetti({
    particleCount: 150,
    spread: 90,
    origin: { y: 0.6 },
    colors: [colors.primary, colors.primaryLight, colors.accent, '#FFD700', '#FF6B6B'],
  });
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 120,
      origin: { y: 0.5, x: 0.25 },
      colors: [colors.primary, '#FFD700'],
    });
    confetti({
      particleCount: 80,
      spread: 120,
      origin: { y: 0.5, x: 0.75 },
      colors: [colors.primaryLight, '#FF6B6B'],
    });
  }, 250);
}

export default function SurveyRenderer({
  questions,
  colors,
  storeName,
  surveyTitle,
  logoUrl,
  frameId,
  discountEnabled,
  discountValue,
  onSubmit,
  isSubmitting,
  discountMode,
  discountTiers,
}: SurveyRendererProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [direction, setDirection] = useState(1);
  const [combo, setCombo] = useState(0);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // XP (折扣點數) system
  const [xp, setXp] = useState(0);
  const [displayXp, setDisplayXp] = useState(0);
  const [floatingXp, setFloatingXp] = useState<{ amount: number; id: number } | null>(null);
  const floatingIdRef = useRef(0);
  const prevLevelRef = useRef(1);
  const [levelUpVisible, setLevelUpVisible] = useState(false);

  // Track which questions already awarded XP (prevents text input giving XP per keystroke)
  const xpAwardedRef = useRef<Set<string>>(new Set());

  // AI Companion
  const [companionMsg, setCompanionMsg] = useState<string>('嗨！完成問卷就能獲得折扣碼喔 🪙');
  const [companionVisible, setCompanionVisible] = useState(true);
  const [companionTyped, setCompanionTyped] = useState('');
  const companionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const companionQueueRef = useRef<CompanionMessage[]>([]);
  const companionBusyRef = useRef(false);

  // Idle detection refs
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleCountRef = useRef(0);
  const progressRef = useRef(0);
  const showCompanionRef = useRef<(msg: CompanionMessage) => void>(() => {});

  // Voice feedback recording
  const [voiceRecording, setVoiceRecording] = useState<string | null>(null); // question ID being recorded
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  async function startVoiceRecording(questionId: string) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setVoiceRecording(null);
        setVoiceProcessing(true);

        try {
          const formData = new FormData();
          formData.append('audio', blob, 'voice.webm');
          const q = questions.find(qu => qu.id === questionId);
          formData.append('questionLabel', q?.label || '');
          formData.append('surveyTitle', surveyTitle || '');

          const res = await fetch('/api/ai/voice-feedback', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            // Use polished version
            setAnswer(questionId, data.polished || data.transcript || '', q?.type || 'textarea');
            showCompanionRef.current({ text: '語音已轉換成文字了！你可以修改內容 ✨', priority: 6 });
          }
        } catch { /* ignore */ }
        setVoiceProcessing(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setVoiceRecording(questionId);
      showCompanionRef.current({ text: '正在聽你說... 說完按一下停止 🎙️', priority: 7 });
    } catch {
      showCompanionRef.current({ text: '無法使用麥克風，請檢查權限設定', priority: 8 });
    }
  }

  function stopVoiceRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }

  // Achievement system
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
  const [toastBadge, setToastBadge] = useState<Achievement | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Speed tracking
  const answerTimestamps = useRef<number[]>([]);
  const sessionStartRef = useRef<number>(Date.now());

  // Milestone tracking
  const milestonesTriggered = useRef<Set<number>>(new Set());

  // Combo glow
  const [borderFlash, setBorderFlash] = useState(false);

  // Card glow on answer
  const [glowCardId, setGlowCardId] = useState<string | null>(null);

  // Validation
  const [showValidation, setShowValidation] = useState(false);

  // Ref for scrolling to next question
  const questionRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  /* ───── Display tiers ───── */
  const displayTiers = useMemo(
    () => buildDisplayTiers(discountMode, discountTiers),
    [discountMode, discountTiers],
  );

  const currentTierIndex = getCurrentTierIndex(xp, displayTiers);
  const currentTier = displayTiers[currentTierIndex];
  const nextTier = displayTiers[currentTierIndex + 1] || null;

  // Max XP for progress bar (use last tier's min_xp + some buffer)
  const maxXpForBar = displayTiers[displayTiers.length - 1].min_xp + 50;
  const xpBarProgress = Math.min(100, (xp / maxXpForBar) * 100);

  /* ───── Sections ───── */
  const sections = useMemo(() => {
    const sectionMap: Record<string, Question[]> = {};
    questions.forEach(q => {
      const section = q.section || '問卷';
      if (!sectionMap[section]) sectionMap[section] = [];
      sectionMap[section].push(q);
    });
    return Object.entries(sectionMap).map(([title, qs]) => ({ title, questions: qs }));
  }, [questions]);

  const countAnswerable = (qs: Question[]): number =>
    qs.reduce((acc, q) => {
      if (q.type === 'section-header') return acc;
      if (q.type === 'dish-group' && q.subQuestions) return acc + q.subQuestions.length;
      return acc + 1;
    }, 0);

  const totalQuestions = countAnswerable(questions);
  const answeredCount = Object.keys(answers).filter(k => {
    if (k.endsWith('_reason')) return false;
    const v = answers[k];
    return v && (Array.isArray(v) ? v.length > 0 : v.trim() !== '');
  }).length;
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  progressRef.current = progress;

  /* ───── Idle detection — nudge pausing customers ───── */
  useEffect(() => {
    const idleMessages = [
      '需要幫忙嗎？隨意選擇就好，沒有標準答案 😊',
      '你的每一個回答都很重要，店家會用心改進 ✨',
      '快完成了！填完就能拿到折扣碼喔 🎫',
      '只需要你的真實感受，怎麼選都對 👍',
      '休息一下也沒關係，我在這等你～ ☕',
    ];

    function resetIdleTimer() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (progressRef.current < 100) {
          const msg = idleMessages[idleCountRef.current % idleMessages.length];
          showCompanionRef.current({ text: msg, priority: 4 });
          idleCountRef.current++;
        }
      }, 15000);
    }

    resetIdleTimer();
    const events = ['touchstart', 'click', 'scroll', 'keydown'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, []);

  const isLastSection = currentSection === sections.length - 1;
  const currentLevel = getLevel(xp);
  const { min: lvMin, max: lvMax } = getLevelXpRange(currentLevel);
  const levelProgress = Math.min(100, ((xp - lvMin) / (lvMax - lvMin)) * 100);

  /* ───── Animate XP counter rolling up ───── */
  useEffect(() => {
    if (displayXp === xp) return;
    const diff = xp - displayXp;
    const step = Math.max(1, Math.ceil(diff / 15));
    const timer = setTimeout(() => {
      setDisplayXp(prev => Math.min(prev + step, xp));
    }, 30);
    return () => clearTimeout(timer);
  }, [displayXp, xp]);

  /* ───── Level-up detection ───── */
  useEffect(() => {
    const newLevel = getLevel(xp);
    if (newLevel > prevLevelRef.current) {
      prevLevelRef.current = newLevel;
      setLevelUpVisible(true);
      miniConfetti(colors);
      setTimeout(() => setLevelUpVisible(false), 2000);
    }
  }, [xp, colors]);

  /* ───── Companion typing effect ───── */
  useEffect(() => {
    if (!companionVisible || !companionMsg) {
      setCompanionTyped('');
      return;
    }
    setCompanionTyped('');
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setCompanionTyped(companionMsg.slice(0, i));
      if (i >= companionMsg.length) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [companionMsg, companionVisible]);

  /* ───── Milestone checks ───── */
  useEffect(() => {
    const milestones = [25, 50, 75, 100];
    for (const m of milestones) {
      if (progress >= m && !milestonesTriggered.current.has(m)) {
        milestonesTriggered.current.add(m);
        // Only confetti at 100% — less is more
        if (m === 100) {
          miniConfetti(colors);
          triggerAchievement('complete');
        }
        const msgs: Record<number, string> = {
          25: `已完成 ${answeredCount}/${totalQuestions} 題，做得好！繼續～ 😊`,
          50: `一半了！${totalQuestions - answeredCount} 題就完成囉 ✨`,
          75: `剩最後 ${totalQuestions - answeredCount} 題！馬上就能拿獎勵了 🎁`,
          100: '全部完成！太厲害了！🎉',
        };
        showCompanionMessage({ text: msgs[m], priority: 8 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  /* ───── Companion message queue system ───── */
  const showCompanionMessage = useCallback((msg: CompanionMessage) => {
    // If companion is currently showing a message, queue if higher priority
    if (companionBusyRef.current) {
      companionQueueRef.current.push(msg);
      companionQueueRef.current.sort((a, b) => b.priority - a.priority);
      return;
    }
    companionBusyRef.current = true;
    setCompanionMsg(msg.text);
    setCompanionVisible(true);

    if (companionTimerRef.current) clearTimeout(companionTimerRef.current);
    companionTimerRef.current = setTimeout(() => {
      setCompanionVisible(false);
      companionBusyRef.current = false;
      // Process queue
      setTimeout(() => {
        if (companionQueueRef.current.length > 0) {
          const next = companionQueueRef.current.shift()!;
          showCompanionMessage(next);
        }
      }, 400);
    }, 2500);
  }, []);
  showCompanionRef.current = showCompanionMessage;

  /* ───── Achievement trigger ───── */
  const triggerAchievement = useCallback((id: string) => {
    if (earnedBadges.has(id)) return;
    setEarnedBadges(prev => new Set(prev).add(id));
    const badge = ACHIEVEMENTS.find(a => a.id === id);
    if (!badge) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastBadge(badge);
    toastTimerRef.current = setTimeout(() => setToastBadge(null), 3500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earnedBadges]);

  /* ───── Auto-scroll helper ───── */
  const scrollToNextQuestion = useCallback((currentId: string) => {
    const currentQuestions = sections[currentSection]?.questions || [];
    const flatIds: string[] = [];
    currentQuestions.forEach(q => {
      if (q.type === 'section-header') return;
      if (q.type === 'dish-group' && q.subQuestions) {
        q.subQuestions.forEach(sub => flatIds.push(`${q.id}_${sub.id}`));
      } else {
        flatIds.push(q.id);
      }
    });
    const idx = flatIds.indexOf(currentId);
    if (idx >= 0 && idx < flatIds.length - 1) {
      const nextId = flatIds[idx + 1];
      // Find the parent card (the q.id part before any sub)
      const parentId = nextId.includes('_') ? nextId.split('_')[0] + '_' + nextId.split('_')[1] : nextId;
      setTimeout(() => {
        const el = questionRefs.current.get(parentId) || questionRefs.current.get(nextId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    }
  }, [sections, currentSection]);

  /* ───── Answer handler with XP, achievements, companion ───── */
  const setAnswer = useCallback((id: string, value: string | string[], questionType?: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));

    const qType = questionType || 'radio';
    const isTextType = qType === 'text' || qType === 'textarea';

    // For text inputs: only award XP once (not per keystroke!)
    // For reason fields (ending with _reason): never award XP
    const isReasonField = id.endsWith('_reason');
    const alreadyAwarded = xpAwardedRef.current.has(id);

    if (!isReasonField && !alreadyAwarded) {
      // For text: award XP on first non-empty input, then mark as awarded
      if (isTextType && (!value || (typeof value === 'string' && value.trim() === ''))) {
        // Don't award for empty text
      } else {
        xpAwardedRef.current.add(id);

        // Combo (relaxed: 6s timeout instead of 3s to not punish thoughtfulness)
        setCombo(prev => prev + 1);
        if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = setTimeout(() => setCombo(0), 6000);

        // XP
        const baseXp = XP_MAP[qType] || 10;
        const newCombo = combo + 1;
        const multiplier = newCombo >= 3 ? 2 : 1;
        const earnedXp = baseXp * multiplier;
        setXp(prev => prev + earnedXp);

        // Floating 點數
        floatingIdRef.current += 1;
        setFloatingXp({ amount: earnedXp, id: floatingIdRef.current });

        // Card glow
        setGlowCardId(id);
        setTimeout(() => setGlowCardId(null), 600);

        // Track timestamps for speed achievements
        const now = Date.now();
        answerTimestamps.current.push(now);

        // Check streak3
        const ts = answerTimestamps.current;
        if (ts.length >= 3) {
          const last3 = ts.slice(-3);
          const allFast = last3.every((t, i) => i === 0 || t - last3[i - 1] < 5000);
          if (allFast) triggerAchievement('streak3');
        }

        // Check speed5
        if (ts.length >= 5) {
          const last5 = ts.slice(-5);
          if (last5[last5.length - 1] - last5[0] < 30000) {
            triggerAchievement('speed5');
          }
        }

        // Check perfect rating
        if ((qType === 'rating' || qType === 'rating-with-reason' || qType === 'emoji-rating') && value === '5') {
          triggerAchievement('perfect');
        }

        // Combo companion messages (less aggressive)
        if (newCombo === 5) {
          showCompanionMessage({ text: '太棒了！持續累積點數中 ⚡', priority: 5 });
        }

        // Combo 5+ border flash
        if (newCombo >= 5) {
          setBorderFlash(true);
          setTimeout(() => setBorderFlash(false), 400);
        }

        // First answer encouragement
        if (Object.keys(answers).filter(k => !k.endsWith('_reason')).length === 0) {
          setTimeout(() => {
            showCompanionMessage({ text: '不錯喔！已經開始累積點數了～ 💪', priority: 3 });
          }, 300);
        }

        // Auto-scroll to next question (only for non-text types — text needs continued typing)
        if (!isTextType) {
          scrollToNextQuestion(id);
        }
      }
    }

    // Check writer achievement (can fire even after XP is already awarded)
    if (isTextType && typeof value === 'string' && value.length > 20) {
      triggerAchievement('writer');
    }
  }, [combo, answers, triggerAchievement, showCompanionMessage, scrollToNextQuestion]);

  function toggleCheckbox(id: string, option: string) {
    setAnswers(prev => {
      const current = (prev[id] as string[]) || [];
      const next = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [id]: next };
    });

    // Only award XP on first checkbox interaction for this question
    if (!xpAwardedRef.current.has(id)) {
      xpAwardedRef.current.add(id);

      setCombo(prev => prev + 1);
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = setTimeout(() => setCombo(0), 6000);

      const baseXp = 10;
      const newCombo = combo + 1;
      const multiplier = newCombo >= 3 ? 2 : 1;
      const earnedXp = baseXp * multiplier;
      setXp(prev => prev + earnedXp);
      floatingIdRef.current += 1;
      setFloatingXp({ amount: earnedXp, id: floatingIdRef.current });
    }

    setGlowCardId(id);
    setTimeout(() => setGlowCardId(null), 600);
    answerTimestamps.current.push(Date.now());
  }

  function getRequiredUnanswered(): { sectionIndex: number; questionId: string; label: string }[] {
    const missing: { sectionIndex: number; questionId: string; label: string }[] = [];
    sections.forEach((sec, sIdx) => {
      sec.questions.forEach(q => {
        if (q.type === 'section-header') return;
        if (q.type === 'dish-group' && q.subQuestions) {
          q.subQuestions.forEach(sub => {
            if (sub.required) {
              const key = `${q.id}_${sub.id}`;
              const val = answers[key];
              if (!val || (Array.isArray(val) ? val.length === 0 : val.trim() === '')) {
                missing.push({ sectionIndex: sIdx, questionId: key, label: sub.title || sub.label || '' });
              }
            }
          });
        } else if (q.required) {
          const val = answers[q.id];
          if (!val || (Array.isArray(val) ? val.length === 0 : val.trim() === '')) {
            missing.push({ sectionIndex: sIdx, questionId: q.id, label: q.title || q.label || '' });
          }
        }
      });
    });
    return missing;
  }

  function handleSubmit() {
    const missing = getRequiredUnanswered();
    if (missing.length > 0) {
      // Gentle reminder but allow submit
      showCompanionMessage({ text: `還有 ${missing.length} 題沒填，沒關係，想跳過也可以提交 😊`, priority: 7 });
    }
    megaConfetti(colors);
    onSubmit(answers, xp);
  }

  function goNext() {
    setDirection(1);
    setCurrentSection(prev => prev + 1);
    // Last section companion message
    if (currentSection + 1 === sections.length - 1) {
      showCompanionMessage({ text: '最後一步了！看看你能拿到什麼等級的獎勵 🎊', priority: 7 });
    }
  }

  function goPrev() {
    setDirection(-1);
    setCurrentSection(prev => prev - 1);
  }

  const section = sections[currentSection];
  if (!section) return null;

  /* ───── slide variants ───── */
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  /* ───── helper: render option button (card-style, not boring pill) ───── */
  // Map satisfaction words to emojis
  const satisfactionEmoji: Record<string, string> = {
    '非常滿意': '🤩', '滿意': '😊', '普通': '😐', '不太滿意': '😕', '不滿意': '😞', '很差': '😫',
    '非常好': '🤩', '好': '😊', '還好': '😐', '不好': '😕',
    '非常願意': '😍', '願意': '😊', '不願意': '😕',
    '太多（適合分享）': '😅', '剛好': '👌', '稍微偏少': '🤏',
  };

  const renderPill = (
    opt: string,
    isSelected: boolean,
    onClick: () => void,
    size: 'sm' | 'md' = 'md',
  ) => {
    const emoji = satisfactionEmoji[opt];
    return (
    <motion.button
      key={opt}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      animate={isSelected ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={springBounce}
      layout
      className={`${size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'} rounded-xl font-medium transition-all relative overflow-hidden`}
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})`
          : colors.surface,
        color: isSelected ? 'white' : colors.text,
        border: `2px solid ${isSelected ? colors.primary : colors.border}`,
        boxShadow: isSelected ? `0 4px 12px ${colors.primary}30` : 'none',
      }}
    >
      {/* Selection checkmark */}
      {emoji && (
        <motion.span
          className="inline-block mr-1 text-base"
          animate={isSelected ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {emoji}
        </motion.span>
      )}
      {!emoji && isSelected && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-block mr-1">✓</motion.span>
      )}
      {opt}
    </motion.button>
    );
  };

  /* ───── helper: render rating (emoji faces instead of numbers) ───── */
  const renderRating = (qId: string, compact = false) => (
    <div className="flex gap-2 justify-between">
      {[1, 2, 3, 4, 5].map(n => {
        const selected = answers[qId] === String(n);
        const face = RATING_FACES[n - 1];
        const emojiColor = EMOJI_COLORS[n - 1];
        return (
          <motion.button
            key={n}
            onClick={() => setAnswer(qId, String(n), 'rating')}
            whileTap={{ scale: 0.85 }}
            animate={selected ? { scale: [1, 1.15, 1.05] } : { scale: 1 }}
            transition={springBounce}
            className={`flex-1 flex flex-col items-center gap-1 ${compact ? 'py-2' : 'py-3'} rounded-xl relative`}
            style={{
              background: selected ? `${emojiColor}15` : colors.background,
              border: `2px solid ${selected ? emojiColor : colors.border}`,
              boxShadow: selected ? `0 3px 12px ${emojiColor}25` : 'none',
            }}
          >
            <motion.span
              className={compact ? 'text-xl' : 'text-2xl'}
              animate={selected ? { rotate: [0, -8, 8, 0] } : {}}
              transition={selected ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
            >
              {face}
            </motion.span>
            <span className="text-[10px] font-medium" style={{ color: selected ? emojiColor : colors.textLight }}>
              {RATING_LABELS[n - 1]}
            </span>
          </motion.button>
        );
      })}
    </div>
  );

  /* ───── helper: reason field ───── */
  const renderReasonField = (qId: string, placeholder?: string) => (
    <AnimatePresence>
      {answers[qId] && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ ...springSmooth, opacity: { duration: 0.2 } }}
          className="overflow-hidden"
        >
          <div className="mt-3">
            <input
              type="text"
              value={(answers[`${qId}_reason`] as string) || ''}
              onChange={e => setAnswer(`${qId}_reason`, e.target.value, 'text')}
              placeholder={placeholder || '原因（選填）'}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: colors.background,
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: colors.background,
        color: colors.text,
        fontFamily: "'Noto Sans TC', sans-serif",
      }}
    >
      {/* ───── Keyframe animations ───── */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { opacity: 0.7; }
          100% { transform: translateY(-120px) scale(0.6); opacity: 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 4px 16px var(--glow-color); }
          50% { box-shadow: 0 4px 28px var(--glow-color), 0 0 40px var(--glow-color); }
        }
        @keyframes combo-pop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes xp-float {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-50px); opacity: 0; }
        }
        @keyframes level-up-glow {
          0% { transform: scale(0.5); opacity: 0; }
          30% { transform: scale(1.3); opacity: 1; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes border-flash {
          0% { box-shadow: inset 0 0 0 3px #FFD700; }
          100% { box-shadow: inset 0 0 0 0px transparent; }
        }
        @keyframes badge-pop {
          0% { transform: translateX(120%) scale(0.8); }
          15% { transform: translateX(0%) scale(1.05); }
          25% { transform: translateX(0%) scale(1); }
          85% { transform: translateX(0%) scale(1); }
          100% { transform: translateX(120%) scale(0.8); }
        }
        @keyframes sparkle-border {
          0%, 100% { border-color: ${colors.border}; }
          50% { border-color: ${colors.primary}; box-shadow: 0 0 8px ${colors.primary}40; }
        }
        @keyframes card-glow {
          0% { box-shadow: 0 0 0 0 ${colors.primary}40; }
          50% { box-shadow: 0 0 20px 4px ${colors.primary}30; }
          100% { box-shadow: 0 0 0 0 ${colors.primary}00; }
        }
        @keyframes gold-border-flash {
          0% { box-shadow: inset 0 0 30px #FFD70060, 0 0 20px #FFD70040; }
          100% { box-shadow: inset 0 0 0px transparent, 0 0 0px transparent; }
        }
      `}</style>

      {/* ───── Golden border flash on combo 5+ ───── */}
      <AnimatePresence>
        {borderFlash && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-[100]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ animation: 'gold-border-flash 0.4s ease-out forwards' }}
          />
        )}
      </AnimatePresence>

      {/* ───── AI Companion (bottom-left, compact) ───── */}
      <AnimatePresence>
        {companionVisible && companionTyped && (
          <motion.div
            className="fixed bottom-20 left-3 z-[60] flex items-end gap-1.5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={springSmooth}
          >
            <span className="text-base">🍽️</span>
            <div
              className="max-w-[180px] px-2.5 py-1.5 rounded-xl rounded-bl-sm text-[11px] leading-relaxed"
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                color: colors.textLight,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              {companionTyped}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── Header with frame decoration ───── */}
      {(() => {
        const frame = frameId ? getFrame(frameId) : null;
        const accentColor = frame?.accentColor || colors.primary;
        const headerBg = frame
          ? frame.previewGradient
          : `linear-gradient(160deg, ${colors.background}, ${colors.border})`;
        const headerTextColor = frame?.textColor || colors.text;
        const headerSubColor = frame ? (frame.textColor + '80') : colors.textLight;

        return (
          <div
            className="text-center pt-6 pb-4 px-6 relative overflow-hidden"
            style={{ background: headerBg }}
          >
            {/* Frame corner ornaments */}
            {frame && (
              <>
                <div className="absolute top-2 left-2 w-8 h-8" style={{ borderTop: `2px solid ${accentColor}50`, borderLeft: `2px solid ${accentColor}50` }} />
                <div className="absolute top-2 right-2 w-8 h-8" style={{ borderTop: `2px solid ${accentColor}50`, borderRight: `2px solid ${accentColor}50` }} />
                <div className="absolute bottom-2 left-2 w-8 h-8" style={{ borderBottom: `2px solid ${accentColor}50`, borderLeft: `2px solid ${accentColor}50` }} />
                <div className="absolute bottom-2 right-2 w-8 h-8" style={{ borderBottom: `2px solid ${accentColor}50`, borderRight: `2px solid ${accentColor}50` }} />
                {/* Top center ornament */}
                <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4" viewBox="0 0 64 16" fill="none">
                  <path d="M8 14 Q20 2 32 2 Q44 2 56 14" stroke={accentColor} strokeWidth="1" opacity="0.3" fill="none" />
                  <circle cx="32" cy="2" r="2" fill={accentColor} opacity="0.2" />
                </svg>
              </>
            )}

            <div className="flex items-center justify-center gap-3 mb-1 relative z-10">
              {logoUrl && (
                <motion.img
                  src={logoUrl}
                  alt={storeName}
                  className="h-12 object-contain"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                />
              )}
              <div>
                <motion.h1
                  className="text-xl font-bold tracking-wider"
                  style={{ fontFamily: "'Noto Serif TC', serif", color: headerTextColor }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {surveyTitle}
                </motion.h1>
                <motion.p
                  className="text-xs tracking-widest"
                  style={{ color: headerSubColor }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {storeName}
                </motion.p>
              </div>
            </div>

            {/* Decorative divider */}
            {frame && (
              <svg className="w-24 h-3 mx-auto mt-1" viewBox="0 0 100 12" fill="none">
                <line x1="0" y1="6" x2="40" y2="6" stroke={accentColor} strokeWidth="0.5" opacity="0.3" />
                <path d="M43 6 L50 2 L57 6 L50 10 Z" fill={accentColor} opacity="0.15" />
                <line x1="60" y1="6" x2="100" y2="6" stroke={accentColor} strokeWidth="0.5" opacity="0.3" />
              </svg>
            )}

            {discountEnabled && (
              <motion.div
                className="mt-2 inline-block px-4 py-1.5 rounded-full text-xs font-medium"
                style={{ background: `${accentColor}15`, color: accentColor }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                完成問卷即可獲得 {discountValue}
              </motion.div>
            )}
          </div>
        );
      })()}

      {/* Progress is now communicated via companion, no sticky bar */}

      {/* ───── Section navigation tabs ───── */}
      <div className="flex gap-1 px-4 pt-3 pb-4 overflow-x-auto">
        {sections.map((s, i) => {
          // Check if section is complete (all answerable questions answered)
          const sectionAnswered = s.questions.reduce((acc, q) => {
            if (q.type === 'section-header') return acc;
            if (q.type === 'dish-group' && q.subQuestions) {
              return acc + q.subQuestions.filter(sub => {
                const key = `${q.id}_${sub.id}`;
                const val = answers[key];
                return val && (Array.isArray(val) ? val.length > 0 : val.trim() !== '');
              }).length;
            }
            const val = answers[q.id];
            return acc + (val && (Array.isArray(val) ? val.length > 0 : typeof val === 'string' ? val.trim() !== '' : true) ? 1 : 0);
          }, 0);
          const sectionTotal = countAnswerable(s.questions);
          const isSectionDone = sectionTotal > 0 && sectionAnswered >= sectionTotal;

          return (
            <motion.button
              key={i}
              onClick={() => {
                setDirection(i > currentSection ? 1 : -1);
                setCurrentSection(i);
              }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all flex items-center gap-1"
              style={{
                background: i === currentSection ? colors.primary : isSectionDone ? `${colors.primary}20` : colors.border,
                color: i === currentSection ? 'white' : isSectionDone ? colors.primary : colors.textLight,
                border: isSectionDone && i !== currentSection ? `1px solid ${colors.primary}40` : 'none',
              }}
            >
              {isSectionDone && i !== currentSection && <span className="text-[10px]">✓</span>}
              {s.title}
            </motion.button>
          );
        })}
      </div>

      {/* ───── Questions ───── */}
      <div className="px-4 pb-8 max-w-lg mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSection}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ ...springSmooth, duration: 0.35 }}
          >
            {section.questions.map((q, index) => {
              // Section header
              if (q.type === 'section-header') {
                return (
                  <motion.div
                    key={q.id}
                    className="mb-4 mt-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, ...springSmooth }}
                  >
                    <h2
                      className="text-lg font-bold tracking-wide"
                      style={{ color: colors.primary, fontFamily: "'Noto Serif TC', serif" }}
                    >
                      {q.title || q.label}
                    </h2>
                    {q.description && (
                      <p className="text-xs mt-1" style={{ color: colors.textLight }}>
                        {q.description}
                      </p>
                    )}
                    <motion.div
                      className="mt-2 h-0.5 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${colors.primary}, ${colors.primaryLight}, transparent)`,
                      }}
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
                    />
                  </motion.div>
                );
              }

              // Dish group
              if (q.type === 'dish-group') {
                return (
                  <motion.div
                    key={q.id}
                    className="mb-5 rounded-2xl overflow-hidden"
                    style={{
                      border: `1px solid ${colors.primary}40`,
                      borderLeft: `3px solid ${colors.primary}`,
                      animation: glowCardId && glowCardId.startsWith(q.id) ? 'card-glow 0.6s ease-out' : 'none',
                    }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, ...springSmooth }}
                  >
                    <div className="px-5 py-3" style={{ background: `${colors.primary}12` }}>
                      <h3 className="text-sm font-bold" style={{ color: colors.primary }}>
                        {q.dishName || q.title || q.label}
                      </h3>
                      {q.description && (
                        <p className="text-xs mt-0.5" style={{ color: colors.textLight }}>
                          {q.description}
                        </p>
                      )}
                    </div>
                    <div className="p-4 space-y-4" style={{ background: colors.surface }}>
                      {(q.subQuestions || []).map((subQ, subIdx) => {
                        const subKey = `${q.id}_${subQ.id}`;
                        const reasonKey = `${subKey}_reason`;
                        return (
                          <motion.div
                            key={subQ.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 + subIdx * 0.05, ...springSmooth }}
                          >
                            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                              {subQ.title || subQ.label}
                              {subQ.required && (
                                <span className="ml-1" style={{ color: '#E05050' }}>
                                  *
                                </span>
                              )}
                            </label>
                            {subQ.description && (
                              <p className="text-xs mb-2" style={{ color: colors.textLight }}>
                                {subQ.description}
                              </p>
                            )}
                            {(subQ.type === 'radio' || subQ.type === 'radio-with-reason') && subQ.options && (
                              <div className="flex flex-wrap gap-2">
                                {subQ.options.map(opt =>
                                  renderPill(opt, answers[subKey] === opt, () => setAnswer(subKey, opt, subQ.type), 'sm'),
                                )}
                              </div>
                            )}
                            {(subQ.type === 'rating' || subQ.type === 'rating-with-reason') &&
                              renderRating(subKey, true)}
                            {(subQ.type === 'radio-with-reason' || subQ.type === 'rating-with-reason') && (
                              <AnimatePresence>
                                {answers[subKey] && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ ...springSmooth, opacity: { duration: 0.2 } }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-2">
                                      <input
                                        type="text"
                                        value={(answers[reasonKey] as string) || ''}
                                        onChange={e => setAnswer(reasonKey, e.target.value, 'text')}
                                        placeholder={subQ.reasonPlaceholder || '原因（選填）'}
                                        className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                                        style={{
                                          background: colors.background,
                                          border: `1px solid ${colors.border}`,
                                          color: colors.text,
                                        }}
                                      />
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              }

              // Standard question card
              const isGlowing = glowCardId === q.id;
              const isUnanswered = showValidation && q.required && (!answers[q.id] || (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).length === 0 : (answers[q.id] as string).trim() === ''));
              return (
                <motion.div
                  key={q.id}
                  ref={el => { questionRefs.current.set(q.id, el); }}
                  className="mb-5 p-5 rounded-2xl"
                  style={{
                    background: colors.surface,
                    border: isUnanswered ? '2px solid #D4605A' : `1px solid ${colors.border}`,
                    animation: isGlowing ? 'card-glow 0.6s ease-out' : 'none',
                  }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, ...springSmooth }}
                >
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    {q.title || q.label}
                    {q.required && (
                      <span className="ml-1" style={{ color: '#E05050' }}>
                        *
                      </span>
                    )}
                  </label>
                  {q.description && (
                    <p className="text-xs mb-3" style={{ color: colors.textLight }}>
                      {q.description}
                    </p>
                  )}
                  {!q.description && <div className="mb-3" />}

                  {/* Radio */}
                  {q.type === 'radio' && q.options && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map(opt =>
                        renderPill(opt, answers[q.id] === opt, () => setAnswer(q.id, opt, 'radio')),
                      )}
                    </div>
                  )}

                  {/* Radio with reason */}
                  {q.type === 'radio-with-reason' && q.options && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map(opt =>
                          renderPill(opt, answers[q.id] === opt, () => setAnswer(q.id, opt, 'radio-with-reason')),
                        )}
                      </div>
                      {renderReasonField(q.id, q.reasonPlaceholder)}
                    </>
                  )}

                  {/* Checkbox */}
                  {q.type === 'checkbox' && q.options && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map(opt => {
                        const checked = ((answers[q.id] as string[]) || []).includes(opt);
                        return renderPill(opt, checked, () => toggleCheckbox(q.id, opt));
                      })}
                    </div>
                  )}

                  {/* Rating */}
                  {q.type === 'rating' && renderRating(q.id)}

                  {/* Rating with reason */}
                  {q.type === 'rating-with-reason' && (
                    <>
                      {renderRating(q.id)}
                      {renderReasonField(q.id, q.reasonPlaceholder)}
                    </>
                  )}

                  {/* Emoji rating — BIG expressive faces */}
                  {q.type === 'emoji-rating' && (
                    <div className="flex justify-between gap-2">
                      {EMOJI_LABELS.map((emoji, i) => {
                        const val = String(i + 1);
                        const selected = answers[q.id] === val;
                        const emojiColor = EMOJI_COLORS[i];
                        return (
                          <motion.button
                            key={i}
                            onClick={() => setAnswer(q.id, val, 'emoji-rating')}
                            whileTap={{ scale: 0.85 }}
                            animate={selected ? { scale: [1, 1.2, 1.05] } : { scale: 1 }}
                            transition={springBounce}
                            className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl relative overflow-hidden"
                            style={{
                              background: selected ? `${emojiColor}20` : 'transparent',
                              border: `2.5px solid ${selected ? emojiColor : colors.border}`,
                              boxShadow: selected ? `0 4px 16px ${emojiColor}30` : 'none',
                            }}
                          >
                            {/* Glow ring behind emoji when selected */}
                            {selected && (
                              <motion.div
                                className="absolute inset-0 rounded-2xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.3, 0.1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                style={{ background: `radial-gradient(circle, ${emojiColor}30, transparent 70%)` }}
                              />
                            )}
                            <motion.span
                              className="text-4xl relative z-10"
                              animate={selected
                                ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                                : { scale: 1 }}
                              transition={selected
                                ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }
                                : {}}
                            >
                              {emoji}
                            </motion.span>
                            <span
                              className="text-[10px] font-medium relative z-10"
                              style={{ color: selected ? emojiColor : colors.textLight }}
                            >
                              {EMOJI_TEXTS[i]}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {/* Text — chat-bubble style */}
                  {q.type === 'text' && (
                    <input
                      type="text"
                      value={(answers[q.id] as string) || ''}
                      onChange={e => setAnswer(q.id, e.target.value, 'text')}
                      placeholder={q.placeholder || '說說你的想法...'}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                        animation:
                          (answers[q.id] as string)?.length > 0 ? 'sparkle-border 1.5s ease-in-out infinite' : 'none',
                      }}
                    />
                  )}

                  {/* Textarea — chat style + voice */}
                  {q.type === 'textarea' && (
                    <div>
                      <textarea
                        value={(answers[q.id] as string) || ''}
                        onChange={e => setAnswer(q.id, e.target.value, 'textarea')}
                        placeholder={q.placeholder || '在這裡暢所欲言吧～ 💬'}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-y transition-all"
                        style={{
                          background: colors.background,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                          animation:
                            (answers[q.id] as string)?.length > 0 ? 'sparkle-border 1.5s ease-in-out infinite' : 'none',
                        }}
                      />
                      {/* Voice input button */}
                      <div className="flex items-center gap-2 mt-2">
                        {voiceRecording === q.id ? (
                          <button
                            onClick={stopVoiceRecording}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white transition-all"
                            style={{
                              background: `linear-gradient(135deg, #FF4444, #FF6B6B)`,
                              animation: 'pulse 1s ease-in-out infinite',
                            }}
                          >
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            錄音中... 點擊停止
                          </button>
                        ) : voiceProcessing ? (
                          <span
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs"
                            style={{ color: colors.primary }}
                          >
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
                            </svg>
                            AI 正在理解你的語音...
                          </span>
                        ) : (
                          <button
                            onClick={() => startVoiceRecording(q.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all hover:shadow-md"
                            style={{
                              background: `${colors.primary}15`,
                              color: colors.primary,
                              border: `1px solid ${colors.primary}30`,
                            }}
                          >
                            🎙️ 用說的更快 — AI 語音輸入
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Number */}
                  {q.type === 'number' && (
                    <div className="flex items-center gap-2">
                      {q.numberPrefix && (
                        <span className="text-sm" style={{ color: colors.textLight }}>
                          {q.numberPrefix}
                        </span>
                      )}
                      <input
                        type="number"
                        value={(answers[q.id] as string) || ''}
                        onChange={e => setAnswer(q.id, e.target.value, 'number')}
                        placeholder={q.placeholder || ''}
                        className="w-36 px-4 py-3 rounded-xl text-sm text-center outline-none"
                        style={{
                          background: colors.background,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* ───── Navigation ───── */}
            <div className="flex gap-3 mt-6">
              {currentSection > 0 && (
                <motion.button
                  onClick={goPrev}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 py-3 rounded-full text-sm font-medium transition-all"
                  style={{ border: `1px solid ${colors.border}`, color: colors.textLight }}
                >
                  上一步
                </motion.button>
              )}
              {!isLastSection ? (
                <motion.button
                  onClick={goNext}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`,
                  }}
                >
                  下一步
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`,
                    ['--glow-color' as string]: `${colors.primary}40`,
                    boxShadow: `0 4px 16px ${colors.primary}40`,
                    animation: !isSubmitting ? 'glow-pulse 2s ease-in-out infinite' : 'none',
                  }}
                >
                  {isSubmitting ? '提交中...' : '提交回饋 ✨'}
                </motion.button>
              )}
            </div>

            {/* ───── Footer ───── */}
            <div className="text-center mt-6 pb-8">
              <span className="text-xs" style={{ color: colors.textLight }}>
                Powered by{' '}
                <a href="/" target="_blank" className="font-medium" style={{ color: colors.primary }}>
                  FeedBites
                </a>
              </span>
              <div className="text-[10px] mt-1" style={{ color: colors.textLight }}>
                Bite. Rate. Save.
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
