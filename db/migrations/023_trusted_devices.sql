-- A cryptographically random, server-recorded device token allows an owner
-- to recover from an email-only failed-attempt flood without removing the
-- bound on expensive password verification. Device values are never stored raw.
CREATE TABLE auth_trusted_devices (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_used_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL
);
CREATE INDEX auth_trusted_devices_user_idx ON auth_trusted_devices(user_id,last_used_at DESC);
