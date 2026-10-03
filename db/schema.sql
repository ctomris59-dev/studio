-- StudioTasker PostgreSQL schema — design migration, NOT applied to a live database.
-- Deploy only after choosing a managed Postgres provider and implementing verified authentication.
-- All application database operations MUST run server-side with a verified studio membership.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE studios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  focus text NOT NULL CHECK (focus IN ('Pilates','Yoga','Boutique fitness','Gym')),
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE studio_users (
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  auth_subject text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','manager','staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (studio_id,auth_subject)
);
CREATE INDEX studio_users_subject_idx ON studio_users(auth_subject);
CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('lead','member')),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  notes text NOT NULL DEFAULT '',
  source text,
  lead_stage text CHECK (lead_stage IS NULL OR lead_stage IN ('New','Contacted','Trial booked','Trial attended','Won','Lost')),
  next_contact date,
  joined date,
  last_visit date,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Paused')),
  class_plan text,
  remaining_credits integer CHECK (remaining_credits IS NULL OR remaining_credits>=0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (studio_id,id),
  UNIQUE (studio_id,email)
);
CREATE INDEX people_stage_idx ON people(studio_id,kind,lead_stage);
CREATE INDEX people_last_visit_idx ON people(studio_id,last_visit);
CREATE TABLE consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  opted_in boolean NOT NULL DEFAULT false,
  source text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_person_fk FOREIGN KEY(studio_id,person_id) REFERENCES people(studio_id,id) ON DELETE CASCADE
);
CREATE INDEX consent_lookup_idx ON consents(studio_id,person_id,channel,recorded_at DESC);
CREATE TABLE class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  title text NOT NULL,
  coach text NOT NULL,
  begins_at timestamptz NOT NULL,
  capacity integer NOT NULL CHECK(capacity>0 AND capacity<=100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(studio_id,id)
);
CREATE INDEX class_sessions_time_idx ON class_sessions(studio_id,begins_at);
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  person_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('booked','waitlisted','cancelled')),
  queue_number bigint,
  booked_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  UNIQUE (studio_id,id),
  FOREIGN KEY(studio_id,session_id) REFERENCES class_sessions(studio_id,id) ON DELETE CASCADE,
  FOREIGN KEY(studio_id,person_id) REFERENCES people(studio_id,id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX booking_one_active_per_person_session ON bookings(studio_id,session_id,person_id) WHERE status IN('booked','waitlisted');
CREATE INDEX booking_queue_idx ON bookings(studio_id,session_id,status,booked_at);
CREATE TABLE class_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  booking_id uuid,
  delta integer NOT NULL CHECK(delta <> 0),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(studio_id,person_id) REFERENCES people(studio_id,id) ON DELETE CASCADE,
  FOREIGN KEY(studio_id,booking_id) REFERENCES bookings(studio_id,id)
);
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  action text NOT NULL,
  actor_subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(studio_id,person_id) REFERENCES people(studio_id,id) ON DELETE CASCADE
);
CREATE INDEX activity_person_idx ON activity_log(studio_id,person_id,created_at DESC);
CREATE TABLE followup_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  description text NOT NULL,
  due_on date NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(studio_id,person_id) REFERENCES people(studio_id,id) ON DELETE CASCADE
);
CREATE INDEX tasks_due_idx ON followup_tasks(studio_id,due_on) WHERE completed_at IS NULL;

-- Additional protections required before public launch:
-- 1) All endpoints MUST verify a trusted auth_subject server-side, check studio_users,
--    and scope EVERY query/mutation by the authenticated studio_id.
-- 2) Enable FORCE RLS and create policies tied to verified auth provider identity.
--    This schema intentionally does not pretend to enforce tenancy before auth is chosen.
-- 3) Use a transaction with SELECT ... FOR UPDATE on class_sessions before confirming
--    a booking, then atomically update booking status and class_credit_ledger.
-- 4) On cancellation atomically reverse credit consumption and promote the earliest
--    eligible waitlist entry. Use idempotency keys for client retries.
-- 5) Configure backups, retention/deletion, consent provenance and email unsubscribe.
-- 6) Do not connect this schema to publicly accessible routes before full security tests.
