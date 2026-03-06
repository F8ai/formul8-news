#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function triggerArXivIngestion() {
  console.log('Triggering arXiv ingestion...\n');

  // Get arXiv endpoints
  const { data: endpoints, error } = await supabase
    .from('source_endpoints')
    .select('id, name, endpoint_url, auth_config, sources(id, name)')
    .eq('name', 'arXiv API')
    .eq('is_active', true);

  if (error || !endpoints || endpoints.length === 0) {
    console.error('Error fetching arXiv endpoints:', error);
    return;
  }

  console.log(`Found ${endpoints.length} arXiv endpoints\n`);

  for (const endpoint of endpoints) {
    console.log(`📚 Ingesting ${endpoint.sources.name}...`);
    console.log(`   Query: ${endpoint.auth_config.search_query}`);

    // Create ingest run
    const { data: ingestRun, error: runError } = await supabase
      .from('ingest_runs')
      .insert({
        source_endpoint_id: endpoint.id,
        mode: 'streaming',
        status: 'started',
      })
      .select()
      .single();

    if (runError || !ingestRun) {
      console.error('   ❌ Error creating ingest run:', runError);
      continue;
    }

    console.log(`   Ingest run ID: ${ingestRun.id}`);

    // Call ingest-literature function
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/ingest-literature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          source_endpoint_id: endpoint.id,
          ingest_run_id: ingestRun.id,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('   ❌ Ingestion error:', errorText);
        
        // Update run status to failed
        await supabase
          .from('ingest_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorText,
          })
          .eq('id', ingestRun.id);
      } else {
        const data = await response.json();
        console.log('   ✅ Ingestion successful!');
        console.log(`   - Items processed: ${data.items_processed}`);
        console.log(`   - Items created: ${data.items_created}`);
        console.log(`   - Full text downloaded: ${data.full_text_downloaded}`);
        
        if (data.errors && data.errors.length > 0) {
          console.log(`   - Errors: ${data.errors.length}`);
          data.errors.slice(0, 3).forEach(err => {
            console.log(`     • ${err.doi}: ${err.error}`);
          });
        }

        // Update run status to completed
        await supabase
          .from('ingest_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            items_processed: data.items_processed,
            items_created: data.items_created,
          })
          .eq('id', ingestRun.id);
      }
    } catch (err) {
      console.error('   ❌ Function invocation error:', err);
    }

    console.log('');
  }

  // Show sample of ingested papers
  console.log('\n📄 Sample of ingested arXiv papers:');
  const { data: papers, error: papersError } = await supabase
    .from('paper_items')
    .select('arxiv_id, arxiv_categories, signal_items(title, url, published_at)')
    .not('arxiv_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (papersError) {
    console.error('Error fetching papers:', papersError);
  } else if (papers && papers.length > 0) {
    papers.forEach((paper, idx) => {
      console.log(`\n${idx + 1}. ${paper.signal_items.title}`);
      console.log(`   arXiv: ${paper.arxiv_id}`);
      console.log(`   Categories: ${paper.arxiv_categories?.join(', ')}`);
      console.log(`   URL: ${paper.signal_items.url}`);
      console.log(`   Published: ${paper.signal_items.published_at}`);
    });
  } else {
    console.log('No arXiv papers found yet.');
  }

  console.log('\n✅ Ingestion complete!');
}

triggerArXivIngestion().catch(console.error);
