-- Studio-specific appearance, terminology and operating-rule personalization.
ALTER TABLE studios ADD COLUMN accent_color text NOT NULL DEFAULT '#334BDD'
 CHECK(accent_color ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE studios ADD COLUMN member_term text NOT NULL DEFAULT 'Members'
 CHECK(member_term IN('Members','Clients','Students','Customers'));
ALTER TABLE studios ADD COLUMN class_term text NOT NULL DEFAULT 'Classes'
 CHECK(class_term IN('Classes','Sessions','Lessons'));
ALTER TABLE studios ADD COLUMN credit_term text NOT NULL DEFAULT 'Credits'
 CHECK(credit_term IN('Credits','Visits','Sessions'));
ALTER TABLE studios ADD COLUMN week_starts text NOT NULL DEFAULT 'monday'
 CHECK(week_starts IN('monday','sunday'));
ALTER TABLE studios ADD COLUMN time_format text NOT NULL DEFAULT '24h'
 CHECK(time_format IN('24h','12h'));
ALTER TABLE studios ADD COLUMN default_view text NOT NULL DEFAULT 'today'
 CHECK(default_view IN('today','leads','members','classes','followups','insights','settings'));
ALTER TABLE studios ADD COLUMN default_class_duration integer NOT NULL DEFAULT 50
 CHECK(default_class_duration BETWEEN 15 AND 240);
ALTER TABLE studios ADD COLUMN default_class_capacity integer NOT NULL DEFAULT 8
 CHECK(default_class_capacity BETWEEN 1 AND 100);
ALTER TABLE studios ADD COLUMN default_room text NOT NULL DEFAULT 'Main studio'
 CHECK(length(default_room) BETWEEN 1 AND 80);
ALTER TABLE studios ADD COLUMN inactive_days integer NOT NULL DEFAULT 21
 CHECK(inactive_days BETWEEN 7 AND 90);
ALTER TABLE studios ADD COLUMN low_credits_threshold integer NOT NULL DEFAULT 2
 CHECK(low_credits_threshold BETWEEN 0 AND 10);
ALTER TABLE studios ADD COLUMN renewal_window_days integer NOT NULL DEFAULT 14
 CHECK(renewal_window_days BETWEEN 1 AND 60);
ALTER TABLE studios ADD COLUMN trial_followup_hours integer NOT NULL DEFAULT 18
 CHECK(trial_followup_hours BETWEEN 1 AND 168);
ALTER TABLE studios ADD COLUMN package_review_hours integer NOT NULL DEFAULT 24
 CHECK(package_review_hours BETWEEN 1 AND 168);
ALTER TABLE studios ADD COLUMN open_seats_threshold integer NOT NULL DEFAULT 2
 CHECK(open_seats_threshold BETWEEN 1 AND 50);

CREATE TABLE studio_brand_assets (
 studio_id uuid PRIMARY KEY REFERENCES studios(id) ON DELETE CASCADE,
 logo_mime text NOT NULL CHECK(logo_mime IN('image/png','image/jpeg','image/webp')),
 logo_bytes bytea NOT NULL CHECK(octet_length(logo_bytes) BETWEEN 1 AND 200000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE studio_brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_brand_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON studio_brand_assets
 USING(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid)
 WITH CHECK(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid);
