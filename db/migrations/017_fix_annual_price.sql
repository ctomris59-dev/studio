-- Preserve existing migrations and repair the prepaid annual acceptance price.
ALTER TABLE legal_acceptances DROP CONSTRAINT IF EXISTS legal_acceptances_price_cents_check;
ALTER TABLE legal_acceptances ADD CONSTRAINT legal_acceptances_price_cents_check
 CHECK (price_cents IN (3990,40680));
