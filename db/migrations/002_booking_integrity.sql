-- Version 002: durable idempotency for staff credit corrections and booking ledger.
ALTER TABLE credit_ledger ADD COLUMN request_key uuid;
CREATE UNIQUE INDEX credit_ledger_request_unique
  ON credit_ledger(studio_id,request_key) WHERE request_key IS NOT NULL;
CREATE UNIQUE INDEX credit_ledger_single_booking_debit
  ON credit_ledger(studio_id,booking_id) WHERE reason='class_booking';
CREATE UNIQUE INDEX credit_ledger_single_booking_refund
  ON credit_ledger(studio_id,booking_id) WHERE reason='class_refund';
CREATE INDEX bookings_member_lookup ON bookings(studio_id,member_id,status);
CREATE INDEX credits_recent_activity ON credit_ledger(studio_id,created_at DESC);
-- A double-click must not create two identical open tasks; completed tasks remain historical.
CREATE UNIQUE INDEX followup_one_open_reason
  ON followup_tasks(studio_id,person_id,title) WHERE completed_at IS NULL;
