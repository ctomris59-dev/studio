-- Studio managed class cancellation is retained for audit, not physically deleted.
ALTER TABLE class_sessions ADD COLUMN status text NOT NULL DEFAULT 'scheduled'
 CHECK (status IN ('scheduled','cancelled'));
ALTER TABLE class_sessions ADD COLUMN cancelled_at timestamptz;
CREATE INDEX class_sessions_active_dates
 ON class_sessions(studio_id,starts_at) WHERE status='scheduled';
