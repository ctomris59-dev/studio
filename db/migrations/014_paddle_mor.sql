-- Paddle Merchant-of-Record billing metadata and stronger legal acceptance evidence.
ALTER TABLE subscriptions ADD COLUMN provider_customer_id text;
ALTER TABLE subscriptions ADD COLUMN provider_price_id text;

ALTER TABLE legal_acceptances ADD COLUMN cancellation_version text NOT NULL DEFAULT 'legacy';
ALTER TABLE legal_acceptances ALTER COLUMN cancellation_version DROP DEFAULT;
ALTER TABLE legal_acceptances ADD CONSTRAINT legal_acceptances_cancellation_version_check
 CHECK(length(cancellation_version) BETWEEN 6 AND 40);

CREATE INDEX subscriptions_paddle_customer_idx ON subscriptions(provider,provider_customer_id)
 WHERE provider='paddle' AND provider_customer_id IS NOT NULL;
