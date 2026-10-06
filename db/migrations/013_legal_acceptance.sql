-- Legal acceptance evidence and studio-controlled privacy notice.
ALTER TABLE studios ADD COLUMN privacy_policy_url text;
ALTER TABLE studios ADD CONSTRAINT studios_privacy_policy_url_check
 CHECK(privacy_policy_url IS NULL OR (
  length(privacy_policy_url) BETWEEN 8 AND 500 AND privacy_policy_url ~ '^https?://'
 ));

CREATE TABLE legal_acceptances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 source text NOT NULL CHECK(source IN('registration','checkout','reauthorization')),
 terms_version text NOT NULL CHECK(length(terms_version) BETWEEN 8 AND 40),
 dpa_version text NOT NULL CHECK(length(dpa_version) BETWEEN 8 AND 40),
 privacy_version text NOT NULL CHECK(length(privacy_version) BETWEEN 8 AND 40),
 plan text NOT NULL CHECK(plan IN('monthly','annual')),
 price_cents integer NOT NULL CHECK(price_cents IN(3990,41880)),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 acceptance_text_hash text NOT NULL CHECK(length(acceptance_text_hash)=64),
 ip_hash text NOT NULL CHECK(length(ip_hash)=64),
 user_agent text NOT NULL DEFAULT '' CHECK(length(user_agent)<=512),
 accepted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(studio_id,user_id,terms_version,dpa_version,privacy_version,plan,price_cents)
);
CREATE INDEX legal_acceptances_studio_date ON legal_acceptances(studio_id,accepted_at DESC);
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_acceptances FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON legal_acceptances
 USING(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid)
 WITH CHECK(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid);
