#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = 'https://gptfmaceymhubyuhqegu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdGZtYWNleW1odWJ5dWhxZWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMDU3NSwiZXhwIjoyMDg4MzA2NTc1fQ.wL3fOWPhmPGWjlJrLwu_EQ3uIZHrf3QIifYzy8B5mX4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🔬 PubMed Direct Ingestion');
console.log('==========================\n');

// Get PubMed endpoint
const { data: endpoint, error: endpointError } = await supabase
  .from('source_endpoints')
  .select('*, sources(*)')
  .eq('source_id', (await supabase.from('sources').select('id').eq('name', 'PubMed').single()).data.id)
  .single();

if (endpointError || !endpoint) {
  console.error('❌ PubMed endpoint not found');
  process.exit(1);
}

console.log(`📡 Endpoint: ${endpoint.name}`);
console.log(`🔍 Query: ${endpoint.auth_config.search_query}\n`);

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

if (runError) {
  console.error('❌ Failed to create ingest run:', runError.message);
  process.exit(1);
}

console.log(`📝 Ingest Run ID: ${ingestRun.id}\n`);

const searchQuery = endpoint.auth_config.search_query;
const maxResults = endpoint.auth_config.max_results || 100;
const apiKey = endpoint.auth_config.api_key || null;

let itemsProcessed = 0;
let itemsCreated = 0;
let itemsDuplicate = 0;
const errors = [];

try {
  // Step 1: Search PubMed
  console.log('1️⃣ Searching PubMed...');
  const searchParams = new URLSearchParams({
    db: 'pubmed',
    term: searchQuery,
    retmax: maxResults.toString(),
    retmode: 'json',
    sort: 'pub_date',
    ...(apiKey && { api_key: apiKey }),
  });

  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams}`;
  const searchResponse = await fetch(searchUrl);
  
  if (!searchResponse.ok) {
    throw new Error(`PubMed search failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const pmids = searchData.esearchresult?.idlist || [];

  console.log(`   Found ${pmids.length} articles\n`);

  if (pmids.length === 0) {
    console.log('✅ No new articles to process');
    await supabase.from('ingest_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      items_processed: 0,
      items_created: 0,
      items_duplicate: 0,
      items_error: 0,
    }).eq('id', ingestRun.id);
    process.exit(0);
  }

  // Step 2: Fetch article details
  console.log('2️⃣ Fetching article details...');
  const batchSize = 200;
  const papers = [];

  for (let i = 0; i < pmids.length; i += batchSize) {
    const batchPmids = pmids.slice(i, i + batchSize);
    const fetchParams = new URLSearchParams({
      db: 'pubmed',
      id: batchPmids.join(','),
      retmode: 'xml',
      ...(apiKey && { api_key: apiKey }),
    });

    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${fetchParams}`;
    const fetchResponse = await fetch(fetchUrl);
    
    if (!fetchResponse.ok) {
      console.warn(`   ⚠️  Failed to fetch batch starting at ${i}`);
      continue;
    }

    const xmlText = await fetchResponse.text();
    const parsedPapers = parsePubMedXML(xmlText);
    papers.push(...parsedPapers);

    console.log(`   Fetched ${i + batchPmids.length}/${pmids.length} articles`);

    // Rate limiting
    if (i + batchSize < pmids.length) {
      await new Promise(resolve => setTimeout(resolve, apiKey ? 100 : 340));
    }
  }

  console.log(`\n3️⃣ Processing ${papers.length} papers...\n`);

  // Step 3: Process papers
  for (const paper of papers) {
    itemsProcessed++;

    try {
      const { doi, pmid, title, abstract, authors, journal, publishedDate, isOpenAccess, pmcId } = paper;

      if (!title || !pmid) {
        errors.push({ doi: doi || pmid || 'unknown', error: 'Missing required fields' });
        continue;
      }

      // Compute fingerprint
      const normalizedContent = `${title} ${abstract || ''}`.toLowerCase().trim().replace(/\s+/g, ' ');
      const fingerprintHash = crypto.createHash('sha256').update(normalizedContent).digest('hex');

      // Check for duplicate
      const { data: existingFingerprint } = await supabase
        .from('signal_fingerprints')
        .select('signal_item_id')
        .eq('fingerprint_hash', fingerprintHash)
        .single();

      if (existingFingerprint) {
        await supabase.from('ingest_item_events').insert({
          ingest_run_id: ingestRun.id,
          signal_item_id: existingFingerprint.signal_item_id,
          event_type: 'duplicate',
          item_identifier: doi || pmid,
        });
        itemsDuplicate++;
        continue;
      }

      // Create signal_item
      const { data: signalItem, error: signalError } = await supabase
        .from('signal_items')
        .insert({
          type: 'paper',
          title,
          url: doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${pmid}`,
          published_at: publishedDate,
          content_snippet: abstract?.substring(0, 500),
        })
        .select()
        .single();

      if (signalError || !signalItem) {
        errors.push({ doi: doi || pmid, error: signalError?.message || 'Failed to create signal_item' });
        continue;
      }

      // Create paper_item
      await supabase.from('paper_items').insert({
        signal_item_id: signalItem.id,
        doi,
        abstract,
        authors: authors || [],
        journal,
        citation_count: 0,
        is_open_access: isOpenAccess,
      });

      // Create provenance_record
      await supabase.from('provenance_records').insert({
        signal_item_id: signalItem.id,
        source_id: endpoint.source_id,
        source_endpoint_id: endpoint.id,
        ingest_run_id: ingestRun.id,
        raw_artifact_path: null,
        license_policy_applied: endpoint.sources.license_policy,
      });

      // Create fingerprint
      await supabase.from('signal_fingerprints').insert({
        signal_item_id: signalItem.id,
        fingerprint_hash: fingerprintHash,
      });

      // Log created event
      await supabase.from('ingest_item_events').insert({
        ingest_run_id: ingestRun.id,
        signal_item_id: signalItem.id,
        event_type: 'created',
        item_identifier: doi || pmid,
      });

      itemsCreated++;
      
      if (itemsCreated % 10 === 0) {
        console.log(`   ✅ Created ${itemsCreated} papers...`);
      }

    } catch (paperError) {
      errors.push({ 
        doi: paper.doi || paper.pmid || 'unknown', 
        error: paperError.message 
      });
    }
  }

  // Update ingest run
  await supabase.from('ingest_runs').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    items_processed: itemsProcessed,
    items_created: itemsCreated,
    items_duplicate: itemsDuplicate,
    items_error: errors.length,
  }).eq('id', ingestRun.id);

  // Update endpoint
  await supabase.from('source_endpoints').update({
    last_ingested_at: new Date().toISOString()
  }).eq('id', endpoint.id);

  console.log('\n==========================');
  console.log('✅ Ingestion Complete!\n');
  console.log(`📊 Results:`);
  console.log(`   Processed: ${itemsProcessed}`);
  console.log(`   Created: ${itemsCreated}`);
  console.log(`   Duplicates: ${itemsDuplicate}`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > 0 && errors.length <= 5) {
    console.log('\n⚠️  Errors:');
    errors.forEach(err => console.log(`   - ${err.doi}: ${err.error}`));
  }

} catch (error) {
  console.error('\n❌ Ingestion failed:', error.message);
  
  await supabase.from('ingest_runs').update({
    status: 'failed',
    completed_at: new Date().toISOString(),
    items_processed: itemsProcessed,
    items_created: itemsCreated,
    items_duplicate: itemsDuplicate,
    items_error: errors.length,
  }).eq('id', ingestRun.id);
  
  process.exit(1);
}

// Parse PubMed XML
function parsePubMedXML(xmlText) {
  const papers = [];
  const articleMatches = xmlText.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g);
  
  for (const match of articleMatches) {
    const articleXml = match[1];
    
    const pmid = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    const doi = articleXml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1];
    const title = articleXml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/)?.[1];
    const abstractMatch = articleXml.match(/<Abstract>([\s\S]*?)<\/Abstract>/);
    
    let abstract = '';
    if (abstractMatch) {
      const abstractTexts = abstractMatch[1].matchAll(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/g);
      abstract = Array.from(abstractTexts).map(m => m[1]).join(' ');
    }
    
    const journal = articleXml.match(/<Title>([^<]+)<\/Title>/)?.[1];
    const pubDateMatch = articleXml.match(/<PubDate>([\s\S]*?)<\/PubDate>/);
    let publishedDate = null;
    
    if (pubDateMatch) {
      const year = pubDateMatch[1].match(/<Year>(\d{4})<\/Year>/)?.[1];
      const month = pubDateMatch[1].match(/<Month>(\w+|\d+)<\/Month>/)?.[1];
      const day = pubDateMatch[1].match(/<Day>(\d+)<\/Day>/)?.[1];
      
      if (year) {
        const monthNum = month ? (isNaN(Number(month)) ? getMonthNumber(month) : month) : '01';
        const dayNum = day || '01';
        publishedDate = `${year}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      }
    }
    
    const authorMatches = articleXml.matchAll(/<Author[^>]*>([\s\S]*?)<\/Author>/g);
    const authors = [];
    
    for (const authorMatch of authorMatches) {
      const authorXml = authorMatch[1];
      const lastName = authorXml.match(/<LastName>([^<]+)<\/LastName>/)?.[1];
      const foreName = authorXml.match(/<ForeName>([^<]+)<\/ForeName>/)?.[1];
      
      if (lastName) {
        authors.push(foreName ? `${foreName} ${lastName}` : lastName);
      }
    }
    
    const isOpenAccess = articleXml.includes('IdType="pmc"') || articleXml.includes('open access');
    const pmcId = articleXml.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/)?.[1];
    
    papers.push({
      pmid,
      doi,
      title,
      abstract,
      journal,
      publishedDate,
      authors,
      isOpenAccess,
      pmcId,
    });
  }
  
  return papers;
}

function getMonthNumber(monthName) {
  const months = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  return months[monthName] || '01';
}
