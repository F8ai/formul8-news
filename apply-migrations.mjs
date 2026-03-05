#!/usr/bin/env node

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🚀 Applying New Source Migrations');
console.log('==================================\n');

// Read migration files
const migration1 = readFileSync('supabase/migrations/20260305180300_add_comprehensive_sources.sql', 'utf8');
const migration2 = readFileSync('supabase/migrations/20260305180301_update_pubmed_2026.sql', 'utf8');

// Split into individual statements (simple split on semicolon followed by newline)
const statements1 = migration1.split(';\n').filter(s => s.trim() && !s.trim().startsWith('--'));
const statements2 = migration2.split(';\n').filter(s => s.trim() && !s.trim().startsWith('--'));

console.log('📦 Migration 1: Adding 60 new sources...');
console.log(`   Found ${statements1.length} SQL statements\n`);

for (let i = 0; i < statements1.length; i++) {
  const stmt = statements1[i].trim();
  if (!stmt) continue;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: stmt });
    if (error) {
      console.error(`❌ Error in statement ${i + 1}:`, error.message);
    } else {
      console.log(`✅ Statement ${i + 1} executed`);
    }
  } catch (err) {
    console.error(`❌ Exception in statement ${i + 1}:`, err.message);
  }
}

console.log('\n📦 Migration 2: Updating PubMed for 2026...');
console.log(`   Found ${statements2.length} SQL statements\n`);

for (let i = 0; i < statements2.length; i++) {
  const stmt = statements2[i].trim();
  if (!stmt) continue;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: stmt });
    if (error) {
      console.error(`❌ Error in statement ${i + 1}:`, error.message);
    } else {
      console.log(`✅ Statement ${i + 1} executed`);
    }
  } catch (err) {
    console.error(`❌ Exception in statement ${i + 1}:`, err.message);
  }
}

console.log('\n==================================');
console.log('📊 Source Statistics');
console.log('==================================\n');

// Get counts
const { count: sourceCount } = await supabase
  .from('sources')
  .select('*', { count: 'exact', head: true });

const { count: endpointCount } = await supabase
  .from('source_endpoints')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true);

console.log(`Total sources: ${sourceCount}`);
console.log(`Active endpoints: ${endpointCount}`);

console.log('\n✨ Migrations complete!\n');
