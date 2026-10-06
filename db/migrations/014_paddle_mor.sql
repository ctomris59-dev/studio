-- Paddle Merchant-of-Record billing metadata and stronger legal acceptance evidence.
ALTER TABLE subscriptions ADD COLUMN provider_customer_id text;
ALTER TABLE subscriptions ADD COLUMN provider_price_id text;

ALTER TABLE legal_acceptances ADD COLUMN cancellation_version text NOT NULL DEFAULT 'legacy';
ALTER TABLE legal_acceptances ALTER COLUMN cancellation_version DROP DEFAULT;
ALTER TABLE legal_acceptances ADD CONSTRAINT legal_acceptances_cancellation_version_check
 CHECK(length(cancellation_version) BETWEEN 6 AND 40);

-- A Cancellation/Refund Policy update must be capable of creating fresh acceptance evidence
-- even when Terms/DPA/plan/price are otherwise unchanged. Privacy is disclosure evidence,
-- not part of the contractual consent key.
DO 'DECLARE old_unique text;
BEGIN
 SELECT conname INTO old_unique
 FROM pg_constraint
 WHERE conrelid=''legal_acceptances''::regclass
   AND contype=''u''
 ORDER BY oid
 LIMIT 1;
 IF old_unique IS NOT NULL THEN
  EXECUTE ''ALTER TABLE legal_acceptances DROP CONSTRAINT '' || quote_ident(old_unique);
 END IF;
END';

ALTER TABLE legal_acceptances ADD CONSTRAINT legal_acceptances_contract_version_key
 UNIQUE(studio_id,user_id,terms_version,dpa_version,cancellation_version,plan,price_cents);

CREATE INDEX subscriptions_paddle_customer_idx ON subscriptions(provider,provider_customer_id)
 WHERE provider='paddle' AND provider_customer_id IS NOT NULL;
