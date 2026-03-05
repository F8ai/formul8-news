#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔧 Fixing RLS policies to allow public read access...\n');

// Read the migration file
const migrationSQL = await Deno.readTextFile('supabase/migrations/20260305180100_fix_public_read_access.sql');

// Split into individual statements (rough split by semicolons outside of DO blocks)
const statements = migrationSQL
  .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // Split on semicolons not in quotes
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Executing ${statements.length} SQL statements...\n`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  if (!stmt) continue;
  
  console.log(`[${i + 1}/${statements.length}] Executing...`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      console.error(`Statement: ${stmt.substring(0, 100)}...`);
    } else {
      console.log(`✅ Success`);
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
  }
}

console.log('\n✨ RLS policy fix complete!');
console.log('Test the news page: https://f8ai.github.io/formul8-news/');
