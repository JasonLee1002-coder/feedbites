export type TextureId = 'none' | 'wood' | 'paper' | 'noir' | 'marble' | 'linen';

interface TextureDef {
  id: TextureId;
  name: string;
  emoji: string;
  backgroundImage: string;
  backgroundSize: string;
}

// SVG Perlin noise layer — tiny base64-encoded SVG
const noise = (opacity: number) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='${opacity}'/%3E%3C/svg%3E")`;

export const TEXTURE_DEFS: Record<TextureId, TextureDef> = {
  none: {
    id: 'none',
    name: '無材質',
    emoji: '—',
    backgroundImage: 'none',
    backgroundSize: 'auto',
  },
  wood: {
    id: 'wood',
    name: '木紋',
    emoji: '🪵',
    backgroundImage: [
      noise(0.04),
      `repeating-linear-gradient(108deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 5px, rgba(255,255,255,0.028) 5px, rgba(255,255,255,0.028) 6px)`,
      `repeating-linear-gradient(98deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 11px, rgba(0,0,0,0.022) 11px, rgba(0,0,0,0.022) 12px)`,
    ].join(', '),
    backgroundSize: '200px 200px, auto, auto',
  },
  paper: {
    id: 'paper',
    name: '高級紙',
    emoji: '📄',
    backgroundImage: [
      noise(0.065),
      `repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 22px, rgba(0,0,0,0.012) 22px, rgba(0,0,0,0.012) 23px)`,
    ].join(', '),
    backgroundSize: '200px 200px, auto',
  },
  noir: {
    id: 'noir',
    name: '暗金紋',
    emoji: '✦',
    backgroundImage: [
      noise(0.05),
      `radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)`,
    ].join(', '),
    backgroundSize: '200px 200px, 22px 22px',
  },
  marble: {
    id: 'marble',
    name: '大理石',
    emoji: '🪨',
    backgroundImage: [
      noise(0.04),
      `repeating-linear-gradient(128deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0.027) 12px, rgba(255,255,255,0) 24px)`,
      `repeating-linear-gradient(42deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0.018) 18px, rgba(255,255,255,0) 36px)`,
    ].join(', '),
    backgroundSize: '200px 200px, auto, auto',
  },
  linen: {
    id: 'linen',
    name: '麻布',
    emoji: '🧵',
    backgroundImage: [
      noise(0.055),
      `repeating-linear-gradient(0deg, rgba(0,0,0,0.022) 0px, rgba(0,0,0,0.022) 1px, transparent 1px, transparent 5px)`,
      `repeating-linear-gradient(90deg, rgba(0,0,0,0.022) 0px, rgba(0,0,0,0.022) 1px, transparent 1px, transparent 5px)`,
    ].join(', '),
    backgroundSize: '200px 200px, auto, auto',
  },
};

export function getTextureStyle(textureId?: TextureId | null): { backgroundImage?: string; backgroundSize?: string } {
  if (!textureId || textureId === 'none') return {};
  const t = TEXTURE_DEFS[textureId];
  if (!t) return {};
  return {
    backgroundImage: t.backgroundImage,
    backgroundSize: t.backgroundSize,
  };
}
