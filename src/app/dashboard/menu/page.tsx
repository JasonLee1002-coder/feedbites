'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Camera, Pencil, Trash2, X, Check, ImageIcon, Star, ChefHat, Upload, Sparkles, Loader2, ZoomIn, Crop, Move } from 'lucide-react';
import VoiceRecorder from '@/components/shared/VoiceRecorder';

interface Dish {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  category: string;
  price: string | null;
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
  const [formPrice, setFormPrice] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const menuUploadRef = useRef<HTMLInputElement>(null);
  const menuCameraRef = useRef<HTMLInputElement>(null);

  // Smart menu upload state
  const [showMenuUpload, setShowMenuUpload] = useState(false);
  const [menuParsing, setMenuParsing] = useState(false);
  const [parsedDishes, setParsedDishes] = useState<Array<{
    name: string; description: string; category: string; price: string; selected: boolean;
    bbox?: [number, number, number, number]; photoUrl?: string;
  }>>([]);
  const [parseNotes, setParseNotes] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const menuImageRef = useRef<HTMLImageElement | null>(null);
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null); // ObjectURL for original image

  // Review modal state
  const [reviewingIndex, setReviewingIndex] = useState<number | null>(null);
  const [manualCropping, setManualCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cropUploading, setCropUploading] = useState(false);

  // Zoom & pan for crop mode
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cropMode, setCropMode] = useState<'crop' | 'pan'>('crop'); // toggle between crop and pan

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
    setFormPrice('');
    setFormPhotoUrl(null);
    setShowAddForm(false);
    setEditingId(null);
  }

  function startEdit(dish: Dish) {
    setEditingId(dish.id);
    setFormName(dish.name);
    setFormDesc(dish.description || '');
    setFormCategory(dish.category);
    setFormPrice(dish.price || '');
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
            price: formPrice.trim() || null,
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
            price: formPrice.trim() || null,
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

  async function handleClearAll() {
    if (!confirm(`確定要清空全部 ${dishes.length} 道菜品嗎？此操作無法復原。`)) return;
    setClearingAll(true);
    try {
      const res = await fetch('/api/dishes', { method: 'DELETE' });
      if (res.ok) {
        setDishes([]);
        resetForm();
      }
    } catch { /* ignore */ } finally {
      setClearingAll(false);
    }
  }

  // Crop a dish photo from the original menu image using bbox coordinates
  async function cropDishPhoto(
    originalImage: HTMLImageElement,
    bbox: [number, number, number, number],
  ): Promise<Blob | null> {
    try {
      const [yMin, xMin, yMax, xMax] = bbox;
      const imgW = originalImage.naturalWidth;
      const imgH = originalImage.naturalHeight;

      // Convert normalized coords (0-1000) to pixel coords
      const x = Math.round((xMin / 1000) * imgW);
      const y = Math.round((yMin / 1000) * imgH);
      const w = Math.round(((xMax - xMin) / 1000) * imgW);
      const h = Math.round(((yMax - yMin) / 1000) * imgH);

      if (w < 10 || h < 10) return null;

      const canvas = document.createElement('canvas');
      // Limit output size to 512px max dimension
      const scale = Math.min(1, 512 / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(originalImage, x, y, w, h, 0, 0, canvas.width, canvas.height);

      return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85);
      });
    } catch {
      return null;
    }
  }

  // Upload a cropped dish photo blob
  async function uploadDishPhotoBlob(blob: Blob, dishName: string): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('photo', blob, `${dishName}_${Date.now()}.jpg`);
      const res = await fetch('/api/dishes/upload-photo', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        return data.url || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Load an image file into an HTMLImageElement
  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Compress large images before upload to avoid timeout/size issues
  async function compressImage(file: File, maxWidth = 2048, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/jpeg',
          quality,
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleMenuUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMenuParsing(true);
    setParsedDishes([]);
    setParseNotes('');
    setShowMenuUpload(true);

    try {
      // Aggressively compress — Vercel has 60s timeout + 4.5MB body limit
      let uploadFile: File | Blob = file;
      try {
        uploadFile = await compressImage(file, 800, 0.5);
        // If still over 800KB, go even smaller
        if (uploadFile.size > 800 * 1024) {
          uploadFile = await compressImage(file, 600, 0.4);
        }
      } catch {
        // If compression fails, try with original
      }

      const formData = new FormData();
      formData.append('image', uploadFile, file.name);
      console.log(`Menu upload: original ${(file.size / 1024).toFixed(0)}KB → compressed ${(uploadFile.size / 1024).toFixed(0)}KB`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000); // 55s timeout

      let res: Response;
      try {
        res = await fetch('/api/ai/parse-menu', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeout);
        if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
          throw new Error('AI 辨識超時，請試較小或較清晰的圖片');
        }
        throw new Error('網路連線失敗，請檢查網路後重試');
      }
      clearTimeout(timeout);

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Menu parse response not JSON:', text.substring(0, 200));
        // Check for common non-JSON responses
        if (text.includes('FUNCTION_INVOCATION_TIMEOUT') || text.includes('timeout')) {
          throw new Error('圖片太大或太複雜，AI 處理超時。請試試裁切圖片後重新上傳');
        }
        if (text.includes('413') || text.includes('too large') || text.includes('body size')) {
          throw new Error('圖片檔案太大，請壓縮後再試（建議 5MB 以下）');
        }
        throw new Error('伺服器回傳異常，請重試');
      }

      if (!res.ok) {
        throw new Error(data.error || '辨識失敗');
      }

      if (!data.dishes || data.dishes.length === 0) {
        throw new Error('未辨識到任何菜品，請換一張更清晰的圖片');
      }

      // Always store original image for manual crop later
      const originalImg = await loadImage(file);
      menuImageRef.current = originalImg;
      setMenuImageUrl(URL.createObjectURL(file));

      // First show the parsed dishes immediately (no photos yet)
      const initialDishes = data.dishes.map((d: { name: string; description: string; category: string; price: string; bbox?: [number, number, number, number] }) => ({
        ...d, selected: true, photoUrl: undefined,
      }));
      setParsedDishes(initialDishes);
      setMenuParsing(false);

      const bboxDishes = data.dishes.filter((d: { bbox?: number[] }) => d.bbox && Array.isArray(d.bbox) && d.bbox.length === 4);
      const bboxCount = bboxDishes.length;

      if (bboxCount > 0) {
        setParseNotes(`已辨識 ${data.dishes.length} 道菜品，正在擷取 ${bboxCount} 張照片...`);

        // Sequential crop + upload (one at a time, update UI progressively)
        let photosSuccess = 0;
        for (let i = 0; i < data.dishes.length; i++) {
          const d = data.dishes[i] as { name: string; bbox?: [number, number, number, number] };
          if (!d.bbox || !Array.isArray(d.bbox) || d.bbox.length !== 4) continue;

          try {
            const blob = await cropDishPhoto(originalImg, d.bbox);
            if (blob && blob.size > 500) { // Skip tiny/empty blobs
              const url = await uploadDishPhotoBlob(blob, d.name);
              if (url) {
                photosSuccess++;
                // Update this dish's photo in state immediately
                setParsedDishes(prev => prev.map((pd, j) => j === i ? { ...pd, photoUrl: url } : pd));
              }
            }
          } catch (cropErr) {
            console.warn(`Failed to crop photo for "${d.name}":`, cropErr);
          }
        }

        setParseNotes(
          `已辨識 ${data.dishes.length} 道菜品` +
          (photosSuccess > 0 ? ` · 已擷取 ${photosSuccess} 張菜品照片` : ' · 未偵測到可擷取的菜品照片')
        );
      } else {
        setParseNotes(data.notes || `已辨識 ${data.dishes.length} 道菜品（此菜單未偵測到菜品照片）`);
      }
    } catch (err) {
      setParseNotes(err instanceof Error ? err.message : '辨識失敗，請重試');
    } finally {
      setMenuParsing(false);
      if (menuUploadRef.current) menuUploadRef.current.value = '';
      if (menuCameraRef.current) menuCameraRef.current.value = '';
    }
  }

  async function handleBatchCreate() {
    const selected = parsedDishes.filter(d => d.selected);
    if (selected.length === 0) return;
    setBatchSaving(true);
    setBatchProgress(0);

    try {
      for (let i = 0; i < selected.length; i++) {
        const d = selected[i];
        const res = await fetch('/api/dishes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: d.name,
            description: d.description || null,
            category: d.category || '其他',
            price: d.price || null,
            photo_url: d.photoUrl || null,
          }),
        });
        if (res.ok) {
          const newDish = await res.json();
          setDishes(prev => [newDish, ...prev]);
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error(`Dish create failed for "${d.name}":`, errData);
          alert(`菜品「${d.name}」建立失敗：${errData.error || res.statusText}`);
          break;
        }
        setBatchProgress(Math.round(((i + 1) / selected.length) * 100));
      }
      setShowMenuUpload(false);
      setParsedDishes([]);
    } catch (err) {
      console.error('Batch create error:', err);
      alert('批次建立失敗，請重試');
    } finally {
      setBatchSaving(false);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => menuCameraRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white rounded-full text-sm font-medium hover:shadow-lg hover:shadow-[#FF8C00]/20 transition-all shadow-sm"
          >
            <Camera className="w-4 h-4" />
            拍菜單
          </button>
          <button
            onClick={() => menuUploadRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/30 rounded-full text-sm font-medium hover:bg-[#FF8C00]/20 transition-all"
          >
            <ImageIcon className="w-4 h-4" />
            選照片
          </button>
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C5A55A] text-white rounded-full text-sm font-medium hover:bg-[#A08735] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            新增菜品
          </button>
        </div>
        {/* AI 菜單上傳：拍照 */}
        <input
          ref={menuCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleMenuUpload}
        />
        {/* AI 菜單上傳：從相簿選 */}
        <input
          ref={menuUploadRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleMenuUpload}
        />
      </div>

      {/* Tips — always visible when no dishes */}
      {dishes.length === 0 && !showMenuUpload && (
        <div className="bg-[#FFF8F0] rounded-2xl border border-[#FF8C00]/15 p-5 mb-6">
          <p className="text-sm font-bold text-[#FF8C00] mb-2">📸 AI 菜單辨識 — 拍照就能建菜單</p>
          <ul className="text-xs text-[#8A8585] space-y-1 leading-relaxed">
            <li>✅ 菜單、展示櫃、價格板、黑板都能辨識</li>
            <li>✅ 確保文字和價格清晰可讀</li>
            <li>✅ 一次拍一頁效果最好，最多辨識 15 道</li>
            <li>✅ 辨識後可修改名稱、價格、重新圈選照片</li>
          </ul>
        </div>
      )}

      {/* Smart Menu Upload Panel */}
      {showMenuUpload && (
        <div className="bg-white rounded-2xl border border-[#FF8C00]/20 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#3A3A3A]">AI 菜單辨識</h2>
                <p className="text-xs text-[#8A8585]">副店長正在幫你拆解菜單圖片...</p>
              </div>
            </div>
            <button onClick={() => { setShowMenuUpload(false); setParsedDishes([]); }} className="text-[#8A8585] hover:text-[#3A3A3A]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {menuParsing ? (
            <div className="py-10 text-center">
              <Loader2 className="w-10 h-10 text-[#FF8C00] animate-spin mx-auto mb-4" />
              <p className="text-sm text-[#3A3A3A] font-medium">AI 正在辨識菜單 + 擷取菜品照片...</p>
              <p className="text-xs text-[#8A8585] mt-1">通常需要 10-30 秒</p>
            </div>
          ) : parsedDishes.length > 0 ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-[#3A3A3A]">
                  辨識到 <strong className="text-[#FF8C00]">{parsedDishes.length}</strong> 道菜品，勾選要加入的：
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setParsedDishes(prev => prev.map(d => ({ ...d, selected: true })))}
                    className="text-xs text-[#C5A55A] hover:text-[#A08735]"
                  >
                    全選
                  </button>
                  <button
                    onClick={() => setParsedDishes(prev => prev.map(d => ({ ...d, selected: false })))}
                    className="text-xs text-[#8A8585] hover:text-[#3A3A3A]"
                  >
                    取消全選
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto mb-4">
                {parsedDishes.map((dish, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      dish.selected
                        ? 'border-[#FF8C00]/40 shadow-sm'
                        : 'border-[#E8E2D8] opacity-40'
                    }`}
                  >
                    {/* Photo area — clickable to enlarge */}
                    <div
                      className="relative w-full cursor-pointer group"
                      style={{ aspectRatio: '4/3', background: '#F5F0E8' }}
                      onClick={() => setReviewingIndex(i)}
                    >
                      {dish.photoUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={dish.photoUrl} alt={dish.name} className="w-full h-full object-cover" />
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#8A8585]">
                          <ImageIcon className="w-8 h-8 mb-1 opacity-30" />
                          <span className="text-[10px]">點擊設定照片</span>
                        </div>
                      )}
                      {/* Price badge */}
                      {dish.price && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 text-[#FF8C00] text-[11px] font-bold shadow-sm">
                          {dish.price}
                        </div>
                      )}
                    </div>
                    {/* Info + checkbox */}
                    <div className="p-2.5">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => setParsedDishes(prev => prev.map((d, j) => j === i ? { ...d, selected: !d.selected } : d))}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            dish.selected ? 'bg-[#FF8C00] border-[#FF8C00]' : 'border-[#E8E2D8]'
                          }`}
                        >
                          {dish.selected && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#3A3A3A] leading-tight line-clamp-2">{dish.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#FAF7F2] text-[#A08735] rounded-full">{dish.category}</span>
                          </div>
                        </div>
                        {/* Edit button */}
                        <button
                          onClick={() => setReviewingIndex(i)}
                          className="p-1.5 text-[#8A8585] hover:text-[#FF8C00] hover:bg-[#FF8C00]/10 rounded-lg transition-colors shrink-0"
                          title="檢視/編輯"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {parseNotes && (
                <p className="text-xs text-[#8A8585] mb-3 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#FF8C00]" />
                  {parseNotes}
                </p>
              )}

              <div className="mb-4 p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E2D8]">
                <p className="text-xs text-[#8A8585] leading-relaxed">
                  💡 點擊照片可放大檢視，點 ✏️ 可修改名稱、價格、分類。也可以從原圖重新圈選照片
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleBatchCreate}
                  disabled={batchSaving || parsedDishes.filter(d => d.selected).length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white rounded-full text-sm font-bold hover:shadow-lg hover:shadow-[#FF8C00]/20 transition-all disabled:opacity-50"
                >
                  {batchSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />建立中 {batchProgress}%</>
                  ) : (
                    <><Check className="w-4 h-4" />加入 {parsedDishes.filter(d => d.selected).length} 道菜品</>
                  )}
                </button>
                <button
                  onClick={() => menuUploadRef.current?.click()}
                  className="px-4 py-2.5 text-[#8A8585] text-sm hover:text-[#FF8C00] transition-colors"
                >
                  重新上傳
                </button>
              </div>
            </>
          ) : parseNotes ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-500 mb-3">{parseNotes}</p>
              <button
                onClick={() => menuUploadRef.current?.click()}
                className="text-sm text-[#FF8C00] hover:text-[#E07800]"
              >
                重新上傳
              </button>
            </div>
          ) : null}
        </div>
      )}

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
                <label className="block text-sm font-medium text-[#3A3A3A] mb-1">價格</label>
                <input
                  type="text"
                  value={formPrice}
                  onChange={e => setFormPrice(e.target.value)}
                  placeholder="例如：NT$140、140、NT$140-180"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] transition-colors bg-[#FAF7F2]"
                />
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
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-bold text-sm text-[#3A3A3A] truncate">{dish.name}</h4>
                    {dish.price && (
                      <span className="text-xs font-medium text-[#FF8C00] shrink-0 ml-1">{dish.price}</span>
                    )}
                  </div>
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-[#B0AAA0]">
              <Star className="w-3 h-3" />
              建立問卷時可選擇讓客人評分這些菜品
            </div>
            <button
              onClick={handleClearAll}
              disabled={clearingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              {clearingAll ? '清除中...' : '清空全部'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════ Dish Review Modal ═══════ */}
      {reviewingIndex !== null && parsedDishes[reviewingIndex] && (() => {
        const dish = parsedDishes[reviewingIndex];
        const updateField = (field: string, value: string) => {
          setParsedDishes(prev => prev.map((d, j) => j === reviewingIndex ? { ...d, [field]: value } : d));
        };

        // Manual crop handlers
        // Convert screen coords to image-space percentage, accounting for zoom & pan
        const screenToImageCoords = (clientX: number, clientY: number, rect: DOMRect) => {
          const x = ((clientX - rect.left - cropPan.x) / cropZoom / rect.width) * 100;
          const y = ((clientY - rect.top - cropPan.y) / cropZoom / rect.height) * 100;
          return { x, y };
        };

        const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = screenToImageCoords(e.clientX, e.clientY, rect);
          setCropStart(pos);
          setCropEnd(pos);
          setIsDragging(true);
        };
        const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
          if (!isDragging) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = screenToImageCoords(e.clientX, e.clientY, rect);
          setCropEnd({ x: Math.max(0, Math.min(100, pos.x)), y: Math.max(0, Math.min(100, pos.y)) });
        };
        const handleCropMouseUp = () => setIsDragging(false);

        // Touch handlers for mobile crop
        const handleCropTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
          const touch = e.touches[0];
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = screenToImageCoords(touch.clientX, touch.clientY, rect);
          setCropStart(pos);
          setCropEnd(pos);
          setIsDragging(true);
        };
        const handleCropTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
          if (!isDragging) return;
          const touch = e.touches[0];
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = screenToImageCoords(touch.clientX, touch.clientY, rect);
          setCropEnd({ x: Math.max(0, Math.min(100, pos.x)), y: Math.max(0, Math.min(100, pos.y)) });
        };

        const handleCropConfirm = async () => {
          if (!cropStart || !cropEnd || !menuImageRef.current) return;
          setCropUploading(true);
          try {
            const xMin = Math.min(cropStart.x, cropEnd.x) * 10; // Convert % to 0-1000
            const yMin = Math.min(cropStart.y, cropEnd.y) * 10;
            const xMax = Math.max(cropStart.x, cropEnd.x) * 10;
            const yMax = Math.max(cropStart.y, cropEnd.y) * 10;
            const bbox: [number, number, number, number] = [yMin, xMin, yMax, xMax];
            const blob = await cropDishPhoto(menuImageRef.current, bbox);
            if (blob && blob.size > 500) {
              const url = await uploadDishPhotoBlob(blob, dish.name);
              if (url) {
                setParsedDishes(prev => prev.map((d, j) => j === reviewingIndex ? { ...d, photoUrl: url, bbox } : d));
              }
            }
          } catch { /* ignore */ }
          setCropUploading(false);
          setManualCropping(false);
          setCropStart(null);
          setCropEnd(null);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setReviewingIndex(null); setManualCropping(false); setCropStart(null); setCropEnd(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div className="sticky top-0 bg-white rounded-t-2xl border-b border-[#E8E2D8] px-5 py-3 flex items-center justify-between z-10">
                <h3 className="font-bold text-[#3A3A3A]">
                  {manualCropping ? '📐 圈選照片' : '🔍 檢視 / 編輯菜品'}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Navigate between dishes */}
                  {!manualCropping && (
                    <>
                      <button
                        onClick={() => setReviewingIndex(Math.max(0, reviewingIndex - 1))}
                        disabled={reviewingIndex === 0}
                        className="p-1.5 text-[#8A8585] hover:text-[#3A3A3A] disabled:opacity-30 rounded-lg"
                      >
                        ◀
                      </button>
                      <span className="text-xs text-[#8A8585]">{reviewingIndex + 1}/{parsedDishes.length}</span>
                      <button
                        onClick={() => setReviewingIndex(Math.min(parsedDishes.length - 1, reviewingIndex + 1))}
                        disabled={reviewingIndex === parsedDishes.length - 1}
                        className="p-1.5 text-[#8A8585] hover:text-[#3A3A3A] disabled:opacity-30 rounded-lg"
                      >
                        ▶
                      </button>
                    </>
                  )}
                  <button onClick={() => { setReviewingIndex(null); setManualCropping(false); setCropStart(null); setCropEnd(null); }} className="p-1.5 text-[#8A8585] hover:text-[#3A3A3A]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {manualCropping ? (
                /* ──── Manual crop mode with zoom/pan ──── */
                <div className="p-4">
                  <p className="text-xs text-[#8A8585] mb-2 text-center">
                    👇 上傳的原圖 — {cropMode === 'crop' ? '拖曳框選' : '拖曳平移'}「{dish.name}」
                  </p>

                  {/* Toolbar: zoom + mode toggle */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <button
                      onClick={() => { setCropMode('crop'); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        cropMode === 'crop' ? 'bg-[#FF8C00] text-white' : 'bg-[#FAF7F2] text-[#8A8585] border border-[#E8E2D8]'
                      }`}
                    >
                      <Crop className="w-3 h-3" />
                      圈選
                    </button>
                    <button
                      onClick={() => { setCropMode('pan'); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        cropMode === 'pan' ? 'bg-[#FF8C00] text-white' : 'bg-[#FAF7F2] text-[#8A8585] border border-[#E8E2D8]'
                      }`}
                    >
                      <Move className="w-3 h-3" />
                      平移
                    </button>
                    <div className="w-px h-5 bg-[#E8E2D8] mx-1" />
                    <button
                      onClick={() => setCropZoom(z => Math.max(1, z - 0.5))}
                      disabled={cropZoom <= 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#FAF7F2] border border-[#E8E2D8] text-[#3A3A3A] text-sm font-bold disabled:opacity-30 hover:bg-[#E8E2D8] transition-colors"
                    >
                      −
                    </button>
                    <span className="text-xs text-[#8A8585] w-10 text-center">{Math.round(cropZoom * 100)}%</span>
                    <button
                      onClick={() => setCropZoom(z => Math.min(4, z + 0.5))}
                      disabled={cropZoom >= 4}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#FAF7F2] border border-[#E8E2D8] text-[#3A3A3A] text-sm font-bold disabled:opacity-30 hover:bg-[#E8E2D8] transition-colors"
                    >
                      +
                    </button>
                    {cropZoom > 1 && (
                      <button
                        onClick={() => { setCropZoom(1); setCropPan({ x: 0, y: 0 }); }}
                        className="text-[10px] text-[#FF8C00] hover:text-[#E07800] ml-1"
                      >
                        重置
                      </button>
                    )}
                  </div>

                  <div
                    className="relative w-full rounded-xl overflow-hidden border border-[#E8E2D8] select-none touch-none"
                    style={{ cursor: cropMode === 'pan' ? 'grab' : 'crosshair', maxHeight: '60vh' }}
                    onMouseDown={(e) => {
                      if (cropMode === 'pan') {
                        setIsPanning(true);
                        setPanStart({ x: e.clientX - cropPan.x, y: e.clientY - cropPan.y });
                      } else {
                        handleCropMouseDown(e);
                      }
                    }}
                    onMouseMove={(e) => {
                      if (cropMode === 'pan' && isPanning) {
                        setCropPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
                      } else if (cropMode === 'crop') {
                        handleCropMouseMove(e);
                      }
                    }}
                    onMouseUp={() => { setIsPanning(false); if (cropMode === 'crop') handleCropMouseUp(); }}
                    onMouseLeave={() => { setIsPanning(false); if (cropMode === 'crop') handleCropMouseUp(); }}
                    onTouchStart={(e) => {
                      if (cropMode === 'pan') {
                        const t = e.touches[0];
                        setIsPanning(true);
                        setPanStart({ x: t.clientX - cropPan.x, y: t.clientY - cropPan.y });
                      } else {
                        handleCropTouchStart(e);
                      }
                    }}
                    onTouchMove={(e) => {
                      if (cropMode === 'pan' && isPanning) {
                        const t = e.touches[0];
                        setCropPan({ x: t.clientX - panStart.x, y: t.clientY - panStart.y });
                      } else if (cropMode === 'crop') {
                        handleCropTouchMove(e);
                      }
                    }}
                    onTouchEnd={() => { setIsPanning(false); if (cropMode === 'crop') setIsDragging(false); }}
                  >
                    <div style={{
                      transform: `scale(${cropZoom}) translate(${cropPan.x / cropZoom}px, ${cropPan.y / cropZoom}px)`,
                      transformOrigin: 'top left',
                      transition: isPanning || isDragging ? 'none' : 'transform 0.2s ease',
                    }}>
                      {menuImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={menuImageUrl} alt="原始菜單" className="w-full" draggable={false} />
                      )}
                      {/* Crop selection rectangle */}
                      {cropStart && cropEnd && (
                        <div
                          className="absolute border-2 border-[#FF8C00] bg-[#FF8C00]/10 pointer-events-none"
                          style={{
                            left: `${Math.min(cropStart.x, cropEnd.x)}%`,
                            top: `${Math.min(cropStart.y, cropEnd.y)}%`,
                            width: `${Math.abs(cropEnd.x - cropStart.x)}%`,
                            height: `${Math.abs(cropEnd.y - cropStart.y)}%`,
                          }}
                        >
                          <div className="absolute -top-1 -left-1 w-3 h-3 border-2 border-[#FF8C00] bg-white rounded-full" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 border-2 border-[#FF8C00] bg-white rounded-full" />
                          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-2 border-[#FF8C00] bg-white rounded-full" />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-2 border-[#FF8C00] bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <canvas ref={cropCanvasRef} className="hidden" />
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={handleCropConfirm}
                      disabled={!cropStart || !cropEnd || cropUploading || Math.abs((cropEnd?.x || 0) - (cropStart?.x || 0)) < 3}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8C00] text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
                    >
                      {cropUploading ? <><Loader2 className="w-4 h-4 animate-spin" />裁切中...</> : <><Crop className="w-4 h-4" />確定裁切</>}
                    </button>
                    <button
                      onClick={() => { setManualCropping(false); setCropStart(null); setCropEnd(null); setCropZoom(1); setCropPan({ x: 0, y: 0 }); setCropMode('crop'); }}
                      className="px-4 py-2.5 text-sm text-[#8A8585] hover:text-[#3A3A3A] transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                /* ──── Review/edit mode ──── */
                <div className="p-4">
                  {/* Large photo preview */}
                  <div className="relative w-full rounded-xl overflow-hidden border border-[#E8E2D8] mb-4" style={{ aspectRatio: '4/3', background: '#F5F0E8' }}>
                    {dish.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dish.photoUrl} alt={dish.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#8A8585]">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-30" />
                        <span className="text-sm">尚無照片</span>
                      </div>
                    )}
                  </div>

                  {/* Photo actions */}
                  {menuImageUrl && (
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => { setManualCropping(true); setCropStart(null); setCropEnd(null); setCropZoom(1); setCropPan({ x: 0, y: 0 }); setCropMode('crop'); }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-[#FF8C00]/30 text-[#FF8C00] rounded-xl text-xs font-medium hover:bg-[#FF8C00]/5 transition-colors"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        從原圖重新圈選
                      </button>
                      {dish.photoUrl && (
                        <button
                          onClick={() => updateField('photoUrl', '')}
                          className="flex items-center justify-center gap-2 px-3 py-2 border border-red-200 text-red-400 rounded-xl text-xs font-medium hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          移除照片
                        </button>
                      )}
                    </div>
                  )}

                  {/* Editable fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#8A8585] mb-1">菜品名稱</label>
                      <input
                        type="text"
                        value={dish.name}
                        onChange={e => updateField('name', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E2D8] text-sm font-medium outline-none focus:border-[#FF8C00] bg-[#FAF7F2] text-[#3A3A3A]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#8A8585] mb-1">價格</label>
                        <input
                          type="text"
                          value={dish.price || ''}
                          onChange={e => updateField('price', e.target.value)}
                          placeholder="NT$..."
                          className="w-full px-3 py-2 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#FF8C00] bg-[#FAF7F2] text-[#FF8C00] font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#8A8585] mb-1">分類</label>
                        <select
                          value={dish.category}
                          onChange={e => updateField('category', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#FF8C00] bg-[#FAF7F2] text-[#3A3A3A]"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8A8585] mb-1">描述</label>
                      <input
                        type="text"
                        value={dish.description || ''}
                        onChange={e => updateField('description', e.target.value)}
                        placeholder="簡短描述..."
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#FF8C00] bg-[#FAF7F2] text-[#3A3A3A]"
                      />
                    </div>
                  </div>

                  {/* Confirm / toggle selection */}
                  <div className="flex items-center gap-3 mt-5">
                    <button
                      onClick={() => {
                        setParsedDishes(prev => prev.map((d, j) => j === reviewingIndex ? { ...d, selected: true } : d));
                        setReviewingIndex(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8C00] text-white rounded-xl text-sm font-bold hover:bg-[#E07800] transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      確定加入
                    </button>
                    <button
                      onClick={() => {
                        setParsedDishes(prev => prev.map((d, j) => j === reviewingIndex ? { ...d, selected: false } : d));
                        setReviewingIndex(null);
                      }}
                      className="px-4 py-2.5 text-sm text-red-400 hover:text-red-600 transition-colors"
                    >
                      不加入
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
