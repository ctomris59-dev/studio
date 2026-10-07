-- Optional related contact for class-based studios.
-- Used as parent / guardian contact for Dance studios and as an optional
-- emergency / family contact elsewhere. Kept deliberately minimal.
ALTER TABLE people ADD COLUMN related_contact_name text NOT NULL DEFAULT '' CHECK(length(related_contact_name)<=100);
ALTER TABLE people ADD COLUMN related_contact_role text NOT NULL DEFAULT '' CHECK(length(related_contact_role)<=40);
ALTER TABLE people ADD COLUMN related_contact_email text NOT NULL DEFAULT '' CHECK(length(related_contact_email)<=160);
ALTER TABLE people ADD COLUMN related_contact_phone text NOT NULL DEFAULT '' CHECK(length(related_contact_phone)<=30);
