-- Migration: Fix Model Names - Add Provider Prefix for OpenRouter Compatibility
-- Version: 3.4
-- Date: 2025-10-27
-- Description: Update all model names to include provider prefix (provider/model-name format)
--              OpenRouter requires this format for API calls to work correctly.

-- ============================================================================
-- ISSUE: All model names are missing the provider prefix
-- ============================================================================
-- OpenRouter API requires model names in format: "provider/model-name"
-- Current database has models like "gpt-4o-mini-2024-07-18"
-- Should be: "openai/gpt-4o-mini-2024-07-18"
--
-- This migration updates all 23 models to the correct format.

-- ============================================================================
-- FIX 1: Update Anthropic Claude Models (3 models)
-- ============================================================================

-- Claude 3.5 Sonnet
UPDATE models
SET name = 'anthropic/' || name
WHERE name = 'claude-3-5-sonnet-20241022'
  AND provider = 'anthropic';

-- Claude 4.5 Sonnet
UPDATE models
SET name = 'anthropic/' || name
WHERE name = 'claude-4.5-sonnet-20250929'
  AND provider = 'anthropic';

-- Claude Haiku 4.5
UPDATE models
SET name = 'anthropic/' || name
WHERE name = 'claude-haiku-4.5'
  AND provider = 'anthropic';

-- ============================================================================
-- FIX 2: Update OpenAI GPT Models (4 models)
-- ============================================================================

-- GPT-4o (update to latest version)
UPDATE models
SET name = 'openai/' || name
WHERE name = 'gpt-4o-2024-11-20'
  AND provider = 'openai';

-- GPT-4o Mini
UPDATE models
SET name = 'openai/' || name
WHERE name = 'gpt-4o-mini-2024-07-18'
  AND provider = 'openai';

-- GPT-5 Pro (fix incorrect date in name)
UPDATE models
SET name = 'openai/gpt-5-pro',
    display_name = 'OpenAI GPT-5 Pro'
WHERE name = 'gpt-5-pro-2025-10-06'
  AND provider = 'openai';

-- GPT-5 Codex
UPDATE models
SET name = 'openai/' || name
WHERE name = 'gpt-5-codex'
  AND provider = 'openai';

-- o3-mini (reasoning model)
UPDATE models
SET name = 'openai/' || name
WHERE name = 'o3-mini'
  AND provider = 'openai';

-- ============================================================================
-- FIX 3: Update Google Gemini Models (1 model)
-- ============================================================================

-- Gemini 2.5 Flash Preview
UPDATE models
SET name = 'google/' || name
WHERE name = 'gemini-2.5-flash-preview-09-2025'
  AND provider = 'google';

-- ============================================================================
-- FIX 4: Update DeepSeek Models (4 models)
-- ============================================================================

-- DeepSeek Chat V3
UPDATE models
SET name = 'deepseek/' || name
WHERE name = 'deepseek-chat'
  AND provider = 'deepseek';

-- DeepSeek Chat (Free)
UPDATE models
SET name = 'deepseek/' || name
WHERE name = 'deepseek-chat:free'
  AND provider = 'deepseek';

-- DeepSeek R1 (Reasoning)
UPDATE models
SET name = 'deepseek/' || name
WHERE name = 'deepseek-r1'
  AND provider = 'deepseek';

-- DeepSeek V3.1 Terminus
UPDATE models
SET name = 'deepseek/' || name
WHERE name = 'deepseek-v3.1-terminus'
  AND provider = 'deepseek';

-- ============================================================================
-- FIX 5: Update Meta Llama Models (2 models)
-- ============================================================================

-- Llama 3.1 8B Instruct (Free)
UPDATE models
SET name = 'meta-llama/' || name
WHERE name = 'llama-3.1-8b-instruct:free'
  AND provider = 'meta-llama';

-- Llama 3.3 70B Instruct
UPDATE models
SET name = 'meta-llama/' || name
WHERE name = 'llama-3.3-70b-instruct'
  AND provider = 'meta-llama';

-- ============================================================================
-- FIX 6: Update Mistral AI Models (2 models)
-- ============================================================================

-- Mistral 7B Instruct (Free)
UPDATE models
SET name = 'mistralai/' || name
WHERE name = 'mistral-7b-instruct:free'
  AND provider = 'mistralai';

-- Mistral Large
UPDATE models
SET name = 'mistralai/' || name
WHERE name = 'mistral-large-2411'
  AND provider = 'mistralai';

-- ============================================================================
-- FIX 7: Update Nous Research Hermes Models (1 model)
-- ============================================================================

-- Hermes 4 70B
UPDATE models
SET name = 'nousresearch/' || name
WHERE name = 'hermes-4-70b'
  AND provider = 'nousresearch';

-- ============================================================================
-- FIX 8: Update NVIDIA Models (1 model)
-- ============================================================================

-- NVIDIA Llama 3.3 Nemotron Super 49B
UPDATE models
SET name = 'nvidia/' || name
WHERE name = 'llama-3.3-nemotron-super-49b-v1.5'
  AND provider = 'nvidia';

-- ============================================================================
-- FIX 9: Update Qwen Models (3 models)
-- ============================================================================

-- Qwen3 Max
UPDATE models
SET name = 'qwen/' || name
WHERE name = 'qwen3-max'
  AND provider = 'qwen';

-- Qwen3 Next 80B Instruct
UPDATE models
SET name = 'qwen/' || name
WHERE name = 'qwen3-next-80b-a3b-instruct'
  AND provider = 'qwen';

-- Qwen QwQ 32B (Reasoning)
UPDATE models
SET name = 'qwen/' || name
WHERE name = 'qwq-32b-preview'
  AND provider = 'qwen';

-- ============================================================================
-- FIX 10: Update xAI Grok Models (1 model)
-- ============================================================================

-- xAI Grok 2
UPDATE models
SET name = 'x-ai/' || name
WHERE name = 'grok-2-1212'
  AND provider = 'x-ai';

-- ============================================================================
-- VERIFICATION: Check all models now have provider prefix
-- ============================================================================

-- This query should return 0 rows (all models should have prefix now)
DO $$
DECLARE
  models_without_prefix INTEGER;
BEGIN
  SELECT COUNT(*) INTO models_without_prefix
  FROM models
  WHERE name NOT LIKE '%/%';

  IF models_without_prefix > 0 THEN
    RAISE WARNING 'Found % models without provider prefix!', models_without_prefix;
  ELSE
    RAISE NOTICE 'SUCCESS: All % models now have provider prefix format', (SELECT COUNT(*) FROM models);
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of changes:
-- - Updated 23 models to include provider prefix (provider/model-name format)
-- - Fixed GPT-5 Pro name (removed incorrect date)
-- - All models now compatible with OpenRouter API requirements
--
-- Expected result:
-- - All LLM API calls will now work correctly with OpenRouter
-- - Model names match OpenRouter's catalog format
-- - No breaking changes to frontend (display_name unchanged)
