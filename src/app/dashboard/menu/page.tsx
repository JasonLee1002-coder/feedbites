'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Camera, Pencil, Trash2, X, Check, ImageIcon, Star, ChefHat } from 'lucide-react';
import VoiceRecorder from '@/components/shared/VoiceRecorder';

interface Dish {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = ['主食', '前菜', '湯品', '甜點', '飲品', '小吃', '套餐', '其他'];

export default function MenuPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('全部');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('主食');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDishes();
  }, []);

  async function fetchDishes() {
    try {
      const res = await fetch('/api/dishes');
      if (res.ok) {
        const data = await res.json();
        setDishes(data);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormName('');
    setFormDesc('');
    setFormCategory('主食');
    setFormPhotoUrl(null);
    setShowAddForm(false);
    setEditingId(null);
  }

  function startEdit(dish: Dish) {
    setEditingId(dish.id);
    setFormName(dish.name);
    setFormDesc(dish.description || '');
    setFormCategory(dish.category);
    setFormPhotoUrl(dish.photo_url);
    setShowAddForm(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, dishId?: string) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      if (dishId) formData.append('dishId', dishId);

      const res = await fetch('/api/dishes/upload-photo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.url) {
        setFormPhotoUrl(data.url);
        if (dishId) {
          setDishes(prev => prev.map(d => d.id === dishId ? { ...d, photo_url: data.url } : d));
        }
      }
    } catch { /* ignore */ } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);

    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/dishes/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDesc.trim() || null,
            category: formCategory,
            photo_url: formPhotoUrl,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setDishes(prev => prev.map(d => d.id === editingId ? updated : d));
          resetForm();
        }
      } else {
        // Create
        const res = await fetch('/api/dishes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDesc.trim() || null,
            category: formCategory,
            photo_url: formPhotoUrl,
          }),
        });
        if (res.ok) {
          const newDish = await res.json();
          setDishes(prev => [newDish, ...prev]);
          resetForm();
        }
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除此菜品嗎？')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/dishes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDishes(prev => prev.filter(d => d.id !== id));
        if (editingId === id) resetForm();
      }
    } catch { /* ignore */ } finally {
      setDeleting(null);
    }
  }

  const handleVoiceResult = useCallback((result: { transcript: string; description: string; suggestedName?: string }) => {
    if (result.description) setFormDesc(result.description);
    if (result.suggestedName && !formName) setFormName(result.suggestedName);
  }, [formName]);

  const categories = ['全部', ...new Set(dishes.map(d => d.category))];
  const filteredDishes = filterCategory === '全部'
    ? dishes
    : dishes.filter(d => d.category === filterCategory);

  // Group by category
  const grouped: Record<string, Dish[]> = {};
  for (const d of filteredDishes) {
    if (!grouped[d.category]) grouped[d.category] = [];
    grouped[d.category].push(d);
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#E8E2D8] rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-[#E8E2D8] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#3A3A3A] flex items-center gap-2" style={{ fontFamily: "'Noto Serif TC', serif" }}>
            <ChefHat className="w-7 h-7 text-[#C5A55A]" />
            菜單管理
          </h1>
          <p className="text-sm text-[#8A8585] mt-1">
            上傳菜色照片與描述，用於問卷評分和人氣排行
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#C5A55A] text-white rounded-full text-sm font-medium hover:bg-[#A08735] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新增菜品
        </button>
      </div>

      {/* Category Filter */}
      {dishes.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-[#C5A55A] text-white'
                  : 'bg-white text-[#8A8585] border border-[#E8E2D8] hover:border-[#C5A55A] hover:text-[#A08735]'
              }`}
            >
              {cat} {cat !== '全部' && `(${dishes.filter(d => d.category === cat).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#3A3A3A]">
              {editingId ? '編輯菜品' : '新增菜品'}
            </h2>
            <button onClick={resetForm} className="text-[#8A8585] hover:text-[#3A3A3A]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-[200px_1fr] gap-6">
            {/* Photo Upload */}
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square rounded-xl border-2 border-dashed border-[#E8E2D8] hover:border-[#FF8C00] transition-colors cursor-pointer flex flex-col items-center justify-center overflow-hidden bg-[#FAF7F2] relative group"
              >
                {formPhotoUrl ? (
                  <>
                    <img src={formPhotoUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </>
                ) : uploading ? (
                  <div className="text-sm text-[#8A8585]">上傳中...</div>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-[#FF8C00] mb-2" />
                    <span className="text-xs text-[#8A8585]">點擊上傳照片</span>
                    <span className="text-[10px] text-[#B0AAA0] mt-1">JPG / PNG / WebP</span>
                  </>
                )}
              </div>

              {/* Camera + Gallery buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FF8C00] text-white text-xs font-medium rounded-lg hover:bg-[#E07800] transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  拍照
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FAF7F2] text-[#8A8585] text-xs font-medium rounded-lg border border-[#E8E2D8] hover:border-[#FF8C00] hover:text-[#FF8C00] transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  相簿
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, editingId || undefined)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, editingId || undefined)}
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-1">菜品名稱 *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="例如：經典紅燒牛肉麵"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] transition-colors bg-[#FAF7F2]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-1">菜品描述</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="食材、特色、推薦原因..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#FF8C00] transition-colors bg-[#FAF7F2] resize-none"
                />
                <div className="mt-2">
                  <VoiceRecorder
                    dishName={formName}
                    onResult={handleVoiceResult}
                    mode="describe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-1">分類</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        formCategory === cat
                          ? 'bg-[#C5A55A] text-white'
                          : 'bg-[#FAF7F2] text-[#8A8585] border border-[#E8E2D8] hover:border-[#C5A55A]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !formName.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#C5A55A] text-white rounded-full text-sm font-medium hover:bg-[#A08735] transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {saving ? '儲存中...' : editingId ? '更新菜品' : '新增菜品'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 text-[#8A8585] rounded-full text-sm hover:bg-[#FAF7F2] transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {dishes.length === 0 && !showAddForm && (
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#C5A55A]/10 flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-10 h-10 text-[#C5A55A]" />
          </div>
          <h2 className="text-lg font-bold text-[#3A3A3A] mb-2">還沒有菜品</h2>
          <p className="text-sm text-[#8A8585] mb-6 max-w-md mx-auto">
            上傳你的招牌菜色，客人在問卷中就能針對每道菜評分，<br />
            你可以看到哪道菜最受歡迎、哪道需要改進。
          </p>
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A55A] text-white rounded-full text-sm font-medium hover:bg-[#A08735] transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增第一道菜
          </button>
        </div>
      )}

      {/* Dish Grid */}
      {Object.entries(grouped).map(([category, categoryDishes]) => (
        <div key={category} className="mb-8">
          <h3 className="text-sm font-bold text-[#A08735] mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A55A]" />
            {category}
            <span className="text-[#B0AAA0] font-normal">({categoryDishes.length})</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoryDishes.map(dish => (
              <div
                key={dish.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all group ${
                  editingId === dish.id ? 'border-[#C5A55A] ring-2 ring-[#C5A55A]/20' : 'border-[#E8E2D8]'
                }`}
              >
                {/* Photo */}
                <div className="aspect-[4/3] bg-[#FAF7F2] relative overflow-hidden">
                  {dish.photo_url ? (
                    <img
                      src={dish.photo_url}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-[#E8E2D8] mb-1" />
                      <span className="text-[10px] text-[#B0AAA0]">尚未上傳</span>
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(dish)}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-[#FAF7F2] transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-[#3A3A3A]" />
                    </button>
                    <button
                      onClick={() => handleDelete(dish.id)}
                      disabled={deleting === dish.id}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>

                  {/* Category badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-medium text-[#A08735]">
                    {dish.category}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h4 className="font-bold text-sm text-[#3A3A3A] mb-0.5 truncate">{dish.name}</h4>
                  {dish.description && (
                    <p className="text-xs text-[#8A8585] line-clamp-2 leading-relaxed">{dish.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Stats footer */}
      {dishes.length > 0 && (
        <div className="mt-8 p-4 bg-white rounded-2xl border border-[#E8E2D8] flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-[#8A8585]">
            <span>共 <strong className="text-[#3A3A3A]">{dishes.length}</strong> 道菜品</span>
            <span>
              <strong className="text-[#3A3A3A]">{dishes.filter(d => d.photo_url).length}</strong> 已上傳照片
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#B0AAA0]">
            <Star className="w-3 h-3" />
            建立問卷時可選擇讓客人評分這些菜品
          </div>
        </div>
      )}
    </div>
  );
}
