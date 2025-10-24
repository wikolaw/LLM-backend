-- Migration: Remove Quality Scoring, Add JSON Schema Validation
-- Version: 2.0
-- Date: 2025-10-24

-- Remove quality scoring columns (v1.0)
ALTER TABLE outputs
DROP COLUMN IF EXISTS quality_syntax,
DROP COLUMN IF EXISTS quality_structural,
DROP COLUMN IF EXISTS quality_completeness,
DROP COLUMN IF EXISTS quality_content,
DROP COLUMN IF EXISTS quality_consensus,
DROP COLUMN IF EXISTS quality_overall,
DROP COLUMN IF EXISTS quality_flags,
DROP COLUMN IF EXISTS quality_metrics;

-- Add JSON schema validation columns (v2.0)
ALTER TABLE outputs
ADD COLUMN output_format TEXT CHECK (output_format IN ('json', 'jsonl')),
ADD COLUMN validation_schema JSONB,
ADD COLUMN validation_passed BOOLEAN,
ADD COLUMN validation_errors JSONB;

-- Add index for filtering by validation status
CREATE INDEX idx_outputs_validation_passed ON outputs(validation_passed);

-- Add comment to document the change
COMMENT ON COLUMN outputs.output_format IS 'Output format: json (single object) or jsonl (JSON Lines)';
COMMENT ON COLUMN outputs.validation_schema IS 'JSON Schema used to validate the LLM output';
COMMENT ON COLUMN outputs.validation_passed IS 'Whether the output passed JSON schema validation';
COMMENT ON COLUMN outputs.validation_errors IS 'Validation errors if validation_passed is false';
