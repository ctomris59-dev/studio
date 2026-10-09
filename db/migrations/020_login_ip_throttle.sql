-- Privacy-preserving hashed IP counters for verified-proxy sign-in rate limits.
CREATE TABLE login_ip_attempts(
 ip_hash text PRIMARY KEY CHECK(length(ip_hash)=64),
 attempts integer NOT NULL CHECK(attempts>=0),
 window_started_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_ip_attempts_stale_idx ON login_ip_attempts(window_started_at);
