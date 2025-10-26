-- Rollback migration: Remove provider prefixes from model names
--
-- This migration fixes the model name prefix duplication issue where
-- model names were stored with provider prefix (e.g., 'openai/gpt-5-pro')
-- but code already constructs identifiers as ${provider}/${name}, causing
-- duplication like 'openai/openai/gpt-5-pro'
--
-- After this migration:
-- - Database stores: name='gpt-5-pro', provider='openai'
-- - Code constructs: openai/gpt-5-pro (correct format for OpenRouter API)

-- Remove provider prefix from all model names
-- Uses REPLACE to remove the prefix pattern: 'provider/'
-- Only updates rows where the name starts with the provider prefix
UPDATE models
SET name = REPLACE(name, provider || '/', '')
WHERE name LIKE provider || '/%';

-- Verify the fix worked by checking a few examples
-- (This is just for documentation - actual verification happens in tests)
-- Expected results after migration:
--   openai/gpt-5-pro -> gpt-5-pro
--   anthropic/claude-3-5-sonnet-20241022 -> claude-3-5-sonnet-20241022
--   google/gemini-2.5-flash-preview-09-2025 -> gemini-2.5-flash-preview-09-2025
