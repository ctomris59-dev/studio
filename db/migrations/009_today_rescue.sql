-- StudioTasker Today: idempotent one-click follow-ups and temporary signal suppression.
ALTER TABLE followup_tasks ADD COLUMN source_key text;
CREATE UNIQUE INDEX followup_open_source_idx
 ON followup_tasks(studio_id,source_key)
 WHERE source_key IS NOT NULL AND completed_at IS NULL;

CREATE TABLE action_center_snoozes (
 studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
 action_key text NOT NULL CHECK(length(action_key) BETWEEN 3 AND 180),
 snoozed_until timestamptz NOT NULL,
 created_by uuid NOT NULL REFERENCES app_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(studio_id,action_key)
);
CREATE INDEX action_center_snoozes_due_idx ON action_center_snoozes(studio_id,snoozed_until);

ALTER TABLE action_center_snoozes ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_center_snoozes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON action_center_snoozes
 USING(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid)
 WITH CHECK(studio_id=nullif(current_setting('app.studio_id',true),'')::uuid);
