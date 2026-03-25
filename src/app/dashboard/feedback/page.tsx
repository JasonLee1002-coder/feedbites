'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquareWarning, Bug, Lightbulb, HelpCircle, Send, Paperclip,
  Image as ImageIcon, X, Loader2, ChevronRight,
  Clock, CheckCircle2, AlertCircle, ArrowRight, Sparkles, MessageCircle,
  Zap, Plus,
} from 'lucide-react';
import VoiceRecorder from '@/components/shared/VoiceRecorder';

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
}

interface Response {
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
  voice_transcript: string | null;
  created_at: string;
  updated_at: string;
  feedback_attachments: Attachment[];
  feedback_responses: Response[];
}

const CATEGORIES = [
  { id: 'bug', label: '問題回報', icon: Bug, color: '#EF4444', bgColor: '#FEF2F2', gradient: 'from-red-500 to-rose-400' },
  { id: 'suggestion', label: '功能建議', icon: Lightbulb, color: '#C5A55A', bgColor: '#FDF8EE', gradient: 'from-[#C5A55A] to-[#A08735]' },
  { id: 'question', label: '使用疑問', icon: HelpCircle, color: '#3B82F6', bgColor: '#EFF6FF', gradient: 'from-blue-500 to-indigo-400' },
];

const PRIORITIES = [
  { id: 'low', label: '低', color: '#6B7280', bg: 'bg-gray-100' },
  { id: 'medium', label: '中', color: '#C5A55A', bg: 'bg-[#C5A55A]/10' },
  { id: 'high', label: '高', color: '#EF4444', bg: 'bg-red-50' },
  { id: 'urgent', label: '緊急', color: '#DC2626', bg: 'bg-red-100' },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: '待處理', color: '#F59E0B', icon: Clock },
  'in-progress': { label: '處理中', color: '#3B82F6', icon: ArrowRight },
  resolved: { label: '已解決', color: '#10B981', icon: CheckCircle2 },
  closed: { label: '已關閉', color: '#6B7280', icon: AlertCircle },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function FeedbackPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('suggestion');
  const [priority, setPriority] = useState('medium');
  const [voiceTranscript, setVoiceTranscript] = useState('');
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

  const handleVoiceResult = useCallback((result: { transcript: string; description: string }) => {
    if (result.transcript) {
      setVoiceTranscript(result.transcript);
      setDescription(prev => prev ? prev + '\n\n' + result.transcript : result.transcript);
    }
  }, []);

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          voice_transcript: voiceTranscript || null,
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
        setShowForm(false);
        setSubmitted(false);
        setTitle('');
        setDescription('');
        setCategory('suggestion');
        setPriority('medium');
        setVoiceTranscript('');
        setScreenshots([]);
        setScreenshotPreviews([]);
        fetchReports();
      }, 2000);
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  }

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
    <div className="p-4 lg:p-8 max-w-4xl mx-auto relative overflow-hidden">
      {/* Background sparkles */}
      {[
        { x: '90%', y: '8%', delay: 0 },
        { x: '5%', y: '60%', delay: 1.5 },
        { x: '85%', y: '75%', delay: 0.8 },
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none text-[#C5A55A]/15"
          style={{ left: p.x, top: p.y }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: 3.5, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="w-4 h-4" />
        </motion.div>
      ))}

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
            遇到問題或有建議？回報給我們，專屬顧問會盡快回覆
          </p>
        </div>
        {!showForm && (
          <motion.button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#C5A55A] to-[#A08735] text-white rounded-xl text-sm font-bold shadow-md shadow-[#C5A55A]/15 hover:shadow-lg transition-all"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Plus className="w-4 h-4" />
            新增回報
          </motion.button>
        )}
      </motion.div>

      {/* ═══ Submit Form ═══ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            {submitted ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl border border-emerald-200 p-12 text-center"
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
            ) : (
              <div className="bg-white rounded-2xl border border-[#E8E2D8] shadow-lg shadow-[#C5A55A]/5 overflow-hidden">
                {/* Form header */}
                <div className="relative bg-gradient-to-r from-[#1a1a2e] to-[#16213e] p-5 flex items-center justify-between overflow-hidden">
                  <motion.div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(197,165,90,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(197,165,90,0.2) 0%, transparent 50%)',
                    }}
                    animate={{ opacity: [0.05, 0.15, 0.05] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                  <div className="flex items-center gap-3 relative">
                    <motion.div
                      className="w-10 h-10 rounded-xl bg-[#C5A55A]/20 flex items-center justify-center backdrop-blur-sm"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    >
                      <Zap className="w-5 h-5 text-[#C5A55A]" />
                    </motion.div>
                    <div>
                      <h2 className="font-bold text-white">新增回報</h2>
                      <p className="text-[11px] text-white/50">描述越詳細，我們越能快速幫你解決</p>
                    </div>
                  </div>
                  <button onClick={() => setShowForm(false)} className="text-white/50 hover:text-white transition-colors relative">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-bold text-[#3A3A3A] mb-2">回報類型</label>
                    <div className="grid grid-cols-3 gap-3">
                      {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const isActive = category === cat.id;
                        return (
                          <motion.button
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className={`relative flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium transition-all border-2 overflow-hidden ${
                              isActive
                                ? 'text-white shadow-lg border-transparent'
                                : 'border-[#E8E2D8] hover:border-[#C5A55A]/40 bg-white text-[#3A3A3A]'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isActive && (
                              <motion.div
                                className={`absolute inset-0 bg-gradient-to-r ${cat.gradient}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              />
                            )}
                            <span className="relative flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {cat.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-bold text-[#3A3A3A] mb-2">優先程度</label>
                    <div className="flex gap-2">
                      {PRIORITIES.map(p => (
                        <motion.button
                          key={p.id}
                          onClick={() => setPriority(p.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            priority === p.id
                              ? 'text-white shadow-md'
                              : `${p.bg} border border-[#E8E2D8]`
                          }`}
                          style={priority === p.id ? { background: p.color } : { color: p.color }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {p.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-bold text-[#3A3A3A] mb-2">標題</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="簡短描述你遇到的問題或建議"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20 bg-[#FAF7F2] transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-bold text-[#3A3A3A] mb-2">詳細描述</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="請詳細描述你遇到的情況，步驟、預期結果、實際結果..."
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20 bg-[#FAF7F2] resize-none transition-all"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <VoiceRecorder
                        dishName=""
                        onResult={handleVoiceResult}
                        mode="transcribe"
                      />
                      <span className="text-[10px] text-[#8A8585]">按住說明問題，AI 自動轉文字填入</span>
                    </div>
                  </div>

                  {/* Screenshots */}
                  <div>
                    <label className="block text-sm font-bold text-[#3A3A3A] mb-2">
                      截圖附件 <span className="font-normal text-[#8A8585]">（選填，可多張）</span>
                    </label>
                    <div className="flex flex-wrap gap-3">
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
                        className="w-24 h-24 rounded-xl border-2 border-dashed border-[#E8E2D8] hover:border-[#C5A55A] flex flex-col items-center justify-center gap-1 text-[#8A8585] hover:text-[#C5A55A] transition-all bg-[#FAF7F2]"
                        whileHover={{ scale: 1.05, borderColor: '#C5A55A' }}
                      >
                        <Paperclip className="w-5 h-5" />
                        <span className="text-[10px]">上傳截圖</span>
                      </motion.button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={addScreenshot}
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex items-center gap-3 pt-2">
                    <motion.button
                      onClick={handleSubmit}
                      disabled={submitting || !title.trim() || !description.trim()}
                      className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#C5A55A] to-[#A08735] text-white rounded-xl text-sm font-bold shadow-md shadow-[#C5A55A]/15 hover:shadow-lg disabled:opacity-50 transition-all"
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {submitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />提交中...</>
                      ) : (
                        <><Send className="w-4 h-4" />送出回報</>
                      )}
                    </motion.button>
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-6 py-3 text-[#8A8585] text-sm hover:text-[#3A3A3A] transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Report History ═══ */}
      {reports.length === 0 && !showForm ? (
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
            使用過程中遇到問題或有建議？點擊上方按鈕告訴我們，我們會盡快處理。
          </p>
        </motion.div>
      ) : reports.length > 0 && (
        <motion.div
          className="space-y-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.h2
            className="text-sm font-bold text-[#8A8585] mb-3 flex items-center gap-2"
            variants={fadeUp}
          >
            回報紀錄
            <span className="px-2 py-0.5 bg-[#C5A55A]/10 text-[#A08735] rounded-full text-[11px]">
              {reports.length}
            </span>
          </motion.h2>
          {reports.map(report => {
            const isExpanded = expandedId === report.id;
            const statusInfo = STATUS_MAP[report.status] || STATUS_MAP.pending;
            const StatusIcon = statusInfo.icon;
            const catInfo = CATEGORIES.find(c => c.id === report.category);
            const CatIcon = catInfo?.icon || HelpCircle;
            const hasResponses = report.feedback_responses?.length > 0;
            const hasNewResponse = hasResponses && report.feedback_responses.some(r =>
              new Date(r.created_at) > new Date(report.updated_at || report.created_at)
            );

            return (
              <motion.div
                key={report.id}
                variants={fadeUp}
                layout
                className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md hover:shadow-[#C5A55A]/5 ${
                  hasNewResponse ? 'border-[#C5A55A]/40 shadow-md shadow-[#C5A55A]/10' : 'border-[#E8E2D8]'
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-[#FAF7F2]/50 transition-colors"
                >
                  <motion.div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: catInfo?.bgColor || '#F3F4F6' }}
                    whileHover={{ rotate: 5, scale: 1.1 }}
                  >
                    <CatIcon className="w-5 h-5" style={{ color: catInfo?.color || '#6B7280' }} />
                  </motion.div>
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
                              <motion.div
                                key={resp.id}
                                className="p-3 bg-[#C5A55A]/5 rounded-xl border border-[#C5A55A]/20"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                              >
                                <p className="text-sm text-[#3A3A3A] whitespace-pre-wrap">{resp.message}</p>
                                <p className="text-[10px] text-[#8A8585] mt-2">
                                  {new Date(resp.created_at).toLocaleString('zh-TW')}
                                </p>
                              </motion.div>
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
        </motion.div>
      )}
    </div>
  );
}
