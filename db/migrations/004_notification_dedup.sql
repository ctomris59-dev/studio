-- Version 004: prevent duplicate automated notifications and allow limited retries.
ALTER TABLE mail_outbox ADD COLUMN dedupe_key text;
CREATE UNIQUE INDEX mail_outbox_dedupe ON mail_outbox(dedupe_key) WHERE dedupe_key IS NOT NULL;
