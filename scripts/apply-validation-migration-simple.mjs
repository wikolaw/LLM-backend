import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🚀 Applying 3-level validation migration...\n')

  // Since ALTER TABLE statements use IF NOT EXISTS, they're idempotent
  const sql = `
-- Add detailed 3-level validation tracking to outputs table
ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS json_valid BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attributes_valid BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS formats_valid BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validation_details JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prompt_guidance TEXT[] DEFAULT NULL;

-- Add detailed validation metrics to batch_analytics table
ALTER TABLE batch_analytics
  ADD COLUMN IF NOT EXISTS json_validity_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attribute_validity_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS format_validity_rate NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validation_breakdown JSONB DEFAULT NULL;
  `

  try {
    // Execute using Supabase SQL editor API
    const { data, error } = await supabase
      .from('_migrations')
      .select('*')
      .limit(1)

    if (error && error.code === 'PGRST204') {
      console.log('Note: _migrations table not found (expected)')
    }

    // We can't execute raw SQL directly via SDK, need to use psql or Management API
    console.log('📝 Migration SQL:\n')
    console.log('─'.repeat(80))
    console.log(sql)
    console.log('─'.repeat(80))
    console.log('\n⚠️  Note: Please run this SQL directly in Supabase Dashboard > SQL Editor')
    console.log('Or use: npx supabase db execute -f supabase/migrations/20251025120000_add_detailed_validation.sql')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

applyMigration()
