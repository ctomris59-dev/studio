-- ReformDesk 003: verified identity, member portal, reliable mail outbox, provider event ordering.
ALTER TABLE app_users ADD COLUMN email_verified_at timestamptz;
ALTER TABLE app_users ADD COLUMN password_changed_at timestamptz;

CREATE TABLE auth_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
 purpose text NOT NULL CHECK(purpose IN('verify_email','password_reset','member_invitation')),
 email text NOT NULL CHECK(email=lower(email)),
 user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
 studio_id uuid REFERENCES studios(id) ON DELETE CASCADE,
 member_id uuid,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (purpose='member_invitation' OR studio_id IS NULL),
 CHECK (purpose='member_invitation' OR member_id IS NULL),
 FOREIGN KEY (studio_id,member_id) REFERENCES people(studio_id,id)
);
CREATE INDEX auth_challenges_expiry ON auth_challenges(expires_at);

CREATE TABLE mail_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recipient_email text NOT NULL,
 template text NOT NULL CHECK(template IN('verify_email','password_reset','member_invitation','booking_confirmed','booking_cancelled','waitlist_promoted','renewal_alert')),
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 dispatched_at timestamptz,
 attempts integer NOT NULL DEFAULT 0,
 last_error text,
 CHECK(length(recipient_email)<=160)
);
CREATE INDEX mail_outbox_pending ON mail_outbox(created_at) WHERE dispatched_at IS NULL;

CREATE TABLE member_identities (
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 person_id uuid NOT NULL,
 user_id uuid NOT NULL,
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(studio_id,person_id),
 UNIQUE(studio_id,user_id),
 FOREIGN KEY(studio_id,person_id) REFERENCES people(studio_id,id) ON DELETE CASCADE,
 FOREIGN KEY(studio_id,user_id) REFERENCES studio_users(studio_id,user_id) ON DELETE CASCADE
);

ALTER TABLE subscriptions ADD COLUMN provider_updated_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN is_test_mode boolean NOT NULL DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN customer_portal_url text;
ALTER TABLE subscriptions ADD COLUMN provider_variant_id text;

CREATE TABLE data_export_audits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES app_users(id),
 reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX export_audits_studio_date ON data_export_audits(studio_id,created_at DESC);

-- GDPR-compatible soft-delete flags. Related bookings / financial ledgers remain intact
-- pending a documented retention/anonymization procedure.
ALTER TABLE people ADD COLUMN archived_at timestamptz;
CREATE INDEX people_active_studio ON people(studio_id,kind) WHERE archived_at IS NULL;

-- Default deny when no tenant set. The user-to-member mapping also requires tenant scope.
ALTER TABLE member_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_identities FORCE ROW LEVEL SECURITY;
CREATE POLICY member_identity_tenant ON member_identities
 USING(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid)
 WITH CHECK(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid);
ALTER TABLE data_export_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_audits FORCE ROW LEVEL SECURITY;
CREATE POLICY data_export_tenant ON data_export_audits
 USING(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid)
 WITH CHECK(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid);
