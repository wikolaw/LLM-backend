import pg from 'pg'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg

// Load environment variables
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get database connection string from Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Extract project ref from Supabase URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('❌ Could not extract project ref from SUPABASE_URL')
  process.exit(1)
}

// Note: For direct database access, you'd need the database password
// For this script, we'll output the SQL for manual execution
async function showMigration() {
  console.log('🚀 3-Level Validation Migration\n')
  console.log('─'.repeat(80))

  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251025120000_add_detailed_validation.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log(migrationSQL)
  console.log('─'.repeat(80))
  console.log('\n📝 To apply this migration:')
  console.log('   1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/' + projectRef)
  console.log('   2. Navigate to SQL Editor')
  console.log('   3. Create a new query and paste the SQL above')
  console.log('   4. Run the query')
  console.log('\n✅ Migration uses IF NOT EXISTS, so it\'s safe to run multiple times')
}

showMigration()
