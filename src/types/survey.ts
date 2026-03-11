export type QuestionType = 'radio' | 'checkbox' | 'rating' | 'text' | 'textarea' | 'number' | 'emoji-rating';

export interface Question {
  id: string;
  type: QuestionType;
  label?: string;
  title?: string;
  description?: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  placeholder?: string;
  section?: string;
}

export interface Survey {
  id: string;
  store_id: string;
  title: string;
  template_id: TemplateId;
  custom_colors?: ThemeColors | null;
  questions: Question[];
  is_active: boolean;
  discount_type: 'percentage' | 'fixed' | 'freebie' | 'custom_text';
  discount_value: string;
  discount_expiry_days: number;
  discount_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  answers: Record<string, string | string[]>;
  respondent_name?: string;
  discount_code?: string;
  submitted_at: string;
}

export interface DiscountCode {
  id: string;
  survey_id: string;
  response_id: string;
  code: string;
  is_used: boolean;
  used_at?: string | null;
  expires_at: string;
  created_at: string;
}

export type TemplateId = 'fine-dining' | 'japanese' | 'industrial' | 'cafe' | 'chinese-classic';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  surface: string;
  text: string;
  textLight: string;
  border: string;
  accent: string;
}

export interface Template {
  id: TemplateId;
  name: string;
  nameEn: string;
  description: string;
  suited: string;
  colors: ThemeColors;
  fontHeading: string;
  fontBody: string;
  borderRadius: string;
  cardStyle: 'rounded' | 'sharp' | 'soft';
}

export interface Store {
  id: string;
  email: string;
  store_name: string;
  logo_url?: string | null;
  bg_image_url?: string | null;
  created_at: string;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  questions: Question[];
}
