-- Add detailed 3-level validation tracking to runs table
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS json_valid BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attributes_valid BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS formats_valid BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validation_details JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prompt_guidance TEXT[] DEFAULT NULL;

-- Add comments explaining the new fields
COMMENT ON COLUMN runs.json_valid IS 'Level 1: Is the LLM response valid JSON?';
COMMENT ON COLUMN runs.attributes_valid IS 'Level 2: Does JSON contain correct attribute names (schema properties)?';
COMMENT ON COLUMN runs.formats_valid IS 'Level 3: Do attribute values match expected formats/types?';
COMMENT ON COLUMN runs.validation_details IS 'Detailed breakdown: {jsonErrors, missingAttributes, invalidAttributes, formatErrors}';
COMMENT ON COLUMN runs.prompt_guidance IS 'Array of specific suggestions to improve the prompt based on validation failures';

-- Add detailed validation metrics to batch_analytics table
ALTER TABLE batch_analytics
  ADD COLUMN IF NOT EXISTS json_validity_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attribute_validity_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS format_validity_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validation_breakdown JSONB DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN batch_analytics.json_validity_rate IS 'Percentage of runs with valid JSON (0-100)';
COMMENT ON COLUMN batch_analytics.attribute_validity_rate IS 'Percentage of runs with correct attributes (0-100)';
COMMENT ON COLUMN batch_analytics.format_validity_rate IS 'Percentage of runs with correct formats (0-100)';
COMMENT ON COLUMN batch_analytics.validation_breakdown IS 'Detailed stats: {totalRuns, jsonValid, attributesValid, formatsValid, commonGuidance}';

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_runs_validation_levels
  ON runs(json_valid, attributes_valid, formats_valid);
