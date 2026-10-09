-- Distinguish owner revocation from operator security suspension.
-- Pre-existing disabled identities default to operator-controlled status,
-- so application owners cannot unintentionally overturn an administrative hold.
ALTER TABLE app_users ADD COLUMN disabled_reason text;
ALTER TABLE app_users ADD COLUMN disabled_by uuid REFERENCES app_users(id) ON DELETE SET NULL;
UPDATE app_users SET disabled_reason='operator_suspended' WHERE disabled_at IS NOT NULL;
ALTER TABLE app_users ADD CONSTRAINT app_users_disabled_reason_check
 CHECK (disabled_reason IS NULL OR disabled_reason IN ('owner_revoked','operator_suspended','security_hold'));
CREATE INDEX app_users_disabled_reason_idx ON app_users(disabled_reason) WHERE disabled_at IS NOT NULL;
