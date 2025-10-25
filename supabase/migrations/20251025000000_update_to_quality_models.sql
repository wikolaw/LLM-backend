-- Update OpenRouter models to focus on quality over cost (January 2025)
-- Verified working models from OpenRouter API
-- Priority: Quality within each bucket size

-- Clear old models
DELETE FROM models;

-- TIER 1: Premium Quality Models (Best Performance)
-- These are the highest quality models available
INSERT INTO models (provider, name, display_name, supports_json_mode, price_in, price_out, context_window) VALUES
('openai', 'gpt-5-pro-2025-10-06', 'OpenAI GPT-5 Pro', true, 0.000015, 0.00012, 400000),
('anthropic', 'claude-4.5-sonnet-20250929', 'Anthropic Claude Sonnet 4.5', true, 0.000003, 0.000015, 1000000),
('anthropic', 'claude-3-5-sonnet-20241022', 'Anthropic Claude 3.5 Sonnet', true, 0.000003, 0.000015, 200000),
('openai', 'gpt-5-codex', 'OpenAI GPT-5 Codex', true, 0.00000125, 0.00001, 400000),
('qwen', 'qwen3-max', 'Qwen3 Max', true, 0.0000012, 0.000006, 256000);

-- TIER 2: High Quality Mid-Range Models (Excellent Performance/Cost Ratio)
INSERT INTO models (provider, name, display_name, supports_json_mode, price_in, price_out, context_window) VALUES
('google', 'gemini-2.5-flash-preview-09-2025', 'Google Gemini 2.5 Flash Preview', true, 0.0000003, 0.0000025, 1048576),
('anthropic', 'claude-haiku-4.5', 'Anthropic Claude Haiku 4.5', true, 0.000001, 0.000005, 200000),
('openai', 'gpt-4o-2024-11-20', 'OpenAI GPT-4o', true, 0.0000025, 0.00001, 128000),
('openai', 'gpt-4o-mini-2024-07-18', 'OpenAI GPT-4o Mini', true, 0.00000015, 0.0000006, 128000),
('deepseek', 'deepseek-v3.1-terminus', 'DeepSeek V3.1 Terminus', true, 0.00000023, 0.0000009, 163840),
('x-ai', 'grok-2-1212', 'xAI Grok 2', true, 0.000002, 0.00001, 131072);

-- TIER 3: Solid Performance Budget Models
INSERT INTO models (provider, name, display_name, supports_json_mode, price_in, price_out, context_window) VALUES
('nvidia', 'llama-3.3-nemotron-super-49b-v1.5', 'NVIDIA Llama 3.3 Nemotron Super 49B', true, 0.0000001, 0.0000004, 131072),
('qwen', 'qwen3-next-80b-a3b-instruct', 'Qwen3 Next 80B Instruct', true, 0.0000001, 0.0000004, 131072),
('mistralai', 'mistral-large-2411', 'Mistral Large', true, 0.000002, 0.000006, 131072),
('nousresearch', 'hermes-4-70b', 'Nous Hermes 4 70B', true, 0.00000011, 0.00000044, 131072),
('meta-llama', 'llama-3.3-70b-instruct', 'Meta Llama 3.3 70B Instruct', true, 0.00000035, 0.0000004, 131072);

-- TIER 4: Specialized/Thinking Models (Advanced Reasoning)
INSERT INTO models (provider, name, display_name, supports_json_mode, price_in, price_out, context_window) VALUES
('deepseek', 'deepseek-r1', 'DeepSeek R1 (Reasoning)', true, 0.00000055, 0.0000022, 65536),
('openai', 'o3-mini', 'OpenAI o3 Mini (Reasoning)', true, 0.000001, 0.000004, 200000),
('qwen', 'qwq-32b-preview', 'Qwen QwQ 32B (Reasoning)', true, 0.0000001, 0.0000004, 32768),
('deepseek', 'deepseek-chat', 'DeepSeek Chat V3', true, 0.00000014, 0.00000028, 65536);

-- TIER 5: Free Models (Testing Only - Lower Priority)
-- Only include free models that actually work
INSERT INTO models (provider, name, display_name, supports_json_mode, price_in, price_out, context_window, enabled) VALUES
('meta-llama', 'llama-3.1-8b-instruct:free', 'Llama 3.1 8B Instruct (Free)', true, 0, 0, 131072, false),
('mistralai', 'mistral-7b-instruct:free', 'Mistral 7B Instruct (Free)', true, 0, 0, 32768, false),
('deepseek', 'deepseek-chat:free', 'DeepSeek Chat (Free)', true, 0, 0, 65536, false);

-- Note: Free models are disabled by default (enabled=false)
-- Enable them only for testing purposes in development

