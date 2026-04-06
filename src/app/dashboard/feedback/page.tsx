'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquareWarning, Bug, Frown, Lightbulb, HelpCircle, Send,
  Image as ImageIcon, X, Loader2, ChevronRight,
  Clock, CheckCircle2, AlertCircle, ArrowRight, MessageCircle, Upload,
  Star, TrendingUp, Zap, Heart, Trash2, Check,
} from 'lucide-react';

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
}

interface FeedbackResponse {
  id: string;
  responder_email: string;
  message: string;
  created_at: string;
}

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  feedback_attachments: Attachment[];
  feedback_responses: FeedbackResponse[];
}

const CATEGORIES = [
  { id: 'bug', label: '發現 Bug', desc: '功能壞掉、錯誤訊息', icon: Bug, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  { id: 'ux', label: '操作不順', desc: '步驟太多、不好用', icon: Frown, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'suggestion', label: '功能建議', desc: '希望新增的功能', icon: Lightbulb, color: '#C5A55A', bg: '#FDF8EE', border: '#E8D5A0' },
  { id: 'other', label: '其他', desc: '其他意見或回饋', icon: HelpCircle, color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: '待處理', color: '#F59E0B', icon: Clock },
  'in-progress': { label: '處理中', color: '#3B82F6', icon: ArrowRight },
  resolved: { label: '已解決', color: '#10B981', icon: CheckCircle2 },
  closed: { label: '已關閉', color: '#6B7280', icon: AlertCircle },
};

export default function FeedbackPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<0 | 1 | 2>(1); // 1=pick category, 2=describe (start open)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<Record<string, boolean>>({});
  const [ratingHover, setRatingHover] = useState<Record<string, number>>({});
  const [ratingSelected, setRatingSelected] = useState<Record<string, number>>({});
  const [ratingComment, setRatingComment] = useState<Record<string, string>>({});
  const [ratingSubmitting, setRatingSubmitting] = useState<Record<string, boolean>>({});
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) setReports(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  async function handleReply(reportId: string) {
    const text = replyText[reportId]?.trim();
    if (!text) return;
    setReplying(prev => ({ ...prev, [reportId]: true }));
    try {
      const res = await fetch(`/api/feedback/${reportId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        setReplyText(prev => ({ ...prev, [reportId]: '' }));
        fetchReports();
      }
    } catch { /* ignore */ } finally {
      setReplying(prev => ({ ...prev, [reportId]: false }));
    }
  }

  async function handleRate(reportId: string) {
    const rating = ratingSelected[reportId];
    if (!rating) return;
    setRatingSubmitting(prev => ({ ...prev, [reportId]: true }));
    try {
      const res = await fetch(`/api/feedback/${reportId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: ratingComment[reportId] || '' }),
      });
      if (res.ok) fetchReports();
    } catch { /* ignore */ } finally {
      setRatingSubmitting(prev => ({ ...prev, [reportId]: false }));
    }
  }

  function toggleDeleteSelect(id: string) {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (selectedForDelete.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/feedback/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedForDelete) }),
      });
      if (res.ok) {
        setDeleteMode(false);
        setSelectedForDelete(new Set());
        fetchReports();
      }
    } catch { /* ignore */ } finally {
      setDeleting(false);
    }
  }

  function exitDeleteMode() {
    setDeleteMode(false);
    setSelectedForDelete(new Set());
  }

  function pickCategory(id: string) {
    setCategory(id);
    setStep(2);
  }

  function addScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setScreenshots(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setScreenshotPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeScreenshot(index: number) {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setStep(0);
    setCategory('');
    setDescription('');
    setScreenshots([]);
    setScreenshotPreviews([]);
    setSubmitted(false);
  }

  async function handleSubmit() {
    if (!description.trim()) return;
    setSubmitting(true);

    try {
      const catInfo = CATEGORIES.find(c => c.id === category);
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: catInfo?.label || '回報',
          description: description.trim(),
          category: category === 'ux' ? 'bug' : category === 'other' ? 'question' : category,
          priority: category === 'bug' ? 'high' : 'medium',
        }),
      });

      if (!res.ok) throw new Error('提交失敗');
      const report = await res.json();

      for (const file of screenshots) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('report_id', report.id);
        await fetch('/api/feedback/upload', { method: 'POST', body: formData });
      }

      setSubmitted(true);
      setTimeout(() => {
        resetForm();
        fetchReports();
      }, 2000);
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  }

  const catInfo = CATEGORIES.find(c => c.id === category);

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#E8E2D8] rounded w-48" />
          <div className="h-40 bg-[#E8E2D8] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-[#3A3A3A] flex items-center gap-2" style={{ fontFamily: "'Noto Serif TC', serif" }}>
            <motion.div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C5A55A] to-[#A08735] flex items-center justify-center"
              whileHover={{ rotate: 10, scale: 1.1 }}
            >
              <MessageSquareWarning className="w-5 h-5 text-white" />
            </motion.div>
            系統問題回報
          </h1>
          <p className="text-sm text-[#8A8585] mt-1">
            遇到問題或有建議？我們會盡快處理
          </p>
        </div>
        {step === 0 && (
          <motion.button
            onClick={() => setStep(1)}
            className="relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#C5A55A] to-[#A08735] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#C5A55A]/25 hover:shadow-xl overflow-hidden yuzu-glow-pulse"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="absolute inset-0 pointer-events-none yuzu-shimmer" />
            <Send className="w-4 h-4 relative z-10" />
            <span className="relative z-10">新增回報</span>
          </motion.button>
        )}
      </motion.div>

      {/* ═══ Wizard ═══ */}
      <AnimatePresence mode="wait">
        {/* Success */}
        {submitted && (
          <motion.div
            key="success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-8 bg-white rounded-2xl border border-emerald-200 p-12 text-center"
          >
            <motion.div
              className="text-5xl mb-4"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.8 }}
            >
              🎉
            </motion.div>
            <h2 className="text-xl font-bold text-emerald-600 mb-2">回報已送出！</h2>
            <p className="text-sm text-[#8A8585]">我們會盡快查看並回覆你</p>
          </motion.div>
        )}

        {/* Step 1: Pick category */}
        {step === 1 && !submitted && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl border border-[#E8E2D8] shadow-lg shadow-[#C5A55A]/5 overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-[#1a1a2e] to-[#16213e] px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="text-2xl"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🔍
                  </motion.div>
                  <h2 className="font-bold text-white text-lg tracking-wide" style={{ fontFamily: "'Noto Serif TC', serif" }}>遇到什麼問題了嗎？</h2>
                </div>
                <button onClick={resetForm} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category cards */}
              <div className="p-5 space-y-3">
                {CATEGORIES.map((cat, i) => {
                  const Icon = cat.icon;
                  return (
                    <motion.button
                      key={cat.id}
                      onClick={() => pickCategory(cat.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md group"
                      style={{ borderColor: cat.border, background: cat.bg }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: cat.color + '18' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-[#3A3A3A]" style={{ color: cat.color }}>{cat.label}</div>
                        <div className="text-xs text-[#8A8585] mt-0.5">{cat.desc}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#8A8585] group-hover:translate-x-1 transition-transform" style={{ color: cat.color }} />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Describe */}
        {step === 2 && !submitted && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl border border-[#E8E2D8] shadow-lg shadow-[#C5A55A]/5 overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-[#1a1a2e] to-[#16213e] px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="text-2xl"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ✏️
                  </motion.div>
                  <h2 className="font-bold text-white text-lg tracking-wide" style={{ fontFamily: "'Noto Serif TC', serif" }}>告訴我們更多細節</h2>
                </div>
                {/* Step dots */}
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/30" />
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Selected category badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#8A8585]">類型：</span>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: catInfo?.bg, color: catInfo?.color, border: `1px solid ${catInfo?.border}` }}
                  >
                    {catInfo?.label}
                  </span>
                </div>

                {/* Screenshot upload */}
                <div>
                  <label className="block text-sm font-bold text-[#3A3A3A] mb-2">截圖（選填）</label>
                  {screenshotPreviews.length > 0 ? (
                    <div className="flex flex-wrap gap-3 mb-3">
                      {screenshotPreviews.map((preview, i) => (
                        <motion.div
                          key={i}
                          className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#E8E2D8] group"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeScreenshot(i)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                      <motion.button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-xl border-2 border-dashed border-[#E8E2D8] hover:border-[#C5A55A] flex flex-col items-center justify-center gap-1 text-[#8A8585] hover:text-[#C5A55A] transition-all"
                        whileHover={{ scale: 1.05 }}
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-[9px]">再加一張</span>
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-10 rounded-xl border-2 border-dashed border-[#E8E2D8] hover:border-[#C5A55A] flex flex-col items-center justify-center gap-2 text-[#8A8585] hover:text-[#C5A55A] transition-all bg-[#FAF7F2]"
                      whileHover={{ borderColor: '#C5A55A' }}
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-sm">點擊上傳截圖</span>
                      <span className="text-[10px] text-[#8A8585]">JPG / PNG，最大 5MB</span>
                    </motion.button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={addScreenshot}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-[#3A3A3A] mb-2">
                    描述問題 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value.slice(0, 2000))}
                    placeholder="請描述你遇到的問題或建議..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20 bg-[#FAF7F2] resize-none transition-all"
                    autoFocus
                  />
                  <div className="text-right text-[10px] text-[#8A8585] mt-1">
                    {description.length}/2000
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 text-sm font-medium text-[#3A3A3A] bg-[#FAF7F2] rounded-xl border border-[#E8E2D8] hover:border-[#C5A55A] transition-all"
                  >
                    返回
                  </button>
                  <motion.button
                    onClick={handleSubmit}
                    disabled={submitting || !description.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#C5A55A] to-[#A08735] text-white rounded-xl text-sm font-bold shadow-md shadow-[#C5A55A]/15 disabled:opacity-50 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />送出中...</>
                    ) : (
                      <><Send className="w-4 h-4" />送出回報</>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Enhanced Service Stats Dashboard ═══ */}
      {reports.length > 0 && step === 0 && (() => {
        const resolved = reports.filter(r => r.status === 'resolved' || r.status === 'closed');
        const inProgress = reports.filter(r => r.status === 'in-progress');
        const pending = reports.filter(r => r.status === 'pending');
        const withResponse = reports.filter(r => r.feedback_responses?.length > 0);
        const avgHours = withResponse.length > 0
          ? Math.round(withResponse.reduce((sum, r) => {
              const submitted = new Date(r.created_at).getTime();
              const firstReply = new Date(r.feedback_responses[0].created_at).getTime();
              return sum + (firstReply - submitted) / (1000 * 60 * 60);
            }, 0) / withResponse.length)
          : null;
        const rated = reports.filter(r => r.satisfaction_rating !== null && r.satisfaction_rating !== undefined);
        const avgRating = rated.length > 0
          ? (rated.reduce((sum, r) => sum + (r.satisfaction_rating || 0), 0) / rated.length).toFixed(1)
          : null;
        const resolveRate = reports.length > 0 ? Math.round((resolved.length / reports.length) * 100) : 0;

        return (
          <motion.div
            className="mb-6 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f172a] rounded-2xl text-white relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Decorative elements */}
            <motion.div
              className="absolute top-4 right-20 text-lg opacity-20"
              animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            >✨</motion.div>
            <motion.div
              className="absolute bottom-8 right-8 text-sm opacity-15"
              animate={{ rotate: [0, -360] }}
              transition={{ duration: 6, repeat: Infinity }}
            >⭐</motion.div>
            <motion.div
              className="absolute top-12 right-4 w-20 h-20 rounded-full bg-[#C5A55A]/5 blur-xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />

            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <motion.div
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C5A55A] to-[#A08735] flex items-center justify-center shadow-lg shadow-[#C5A55A]/20"
                  whileHover={{ rotate: 10 }}
                >
                  <span className="text-base">🛡️</span>
                </motion.div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">FeedBites 服務儀表板</h3>
                  <p className="text-[10px] text-white/40">我們重視每一則回饋</p>
                </div>
              </div>
              {avgRating && (
                <motion.div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/20"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.5 }}
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-amber-300">{avgRating}</span>
                  <span className="text-[9px] text-amber-400/60">滿意度</span>
                </motion.div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="px-5 pb-4 grid grid-cols-4 gap-2.5">
              {[
                { value: resolved.length, label: '已解決', color: 'text-emerald-400', icon: CheckCircle2, delay: 0.1 },
                { value: `${resolveRate}%`, label: '解決率', color: 'text-[#C5A55A]', icon: TrendingUp, delay: 0.2 },
                { value: avgHours !== null ? (avgHours < 1 ? '<1h' : `${avgHours}h`) : '—', label: '平均回覆', color: 'text-sky-400', icon: Zap, delay: 0.3 },
                { value: reports.length, label: '總回報', color: 'text-purple-400', icon: MessageSquareWarning, delay: 0.4 },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={i}
                    className="bg-white/[0.06] hover:bg-white/[0.1] rounded-xl p-3 text-center backdrop-blur-sm transition-colors border border-white/[0.04]"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: stat.delay }}
                  >
                    <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${stat.color} opacity-60`} />
                    <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-[9px] text-white/40 mt-0.5">{stat.label}</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Progress Bar: pending / in-progress / resolved */}
            {reports.length > 0 && (
              <div className="px-5 pb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-white/40">處理進度</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden flex">
                    {resolved.length > 0 && (
                      <motion.div
                        className="h-full bg-emerald-500 rounded-l-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(resolved.length / reports.length) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                    )}
                    {inProgress.length > 0 && (
                      <motion.div
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(inProgress.length / reports.length) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                      />
                    )}
                    {pending.length > 0 && (
                      <motion.div
                        className="h-full bg-amber-500/50 rounded-r-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(pending.length / reports.length) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] text-white/30">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />已解決 {resolved.length}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />處理中 {inProgress.length}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />待處理 {pending.length}</span>
                </div>
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* ═══ Report History ═══ */}
      {reports.length === 0 && step === 0 ? (
        <motion.div
          className="bg-white rounded-2xl border border-[#E8E2D8] p-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="w-20 h-20 rounded-full bg-[#C5A55A]/10 flex items-center justify-center mx-auto mb-5"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <MessageSquareWarning className="w-10 h-10 text-[#C5A55A]" />
          </motion.div>
          <h2 className="text-lg font-bold text-[#3A3A3A] mb-2">還沒有任何回報</h2>
          <p className="text-sm text-[#8A8585] max-w-sm mx-auto">
            使用過程中遇到問題或有建議？點擊上方按鈕告訴我們。
          </p>
        </motion.div>
      ) : reports.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#3A3A3A] flex items-center gap-2" style={{ fontFamily: "'Noto Serif TC', serif" }}>
              <motion.div
                className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C5A55A]/20 to-[#A08735]/10 flex items-center justify-center"
                whileHover={{ rotate: 10 }}
              >
                <MessageCircle className="w-4 h-4 text-[#C5A55A]" />
              </motion.div>
              回報紀錄
              <span className="px-2 py-0.5 bg-[#C5A55A]/10 text-[#A08735] rounded-full text-[11px] font-normal">
                {reports.length}
              </span>
            </h2>
            {!deleteMode ? (
              <motion.button
                onClick={() => setDeleteMode(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-red-400 hover:text-red-500 hover:bg-red-50 transition-all"
                whileTap={{ scale: 0.95 }}
              >
                <Trash2 className="w-3 h-3" />
                刪除
              </motion.button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={exitDeleteMode}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-[#8A8585] hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <motion.button
                  onClick={handleDelete}
                  disabled={selectedForDelete.size === 0 || deleting}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 transition-all"
                  whileTap={{ scale: 0.95 }}
                >
                  {deleting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  刪除 {selectedForDelete.size > 0 ? `(${selectedForDelete.size})` : ''}
                </motion.button>
              </div>
            )}
          </div>
          {reports.map((report, idx) => {
            const isExpanded = expandedId === report.id;
            const statusInfo = STATUS_MAP[report.status] || STATUS_MAP.pending;
            const StatusIcon = statusInfo.icon;
            const catInfo2 = CATEGORIES.find(c => c.id === report.category) || CATEGORIES[3];
            const CatIcon = catInfo2.icon;
            const hasResponses = report.feedback_responses?.length > 0;
            const latestResponse = hasResponses
              ? report.feedback_responses[report.feedback_responses.length - 1]
              : null;
            const hasNewResponse = hasResponses && report.feedback_responses.some(r =>
              new Date(r.created_at) > new Date(report.updated_at || report.created_at)
            );
            const isResolved = report.status === 'resolved';

            // Calculate response time
            const responseTimeLabel = (() => {
              if (!latestResponse) return null;
              const submitted = new Date(report.created_at).getTime();
              const replied = new Date(latestResponse.created_at).getTime();
              const diffH = Math.round((replied - submitted) / (1000 * 60 * 60));
              if (diffH < 1) return '1 小時內回覆';
              if (diffH < 24) return `${diffH} 小時內回覆`;
              const diffD = Math.round(diffH / 24);
              return `${diffD} 天內回覆`;
            })();

            // Progress steps
            const progressSteps = [
              { label: '已提交', done: true, icon: '📝', time: report.created_at },
              { label: '已收到', done: report.status !== 'pending' || hasResponses, icon: '👀', time: null },
              { label: '處理中', done: report.status === 'in-progress' || isResolved, icon: '🔧', time: latestResponse?.created_at || null },
              { label: '已解決', done: isResolved, icon: '✅', time: isResolved ? (report.updated_at || latestResponse?.created_at || null) : null },
            ];

            return (
              <motion.div
                key={report.id}
                layout
                className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md ${
                  isResolved
                    ? 'border-emerald-200 shadow-sm shadow-emerald-100'
                    : hasNewResponse
                      ? 'border-[#C5A55A]/40 shadow-md shadow-[#C5A55A]/10'
                      : 'border-[#E8E2D8] hover:shadow-[#C5A55A]/5'
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                {/* ── Card Header ── */}
                <button
                  onClick={() => deleteMode ? toggleDeleteSelect(report.id) : setExpandedId(isExpanded ? null : report.id)}
                  className="w-full p-4 text-left hover:bg-[#FAF7F2]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Delete mode checkbox */}
                    {deleteMode && (
                      <motion.div
                        initial={{ scale: 0, width: 0 }}
                        animate={{ scale: 1, width: 'auto' }}
                        exit={{ scale: 0, width: 0 }}
                        className="shrink-0"
                      >
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          selectedForDelete.has(report.id)
                            ? 'bg-red-500 border-red-500'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {selectedForDelete.has(report.id) && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                      </motion.div>
                    )}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: isResolved ? '#ECFDF5' : catInfo2.bg }}
                    >
                      {isResolved
                        ? <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>✅</motion.span>
                        : <CatIcon className="w-5 h-5" style={{ color: catInfo2.color }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#3A3A3A] truncate">{report.title}</span>
                        {hasNewResponse && !isResolved && (
                          <motion.span
                            className="px-1.5 py-0.5 bg-gradient-to-r from-[#C5A55A] to-[#A08735] text-white text-[9px] font-bold rounded-full"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            NEW
                          </motion.span>
                        )}
                        {isResolved && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-full border border-emerald-200">
                            已解決
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#8A8585]">
                          {new Date(report.created_at).toLocaleDateString('zh-TW')}
                        </span>
                        {responseTimeLabel && (
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />{responseTimeLabel}
                          </span>
                        )}
                        {report.feedback_attachments?.length > 0 && (
                          <span className="text-[10px] text-[#8A8585] flex items-center gap-0.5">
                            <ImageIcon className="w-3 h-3" />{report.feedback_attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isResolved && (
                        <span
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{ background: statusInfo.color + '15', color: statusInfo.color }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      )}
                      <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                        <ChevronRight className="w-4 h-4 text-[#8A8585]" />
                      </motion.div>
                    </div>
                  </div>

                  {/* ── Latest response preview (no expand needed) ── */}
                  {latestResponse && !isExpanded && (
                    <div className="mt-3 ml-[52px] p-2.5 bg-[#C5A55A]/5 rounded-xl border border-[#C5A55A]/15">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-4 h-4 rounded-full bg-[#C5A55A]/20 flex items-center justify-center">
                          <span className="text-[8px]">💬</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#C5A55A]">FeedBites 餐飲顧問</span>
                        <span className="text-[9px] text-[#8A8585]">
                          {new Date(latestResponse.created_at).toLocaleDateString('zh-TW')}
                        </span>
                      </div>
                      <p className="text-xs text-[#3A3A3A] line-clamp-2 leading-relaxed">
                        {latestResponse.message}
                      </p>
                    </div>
                  )}
                </button>

                {/* ── Expanded Detail ── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 border-t border-[#E8E2D8]">

                        {/* ── Progress Timeline ── */}
                        <div className="mt-4 mb-4 flex items-center gap-0">
                          {progressSteps.map((s, i) => (
                            <div key={i} className="flex items-center flex-1">
                              <div className="flex flex-col items-center">
                                <motion.div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                                    s.done
                                      ? 'bg-emerald-50 border-2 border-emerald-400'
                                      : 'bg-gray-50 border-2 border-gray-200'
                                  }`}
                                  initial={s.done ? { scale: 0 } : {}}
                                  animate={s.done ? { scale: 1 } : {}}
                                  transition={{ type: 'spring', delay: i * 0.1 }}
                                >
                                  {s.icon}
                                </motion.div>
                                <span className={`text-[9px] mt-1 font-medium ${s.done ? 'text-emerald-600' : 'text-gray-300'}`}>
                                  {s.label}
                                </span>
                                {s.time && (
                                  <span className="text-[8px] text-[#8A8585]">
                                    {new Date(s.time).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              {i < progressSteps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-1 rounded ${
                                  progressSteps[i + 1].done ? 'bg-emerald-300' : 'bg-gray-200'
                                }`} />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* ── Resolved celebration + Satisfaction Rating ── */}
                        {isResolved && (
                          <motion.div
                            className="mb-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 overflow-hidden"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                          >
                            <div className="p-4 text-center">
                              <motion.div
                                className="text-3xl mb-2"
                                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                                transition={{ duration: 1.5, repeat: 2 }}
                              >
                                🎉
                              </motion.div>
                              <p className="text-sm font-bold text-emerald-700">問題已解決！</p>
                              <p className="text-[11px] text-emerald-600/70 mt-1">感謝你的回饋，讓我們持續變更好</p>
                            </div>

                            {/* Satisfaction Rating */}
                            {report.satisfaction_rating ? (
                              <div className="px-4 pb-4">
                                <div className="bg-white/60 rounded-xl p-3 text-center border border-emerald-200/50">
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <Star
                                        key={s}
                                        className={`w-4 h-4 ${s <= report.satisfaction_rating! ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-emerald-600/70 flex items-center justify-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    感謝您的評分！
                                  </p>
                                  {report.satisfaction_comment && (
                                    <p className="text-[11px] text-[#3A3A3A]/70 mt-1 italic">
                                      「{report.satisfaction_comment}」
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="px-4 pb-4">
                                <div className="bg-white/60 rounded-xl p-4 border border-emerald-200/50">
                                  <p className="text-xs font-bold text-emerald-700 text-center mb-3">
                                    這次處理滿意嗎？給我們打個分吧 ✨
                                  </p>
                                  {/* Star rating */}
                                  <div className="flex items-center justify-center gap-2 mb-3">
                                    {[1, 2, 3, 4, 5].map(s => {
                                      const hoverVal = ratingHover[report.id] || 0;
                                      const selectedVal = ratingSelected[report.id] || 0;
                                      const isActive = s <= (hoverVal || selectedVal);
                                      return (
                                        <motion.button
                                          key={s}
                                          onMouseEnter={() => setRatingHover(prev => ({ ...prev, [report.id]: s }))}
                                          onMouseLeave={() => setRatingHover(prev => ({ ...prev, [report.id]: 0 }))}
                                          onClick={() => setRatingSelected(prev => ({ ...prev, [report.id]: s }))}
                                          className="p-1 transition-all"
                                          whileHover={{ scale: 1.3, y: -2 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <Star
                                            className={`w-7 h-7 transition-colors ${
                                              isActive
                                                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]'
                                                : 'text-gray-200 hover:text-amber-200'
                                            }`}
                                          />
                                        </motion.button>
                                      );
                                    })}
                                  </div>
                                  {/* Rating label */}
                                  {(ratingHover[report.id] || ratingSelected[report.id]) ? (
                                    <motion.p
                                      className="text-center text-xs text-amber-600 font-medium mb-2"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                    >
                                      {['', '😞 不太滿意', '😐 還好', '🙂 滿意', '😊 很滿意', '🤩 非常滿意'][ratingHover[report.id] || ratingSelected[report.id] || 0]}
                                    </motion.p>
                                  ) : null}
                                  {/* Comment + Submit */}
                                  {ratingSelected[report.id] && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="space-y-2"
                                    >
                                      <input
                                        type="text"
                                        value={ratingComment[report.id] || ''}
                                        onChange={e => setRatingComment(prev => ({ ...prev, [report.id]: e.target.value }))}
                                        placeholder="想說什麼都可以（選填）"
                                        className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 bg-white"
                                      />
                                      <motion.button
                                        onClick={() => handleRate(report.id)}
                                        disabled={ratingSubmitting[report.id]}
                                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-500/15 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        {ratingSubmitting[report.id] ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <><Heart className="w-3.5 h-3.5" />送出評分</>
                                        )}
                                      </motion.button>
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* ── Description ── */}
                        <div className="p-4 bg-[#FAF7F2] rounded-xl">
                          <p className="text-sm text-[#3A3A3A] whitespace-pre-wrap leading-relaxed">
                            {report.description}
                          </p>
                        </div>

                        {/* ── Attachments ── */}
                        {report.feedback_attachments?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {report.feedback_attachments.map(att => (
                              <a
                                key={att.id}
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-20 h-20 rounded-xl overflow-hidden border border-[#E8E2D8] hover:border-[#C5A55A] transition-colors hover:shadow-md"
                              >
                                <img src={att.file_url} alt={att.file_name || ''} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* ── Conversation History ── */}
                        {report.feedback_responses?.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <div className="text-xs font-bold text-[#C5A55A] flex items-center gap-1">
                              <MessageCircle className="w-3.5 h-3.5" />
                              對話紀錄
                            </div>
                            {report.feedback_responses.map((resp, ri) => {
                              const isTeam = resp.responder_email === 'admin@feedbites.app' || resp.responder_email?.includes('feedbites');
                              return (
                                <motion.div
                                  key={resp.id}
                                  className={`p-3.5 rounded-xl border relative ${
                                    isTeam
                                      ? 'bg-[#C5A55A]/5 border-[#C5A55A]/20'
                                      : 'bg-blue-50/50 border-blue-200/50 ml-4'
                                  }`}
                                  initial={{ opacity: 0, x: isTeam ? -10 : 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: ri * 0.1 }}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                      isTeam ? 'bg-[#C5A55A]/20' : 'bg-blue-100'
                                    }`}>
                                      <span className="text-[10px]">{isTeam ? '🍽️' : '💬'}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold ${isTeam ? 'text-[#C5A55A]' : 'text-blue-600'}`}>
                                      {isTeam ? 'FeedBites 餐飲顧問' : '我的回覆'}
                                    </span>
                                    <span className="text-[9px] text-[#8A8585]">
                                      {new Date(resp.created_at).toLocaleString('zh-TW')}
                                    </span>
                                  </div>
                                  <p className="text-sm text-[#3A3A3A] whitespace-pre-wrap leading-relaxed">{resp.message}</p>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}

                        {/* ── Reply Input ── */}
                        {report.status !== 'closed' && (
                          <div className="mt-4">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyText[report.id] || ''}
                                onChange={e => setReplyText(prev => ({ ...prev, [report.id]: e.target.value }))}
                                placeholder="回覆或補充說明..."
                                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20 bg-[#FAF7F2]"
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey && replyText[report.id]?.trim()) {
                                    e.preventDefault();
                                    handleReply(report.id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleReply(report.id)}
                                disabled={replying[report.id] || !replyText[report.id]?.trim()}
                                className="px-4 py-2.5 bg-[#C5A55A] text-white rounded-xl text-sm font-bold hover:bg-[#A08735] disabled:opacity-40 transition-all shrink-0 flex items-center gap-1.5"
                              >
                                {replying[report.id] ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                送出
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
