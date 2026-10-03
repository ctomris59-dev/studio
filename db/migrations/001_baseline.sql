-- ReformDesk portable PostgreSQL baseline (first production architecture increment).
-- Apply using an ADMIN migration connection. Runtime must use a DISTINCT non-owner,
-- non-superuser, NO BYPASSRLS login role. No real user data until security review.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  CONSTRAINT app_users_email_check CHECK (length(email) BETWEEN 3 AND 160 AND email = lower(email))
);
CREATE UNIQUE INDEX app_users_email_unique ON app_users (lower(email));

CREATE TABLE studios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  focus text NOT NULL DEFAULT 'Pilates' CHECK (focus IN ('Pilates','Yoga','Boutique fitness','Gym')),
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE studio_users (
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','manager','instructor','receptionist','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (studio_id,user_id)
);
CREATE INDEX studio_users_user_idx ON studio_users(user_id);

CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  FOREIGN KEY(studio_id,user_id) REFERENCES studio_users(studio_id,user_id) ON DELETE CASCADE
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at);

-- Persist login throttling across all application instances; no per-process counters.
CREATE TABLE login_attempts (
  email_hash text PRIMARY KEY CHECK(length(email_hash)=64),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz
);

CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('lead','member')),
  full_name text NOT NULL CHECK(length(full_name) BETWEEN 2 AND 80),
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  lead_stage text CHECK (lead_stage IS NULL OR lead_stage IN ('New','Contacted','Trial booked','Trial attended','Won','Lost')),
  next_contact date,
  preferred_service text NOT NULL DEFAULT '',
  preferred_channel text CHECK (preferred_channel IS NULL OR preferred_channel IN ('Either','Email','Phone')),
  interest_plan text NOT NULL DEFAULT '',
  joined date,
  start_date date,
  expiry_date date,
  last_visit date,
  member_status text CHECK(member_status IS NULL OR member_status IN('Active','Paused')),
  plan text,
  credits integer CHECK(credits IS NULL OR credits>=0),
  initial_credits integer CHECK(initial_credits IS NULL OR initial_credits>=0),
  package_status text CHECK(package_status IS NULL OR package_status IN ('Pending','Paid')),
  source_lead_id uuid,
  email_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(studio_id,id),
  CHECK (length(email)>0 OR length(phone)>0),
  CHECK (expiry_date IS NULL OR start_date IS NULL OR expiry_date>=start_date),
  FOREIGN KEY(studio_id,source_lead_id) REFERENCES people(studio_id,id)
);
CREATE UNIQUE INDEX people_email_per_studio_idx ON people(studio_id,lower(email)) WHERE email<>'';
CREATE UNIQUE INDEX people_phone_per_studio_idx ON people(studio_id,phone) WHERE phone<>'';
CREATE INDEX people_kind_idx ON people(studio_id,kind,created_at DESC);

CREATE TABLE class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructor text NOT NULL,
  room text NOT NULL DEFAULT 'Main studio',
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 50 CHECK(duration_minutes BETWEEN 15 AND 240),
  capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 100),
  series_id uuid,
  booking_cutoff_hours integer NOT NULL DEFAULT 0 CHECK(booking_cutoff_hours BETWEEN 0 AND 168),
  cancel_cutoff_hours integer NOT NULL DEFAULT 0 CHECK(cancel_cutoff_hours BETWEEN 0 AND 168),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(studio_id,id)
);
CREATE INDEX class_sessions_by_studio_idx ON class_sessions(studio_id,starts_at);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  member_id uuid NOT NULL,
  status text NOT NULL CHECK(status IN ('booked','waitlisted','cancelled')),
  queue_number bigint,
  booked_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  UNIQUE(studio_id,id),
  FOREIGN KEY(studio_id,session_id) REFERENCES class_sessions(studio_id,id) ON DELETE CASCADE,
  FOREIGN KEY(studio_id,member_id) REFERENCES people(studio_id,id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX bookings_active_once_idx ON bookings(studio_id,session_id,member_id) WHERE status IN ('booked','waitlisted');
CREATE INDEX bookings_queue_idx ON bookings(studio_id,session_id,status,booked_at);

CREATE TABLE credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  booking_id uuid,
  delta integer NOT NULL CHECK(delta<>0),
  reason text NOT NULL CHECK(length(reason) BETWEEN 2 AND 200),
  reversal_of uuid,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(studio_id,member_id) REFERENCES people(studio_id,id),
  FOREIGN KEY(studio_id,booking_id) REFERENCES bookings(studio_id,id),
  FOREIGN KEY(reversal_of) REFERENCES credit_ledger(id)
);
CREATE UNIQUE INDEX credit_ledger_single_reversal_idx ON credit_ledger(reversal_of) WHERE reversal_of IS NOT NULL;
CREATE INDEX credit_ledger_member_idx ON credit_ledger(studio_id,member_id,created_at DESC);

CREATE TABLE followup_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  title text NOT NULL,
  due_at timestamptz NOT NULL,
  category text NOT NULL DEFAULT 'General',
  priority text NOT NULL DEFAULT 'Normal',
  repeat_rule text NOT NULL DEFAULT 'None',
  assigned_to uuid,
  notes text NOT NULL DEFAULT '',
  outcome text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(studio_id,person_id) REFERENCES people(studio_id,id),
  FOREIGN KEY(studio_id,assigned_to) REFERENCES studio_users(studio_id,user_id)
);
CREATE INDEX followup_open_idx ON followup_tasks(studio_id,due_at) WHERE completed_at IS NULL;

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  person_id uuid,
  actor_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(studio_id,person_id) REFERENCES people(studio_id,id)
);
CREATE INDEX activity_by_studio_idx ON activity_log(studio_id,created_at DESC);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL UNIQUE REFERENCES studios(id) ON DELETE CASCADE,
  provider text CHECK(provider IS NULL OR provider IN ('paddle','lemon_squeezy')),
  provider_subscription_id text,
  plan text NOT NULL DEFAULT 'none' CHECK(plan IN ('none','monthly','annual')),
  status text NOT NULL DEFAULT 'inactive' CHECK(status IN ('inactive','trialing','active','past_due','cancelled','expired')),
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX subscriptions_provider_ref_idx ON subscriptions(provider,provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
CREATE TABLE billing_events (
  provider text NOT NULL CHECK(provider IN ('paddle','lemon_squeezy')),
  event_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  PRIMARY KEY(provider,event_id)
);

-- FORCE RLS even when runtime role owns tables; never use an admin connection for requests.
-- Tenant setting is scoped to each transaction via set_config(..., true).
DO $policy$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['people','class_sessions','bookings','credit_ledger','followup_tasks','activity_log','subscriptions'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (studio_id = nullif(current_setting(''app.studio_id'', true),'''')::uuid) WITH CHECK (studio_id = nullif(current_setting(''app.studio_id'', true),'''')::uuid)',t);
  END LOOP;
END;
$policy$;
