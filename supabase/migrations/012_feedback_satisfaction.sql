-- Add satisfaction rating to feedback reports
ALTER TABLE feedback_reports
  ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  ADD COLUMN IF NOT EXISTS satisfaction_comment TEXT,
  ADD COLUMN IF NOT EXISTS satisfaction_at TIMESTAMPTZ;

-- Index for stats queries
CREATE INDEX IF NOT EXISTS idx_feedback_reports_satisfaction ON feedback_reports(satisfaction_rating) WHERE satisfaction_rating IS NOT NULL;
