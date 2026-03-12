/**
 * QR Code Print Frame definitions
 * Each frame is a pure CSS/SVG decorative border for print-ready QR cards
 */

export interface QrFrame {
  id: string;
  name: string;
  description: string;
  /** outer wrapper style */
  wrapperClass: string;
  /** inner content area style */
  innerClass: string;
  /** decorative SVG overlay (optional) — rendered as raw HTML */
  cornerSvg?: string;
  /** background CSS for the card */
  bgStyle: React.CSSProperties;
  /** text color */
  textColor: string;
  /** accent color */
  accentColor: string;
  /** preview thumbnail gradient */
  previewGradient: string;
}

export const qrFrames: QrFrame[] = [
  // ─── 1. Classic Gold ───
  {
    id: 'classic-gold',
    name: '經典金框',
    description: '高貴金色雙線邊框',
    wrapperClass: 'bg-[#FFFDF5]',
    innerClass: 'border-[3px] border-[#C5A55A] shadow-[inset_0_0_0_6px_#FFFDF5,inset_0_0_0_7px_#C5A55A]',
    bgStyle: { background: '#FFFDF5' },
    textColor: '#3A3A3A',
    accentColor: '#C5A55A',
    previewGradient: 'linear-gradient(135deg, #FFFDF5 0%, #F5EDD6 100%)',
    cornerSvg: `
      <svg class="absolute top-3 left-3 w-8 h-8 text-[#C5A55A]" viewBox="0 0 40 40" fill="currentColor"><path d="M0 0h8v2H2v6H0zM0 40h8v-2H2v-6H0z"/><path d="M40 0h-8v2h6v6h2zM40 40h-8v-2h6v-6h2z"/><circle cx="20" cy="4" r="2"/><circle cx="20" cy="36" r="2"/></svg>`,
  },

  // ─── 2. Navy Royal ───
  {
    id: 'navy-royal',
    name: '皇家藏藍',
    description: '深藍底金色裝飾',
    wrapperClass: 'bg-[#1B2A4A]',
    innerClass: 'border-2 border-[#C5A55A]/60 bg-[#FFFEF9] shadow-[0_0_0_8px_#1B2A4A,0_0_0_10px_#C5A55A40]',
    bgStyle: { background: '#1B2A4A' },
    textColor: '#C5A55A',
    accentColor: '#FFD700',
    previewGradient: 'linear-gradient(135deg, #1B2A4A 0%, #2A3F6E 100%)',
  },

  // ─── 3. Rose Elegant ───
  {
    id: 'rose-elegant',
    name: '玫瑰典雅',
    description: '粉玫瑰柔美花邊',
    wrapperClass: 'bg-gradient-to-br from-[#FFF5F5] to-[#FEE2E2]',
    innerClass: 'border-2 border-[#E8A0A0] shadow-[inset_0_0_0_4px_#FFF5F5,inset_0_0_0_5px_#E8A0A0]',
    bgStyle: { background: 'linear-gradient(135deg, #FFF5F5, #FEE2E2)' },
    textColor: '#8B4C4C',
    accentColor: '#D4736C',
    previewGradient: 'linear-gradient(135deg, #FFF5F5 0%, #FEE2E2 100%)',
  },

  // ─── 4. Zen Japanese ───
  {
    id: 'zen-japanese',
    name: '和風禪意',
    description: '日式簡約木紋質感',
    wrapperClass: 'bg-[#F5F0E8]',
    innerClass: 'border border-[#C4A882] shadow-[inset_0_0_0_3px_#F5F0E8,inset_0_0_0_4px_#C4A882,inset_0_0_0_8px_#F5F0E8,inset_0_0_0_9px_#C4A88240]',
    bgStyle: { background: '#F5F0E8' },
    textColor: '#5C4A32',
    accentColor: '#8B7355',
    previewGradient: 'linear-gradient(135deg, #F5F0E8 0%, #E8DCC8 100%)',
  },

  // ─── 5. Modern Dark ───
  {
    id: 'modern-dark',
    name: '現代暗黑',
    description: '深色高對比極簡',
    wrapperClass: 'bg-[#1A1A1A]',
    innerClass: 'border border-[#333] bg-[#0D0D0D] shadow-[0_0_30px_rgba(197,165,90,0.1)]',
    bgStyle: { background: '#1A1A1A' },
    textColor: '#FFFFFF',
    accentColor: '#C5A55A',
    previewGradient: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)',
  },

  // ─── 6. Mint Fresh ───
  {
    id: 'mint-fresh',
    name: '薄荷清新',
    description: '清新綠色自然風格',
    wrapperClass: 'bg-gradient-to-br from-[#F0FFF4] to-[#DCFCE7]',
    innerClass: 'border-2 border-[#86EFAC] shadow-[inset_0_0_0_4px_#F0FFF4,inset_0_0_0_5px_#86EFAC40]',
    bgStyle: { background: 'linear-gradient(135deg, #F0FFF4, #DCFCE7)' },
    textColor: '#166534',
    accentColor: '#22C55E',
    previewGradient: 'linear-gradient(135deg, #F0FFF4 0%, #DCFCE7 100%)',
  },

  // ─── 7. Vintage Paper ───
  {
    id: 'vintage-paper',
    name: '復古紙張',
    description: '老式報紙風格',
    wrapperClass: 'bg-[#F5ECD7]',
    innerClass: 'border-[3px] border-double border-[#8B7355] shadow-[inset_0_0_0_6px_#F5ECD7,inset_0_0_0_8px_#8B735540]',
    bgStyle: { background: '#F5ECD7' },
    textColor: '#4A3728',
    accentColor: '#8B7355',
    previewGradient: 'linear-gradient(135deg, #F5ECD7 0%, #E8D8B8 100%)',
  },

  // ─── 8. Luxury Purple ───
  {
    id: 'luxury-purple',
    name: '奢華紫金',
    description: '高端紫色配金色裝飾',
    wrapperClass: 'bg-gradient-to-br from-[#2D1B4E] to-[#1A0F2E]',
    innerClass: 'border border-[#C5A55A]/40 bg-[#FFFEF9] shadow-[0_0_0_6px_#2D1B4E,0_0_0_8px_#C5A55A30]',
    bgStyle: { background: 'linear-gradient(135deg, #2D1B4E, #1A0F2E)' },
    textColor: '#C5A55A',
    accentColor: '#FFD700',
    previewGradient: 'linear-gradient(135deg, #2D1B4E 0%, #4A2D7A 100%)',
  },

  // ─── 9. Cherry Blossom ───
  {
    id: 'cherry-blossom',
    name: '櫻花浪漫',
    description: '粉嫩櫻花漸層',
    wrapperClass: 'bg-gradient-to-br from-[#FFF0F3] to-[#FFD6E0]',
    innerClass: 'border border-[#FFB3C1] shadow-[inset_0_0_0_3px_#FFF0F3,inset_0_0_0_4px_#FFB3C160]',
    bgStyle: { background: 'linear-gradient(135deg, #FFF0F3, #FFD6E0)' },
    textColor: '#8B2252',
    accentColor: '#E8457E',
    previewGradient: 'linear-gradient(135deg, #FFF0F3 0%, #FFD6E0 100%)',
  },

  // ─── 10. Chinese Red ───
  {
    id: 'chinese-red',
    name: '中式紅金',
    description: '中國風紅色金邊',
    wrapperClass: 'bg-[#8B0000]',
    innerClass: 'border-2 border-[#FFD700] bg-[#FFFEF5] shadow-[0_0_0_6px_#8B0000,0_0_0_8px_#FFD70060]',
    bgStyle: { background: '#8B0000' },
    textColor: '#8B0000',
    accentColor: '#FFD700',
    previewGradient: 'linear-gradient(135deg, #8B0000 0%, #B22222 100%)',
  },

  // ─── 11. Ocean Blue ───
  {
    id: 'ocean-blue',
    name: '海洋藍調',
    description: '清爽海洋藍白配色',
    wrapperClass: 'bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]',
    innerClass: 'border-2 border-[#60A5FA] shadow-[inset_0_0_0_4px_#EFF6FF,inset_0_0_0_5px_#60A5FA40]',
    bgStyle: { background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' },
    textColor: '#1E3A5F',
    accentColor: '#2563EB',
    previewGradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
  },

  // ─── 12. Tropical Sunset ───
  {
    id: 'tropical-sunset',
    name: '熱帶夕陽',
    description: '溫暖橘紅漸層',
    wrapperClass: 'bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5]',
    innerClass: 'border-2 border-[#FB923C] shadow-[inset_0_0_0_4px_#FFF7ED,inset_0_0_0_5px_#FB923C40]',
    bgStyle: { background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)' },
    textColor: '#9A3412',
    accentColor: '#F97316',
    previewGradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
  },
];

export function getFrame(id: string): QrFrame {
  return qrFrames.find(f => f.id === id) || qrFrames[0];
}
