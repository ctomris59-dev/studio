-- Irreversible studio-deletion audit proof without retaining name, email or raw tenant ID.
-- This is an operator-only table. Never grant the application runtime role access.
CREATE TABLE completed_studio_closures (
 studio_fingerprint text PRIMARY KEY CHECK(length(studio_fingerprint)=64),
 requested_at timestamptz NOT NULL,
 erased_at timestamptz NOT NULL DEFAULT now(),
 retained_legal_acceptance_count integer NOT NULL DEFAULT 0,
 previous_subscription_status text NOT NULL
);
