-- Extend studio types without narrowing existing data, preserving the same secure tenant model.
ALTER TABLE studios DROP CONSTRAINT studios_focus_check;
ALTER TABLE studios ADD CONSTRAINT studios_focus_check
 CHECK (focus IN ('Pilates','Yoga','Barre','Dance','Boutique fitness','Gym'));
