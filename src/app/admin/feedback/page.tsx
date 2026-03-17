'use client';

import { useState, useEffect } from 'react';
import {
  Shield, Bug, Lightbulb, HelpCircle, Clock, ArrowRight, CheckCircle2,
  AlertCircle, MessageCircle, Send, Loader2, Image as ImageIcon, Filter,
  ChevronDown, Store,
} from 'lucide-react';

interface Report {
  id: string;
  store_name: string;
  user_email: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  voice_transcript: string | null;
  created_at: string;
  updated_at: string;
  feedback_attachments: { id: string; file_url: string }[];
  feedback_responses: { id: string }[];
}

interface DetailReport extends Report {
  feedback_attachments: { id: string; file_url: string; file_name: string }[];
  feedback_responses: { id: string; responder_email: string; message: string; created_at: string }[];
}

const STATUS_OPTIONS = [
  { id: 'pending', label: '待處理', color: '#F59E0B' },
  { id: 'in-progress', label: '處理中', color: '#3B82F6' },
  { id: 'resolved', label: '已解決', color: '#10B981' },
  { id: 'closed', label: '已關閉', color: '#6B7280' },
];

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  bug: Bug,
  suggestion: Lightbulb,
  question: HelpCircle,
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  'in-progress': ArrowRight,
  resolved: CheckCircle2,
  closed: AlertCircle,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6B7280',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#DC2626',
};

export default function AdminFeedbackPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => { fetchReports(); }, [filterStatus, filterCategory]);

  async function fetchReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterCategory) params.set('category', filterCategory);
      const res = await fetch(`/api/admin/feedback?${params}`);
      if (!res.ok) {
        if (res.status === 403) { setError('需要管理員權限'); return; }
        throw new Error();
      }
      setReports(await res.json());
    } catch {
      setError('載入失敗');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    setReplyText('');
    try {
      const res = await fetch(`/api/feedback/${id}`);
      if (res.ok) setDetail(await res.json());
    } catch { /* ignore */ } finally {
      setDetailLoading(false);
    }
  }

  async function handleReply() {
    if (!replyText.trim() || !selectedId) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/feedback/${selectedId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText('');
        loadDetail(selectedId);
        fetchReports();
      }
    } catch { /* ignore */ } finally {
      setReplying(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!selectedId) return;
    setUpdatingStatus(true);
    try {
      await fetch(`/api/feedback/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      loadDetail(selectedId);
      fetchReports();
    } catch { /* ignore */ } finally {
      setUpdatingStatus(false);
    }
  }

  if (error === '需要管理員權限') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#3A3A3A]">無權限存取</h1>
          <p className="text-sm text-[#8A8585] mt-2">此頁面僅限管理員</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Top bar */}
      <div className="bg-white border-b border-[#E8E2D8] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#3A3A3A] flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#C5A55A]" />
          </div>
          <div>
            <h1 className="font-bold text-[#3A3A3A]">FeedBites Admin</h1>
            <p className="text-[10px] text-[#8A8585]">意見回報管理</p>
          </div>
        </div>
        <a href="/dashboard" className="text-xs text-[#C5A55A] hover:text-[#A08735]">
          回到 Dashboard →
        </a>
      </div>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Left: Report list */}
        <div className="w-[400px] border-r border-[#E8E2D8] bg-white flex flex-col">
          {/* Filters */}
          <div className="p-3 border-b border-[#E8E2D8] flex gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg border border-[#E8E2D8] text-xs bg-white outline-none"
            >
              <option value="">全部狀態</option>
              {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg border border-[#E8E2D8] text-xs bg-white outline-none"
            >
              <option value="">全部類型</option>
              <option value="bug">問題回報</option>
              <option value="suggestion">功能建議</option>
              <option value="question">使用疑問</option>
            </select>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-[#8A8585]">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />載入中...
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-[#8A8585] text-sm">沒有回報</div>
            ) : (
              reports.map(r => {
                const CatIcon = CATEGORY_ICONS[r.category] || HelpCircle;
                const StIcon = STATUS_ICONS[r.status] || Clock;
                const stColor = STATUS_OPTIONS.find(s => s.id === r.status)?.color || '#6B7280';
                return (
                  <button
                    key={r.id}
                    onClick={() => loadDetail(r.id)}
                    className={`w-full p-3 border-b border-[#E8E2D8] text-left hover:bg-[#FAF7F2] transition-colors ${
                      selectedId === r.id ? 'bg-[#FF8C00]/5 border-l-2 border-l-[#FF8C00]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CatIcon className="w-3.5 h-3.5 text-[#8A8585]" />
                      <span className="text-sm font-bold text-[#3A3A3A] truncate flex-1">{r.title}</span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: PRIORITY_COLORS[r.priority] || '#6B7280' }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#8A8585]">
                      <Store className="w-3 h-3" />
                      <span className="truncate">{r.store_name || r.user_email}</span>
                      <span className="ml-auto flex items-center gap-1" style={{ color: stColor }}>
                        <StIcon className="w-3 h-3" />
                        {STATUS_OPTIONS.find(s => s.id === r.status)?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#B0AAA0] mt-1">
                      <span>{new Date(r.created_at).toLocaleDateString('zh-TW')}</span>
                      {r.feedback_attachments?.length > 0 && (
                        <span className="flex items-center gap-0.5"><ImageIcon className="w-3 h-3" />{r.feedback_attachments.length}</span>
                      )}
                      {r.feedback_responses?.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[#C5A55A]"><MessageCircle className="w-3 h-3" />{r.feedback_responses.length}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="flex-1 flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-[#8A8585]">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">選擇一個回報查看詳情</p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#FF8C00] animate-spin" />
            </div>
          ) : detail ? (
            <>
              {/* Detail header */}
              <div className="p-5 border-b border-[#E8E2D8] bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-[#3A3A3A]">{detail.title}</h2>
                  <select
                    value={detail.status}
                    onChange={e => handleStatusChange(e.target.value)}
                    disabled={updatingStatus}
                    className="px-3 py-1.5 rounded-lg border border-[#E8E2D8] text-xs font-medium outline-none"
                    style={{ color: STATUS_OPTIONS.find(s => s.id === detail.status)?.color }}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#8A8585]">
                  <span className="flex items-center gap-1"><Store className="w-3 h-3" />{detail.store_name}</span>
                  <span>{detail.user_email}</span>
                  <span>{new Date(detail.created_at).toLocaleString('zh-TW')}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: PRIORITY_COLORS[detail.priority] + '15', color: PRIORITY_COLORS[detail.priority] }}
                  >
                    {detail.priority}
                  </span>
                </div>
              </div>

              {/* Detail content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="p-4 bg-white rounded-xl border border-[#E8E2D8]">
                  <p className="text-sm text-[#3A3A3A] whitespace-pre-wrap leading-relaxed">{detail.description}</p>
                </div>

                {/* Attachments */}
                {detail.feedback_attachments?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-[#8A8585] mb-2">附件截圖</h3>
                    <div className="flex flex-wrap gap-3">
                      {detail.feedback_attachments.map(att => (
                        <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                          className="w-32 h-32 rounded-xl overflow-hidden border border-[#E8E2D8] hover:border-[#FF8C00] transition-colors">
                          <img src={att.file_url} alt={att.file_name || ''} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voice transcript */}
                {detail.voice_transcript && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="text-[10px] text-blue-500 font-medium mb-1">🎙️ 語音轉錄</div>
                    <p className="text-sm text-[#3A3A3A]">{detail.voice_transcript}</p>
                  </div>
                )}

                {/* Responses */}
                {detail.feedback_responses?.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#C5A55A]">回覆紀錄</h3>
                    {detail.feedback_responses
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map(resp => (
                        <div key={resp.id} className="p-3 bg-[#C5A55A]/5 rounded-xl border border-[#C5A55A]/20">
                          <p className="text-sm text-[#3A3A3A] whitespace-pre-wrap">{resp.message}</p>
                          <div className="text-[10px] text-[#8A8585] mt-2 flex items-center gap-2">
                            <span>{resp.responder_email}</span>
                            <span>{new Date(resp.created_at).toLocaleString('zh-TW')}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Reply input */}
              <div className="p-4 border-t border-[#E8E2D8] bg-white">
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="輸入回覆..."
                    rows={2}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] resize-none bg-[#FAF7F2]"
                  />
                  <button
                    onClick={handleReply}
                    disabled={replying || !replyText.trim()}
                    className="px-4 bg-[#C5A55A] text-white rounded-xl hover:bg-[#A08735] transition-colors disabled:opacity-50 shrink-0"
                  >
                    {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
