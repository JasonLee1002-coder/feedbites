-- Feedback/Bug Report System
CREATE TABLE IF NOT EXISTS feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_email TEXT,
  store_name TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'suggestion', 'question')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved', 'closed')),
  voice_transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES feedback_reports(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES feedback_reports(id) ON DELETE CASCADE NOT NULL,
  responder_email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_store ON feedback_reports(store_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_status ON feedback_reports(status);
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_report ON feedback_attachments(report_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_report ON feedback_responses(report_id);
