-- StudioTasker class-based operating system expansion.
-- Adds vertical presets, equipment spots, cancellation/no-show outcomes,
-- staff roster/substitution, member tags/waiver status and reporting fields.

ALTER TABLE studios DROP CONSTRAINT IF EXISTS studios_focus_check;
ALTER TABLE studios ADD CONSTRAINT studios_focus_check
 CHECK (focus IN ('Pilates','Yoga','Barre','Dance','Indoor cycling','Fitness & Gym','Boutique fitness','Gym'));

ALTER TABLE studios ADD COLUMN spot_booking_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE studios ADD COLUMN equipment_label text NOT NULL DEFAULT 'Spot'
 CHECK(length(equipment_label) BETWEEN 2 AND 40);
ALTER TABLE studios ADD COLUMN default_spot_count integer NOT NULL DEFAULT 8
 CHECK(default_spot_count BETWEEN 1 AND 100);
ALTER TABLE studios ADD COLUMN default_class_format text NOT NULL DEFAULT 'group'
 CHECK(default_class_format IN('group','private','semi_private','course','open_gym','pt'));
ALTER TABLE studios ADD COLUMN waiver_required boolean NOT NULL DEFAULT false;
ALTER TABLE studios ADD COLUMN late_cancel_refund_credit boolean NOT NULL DEFAULT false;
ALTER TABLE studios ADD COLUMN no_show_refund_credit boolean NOT NULL DEFAULT false;

CREATE TABLE studio_staff (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 2 AND 80),
 role text NOT NULL DEFAULT 'Instructor'
  CHECK(role IN('Instructor','Coach','Front desk','Manager','Other')),
 availability_notes text NOT NULL DEFAULT '' CHECK(length(availability_notes)<=500),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(studio_id,id)
);
CREATE INDEX studio_staff_active_idx ON studio_staff(studio_id,active,display_name);
ALTER TABLE studio_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_staff FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON studio_staff
 USING(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid)
 WITH CHECK(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid);

ALTER TABLE class_sessions ADD COLUMN class_format text NOT NULL DEFAULT 'group'
 CHECK(class_format IN('group','private','semi_private','course','open_gym','pt'));
ALTER TABLE class_sessions ADD COLUMN level text NOT NULL DEFAULT '' CHECK(length(level)<=60);
ALTER TABLE class_sessions ADD COLUMN program_label text NOT NULL DEFAULT '' CHECK(length(program_label)<=80);
ALTER TABLE class_sessions ADD COLUMN spot_booking_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE class_sessions ADD COLUMN spot_label text NOT NULL DEFAULT 'Spot' CHECK(length(spot_label) BETWEEN 2 AND 40);
ALTER TABLE class_sessions ADD COLUMN spot_count integer CHECK(spot_count IS NULL OR spot_count BETWEEN 1 AND 100);
ALTER TABLE class_sessions ADD COLUMN staff_id uuid;
ALTER TABLE class_sessions ADD COLUMN substitute_staff_id uuid;
ALTER TABLE class_sessions ADD CONSTRAINT class_sessions_staff_fk
 FOREIGN KEY(studio_id,staff_id) REFERENCES studio_staff(studio_id,id);
ALTER TABLE class_sessions ADD CONSTRAINT class_sessions_substitute_staff_fk
 FOREIGN KEY(studio_id,substitute_staff_id) REFERENCES studio_staff(studio_id,id);

ALTER TABLE bookings ADD COLUMN spot_number integer CHECK(spot_number IS NULL OR spot_number BETWEEN 1 AND 100);
ALTER TABLE bookings ADD COLUMN cancellation_type text
 CHECK(cancellation_type IS NULL OR cancellation_type IN('standard','late'));
ALTER TABLE bookings ADD COLUMN no_show_at timestamptz;
CREATE UNIQUE INDEX bookings_active_spot_unique
 ON bookings(studio_id,session_id,spot_number)
 WHERE status='booked' AND spot_number IS NOT NULL;
CREATE INDEX bookings_outcomes_idx
 ON bookings(studio_id,session_id,cancellation_type,no_show_at);

ALTER TABLE people ADD COLUMN tags text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE people ADD COLUMN waiver_status text NOT NULL DEFAULT 'not_required'
 CHECK(waiver_status IN('not_required','pending','signed','expired'));
ALTER TABLE people ADD COLUMN waiver_updated_at timestamptz;
CREATE INDEX people_tags_idx ON people USING gin(tags);

CREATE UNIQUE INDEX credit_ledger_single_no_show_refund
 ON credit_ledger(studio_id,booking_id) WHERE reason='no_show_refund';

-- Existing Gym records remain valid; new UI uses Fitness & Gym.
UPDATE studios SET focus='Fitness & Gym' WHERE focus='Gym';
