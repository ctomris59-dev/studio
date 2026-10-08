-- Anonymization marker enables retention/audit processing without dropping booking ledgers.
ALTER TABLE people ADD COLUMN anonymized_at timestamptz;
CREATE INDEX people_anonymized_idx ON people(studio_id,anonymized_at)
 WHERE anonymized_at IS NOT NULL;
