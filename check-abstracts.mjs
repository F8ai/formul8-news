#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('📄 Checking Abstract Storage\n');

// Get a sample paper with abstract
const { data: papers, error } = await supabase
  .from('signal_items')
  .select(`
    id,
    title,
    content_snippet,
    paper_items (
      abstract,
      doi,
      journal
    )
  `)
  .eq('type', 'paper')
  .order('created_at', { ascending: false })
  .limit(3);

if (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

if (!papers || papers.length === 0) {
  console.log('⚠️  No papers found yet');
  process.exit(0);
}

console.log(`Found ${papers.length} recent papers:\n`);

papers.forEach((paper, i) => {
  console.log(`${i + 1}. ${paper.title}`);
  console.log(`   DOI: ${paper.paper_items[0]?.doi || 'N/A'}`);
  console.log(`   Journal: ${paper.paper_items[0]?.journal || 'Unknown'}\n`);
  
  const abstract = paper.paper_items[0]?.abstract;
  if (abstract) {
    console.log(`   ✅ Abstract stored (${abstract.length} chars)`);
    console.log(`   Preview: ${abstract.substring(0, 200)}...\n`);
  } else {
    console.log(`   ⚠️  No abstract available\n`);
  }
  
  const snippet = paper.content_snippet;
  if (snippet) {
    console.log(`   ✅ Content snippet stored (${snippet.length} chars)`);
    console.log(`   Preview: ${snippet.substring(0, 150)}...\n`);
  }
  
  console.log('---\n');
});

// Get statistics
const { count: totalPapers } = await supabase
  .from('signal_items')
  .select('*', { count: 'exact', head: true })
  .eq('type', 'paper');

const { count: papersWithAbstracts } = await supabase
  .from('paper_items')
  .select('*', { count: 'exact', head: true })
  .not('abstract', 'is', null);

console.log('📊 Statistics:');
console.log(`   Total papers: ${totalPapers}`);
console.log(`   Papers with abstracts: ${papersWithAbstracts}`);
console.log(`   Coverage: ${totalPapers > 0 ? Math.round((papersWithAbstracts / totalPapers) * 100) : 0}%`);
