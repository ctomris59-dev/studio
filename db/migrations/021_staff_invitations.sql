-- One-time invitations to NEW staff accounts; memberships remain studio scoped.
CREATE TABLE staff_invitations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 invited_by uuid NOT NULL REFERENCES app_users(id),
 email text NOT NULL CHECK(email=lower(email) AND length(email) BETWEEN 3 AND 160),
 role text NOT NULL CHECK(role IN ('manager','instructor','receptionist')),
 token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 accepted_at timestamptz,
 revoked_at timestamptz
);
CREATE INDEX staff_invitations_studio_pending_idx ON staff_invitations(studio_id,created_at DESC);
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_invitation_tenant ON staff_invitations
 USING(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid)
 WITH CHECK(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid);
ALTER TABLE mail_outbox DROP CONSTRAINT IF EXISTS mail_outbox_template_check;
ALTER TABLE mail_outbox ADD CONSTRAINT mail_outbox_template_check
 CHECK(template IN ('verify_email','password_reset','member_invitation','booking_confirmed','booking_cancelled','waitlist_promoted','renewal_alert','staff_invitation'));
