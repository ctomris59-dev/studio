-- Stage B: public studio discovery, self-service signup, auditable CSV migration and onboarding.
ALTER TABLE studios ADD COLUMN public_slug text NOT NULL
 DEFAULT ('studio-'||substr(replace(gen_random_uuid()::text,'-',''),1,12));
ALTER TABLE studios ADD COLUMN public_booking_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE studios ADD COLUMN self_signup_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE studios ADD COLUMN onboarding_import_skipped boolean NOT NULL DEFAULT false;

UPDATE studios SET public_slug=
 left(COALESCE(NULLIF(trim(both '-' from regexp_replace(lower(name),'[^a-z0-9]+','-','g')),''),'studio'),52)
 ||'-'||substr(replace(id::text,'-',''),1,8);

ALTER TABLE studios ADD CONSTRAINT studios_public_slug_check
 CHECK(public_slug ~ '^[a-z0-9][a-z0-9-]{2,70}$');
CREATE UNIQUE INDEX studios_public_slug_unique ON studios(public_slug);

CREATE TABLE public_signup_attempts (
 key_hash text PRIMARY KEY CHECK(length(key_hash)=64),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 window_started_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES app_users(id),
 filename text NOT NULL CHECK(length(filename) BETWEEN 1 AND 120),
 row_count integer NOT NULL CHECK(row_count>=0),
 imported_count integer NOT NULL CHECK(imported_count>=0),
 skipped_count integer NOT NULL CHECK(skipped_count>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX import_batches_studio_date ON import_batches(studio_id,created_at DESC);
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON import_batches
 USING(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid)
 WITH CHECK(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid);
