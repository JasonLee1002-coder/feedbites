'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquareWarning, Bug, Frown, Lightbulb, HelpCircle, Send,
  Image as ImageIcon, X, Loader2, ChevronRight,
  Clock, CheckCircle2, AlertCircle, ArrowRight, MessageCircle, Upload,
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
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0=closed, 1=pick category, 2=describe
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) setReports(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
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
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#C5A55A] to-[#A08735] text-white rounded-xl text-sm font-bold shadow-md shadow-[#C5A55A]/15 hover:shadow-lg transition-all"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Send className="w-4 h-4" />
            新增回報
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
                  <h2 className="font-bold text-white text-lg">遇到什麼問題了嗎？</h2>
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
                  <h2 className="font-bold text-white text-lg">告訴我們更多細節</h2>
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
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#8A8585] mb-3 flex items-center gap-2">
            回報紀錄
            <span className="px-2 py-0.5 bg-[#C5A55A]/10 text-[#A08735] rounded-full text-[11px]">
              {reports.length}
            </span>
          </h2>
          {reports.map(report => {
            const isExpanded = expandedId === report.id;
            const statusInfo = STATUS_MAP[report.status] || STATUS_MAP.pending;
            const StatusIcon = statusInfo.icon;
            const catInfo2 = CATEGORIES.find(c => c.id === report.category) || CATEGORIES[3];
            const CatIcon = catInfo2.icon;
            const hasResponses = report.feedback_responses?.length > 0;
            const hasNewResponse = hasResponses && report.feedback_responses.some(r =>
              new Date(r.created_at) > new Date(report.updated_at || report.created_at)
            );

            return (
              <motion.div
                key={report.id}
                layout
                className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md hover:shadow-[#C5A55A]/5 ${
                  hasNewResponse ? 'border-[#C5A55A]/40 shadow-md shadow-[#C5A55A]/10' : 'border-[#E8E2D8]'
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-[#FAF7F2]/50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: catInfo2.bg }}
                  >
                    <CatIcon className="w-5 h-5" style={{ color: catInfo2.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#3A3A3A] truncate">{report.title}</span>
                      {hasNewResponse && (
                        <motion.span
                          className="px-1.5 py-0.5 bg-gradient-to-r from-[#C5A55A] to-[#A08735] text-white text-[9px] font-bold rounded-full"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          NEW
                        </motion.span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#8A8585]">
                        {new Date(report.created_at).toLocaleDateString('zh-TW')}
                      </span>
                      {report.feedback_attachments?.length > 0 && (
                        <span className="text-[10px] text-[#8A8585] flex items-center gap-0.5">
                          <ImageIcon className="w-3 h-3" />{report.feedback_attachments.length}
                        </span>
                      )}
                      {hasResponses && (
                        <span className="text-[10px] text-[#C5A55A] flex items-center gap-0.5 font-medium">
                          <MessageCircle className="w-3 h-3" />{report.feedback_responses.length} 回覆
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: statusInfo.color + '15', color: statusInfo.color }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                      <ChevronRight className="w-4 h-4 text-[#8A8585]" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-[#E8E2D8]">
                        <div className="mt-4 p-4 bg-[#FAF7F2] rounded-xl">
                          <p className="text-sm text-[#3A3A3A] whitespace-pre-wrap leading-relaxed">
                            {report.description}
                          </p>
                        </div>

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

                        {report.feedback_responses?.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <div className="text-xs font-bold text-[#C5A55A] flex items-center gap-1">
                              <MessageCircle className="w-3.5 h-3.5" />
                              FeedBites 團隊回覆
                            </div>
                            {report.feedback_responses.map(resp => (
                              <div
                                key={resp.id}
                                className="p-3 bg-[#C5A55A]/5 rounded-xl border border-[#C5A55A]/20"
                              >
                                <p className="text-sm text-[#3A3A3A] whitespace-pre-wrap">{resp.message}</p>
                                <p className="text-[10px] text-[#8A8585] mt-2">
                                  {new Date(resp.created_at).toLocaleString('zh-TW')}
                                </p>
                              </div>
                            ))}
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
