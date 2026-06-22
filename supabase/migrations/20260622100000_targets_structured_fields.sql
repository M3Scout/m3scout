-- Structured data fields on targets for future AI cross-referencing
ALTER TABLE targets
  ADD COLUMN IF NOT EXISTS tactical_function    text,
  ADD COLUMN IF NOT EXISTS contract_end_date    date,
  ADD COLUMN IF NOT EXISTS agency_situation     text CHECK (agency_situation IN ('free', 'known_agency', 'unknown')),
  ADD COLUMN IF NOT EXISTS score_physical       smallint CHECK (score_physical BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS score_technical      smallint CHECK (score_technical BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS score_tactical       smallint CHECK (score_tactical BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS score_mental         smallint CHECK (score_mental BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS recommendation_grade text CHECK (recommendation_grade IN ('A', 'B', 'C', 'D'));
