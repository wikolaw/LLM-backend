import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const batchId = '2fc8a1af-93f0-4efd-adeb-d86f1bbe2392';

const { data: runs, error } = await supabase
  .from('runs')
  .select('*')
  .eq('batch_job_id', batchId)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Found', runs.length, 'runs\n');
runs.forEach((run, idx) => {
  console.log(`Run ${idx + 1}:`);
  console.log('  ID:', run.id);
  console.log('  Model:', run.model_name);
  console.log('  Status:', run.status);
  console.log('  Schema Valid:', run.schema_valid);
  console.log('  Error:', run.error_message || 'None');
  if (run.extracted_data) {
    console.log('\n  Extracted Data:', JSON.stringify(run.extracted_data, null, 2));
  }
  if (run.schema_errors && run.schema_errors.length > 0) {
    console.log('\n  Schema Errors:', JSON.stringify(run.schema_errors, null, 2));
  }
  console.log('');
});
