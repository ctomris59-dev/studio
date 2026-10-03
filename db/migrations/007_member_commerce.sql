-- StudioTasker member commerce. Tenant-scoped catalog, Stripe Connect and checkout audit.
CREATE TABLE studio_payment_accounts (
 studio_id uuid PRIMARY KEY REFERENCES studios(id) ON DELETE CASCADE,
 stripe_account_id text NOT NULL UNIQUE CHECK(stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
 country text NOT NULL CHECK(country ~ '^[A-Z]{2}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE studio_packages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 70),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=240),
 price_cents integer NOT NULL CHECK(price_cents BETWEEN 100 AND 1000000),
 currency text NOT NULL CHECK(currency IN ('usd','eur','gbp','cad','aud')),
 credits integer NOT NULL CHECK(credits BETWEEN 1 AND 100),
 valid_days integer NOT NULL CHECK(valid_days BETWEEN 7 AND 365),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(studio_id,id)
);
CREATE INDEX studio_packages_visible_idx ON studio_packages(studio_id,active);
CREATE TABLE member_purchases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 member_id uuid NOT NULL,
 package_id uuid NOT NULL,
 stripe_account_id text NOT NULL,
 amount_cents integer NOT NULL CHECK(amount_cents>0),
 currency text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','paid','refunded','disputed')),
 stripe_session_id text UNIQUE,
 stripe_payment_intent_id text UNIQUE,
 fulfilled_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(studio_id,id),
 FOREIGN KEY(studio_id,member_id) REFERENCES people(studio_id,id),
 FOREIGN KEY(studio_id,package_id) REFERENCES studio_packages(studio_id,id)
);
CREATE INDEX member_purchases_member_idx ON member_purchases(studio_id,member_id,created_at DESC);
CREATE TABLE studio_payment_events (
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 stripe_event_id text NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(studio_id,stripe_event_id)
);
ALTER TABLE credit_ledger ADD COLUMN purchase_id uuid REFERENCES member_purchases(id);
CREATE UNIQUE INDEX credit_ledger_purchase_once ON credit_ledger(studio_id,purchase_id) WHERE purchase_id IS NOT NULL;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['studio_payment_accounts','studio_packages','member_purchases','studio_payment_events'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(studio_id=nullif(current_setting(''app.studio_id'',true),'''')::uuid) WITH CHECK(studio_id=nullif(current_setting(''app.studio_id'',true),'''')::uuid)',t);
 END LOOP;
END $$;
