import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load from .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const accessToken = envContent.match(/SUPABASE_ACCESS_TOKEN=(.*)/)?.[1]?.trim();
const projectRef = 'ughfpgtntupnedjotmrr';

if (!accessToken) {
  console.error('❌ Could not find SUPABASE_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

console.log('📖 Reading migration file...');
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251024150000_create_batch_processing.sql');
const sql = readFileSync(migrationPath, 'utf-8');

console.log('🔗 Connecting to Supabase Management API...');
console.log(`📍 Project: ${projectRef}\n`);

console.log('⚙️  Executing migration SQL...\n');

try {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: sql
    })
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ Migration failed:', result);
    console.log('\n💡 Manual alternative:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/sql/new');
    console.log('   2. Copy contents of: supabase/migrations/20251024150000_create_batch_processing.sql');
    console.log('   3. Paste and click "Run"');
    process.exit(1);
  }

  console.log('✅ Migration executed successfully!\n');
  console.log('📊 Created/updated:');
  console.log('   • batch_jobs table');
  console.log('   • batch_analytics table');
  console.log('   • runs.batch_job_id column');
  console.log('   • Helper functions and triggers');
  console.log('\n🎉 You can now process batches of documents!');
  console.log('\n📝 Result:', JSON.stringify(result, null, 2));

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.log('\n💡 Manual alternative:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/sql/new');
  console.log('   2. Copy contents of: supabase/migrations/20251024150000_create_batch_processing.sql');
  console.log('   3. Paste and click "Run"');
  process.exit(1);
}
