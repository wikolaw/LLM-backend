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

console.log('🔍 Checking latest batch job status...\n');

try {
  const sql = `
    SELECT
      id,
      name,
      status,
      total_documents,
      completed_documents,
      successful_runs,
      failed_runs,
      created_at
    FROM batch_jobs
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ Query failed:', result);
    process.exit(1);
  }

  if (result.length > 0 && result[0].rows && result[0].rows.length > 0) {
    const batch = result[0].rows[0];
    console.log('Latest Batch Job:');
    console.log('  ID:', batch.id);
    console.log('  Name:', batch.name);
    console.log('  Status:', batch.status);
    console.log('  Documents:', `${batch.completed_documents}/${batch.total_documents}`);
    console.log('  Runs:', `${batch.successful_runs} successful, ${batch.failed_runs} failed`);
    console.log('  Created:', batch.created_at);
  } else {
    console.log('No batch jobs found');
  }

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
