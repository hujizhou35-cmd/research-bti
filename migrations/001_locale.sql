-- Apply once to an existing database. Fresh installs use schema.sql instead.
ALTER TABLE responses ADD COLUMN locale TEXT;
ALTER TABLE responses ADD COLUMN translation_version TEXT;
