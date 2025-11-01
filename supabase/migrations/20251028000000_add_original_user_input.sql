-- Add original_user_input column to batch_jobs table
-- This stores the short user description (e.g., "Extract contract name, parties, dates")
-- Separate from user_prompt which stores the AI-optimized 400-800 word prompt

ALTER TABLE batch_jobs
ADD COLUMN original_user_input TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN batch_jobs.original_user_input IS 'Original short user description before AI optimization. Used for cloning batches.';
