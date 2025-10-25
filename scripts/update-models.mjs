#!/usr/bin/env node

/**
 * Update models in Supabase to quality-focused set
 * Run with: node scripts/update-models.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
const envPath = join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseServiceKey

try {
  const envFile = readFileSync(envPath, 'utf-8')
  const envVars = Object.fromEntries(
    envFile.split('\n')
      .filter(line => line.includes('='))
      .map(line => {
        const [key, ...values] = line.split('=')
        return [key.trim(), values.join('=').trim()]
      })
  )
  supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
  supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY
} catch (error) {
  console.error('❌ Could not load .env.local file')
  process.exit(1)
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Quality-focused model definitions (verified working models from OpenRouter)
const models = [
  // TIER 1: Premium Quality Models
  { provider: 'openai', name: 'gpt-5-pro-2025-10-06', display_name: 'OpenAI GPT-5 Pro', supports_json_mode: true, price_in: 0.000015, price_out: 0.00012, context_window: 400000, enabled: true },
  { provider: 'anthropic', name: 'claude-4.5-sonnet-20250929', display_name: 'Anthropic Claude Sonnet 4.5', supports_json_mode: true, price_in: 0.000003, price_out: 0.000015, context_window: 1000000, enabled: true },
  { provider: 'anthropic', name: 'claude-3-5-sonnet-20241022', display_name: 'Anthropic Claude 3.5 Sonnet', supports_json_mode: true, price_in: 0.000003, price_out: 0.000015, context_window: 200000, enabled: true },
  { provider: 'openai', name: 'gpt-5-codex', display_name: 'OpenAI GPT-5 Codex', supports_json_mode: true, price_in: 0.00000125, price_out: 0.00001, context_window: 400000, enabled: true },
  { provider: 'qwen', name: 'qwen3-max', display_name: 'Qwen3 Max', supports_json_mode: true, price_in: 0.0000012, price_out: 0.000006, context_window: 256000, enabled: true },

  // TIER 2: High Quality Mid-Range Models
  { provider: 'google', name: 'gemini-2.5-flash-preview-09-2025', display_name: 'Google Gemini 2.5 Flash Preview', supports_json_mode: true, price_in: 0.0000003, price_out: 0.0000025, context_window: 1048576, enabled: true },
  { provider: 'anthropic', name: 'claude-haiku-4.5', display_name: 'Anthropic Claude Haiku 4.5', supports_json_mode: true, price_in: 0.000001, price_out: 0.000005, context_window: 200000, enabled: true },
  { provider: 'openai', name: 'gpt-4o-2024-11-20', display_name: 'OpenAI GPT-4o', supports_json_mode: true, price_in: 0.0000025, price_out: 0.00001, context_window: 128000, enabled: true },
  { provider: 'openai', name: 'gpt-4o-mini-2024-07-18', display_name: 'OpenAI GPT-4o Mini', supports_json_mode: true, price_in: 0.00000015, price_out: 0.0000006, context_window: 128000, enabled: true },
  { provider: 'deepseek', name: 'deepseek-v3.1-terminus', display_name: 'DeepSeek V3.1 Terminus', supports_json_mode: true, price_in: 0.00000023, price_out: 0.0000009, context_window: 163840, enabled: true },
  { provider: 'x-ai', name: 'grok-2-1212', display_name: 'xAI Grok 2', supports_json_mode: true, price_in: 0.000002, price_out: 0.00001, context_window: 131072, enabled: true },

  // TIER 3: Solid Performance Budget Models
  { provider: 'nvidia', name: 'llama-3.3-nemotron-super-49b-v1.5', display_name: 'NVIDIA Llama 3.3 Nemotron Super 49B', supports_json_mode: true, price_in: 0.0000001, price_out: 0.0000004, context_window: 131072, enabled: true },
  { provider: 'qwen', name: 'qwen3-next-80b-a3b-instruct', display_name: 'Qwen3 Next 80B Instruct', supports_json_mode: true, price_in: 0.0000001, price_out: 0.0000004, context_window: 131072, enabled: true },
  { provider: 'mistralai', name: 'mistral-large-2411', display_name: 'Mistral Large', supports_json_mode: true, price_in: 0.000002, price_out: 0.000006, context_window: 131072, enabled: true },
  { provider: 'nousresearch', name: 'hermes-4-70b', display_name: 'Nous Hermes 4 70B', supports_json_mode: true, price_in: 0.00000011, price_out: 0.00000044, context_window: 131072, enabled: true },
  { provider: 'meta-llama', name: 'llama-3.3-70b-instruct', display_name: 'Meta Llama 3.3 70B Instruct', supports_json_mode: true, price_in: 0.00000035, price_out: 0.0000004, context_window: 131072, enabled: true },

  // TIER 4: Specialized/Thinking Models
  { provider: 'deepseek', name: 'deepseek-r1', display_name: 'DeepSeek R1 (Reasoning)', supports_json_mode: true, price_in: 0.00000055, price_out: 0.0000022, context_window: 65536, enabled: true },
  { provider: 'openai', name: 'o3-mini', display_name: 'OpenAI o3 Mini (Reasoning)', supports_json_mode: true, price_in: 0.000001, price_out: 0.000004, context_window: 200000, enabled: true },
  { provider: 'qwen', name: 'qwq-32b-preview', display_name: 'Qwen QwQ 32B (Reasoning)', supports_json_mode: true, price_in: 0.0000001, price_out: 0.0000004, context_window: 32768, enabled: true },
  { provider: 'deepseek', name: 'deepseek-chat', display_name: 'DeepSeek Chat V3', supports_json_mode: true, price_in: 0.00000014, price_out: 0.00000028, context_window: 65536, enabled: true },

  // TIER 5: Free Models (Disabled by default - for testing only)
  { provider: 'meta-llama', name: 'llama-3.1-8b-instruct:free', display_name: 'Llama 3.1 8B Instruct (Free)', supports_json_mode: true, price_in: 0, price_out: 0, context_window: 131072, enabled: false },
  { provider: 'mistralai', name: 'mistral-7b-instruct:free', display_name: 'Mistral 7B Instruct (Free)', supports_json_mode: true, price_in: 0, price_out: 0, context_window: 32768, enabled: false },
  { provider: 'deepseek', name: 'deepseek-chat:free', display_name: 'DeepSeek Chat (Free)', supports_json_mode: true, price_in: 0, price_out: 0, context_window: 65536, enabled: false },
]

async function updateModels() {
  console.log('🔄 Updating models in Supabase...\n')

  // Delete all existing models
  console.log('📦 Clearing existing models...')
  const { error: deleteError } = await supabase
    .from('models')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (deleteError) {
    console.error('❌ Error deleting old models:', deleteError)
    process.exit(1)
  }
  console.log('✓ Old models cleared\n')

  // Insert new models
  console.log(`📥 Inserting ${models.length} quality models...`)
  const { data, error: insertError } = await supabase
    .from('models')
    .insert(models)
    .select()

  if (insertError) {
    console.error('❌ Error inserting models:', insertError)
    process.exit(1)
  }

  console.log(`✓ Successfully inserted ${data.length} models\n`)

  // Display summary by tier
  const tiers = {
    'Premium (Tier 1)': models.slice(0, 5).filter(m => m.enabled),
    'High Quality (Tier 2)': models.slice(5, 11).filter(m => m.enabled),
    'Budget (Tier 3)': models.slice(11, 16).filter(m => m.enabled),
    'Specialized (Tier 4)': models.slice(16, 20).filter(m => m.enabled),
    'Free (Tier 5 - Disabled)': models.slice(20).filter(m => !m.enabled),
  }

  console.log('📊 Model Summary:')
  for (const [tier, tierModels] of Object.entries(tiers)) {
    console.log(`\n${tier}: ${tierModels.length} models`)
    tierModels.forEach(m => {
      const cost = m.price_in > 0
        ? `$${(m.price_in * 1000000).toFixed(2)}/1M`
        : 'FREE'
      console.log(`  • ${m.display_name} (${cost})`)
    })
  }

  console.log('\n✅ Models updated successfully!')
  console.log('\n💡 Recommendations:')
  console.log('  • For best quality: Use GPT-5 Pro or Claude Sonnet 4.5')
  console.log('  • For balanced performance: Use Gemini 2.5 Flash or GPT-4o')
  console.log('  • For reasoning tasks: Use DeepSeek R1 or OpenAI o3 Mini')
}

updateModels().catch(console.error)
