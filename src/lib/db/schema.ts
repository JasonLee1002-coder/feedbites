// src/lib/db/schema.ts
// Drizzle ORM schema — mirrors feedbites-pg-schema.sql exactly
// Generated from Supabase migrations 001–019

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  real,
  date,
  jsonb,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── helpers ───────────────────────────────────────────────────────────────────
const now = () => sql`NOW()`

// ── users ─────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email:        text('email').unique().notNull(),
  password_hash: text('password_hash').notNull(),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().default(sql`NOW()`),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().default(sql`NOW()`),
})

// ── stores ────────────────────────────────────────────────────────────────────
export const stores = pgTable('stores', {
  id:                uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id:           uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email:             text('email').notNull(),
  store_name:        text('store_name').notNull().default(''),
  logo_url:          text('logo_url'),
  bg_image_url:      text('bg_image_url'),
  owner_avatar_url:  text('owner_avatar_url'),
  frame_id:          text('frame_id'),
  owner_line_user_id: text('owner_line_user_id').default(sql`NULL`),
  invite_token:      text('invite_token').default(sql`NULL`),
  // 004 metadata
  cuisine_type:      text('cuisine_type'),
  city:              text('city'),
  district:          text('district'),
  price_range:       text('price_range'),
  seating_capacity:  integer('seating_capacity'),
  opening_year:      integer('opening_year'),
  target_audience:   text('target_audience'),
  service_type:      text('service_type'),
  created_at:        timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
  updated_at:        timestamp('updated_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── surveys ───────────────────────────────────────────────────────────────────
export const surveys = pgTable('surveys', {
  id:                   uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:             uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  title:                text('title').notNull(),
  template_id:          text('template_id').notNull().default('fine-dining'),
  custom_colors:        jsonb('custom_colors'),
  questions:            jsonb('questions').notNull().default(sql`'[]'::jsonb`),
  is_active:            boolean('is_active').default(true),
  discount_enabled:     boolean('discount_enabled').default(true),
  discount_type:        text('discount_type').default('percentage'),
  discount_value:       text('discount_value').default('9折'),
  discount_expiry_days: integer('discount_expiry_days').default(30),
  discount_mode:        text('discount_mode').default('basic'),
  discount_tiers:       jsonb('discount_tiers'),
  prize_items:          jsonb('prize_items').default(sql`NULL`),
  prize_same_day_valid: boolean('prize_same_day_valid').default(true),
  created_at:           timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
  updated_at:           timestamp('updated_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── responses ─────────────────────────────────────────────────────────────────
export const responses = pgTable('responses', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  survey_id:       uuid('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  answers:         jsonb('answers').notNull().default(sql`'{}'::jsonb`),
  respondent_name: text('respondent_name'),
  phone:           text('phone'),
  email:           text('email'),
  xp_earned:       integer('xp_earned'),
  submitted_at:    timestamp('submitted_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── discount_codes ────────────────────────────────────────────────────────────
export const discount_codes = pgTable('discount_codes', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  survey_id:   uuid('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  response_id: uuid('response_id').notNull().references(() => responses.id, { onDelete: 'cascade' }),
  code:        text('code').unique().notNull(),
  is_used:     boolean('is_used').default(false),
  used_at:     timestamp('used_at', { withTimezone: true }),
  expires_at:  timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at:  timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── dishes ────────────────────────────────────────────────────────────────────
export const dishes = pgTable('dishes', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:    uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  photo_url:   text('photo_url'),
  category:    text('category').notNull().default('主食'),
  price:       text('price'),
  is_active:   boolean('is_active').default(true),
  created_at:  timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── dish_categories ───────────────────────────────────────────────────────────
export const dish_categories = pgTable('dish_categories', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:   uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name:       text('name').notNull(),
  position:   integer('position').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`NOW()`),
}, (t) => ({
  unq: unique().on(t.store_id, t.name),
}))

// ── store_members ─────────────────────────────────────────────────────────────
export const store_members = pgTable('store_members', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:   uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  user_id:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  invited_by: uuid('invited_by').references(() => users.id),
  joined_at:  timestamp('joined_at', { withTimezone: true }).default(sql`NOW()`),
}, (t) => ({
  unq: unique().on(t.store_id, t.user_id),
}))

// ── store_invites ─────────────────────────────────────────────────────────────
export const store_invites = pgTable('store_invites', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:   uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  email:      text('email').notNull(),
  invited_by: uuid('invited_by').references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
}, (t) => ({
  unq: unique().on(t.store_id, t.email),
}))

// ── store_knowledge ───────────────────────────────────────────────────────────
export const store_knowledge = pgTable('store_knowledge', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:   uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  category:   text('category').notNull(),
  content:    text('content').notNull(),
  source:     text('source'),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── feedback_reports ──────────────────────────────────────────────────────────
export const feedback_reports = pgTable('feedback_reports', {
  id:                   uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:             uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  user_id:              uuid('user_id').notNull(),
  user_email:           text('user_email'),
  store_name:           text('store_name'),
  title:                text('title').notNull(),
  description:          text('description').notNull(),
  category:             text('category').notNull(),
  priority:             text('priority').notNull().default('medium'),
  status:               text('status').notNull().default('pending'),
  voice_transcript:     text('voice_transcript'),
  satisfaction_rating:  integer('satisfaction_rating'),
  satisfaction_comment: text('satisfaction_comment'),
  satisfaction_at:      timestamp('satisfaction_at', { withTimezone: true }),
  created_at:           timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
  updated_at:           timestamp('updated_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── feedback_attachments ──────────────────────────────────────────────────────
export const feedback_attachments = pgTable('feedback_attachments', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  report_id:  uuid('report_id').notNull().references(() => feedback_reports.id, { onDelete: 'cascade' }),
  file_url:   text('file_url').notNull(),
  file_name:  text('file_name'),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── feedback_responses ────────────────────────────────────────────────────────
export const feedback_responses = pgTable('feedback_responses', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  report_id:       uuid('report_id').notNull().references(() => feedback_reports.id, { onDelete: 'cascade' }),
  responder_email: text('responder_email').notNull(),
  message:         text('message').notNull(),
  created_at:      timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── feedback_conversations ────────────────────────────────────────────────────
export const feedback_conversations = pgTable('feedback_conversations', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:        uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  session_id:      text('session_id').notNull(),
  source:          text('source').default('chat'),
  customer_name:   text('customer_name'),
  metadata:        jsonb('metadata').default(sql`'{}'::jsonb`),
  sentiment_score: real('sentiment_score'),
  topics:          text('topics').array(),
  severity:        text('severity'),
  status:          text('status').default('new'),
  created_at:      timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
  updated_at:      timestamp('updated_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── feedback_messages ─────────────────────────────────────────────────────────
export const feedback_messages = pgTable('feedback_messages', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  conversation_id: uuid('conversation_id').notNull().references(() => feedback_conversations.id, { onDelete: 'cascade' }),
  role:            text('role').notNull(),
  content:         text('content').notNull(),
  metadata:        jsonb('metadata').default(sql`'{}'::jsonb`),
  created_at:      timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── feedback_insights ─────────────────────────────────────────────────────────
export const feedback_insights = pgTable('feedback_insights', {
  id:                 uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:           uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  period_start:       timestamp('period_start', { withTimezone: true }).notNull(),
  period_end:         timestamp('period_end', { withTimezone: true }).notNull(),
  summary:            text('summary').notNull(),
  issues:             jsonb('issues').notNull().default(sql`'[]'::jsonb`),
  self_review:        jsonb('self_review').default(sql`'{}'::jsonb`),
  recommendations:    jsonb('recommendations').default(sql`'[]'::jsonb`),
  conversation_count: integer('conversation_count').default(0),
  avg_sentiment:      real('avg_sentiment'),
  created_at:         timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── ai_memories ───────────────────────────────────────────────────────────────
export const ai_memories = pgTable('ai_memories', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:   uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  category:   text('category').notNull().default('general'),
  subject:    text('subject'),
  content:    text('content').notNull(),
  confidence: integer('confidence').notNull().default(1),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`NOW()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`NOW()`),
})

// ── assistant_chat_history ────────────────────────────────────────────────────
export const assistant_chat_history = pgTable('assistant_chat_history', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:   uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  role:       text('role').notNull(),
  content:    text('content').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`NOW()`),
})

// ── domain_knowledge ──────────────────────────────────────────────────────────
export const domain_knowledge = pgTable('domain_knowledge', {
  id:                    uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  project:               text('project').notNull().default('feedbites'),
  category:              text('category').notNull(),
  subject:               text('subject'),
  content:               text('content').notNull(),
  source:                text('source').default('internal'),
  source_type:           text('source_type').default('seed'),
  valid_until:           date('valid_until'),
  confidence:            integer('confidence').default(1),
  last_verified_at:      timestamp('last_verified_at', { withTimezone: true }).default(sql`NOW()`),
  refresh_interval_days: integer('refresh_interval_days'),
  is_stale:              boolean('is_stale').default(false),
  stale_reason:          text('stale_reason'),
  created_at:            timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── knowledge_gaps ────────────────────────────────────────────────────────────
export const knowledge_gaps = pgTable('knowledge_gaps', {
  id:                uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  project:           text('project').notNull(),
  domain:            text('domain').notNull(),
  gap_topic:         text('gap_topic').notNull(),
  discovery_context: text('discovery_context'),
  priority:          integer('priority').default(1),
  status:            text('status').default('pending'),
  filled_at:         timestamp('filled_at', { withTimezone: true }),
  created_at:        timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
})

// ── Type exports (inferred from schema) ───────────────────────────────────────
export type User               = typeof users.$inferSelect
export type NewUser            = typeof users.$inferInsert
export type Store              = typeof stores.$inferSelect
export type NewStore           = typeof stores.$inferInsert
export type Survey             = typeof surveys.$inferSelect
export type NewSurvey          = typeof surveys.$inferInsert
export type Response           = typeof responses.$inferSelect
export type NewResponse        = typeof responses.$inferInsert
export type DiscountCode       = typeof discount_codes.$inferSelect
export type Dish               = typeof dishes.$inferSelect
export type DishCategory       = typeof dish_categories.$inferSelect
export type StoreMember        = typeof store_members.$inferSelect
export type StoreInvite        = typeof store_invites.$inferSelect
export type StoreKnowledge     = typeof store_knowledge.$inferSelect
export type FeedbackReport     = typeof feedback_reports.$inferSelect
export type FeedbackAttachment = typeof feedback_attachments.$inferSelect
export type FeedbackResponse   = typeof feedback_responses.$inferSelect
export type FeedbackConversation = typeof feedback_conversations.$inferSelect
export type FeedbackMessage    = typeof feedback_messages.$inferSelect
export type FeedbackInsight    = typeof feedback_insights.$inferSelect
export type AiMemory           = typeof ai_memories.$inferSelect
export type ChatHistory        = typeof assistant_chat_history.$inferSelect
export type DomainKnowledge    = typeof domain_knowledge.$inferSelect
export type KnowledgeGap       = typeof knowledge_gaps.$inferSelect
