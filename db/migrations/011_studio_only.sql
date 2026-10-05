-- StudioTasker becomes studio-facing B2B operations software.
-- Remove member login/payment processing surfaces and keep only internal package entitlement tracking.

-- Remove member-facing identities/sessions before tightening staff roles.
DELETE FROM auth_sessions s USING studio_users su
 WHERE s.studio_id=su.studio_id AND s.user_id=su.user_id AND su.role='member';
DELETE FROM member_identities;
DELETE FROM studio_users WHERE role='member';
DROP TABLE member_identities;
ALTER TABLE studio_users DROP CONSTRAINT IF EXISTS studio_users_role_check;
ALTER TABLE studio_users ADD CONSTRAINT studio_users_role_check
 CHECK(role IN('owner','manager','instructor','receptionist'));

-- Member invitations and automated member-facing mail are no longer part of the product.
DELETE FROM auth_challenges WHERE purpose='member_invitation';
ALTER TABLE auth_challenges DROP CONSTRAINT IF EXISTS auth_challenges_purpose_check;
ALTER TABLE auth_challenges ADD CONSTRAINT auth_challenges_purpose_check
 CHECK(purpose IN('verify_email','password_reset'));
DELETE FROM mail_outbox WHERE template NOT IN('verify_email','password_reset');
ALTER TABLE mail_outbox DROP CONSTRAINT IF EXISTS mail_outbox_template_check;
ALTER TABLE mail_outbox ADD CONSTRAINT mail_outbox_template_check
 CHECK(template IN('verify_email','password_reset'));

-- Remove StudioTasker-mediated member payments. Historic development rows are discarded;
-- this project has not been opened to real paying studio members.
DROP INDEX IF EXISTS credit_ledger_purchase_once;
ALTER TABLE credit_ledger DROP COLUMN IF EXISTS purchase_id;
DROP TABLE IF EXISTS studio_payment_events;
DROP TABLE IF EXISTS member_purchases;
DROP TABLE IF EXISTS studio_payment_accounts;

-- Packages are internal entitlement templates, not products sold or paid for through StudioTasker.
UPDATE studio_packages SET price_cents=NULL,currency=NULL;
ALTER TABLE studio_packages DROP CONSTRAINT IF EXISTS studio_packages_price_cents_check;
ALTER TABLE studio_packages DROP CONSTRAINT IF EXISTS studio_packages_currency_check;
ALTER TABLE studio_packages ALTER COLUMN price_cents DROP NOT NULL;
ALTER TABLE studio_packages ALTER COLUMN currency DROP NOT NULL;

-- Package status means the studio confirmed the member's entitlement, not that StudioTasker verified money.
UPDATE people SET package_status='Confirmed' WHERE package_status='Paid';
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_package_status_check;
ALTER TABLE people ADD CONSTRAINT people_package_status_check
 CHECK(package_status IS NULL OR package_status IN('Pending','Confirmed'));

-- Remove public member booking/self-registration state. Self-service now means studio-owner onboarding.
DROP TABLE IF EXISTS public_signup_attempts;
ALTER TABLE studios DROP COLUMN IF EXISTS public_slug;
ALTER TABLE studios DROP COLUMN IF EXISTS public_booking_enabled;
ALTER TABLE studios DROP COLUMN IF EXISTS self_signup_enabled;
ALTER TABLE studios ADD COLUMN onboarding_completed_at timestamptz;
