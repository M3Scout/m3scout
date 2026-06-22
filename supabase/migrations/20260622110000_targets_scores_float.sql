-- Change score columns to numeric to support half-star values (e.g. 3.5)
ALTER TABLE targets
  ALTER COLUMN score_physical  TYPE numeric(3,1),
  ALTER COLUMN score_technical TYPE numeric(3,1),
  ALTER COLUMN score_tactical  TYPE numeric(3,1),
  ALTER COLUMN score_mental    TYPE numeric(3,1);

-- Drop integer constraints and add float-aware ones
ALTER TABLE targets
  DROP CONSTRAINT IF EXISTS targets_score_physical_check,
  DROP CONSTRAINT IF EXISTS targets_score_technical_check,
  DROP CONSTRAINT IF EXISTS targets_score_tactical_check,
  DROP CONSTRAINT IF EXISTS targets_score_mental_check;

ALTER TABLE targets
  ADD CONSTRAINT targets_score_physical_check  CHECK (score_physical  BETWEEN 0.5 AND 5),
  ADD CONSTRAINT targets_score_technical_check CHECK (score_technical BETWEEN 0.5 AND 5),
  ADD CONSTRAINT targets_score_tactical_check  CHECK (score_tactical  BETWEEN 0.5 AND 5),
  ADD CONSTRAINT targets_score_mental_check    CHECK (score_mental    BETWEEN 0.5 AND 5);
