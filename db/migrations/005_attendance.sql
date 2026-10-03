-- Explicit per-booking check-in history, tenant-isolated under existing bookings RLS.
ALTER TABLE bookings ADD COLUMN attended_at timestamptz;
CREATE INDEX bookings_attended_idx ON bookings(studio_id,member_id,attended_at) WHERE attended_at IS NOT NULL;
