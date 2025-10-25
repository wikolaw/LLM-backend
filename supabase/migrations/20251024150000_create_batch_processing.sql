-- Migration: Add Batch Processing Support
-- Version: 3.0
-- Date: 2025-10-24
-- Description: Enable multi-document batch processing with comprehensive analytics

-- ============================================================================
-- 1. CREATE BATCH_JOBS TABLE
-- ============================================================================
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  output_format TEXT CHECK (output_format IN ('json', 'jsonl')) NOT NULL,
  validation_schema JSONB NOT NULL,
  models_used TEXT[] NOT NULL,
  total_documents INT NOT NULL CHECK (total_documents > 0),
  completed_documents INT DEFAULT 0 CHECK (completed_documents >= 0),
  successful_runs INT DEFAULT 0 CHECK (successful_runs >= 0),
  failed_runs INT DEFAULT 0 CHECK (failed_runs >= 0),
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  current_document TEXT, -- filename currently being processed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for batch_jobs
CREATE INDEX idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_created_at ON batch_jobs(created_at DESC);

-- Add RLS policies for batch_jobs
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batch jobs"
  ON batch_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own batch jobs"
  ON batch_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batch jobs"
  ON batch_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE batch_jobs IS 'Batch processing jobs for multiple documents';
COMMENT ON COLUMN batch_jobs.name IS 'User-provided name for the batch job';
COMMENT ON COLUMN batch_jobs.total_documents IS 'Total number of documents in this batch';
COMMENT ON COLUMN batch_jobs.completed_documents IS 'Number of documents processed so far';
COMMENT ON COLUMN batch_jobs.successful_runs IS 'Number of successful model runs across all documents';
COMMENT ON COLUMN batch_jobs.failed_runs IS 'Number of failed model runs across all documents';
COMMENT ON COLUMN batch_jobs.current_document IS 'Filename of document currently being processed (for progress display)';

-- ============================================================================
-- 2. UPDATE RUNS TABLE
-- ============================================================================
-- Add batch_job_id to link runs to batches
ALTER TABLE runs
ADD COLUMN batch_job_id UUID REFERENCES batch_jobs(id) ON DELETE CASCADE;

-- Add index for batch filtering
CREATE INDEX idx_runs_batch_job ON runs(batch_job_id);

-- Add comment
COMMENT ON COLUMN runs.batch_job_id IS 'Links this run to a batch job (null for standalone single-doc runs in v1.0/v2.0)';

-- ============================================================================
-- 3. CREATE BATCH_ANALYTICS TABLE
-- ============================================================================
CREATE TABLE batch_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_job_id UUID REFERENCES batch_jobs(id) ON DELETE CASCADE NOT NULL,

  -- Per-model analytics
  model TEXT NOT NULL,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  avg_execution_time_ms INT,
  total_cost DECIMAL(10, 6) DEFAULT 0,

  -- Attribute-level failure tracking
  attribute_failures JSONB DEFAULT '{}',
  -- Structure: {
  --   "contract_name": { "missing": 5, "type_mismatch": 2, "format_violation": 0 },
  --   "parties/supplier_name": { "missing": 8, "type_mismatch": 0, "format_violation": 0 }
  -- }

  -- Common errors across documents
  common_errors JSONB DEFAULT '[]',
  -- Structure: [
  --   { "error": "Required property missing", "count": 10, "documents": ["doc1.pdf", "doc2.pdf"] }
  -- ]

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure one analytics row per model per batch
  UNIQUE(batch_job_id, model)
);

-- Add indexes for batch_analytics
CREATE INDEX idx_batch_analytics_batch_job ON batch_analytics(batch_job_id);
CREATE INDEX idx_batch_analytics_model ON batch_analytics(model);

-- Add RLS policies for batch_analytics
ALTER TABLE batch_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for their batch jobs"
  ON batch_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM batch_jobs
      WHERE batch_jobs.id = batch_analytics.batch_job_id
      AND batch_jobs.user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE batch_analytics IS 'Pre-computed analytics for batch processing results';
COMMENT ON COLUMN batch_analytics.attribute_failures IS 'JSON object tracking failures per schema attribute path';
COMMENT ON COLUMN batch_analytics.common_errors IS 'Array of common error messages with occurrence counts';

-- ============================================================================
-- 4. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to update batch job progress
CREATE OR REPLACE FUNCTION update_batch_job_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completed_documents count when a run completes
  UPDATE batch_jobs
  SET
    completed_documents = (
      SELECT COUNT(DISTINCT document_id)
      FROM runs
      WHERE batch_job_id = NEW.batch_job_id
    ),
    updated_at = now()
  WHERE id = NEW.batch_job_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update progress when runs are inserted
CREATE TRIGGER trigger_update_batch_progress
  AFTER INSERT ON runs
  FOR EACH ROW
  WHEN (NEW.batch_job_id IS NOT NULL)
  EXECUTE FUNCTION update_batch_job_progress();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER trigger_batch_jobs_updated_at
  BEFORE UPDATE ON batch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_batch_analytics_updated_at
  BEFORE UPDATE ON batch_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ADD SAMPLE DATA COMMENT
-- ============================================================================

COMMENT ON DATABASE postgres IS 'LLM Document Analysis - v3.0 with Batch Processing';
