-- Add null counting fields to track null values in LLM outputs

-- Add null_count column to outputs table
ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS null_count INT DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN outputs.null_count IS 'Total number of fields with null values in the JSON output';

-- Add avg_null_count column to batch_analytics table
ALTER TABLE batch_analytics
  ADD COLUMN IF NOT EXISTS avg_null_count NUMERIC(10,2);

-- Add comment explaining the column
COMMENT ON COLUMN batch_analytics.avg_null_count IS 'Average number of null values per document for this model';
