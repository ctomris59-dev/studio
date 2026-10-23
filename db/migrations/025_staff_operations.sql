-- Staff-only operations. No member accounts, public booking or member email.
ALTER TABLE studios ADD COLUMN waitlist_auto_promote boolean NOT NULL DEFAULT true;
ALTER TABLE studios ADD COLUMN waitlist_auto_cutoff_minutes integer NOT NULL DEFAULT 0 CHECK(waitlist_auto_cutoff_minutes BETWEEN 0 AND 10080);
ALTER TABLE studios ADD COLUMN waitlist_offer_minutes integer NOT NULL DEFAULT 30 CHECK(waitlist_offer_minutes BETWEEN 5 AND 1440);
ALTER TABLE bookings ADD COLUMN offer_expires_at timestamptz;
ALTER TABLE bookings ADD COLUMN offer_closed boolean NOT NULL DEFAULT false;
CREATE INDEX bookings_active_offer ON bookings(studio_id,session_id,offer_expires_at) WHERE status='waitlisted';
ALTER TABLE people ADD COLUMN credit_cycle integer NOT NULL DEFAULT 0 CHECK(credit_cycle>=0);
ALTER TABLE people ADD COLUMN rollover_credits integer NOT NULL DEFAULT 0 CHECK(rollover_credits>=0);
ALTER TABLE people ADD CONSTRAINT rollover_within_balance CHECK(rollover_credits=0 OR (credits IS NOT NULL AND rollover_credits<=credits));
ALTER TABLE credit_ledger ADD COLUMN credit_cycle integer NOT NULL DEFAULT 0;
ALTER TABLE credit_ledger ADD COLUMN rollover_amount integer NOT NULL DEFAULT 0 CHECK(rollover_amount BETWEEN 0 AND 1);

CREATE TABLE recurring_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 member_id uuid NOT NULL, anchor_session_id uuid NOT NULL, end_date date NOT NULL,
 active boolean NOT NULL DEFAULT true, created_by uuid REFERENCES app_users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(studio_id,id), UNIQUE(studio_id,member_id,anchor_session_id),
 FOREIGN KEY(studio_id,member_id) REFERENCES people(studio_id,id) ON DELETE CASCADE,
 FOREIGN KEY(studio_id,anchor_session_id) REFERENCES class_sessions(studio_id,id) ON DELETE CASCADE
);
CREATE TABLE recurring_booking_attempts (
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE, reservation_id uuid NOT NULL, session_id uuid NOT NULL,
 booking_id uuid, outcome text NOT NULL CHECK(outcome IN('booked','waitlisted','blocked')), message text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(studio_id,reservation_id,session_id),
 FOREIGN KEY(studio_id,reservation_id) REFERENCES recurring_reservations(studio_id,id) ON DELETE CASCADE,
 FOREIGN KEY(studio_id,session_id) REFERENCES class_sessions(studio_id,id) ON DELETE CASCADE,
 FOREIGN KEY(studio_id,booking_id) REFERENCES bookings(studio_id,id)
);
CREATE TABLE package_renewals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 member_id uuid NOT NULL, package_id uuid NOT NULL, request_key uuid NOT NULL, rollover_limit integer NOT NULL,
 previous_credits integer NOT NULL, carried_credits integer NOT NULL, expired_credits integer NOT NULL,
 new_credits integer NOT NULL, credit_cycle integer NOT NULL, expiry_date date NOT NULL,
 created_by uuid REFERENCES app_users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(studio_id,request_key),
 FOREIGN KEY(studio_id,member_id) REFERENCES people(studio_id,id) ON DELETE CASCADE,
 FOREIGN KEY(studio_id,package_id) REFERENCES studio_packages(studio_id,id)
);
CREATE TABLE studio_waiver_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(title) BETWEEN 2 AND 100), version text NOT NULL CHECK(length(version) BETWEEN 1 AND 40),
 body text NOT NULL CHECK(length(body) BETWEEN 10 AND 10000), active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_users(id),
 UNIQUE(studio_id,id), UNIQUE(studio_id,title,version)
);
CREATE TABLE member_waiver_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 member_id uuid NOT NULL, document_id uuid NOT NULL, evidence_reference text NOT NULL CHECK(length(evidence_reference) BETWEEN 3 AND 200),
 accepted_on date NOT NULL, recorded_by uuid REFERENCES app_users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(studio_id,member_id,document_id),
 FOREIGN KEY(studio_id,member_id) REFERENCES people(studio_id,id) ON DELETE CASCADE,
 FOREIGN KEY(studio_id,document_id) REFERENCES studio_waiver_documents(studio_id,id)
);
DO $policy$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['recurring_reservations','recurring_booking_attempts','package_renewals','studio_waiver_documents','member_waiver_records'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(studio_id=nullif(current_setting(''app.studio_id'',true),'''')::uuid) WITH CHECK(studio_id=nullif(current_setting(''app.studio_id'',true),'''')::uuid)',t);
 END LOOP;
END $policy$;
-- Carry forward the existing runtime grants; do not grant to PUBLIC or assume a production role name.
DO $grants$
DECLARE r record;
BEGIN
 FOR r IN SELECT DISTINCT grantee FROM information_schema.role_table_grants
  WHERE table_schema='public' AND table_name='people' AND privilege_type='INSERT' AND grantee<>'PUBLIC' LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON recurring_reservations,recurring_booking_attempts,package_renewals,studio_waiver_documents,member_waiver_records TO %I',r.grantee);
 END LOOP;
END $grants$;
