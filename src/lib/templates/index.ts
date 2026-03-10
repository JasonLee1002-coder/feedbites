import type { Template, TemplateId } from '@/types/survey';

export const templates: Record<TemplateId, Template> = {
  'fine-dining': {
    id: 'fine-dining',
    name: '奶油金',
    nameEn: 'Elegant Gold',
    description: '溫潤奶油底色搭配金色調，高雅精緻',
    suited: '高級西餐、Fine Dining、法式料理',
    colors: {
      primary: '#C5A55A',
      primaryLight: '#E8D5A3',
      primaryDark: '#A08735',
      background: '#FAF7F2',
      surface: '#FFFFFF',
      text: '#4A4545',
      textLight: '#8A8585',
      border: '#E8E2D8',
      accent: '#B8926A',
    },
    fontHeading: "'Noto Serif TC', serif",
    fontBody: "'Noto Sans TC', sans-serif",
    borderRadius: '16px',
    cardStyle: 'rounded',
  },

  'japanese': {
    id: 'japanese',
    name: '和風',
    nameEn: 'Zen',
    description: '淺米色搭配木質調，寧靜優雅',
    suited: '日料、壽司、居酒屋、拉麵',
    colors: {
      primary: '#8B7355',
      primaryLight: '#C4A882',
      primaryDark: '#6B5540',
      background: '#F5F0E8',
      surface: '#FDFBF7',
      text: '#3C3632',
      textLight: '#8A8078',
      border: '#E0D5C5',
      accent: '#C4A882',
    },
    fontHeading: "'Noto Serif TC', serif",
    fontBody: "'Noto Sans TC', sans-serif",
    borderRadius: '8px',
    cardStyle: 'soft',
  },

  'industrial': {
    id: 'industrial',
    name: '工業風',
    nameEn: 'Industrial',
    description: '深色底搭配暖橘，粗獷有個性',
    suited: '酒吧、燒烤、美式餐廳、居酒屋',
    colors: {
      primary: '#D4A14A',
      primaryLight: '#E8C878',
      primaryDark: '#B8862E',
      background: '#1A1A1A',
      surface: '#2A2A2A',
      text: '#F0ECE0',
      textLight: '#A0A0A0',
      border: '#3A3A3A',
      accent: '#E8C878',
    },
    fontHeading: "'Noto Sans TC', sans-serif",
    fontBody: "'Noto Sans TC', sans-serif",
    borderRadius: '4px',
    cardStyle: 'sharp',
  },

  'cafe': {
    id: 'cafe',
    name: '清新',
    nameEn: 'Fresh',
    description: '白底搭配草綠，清爽自然',
    suited: '早午餐、咖啡廳、輕食、蔬食',
    colors: {
      primary: '#6B9B76',
      primaryLight: '#A8C5A0',
      primaryDark: '#4A7A56',
      background: '#F8FAF5',
      surface: '#FFFFFF',
      text: '#3A4A3E',
      textLight: '#7A8A7E',
      border: '#D8E5D0',
      accent: '#A8C5A0',
    },
    fontHeading: "'Noto Sans TC', sans-serif",
    fontBody: "'Noto Sans TC', sans-serif",
    borderRadius: '20px',
    cardStyle: 'rounded',
  },

  'chinese-classic': {
    id: 'chinese-classic',
    name: '古典紅',
    nameEn: 'Heritage Red',
    description: '暗紅搭配金字，典雅大氣',
    suited: '中餐廳、火鍋、台菜、宴會廳',
    colors: {
      primary: '#B22222',
      primaryLight: '#D4605A',
      primaryDark: '#8B1A1A',
      background: '#FFF8F0',
      surface: '#FFFFFF',
      text: '#3A2020',
      textLight: '#8A6A6A',
      border: '#E8D5CC',
      accent: '#D4A14A',
    },
    fontHeading: "'Noto Serif TC', serif",
    fontBody: "'Noto Sans TC', sans-serif",
    borderRadius: '8px',
    cardStyle: 'soft',
  },
};

export const templateList = Object.values(templates);

export function getTemplate(id: TemplateId): Template {
  return templates[id] || templates['fine-dining'];
}

export function getThemeCSSVars(template: Template): Record<string, string> {
  const { colors } = template;
  return {
    '--color-primary': colors.primary,
    '--color-primary-light': colors.primaryLight,
    '--color-primary-dark': colors.primaryDark,
    '--color-bg': colors.background,
    '--color-surface': colors.surface,
    '--color-text': colors.text,
    '--color-text-light': colors.textLight,
    '--color-border': colors.border,
    '--color-accent': colors.accent,
    '--font-heading': template.fontHeading,
    '--font-body': template.fontBody,
    '--radius': template.borderRadius,
  };
}
