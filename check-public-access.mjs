#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzA1NzUsImV4cCI6MjA4ODMwNjU3NX0.BkohmTjlu9q0-Stu62EPj36fGoFlNXBGqFgaHAmiKhw';

console.log('🔍 Testing public (anonymous) access to articles...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test 1: Can we read signal_items?
console.log('Test 1: Reading signal_items...');
const { data: signals, error: signalsError } = await supabase
  .from('signal_items')
  .select('id, type, title')
  .limit(5);

if (signalsError) {
  console.error('❌ Failed:', signalsError.message);
} else {
  console.log(`✅ Success! Found ${signals?.length || 0} signals`);
  if (signals && signals.length > 0) {
    console.log('   Sample:', signals[0].title);
  }
}

// Test 2: Can we read news_items?
console.log('\nTest 2: Reading news_items...');
const { data: news, error: newsError } = await supabase
  .from('news_items')
  .select('signal_item_id, source_name')
  .limit(5);

if (newsError) {
  console.error('❌ Failed:', newsError.message);
} else {
  console.log(`✅ Success! Found ${news?.length || 0} news items`);
}

// Test 3: Can we read sources?
console.log('\nTest 3: Reading sources...');
const { data: sources, error: sourcesError } = await supabase
  .from('sources')
  .select('id, name, type')
  .limit(5);

if (sourcesError) {
  console.error('❌ Failed:', sourcesError.message);
} else {
  console.log(`✅ Success! Found ${sources?.length || 0} sources`);
  if (sources && sources.length > 0) {
    sources.forEach(s => console.log(`   - ${s.name} (${s.type})`));
  }
}

// Test 4: Can we read topics?
console.log('\nTest 4: Reading topics...');
const { data: topics, error: topicsError } = await supabase
  .from('topics')
  .select('id, name')
  .limit(5);

if (topicsError) {
  console.error('❌ Failed:', topicsError.message);
} else {
  console.log(`✅ Success! Found ${topics?.length || 0} topics`);
}

// Test 5: Full query like the news page does
console.log('\nTest 5: Full query with joins (like news page)...');
const { data: articles, error: articlesError } = await supabase
  .from('signal_items')
  .select('id, type, title, url, published_at, content_snippet, created_at, news_items(source_name), signal_topics(topics(name))')
  .order('created_at', { ascending: false })
  .limit(10);

if (articlesError) {
  console.error('❌ Failed:', articlesError.message);
} else {
  console.log(`✅ Success! Found ${articles?.length || 0} articles`);
  if (articles && articles.length > 0) {
    console.log('\n📰 Sample articles:');
    articles.slice(0, 3).forEach(a => {
      console.log(`   - ${a.title}`);
      console.log(`     Type: ${a.type}, Source: ${a.news_items?.[0]?.source_name || 'Unknown'}`);
    });
  }
}

console.log('\n' + '='.repeat(60));
if (!signalsError && !newsError && !sourcesError && !articlesError) {
  console.log('✨ All tests passed! Public access is working.');
  console.log('🌐 News page should work: https://f8ai.github.io/formul8-news/');
} else {
  console.log('⚠️  Some tests failed. RLS policies may need adjustment.');
  console.log('📝 Apply the migration: supabase/migrations/20260305180100_fix_public_read_access.sql');
  console.log('🔗 Via dashboard: https://supabase.com/dashboard/project/gptfmaceymhubyuhqegu/sql/new');
}
