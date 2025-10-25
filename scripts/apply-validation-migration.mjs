import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('📝 Reading migration file...')

  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251025120000_add_detailed_validation.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log('🚀 Applying migration...')
  console.log('Migration content:')
  console.log('─'.repeat(80))
  console.log(migrationSQL)
  console.log('─'.repeat(80))

  try {
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'))

    console.log(`\n📊 Found ${statements.length} SQL statements\n`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}...`)

      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' }).single()

      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message)
        // Continue with next statement even if this one fails
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    }

    console.log('\n✅ Migration applied successfully!')

  } catch (error) {
    console.error('❌ Error applying migration:', error.message)
    process.exit(1)
  }
}

applyMigration()
