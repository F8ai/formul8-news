#!/usr/bin/env node

import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

console.log('🔧 Deploying Fixed Orchestrator Function');
console.log('=========================================\n');

// Read the function code
const functionCode = readFileSync('supabase/functions/ingest-orchestrator/index.ts', 'utf8');

console.log('📦 Function code loaded');
console.log(`   Size: ${functionCode.length} bytes`);
console.log('');

// The Supabase Management API doesn't support direct function deployment via REST
// Functions must be deployed via CLI or Dashboard

console.log('⚠️  Direct API deployment not supported');
console.log('');
console.log('The fix has been applied to the local file:');
console.log('  supabase/functions/ingest-orchestrator/index.ts');
console.log('');
console.log('Key change: Added "apikey" header to Edge Function calls');
console.log('');
console.log('Before:');
console.log('  headers: {');
console.log('    "Authorization": `Bearer ${serviceRoleKey}`');
console.log('  }');
console.log('');
console.log('After:');
console.log('  headers: {');
console.log('    "Authorization": `Bearer ${serviceRoleKey}`,');
console.log('    "apikey": serviceRoleKey');
console.log('  }');
console.log('');
console.log('To deploy, use one of these methods:');
console.log('');
console.log('1. Supabase Dashboard:');
console.log('   https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/functions');
console.log('');
console.log('2. Supabase CLI (requires login):');
console.log('   supabase login');
console.log('   supabase link --project-ref gptfmaceymhubyuhqegu');
console.log('   supabase functions deploy ingest-orchestrator');
console.log('');
console.log('3. Alternative: Use direct RSS ingestion (bypasses orchestrator)');
console.log('   ./test-direct-rss.sh');
console.log('');

// Show the specific fix
const fixedSection = functionCode.match(/headers: \{[\s\S]*?"apikey": serviceRoleKey,[\s\S]*?\}/);
if (fixedSection) {
  console.log('✅ Fix verified in code:');
  console.log(fixedSection[0]);
} else {
  console.log('❌ Fix not found in code - may need manual verification');
}
