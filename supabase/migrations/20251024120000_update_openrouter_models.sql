-- Update OpenRouter models with correct identifiers (as of January 2025)
-- This migration replaces outdated model identifiers with currently available models

-- Clear old models
DELETE FROM models;

-- Insert currently available models from OpenRouter
-- Free models (priority for testing)
INSERT INTO models (provider, name, display_name, supports_json_mode, price_in, price_out, context_window) VALUES
('deepseek', 'deepseek-chat-v3.1:free', 'DeepSeek Chat V3.1 (Free)', true, 0, 0, 65536),
('meta-llama', 'llama-3.1-8b-instruct:free', 'Llama 3.1 8B Instruct (Free)', true, 0, 0, 131072),
('meta-llama', 'llama-3-8b-instruct:free', 'Llama 3 8B Instruct (Free)', true, 0, 0, 8192),
('mistralai', 'mistral-7b-instruct:free', 'Mistral 7B Instruct (Free)', true, 0, 0, 32768),
('nvidia', 'nemotron-nano-9b-v2:free', 'NVIDIA Nemotron Nano 9B V2 (Free)', true, 0, 0, 4096),
('openai', 'gpt-oss-20b:free', 'GPT OSS 20B (Free)', true, 0, 0, 8192),
('alibaba', 'tongyi-deepresearch-30b-a3b:free', 'Tongyi DeepResearch 30B A3B (Free)', true, 0, 0, 8192),
('meituan', 'longcat-flash-chat:free', 'LongCat Flash Chat (Free)', true, 0, 0, 4096),
('openrouter', 'andromeda-alpha', 'Andromeda Alpha (Free)', true, 0, 0, 128000);

-- Low-cost models (under $0.001/1M tokens input)
INSERT INTO models (provider, name, display_name, supports_json_mode, price_in, price_out, context_window) VALUES
('liquid', 'lfm2-8b-a1b', 'LiquidAI LFM2 8B A1B', true, 0.00000005, 0.0000001, 32768),
('liquid', 'lfm-2.2-6b', 'LiquidAI LFM2 2.6B', true, 0.00000005, 0.0000001, 32768),
('ibm-granite', 'granite-4.0-h-micro', 'IBM Granite 4.0 Micro', true, 0.000000017, 0.00000011, 131000),
('qwen', 'qwen3-vl-8b-instruct', 'Qwen3 VL 8B Instruct', true, 0.00000008, 0.0000005, 131072),
('baidu', 'ernie-4.5-21b-a3b-thinking', 'Baidu ERNIE 4.5 21B A3B Thinking', true, 0.00000007, 0.00000028, 131072),
('nvidia', 'llama-3.3-nemotron-super-49b-v1.5', 'NVIDIA Llama 3.3 Nemotron Super 49B V1.5', true, 0.0000001, 0.0000004, 131072),
('deepseek', 'deepseek-v3.1-terminus', 'DeepSeek V3.1 Terminus', true, 0.00000023, 0.00000092, 65536),
('google', 'gemini-2.5-flash-preview-09-2025', 'Google Gemini 2.5 Flash Preview', true, 0.0000003, 0.00000125, 1048576),
('google', 'gemini-2.5-flash-lite-preview-09-2025', 'Google Gemini 2.5 Flash Lite Preview', true, 0.0000001, 0.0000004, 1048576),
('qwen', 'qwen3-vl-30b-a3b-instruct', 'Qwen3 VL 30B A3B Instruct', true, 0.0000002, 0.0000007, 131072),
('qwen', 'qwen3-next-80b-a3b-instruct', 'Qwen3 Next 80B A3B Instruct', true, 0.0000001, 0.0000004, 131072),
('qwen', 'qwen-plus-2025-07-28', 'Qwen Plus 0728', true, 0.0000004, 0.0000012, 131072),
('x-ai', 'grok-4-fast', 'xAI Grok 4 Fast', true, 0.0000002, 0.0000008, 131072),
('nousresearch', 'hermes-4-70b', 'Nous Hermes 4 70B', true, 0.00000011, 0.00000044, 131072),
('z-ai', 'glm-4.6', 'Z.AI GLM 4.6', true, 0.0000005, 0.000002, 131072);

-- Premium models (affordable pricing, high quality)
INSERT INTO models (provider, name, display_name, supports_json_mode, price_in, price_out, context_window) VALUES
('anthropic', 'claude-haiku-4.5', 'Anthropic Claude Haiku 4.5', true, 0.000001, 0.000005, 200000),
('anthropic', 'claude-3-5-sonnet-20241022', 'Anthropic Claude 3.5 Sonnet', true, 0.000003, 0.000015, 200000),
('anthropic', 'claude-3-opus-20240229', 'Anthropic Claude 3 Opus', true, 0.000015, 0.000075, 200000),
('openai', 'gpt-5-nano', 'OpenAI GPT-5 Nano', true, 0.00000005, 0.0000002, 400000),
('openai', 'gpt-5-mini', 'OpenAI GPT-5 Mini', true, 0.00000025, 0.000001, 400000),
('openai', 'gpt-5', 'OpenAI GPT-5', true, 0.00000125, 0.000005, 400000),
('openai', 'gpt-4o', 'OpenAI GPT-4o', true, 0.0000025, 0.00001, 128000),
('openai', 'gpt-4o-mini', 'OpenAI GPT-4o Mini', true, 0.00000015, 0.0000006, 128000),
('google', 'gemini-2.0-flash-exp', 'Google Gemini 2.0 Flash Experimental', true, 0, 0, 1048576),
('google', 'gemini-2.5-flash-image', 'Google Gemini 2.5 Flash Image', true, 0.0000003, 0.0000025, 32768),
('mistralai', 'mistral-medium-3.1', 'Mistral Medium 3.1', true, 0.0000004, 0.0000012, 131072);

-- Add some reasoning/thinking models
INSERT INTO models (provider, name, display_name, supports_json_mode, price_in, price_out, context_window) VALUES
('qwen', 'qwen3-vl-8b-thinking', 'Qwen3 VL 8B Thinking', true, 0.00000018, 0.0000021, 256000),
('qwen', 'qwen3-vl-30b-a3b-thinking', 'Qwen3 VL 30B A3B Thinking', true, 0.0000002, 0.000001, 131072),
('qwen', 'qwen3-next-80b-a3b-thinking', 'Qwen3 Next 80B A3B Thinking', true, 0.00000015, 0.0000006, 131072),
('deepcogito', 'cogito-v2-preview-llama-70b', 'Deep Cogito Cogito V2 Preview Llama 70B', true, 0.00000088, 0.00000352, 32768),
('inclusionai', 'ling-1t', 'inclusionAI Ling-1T', true, 0.0000004, 0.000002, 131072);
