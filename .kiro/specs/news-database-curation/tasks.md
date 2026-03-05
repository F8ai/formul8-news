# Implementation Plan: News Database Curation System (Formul8 Signals)

## Overview

This implementation plan follows a phased delivery approach to build a multi-source ingestion platform on Supabase that collects, normalizes, deduplicates, enriches, and publishes news articles, patents, and scientific literature.

The system uses TypeScript for Supabase Edge Functions (Deno runtime), Postgres with pgvector for storage, and enforces per-source license policies throughout the pipeline.

## Phase 1: MVP Ingestion + Export (Must Ship)

### 1. Set up Supabase project and database schema

- [x] 1.1 Initialize Supabase project and configure local development environment
  - Create new Supabase project or configure existing project
  - Set up local development with `supabase init` and `supabase start`
  - Configure environment variables for project URL and service role key
  - _Requirements: 1.4, 15.4_

- [x] 1.2 Create database migration for core tables (sources, source_endpoints, signal_items)
  - Write SQL migration creating `sources` table with license_policy JSONB field
  - Write SQL migration creating `source_endpoints` table with auth_config and polling_schedule
  - Write SQL migration creating `signal_items` table with type, title, url, content_snippet, enrichment_status
  - Add appropriate indexes for query performance
  - _Requirements: 1.1, 1.3, 1.4, 2.4_

- [ ]* 1.3 Write property test for source configuration persistence round-trip
  - **Property 1: Source Configuration Persistence Round-Trip**
  - **Validates: Requirements 1.1, 1.3, 1.4**

- [x] 1.4 Create database migration for type-specific tables (news_items, patent_items, paper_items)
  - Write SQL migration creating `news_items` table with author, source_name, content_full
  - Write SQL migration creating `patent_items` table with application_number, abstract, claims, inventors
  - Write SQL migration creating `paper_items` table with doi, abstract, authors, journal
  - Add foreign key constraints to signal_items
  - _Requirements: 2.4, 4.4, 5.5_

- [x] 1.5 Create database migration for provenance and job tracking tables
  - Write SQL migration creating `provenance_records` table linking signals to sources
  - Write SQL migration creating `ingest_runs` table for job tracking
  - Write SQL migration creating `ingest_item_events` table for event logging
  - Add indexes for querying by source, endpoint, and date range
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ]* 1.6 Write property test for ingest run tracking
  - **Property 33: Ingest Run Tracking**
  - **Validates: Requirements 15.1, 15.2, 15.3**

- [x] 1.7 Create database migration for deduplication tables (signal_fingerprints, clusters, cluster_members)
  - Write SQL migration creating `signal_fingerprints` table with unique fingerprint_hash
  - Write SQL migration creating `clusters` table with canonical_signal_id
  - Write SQL migration creating `cluster_members` table with similarity_score
  - Add indexes for fingerprint lookup and cluster queries
  - _Requirements: 8.1, 8.2, 9.5_

- [ ]* 1.8 Write property test for content fingerprint computation
  - **Property 17: Content Fingerprint Computation**
  - **Validates: Requirements 8.1, 8.2**


### 2. Set up Supabase Storage buckets

- [x] 2.1 Create storage buckets for raw artifacts and public feeds
  - Create private bucket `raw-artifacts` with 90-day retention policy
  - Create public bucket `public-feeds` with public read access
  - Configure bucket policies and CORS settings
  - Set up folder structure (rss/, news-api/, patents/, literature/ in raw-artifacts)
  - _Requirements: 3.4, 17.3, 18.5_

- [ ]* 2.2 Write unit tests for storage bucket operations
  - Test file upload to raw-artifacts bucket
  - Test file upload to public-feeds bucket with public read verification
  - Test file retrieval and error handling
  - _Requirements: 3.4_

### 3. Implement RSS connector and basic normalization

- [x] 3.1 Create Edge Function for RSS/Atom feed parsing
  - Implement `ingest-rss` Edge Function with request/response interface
  - Add RSS 2.0 and Atom 1.0 parsing logic using xml parser library
  - Extract title, link, pubDate, author, description, content from feed entries
  - Normalize parsed data into News_Item structure
  - Handle parsing errors gracefully and log to Ingest_Item_Event
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ]* 3.2 Write property test for RSS feed parsing round-trip
  - **Property 4: RSS/Atom Feed Parsing Round-Trip**
  - **Validates: Requirements 2.7**

- [ ]* 3.3 Write property test for feed parsing field extraction
  - **Property 5: Feed Parsing Extracts Required Fields**
  - **Validates: Requirements 2.2, 2.3**

- [ ]* 3.4 Write unit tests for RSS connector
  - Test parsing valid RSS 2.0 feed
  - Test parsing valid Atom 1.0 feed
  - Test handling malformed XML
  - Test handling missing required fields
  - _Requirements: 2.2, 2.5_

- [ ] 3.5 Implement Signal_Item and News_Item creation logic
  - Create function to insert Signal_Item record with type='news'
  - Create function to insert News_Item record with foreign key to Signal_Item
  - Create function to insert Provenance_Record linking to source and endpoint
  - Apply license policy to determine content storage (full text vs snippet vs link only)
  - Store raw feed XML in raw-artifacts bucket
  - _Requirements: 2.4, 7.2, 7.3, 7.4_

- [ ]* 3.6 Write property test for type-specific item creation
  - **Property 6: Type-Specific Item Creation Produces Associated Records**
  - **Validates: Requirements 2.4, 4.4, 5.5**

- [ ]* 3.7 Write property test for license policy enforcement
  - **Property 11: License Policy Enforcement at Ingestion**
  - **Validates: Requirements 7.2, 7.3, 7.4**


### 4. Implement hard duplicate detection (fingerprinting)

- [ ] 4.1 Create fingerprinting utility function
  - Implement content normalization (lowercase, trim whitespace, remove special chars)
  - Implement SHA-256 hash computation for normalized content
  - Create function to compute fingerprint from Signal_Item content
  - _Requirements: 8.1_

- [ ] 4.2 Implement duplicate detection logic
  - Create function to check if fingerprint exists in signal_fingerprints table
  - If duplicate found, mark Signal_Item as duplicate and link to original
  - If not duplicate, create new Signal_Fingerprint record
  - Skip content storage for duplicates and increment duplicate counter
  - Log duplicate detection events to Ingest_Item_Event
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [ ]* 4.3 Write property test for hard duplicate detection
  - **Property 18: Hard Duplicate Detection**
  - **Validates: Requirements 8.3, 8.4, 8.5**

- [ ]* 4.4 Write unit tests for fingerprinting
  - Test fingerprint computation for identical content
  - Test fingerprint differs for different content
  - Test normalization handles whitespace and case differences
  - Test duplicate detection marks items correctly
  - _Requirements: 8.1, 8.2_

### 5. Implement ingestion orchestrator

- [x] 5.1 Create Edge Function for ingestion orchestration
  - Implement `ingest-orchestrator` Edge Function with request/response interface
  - Query active Source_Endpoint records from database
  - Create Ingest_Run record with status='started'
  - Invoke RSS connector for each RSS/Atom endpoint
  - Aggregate results and update Ingest_Run with completion status and counts
  - _Requirements: 15.1, 15.3, 16.1_

- [ ] 5.2 Implement error handling and retry logic
  - Add exponential backoff retry for network timeouts (1s, 2s, 4s, max 3 retries)
  - Handle rate limiting with Retry-After header respect
  - Continue processing other endpoints if one fails
  - Update Ingest_Run status to 'partial' if some endpoints fail
  - Send alerts when error rate exceeds 10%
  - _Requirements: 23.1, 23.2, 23.3, 23.5_

- [ ]* 5.3 Write property test for error logging and continuation
  - **Property 50: Error Logging and Continuation**
  - **Validates: Requirements 23.2, 23.4**

- [ ]* 5.4 Write unit tests for orchestrator
  - Test orchestrator invokes connectors for active endpoints
  - Test orchestrator creates and updates Ingest_Run records
  - Test orchestrator handles connector failures gracefully
  - Test orchestrator aggregates results correctly
  - _Requirements: 15.1, 15.3_


### 6. Implement public feed exporter

- [x] 6.1 Create Edge Function for feed export
  - Implement `export-feeds` Edge Function with request/response interface
  - Query Signal_Items filtered by license policy (redistribution_allowed=true)
  - Implement JSON feed formatter converting Signal_Items to feed format
  - Generate index.json with feed metadata (title, description, item count, last updated)
  - Upload generated JSON files to public-feeds bucket
  - _Requirements: 17.1, 17.2, 17.3, 22.4_

- [ ]* 6.2 Write property test for JSON feed parsing round-trip
  - **Property 48: JSON Feed Parsing Round-Trip**
  - **Validates: Requirements 22.5**

- [ ]* 6.3 Write property test for policy-compliant feed filtering
  - **Property 39: Policy-Compliant Feed Filtering**
  - **Validates: Requirements 17.4, 18.3**

- [ ] 6.2 Implement monthly archive feed generation
  - Create function to filter Signal_Items by published_at month
  - Generate YYYY-MM.json files for each month with signals
  - Apply license policy restrictions (exclude content for link_only sources)
  - Upload monthly archive files to public-feeds/archives/ folder
  - _Requirements: 18.1, 18.2, 18.4, 18.5_

- [ ]* 6.4 Write property test for monthly archive date filtering
  - **Property 40: Monthly Archive Date Filtering**
  - **Validates: Requirements 18.1**

- [ ]* 6.5 Write property test for link-only policy content exclusion
  - **Property 42: Link-Only Policy Content Exclusion**
  - **Validates: Requirements 18.4**

- [ ]* 6.6 Write unit tests for feed exporter
  - Test index.json generation with correct metadata
  - Test monthly archive filtering by date
  - Test license policy filtering excludes restricted sources
  - Test link_only sources exclude content in exports
  - _Requirements: 17.1, 18.1, 18.4_

### 7. Implement Row-Level Security (RLS) policies

- [x] 7.1 Create RLS policies for signal_items table
  - Enable RLS on signal_items table
  - Create policy allowing public (anon) read access only for redistribution_allowed sources
  - Create policy allowing authenticated users full access to all signals
  - Test policies with anon and authenticated roles
  - _Requirements: 21.1, 21.2, 21.3, 21.4_

- [x] 7.2 Create RLS policies for news_items table
  - Enable RLS on news_items table
  - Create policy preventing public access to full content for snippet_only/link_only sources
  - Create policy allowing authenticated users full content access
  - Test policies verify content filtering works correctly
  - _Requirements: 21.2, 21.3_

- [ ]* 7.3 Write property test for RLS policy enforcement
  - **Property 46: RLS Policy Enforcement for Public Queries**
  - **Validates: Requirements 21.2, 21.4**

- [ ]* 7.4 Write property test for RLS policy bypass for internal queries
  - **Property 47: RLS Policy Bypass for Internal Queries**
  - **Validates: Requirements 21.3**


### 8. Set up cron scheduling for periodic ingestion

- [ ] 8.1 Create database migration for cron job scheduling
  - Write SQL using pg_cron to schedule RSS ingestion every 15 minutes
  - Write SQL using pg_cron to schedule feed export daily at 2 AM UTC
  - Configure cron jobs to invoke Edge Functions with service role authentication
  - _Requirements: 16.1, 16.2, 16.3_

- [ ] 8.2 Implement concurrent run prevention logic
  - Add check in orchestrator to query for active Ingest_Runs for endpoint
  - Skip execution and log warning if Ingest_Run already in progress
  - Update endpoint last_ingested_at timestamp on completion
  - _Requirements: 16.4_

- [ ]* 8.3 Write property test for concurrent ingest run prevention
  - **Property 36: Concurrent Ingest Run Prevention**
  - **Validates: Requirements 16.4**

- [ ]* 8.4 Write unit tests for cron scheduling
  - Test cron schedule validation accepts valid expressions
  - Test cron schedule validation rejects invalid expressions
  - Test concurrent run prevention skips duplicate runs
  - _Requirements: 16.1, 16.4_

### 9. Checkpoint - Phase 1 MVP validation

- [ ] 9.1 Ensure all Phase 1 tests pass
  - Run all unit tests and verify passing
  - Run all property tests and verify passing
  - Verify database migrations apply cleanly
  - Verify Edge Functions deploy successfully
  - Ask the user if questions arise

- [ ] 9.2 Perform end-to-end integration test
  - Configure test RSS feed source and endpoint
  - Trigger ingestion orchestrator manually
  - Verify Signal_Items created in database
  - Verify raw artifacts stored in bucket
  - Verify duplicate detection works
  - Verify public feed exported to bucket
  - Verify RLS policies restrict public access correctly
  - _Requirements: 2.1, 2.4, 8.3, 17.3, 21.2_

## Phase 2: Add Patents + Literature

### 10. Implement patent connector

- [x] 10.1 Create Edge Function for patent API ingestion
  - Implement `ingest-patents` Edge Function with request/response interface
  - Add patent API authentication and query logic
  - Parse patent records into Patent_Item structure (application_number, abstract, claims, inventors, assignees)
  - Create Signal_Item with type='patent' and Provenance_Record
  - Store raw API response in raw-artifacts bucket
  - _Requirements: 4.1, 4.2, 4.4_

- [ ]* 10.2 Write property test for API response normalization
  - **Property 8: API Response Normalization Produces Required Fields**
  - **Validates: Requirements 3.3, 4.2, 5.2**

- [ ]* 10.3 Write property test for raw API response storage
  - **Property 9: Raw API Responses Are Stored**
  - **Validates: Requirements 3.4**

- [ ] 10.2 Implement patent family clustering
  - Extract patent_family_id from patent records
  - Create Cluster record with cluster_type='patent_family' for each family
  - Create Cluster_Member records linking patents to family cluster
  - Set earliest patent as canonical_signal_id
  - _Requirements: 4.3, 9.4_

- [ ]* 10.4 Write property test for patent family clustering
  - **Property 10: Patent Family Clustering**
  - **Validates: Requirements 4.3**

- [ ]* 10.5 Write unit tests for patent connector
  - Test patent API authentication
  - Test patent record parsing
  - Test patent family extraction and clustering
  - Test error handling for API failures
  - _Requirements: 4.1, 4.2, 4.3_


### 11. Implement literature connector

- [x] 11.1 Create Edge Function for literature API ingestion
  - Implement `ingest-literature` Edge Function with request/response interface
  - Add literature API authentication and query logic
  - Parse paper records into Paper_Item structure (doi, abstract, authors, journal, citation_count)
  - Create Signal_Item with type='paper' and Provenance_Record
  - Store raw API response in raw-artifacts bucket
  - _Requirements: 5.1, 5.2, 5.5_

- [ ] 11.2 Implement conditional full text download for open access papers
  - Check if paper is_open_access flag is true
  - Check if License_Policy allows full text storage
  - Download full text PDF if both conditions met
  - Store PDF in raw-artifacts bucket with doi_hash folder structure
  - Store only abstract and metadata if conditions not met
  - _Requirements: 5.3, 5.4_

- [ ]* 11.3 Write property test for open access and policy full text storage
  - **Property 12: Open Access and Policy Determine Full Text Storage**
  - **Validates: Requirements 5.3**

- [ ]* 11.4 Write unit tests for literature connector
  - Test literature API authentication
  - Test paper record parsing
  - Test open access full text download
  - Test snippet-only storage when policy restricts
  - Test error handling for API failures
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

### 12. Implement manual upload endpoint

- [x] 12.1 Create Edge Function for manual uploads
  - Implement `upload-manual` Edge Function with request/response interface
  - Add validation logic for News_Item, Patent_Item, Paper_Item based on type
  - Create or reuse Source record with type='Manual'
  - Create Signal_Item and type-specific item records
  - Create Provenance_Record with uploaded_by field
  - Support batch uploads of multiple items
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 12.2 Write property test for manual upload validation
  - **Property 13: Manual Upload Validation**
  - **Validates: Requirements 6.2**

- [ ]* 12.3 Write property test for manual upload source creation
  - **Property 14: Manual Upload Creates Manual Source**
  - **Validates: Requirements 6.3, 6.4**

- [ ]* 12.4 Write property test for batch manual upload processing
  - **Property 15: Batch Manual Upload Processes All Items**
  - **Validates: Requirements 6.5**

- [ ]* 12.5 Write unit tests for manual upload endpoint
  - Test validation rejects items with missing required fields
  - Test validation accepts valid items
  - Test batch upload processes all valid items
  - Test batch upload returns individual errors for invalid items
  - _Requirements: 6.2, 6.5_

### 13. Update feed exporter to support patents and papers

- [ ] 13.1 Extend feed exporter to include patent and paper types
  - Update feed query to include type='patent' and type='paper'
  - Update JSON formatter to handle Patent_Item and Paper_Item fields
  - Update monthly archives to include all signal types
  - Test exports include patents and papers correctly
  - _Requirements: 18.1, 18.2_

- [ ]* 13.2 Write unit tests for multi-type feed export
  - Test feed includes news, patents, and papers
  - Test JSON format correctly represents each type
  - Test monthly archives filter all types by date
  - _Requirements: 18.1_

### 14. Checkpoint - Phase 2 validation

- [ ] 14.1 Ensure all Phase 2 tests pass
  - Run all unit tests and verify passing
  - Run all property tests and verify passing
  - Verify patent and literature connectors work end-to-end
  - Verify manual upload endpoint works
  - Ask the user if questions arise


## Phase 3: Enrichment and Clustering

### 15. Set up enrichment infrastructure

- [x] 15.1 Create database migration for enrichment tables
  - Write SQL migration creating `topics` table with predefined taxonomy
  - Write SQL migration creating `signal_topics` association table with confidence score
  - Write SQL migration creating `entities` table with canonical_name and entity_type
  - Write SQL migration creating `signal_entities` association table with mention_count
  - Add pgvector extension and embedding column to signal_items table
  - Seed topics table with predefined topics (AI, Climate, Healthcare, Energy, Finance, Technology, Science)
  - _Requirements: 11.2, 11.3, 12.2, 14.2_

- [ ]* 15.2 Write unit tests for enrichment table schema
  - Test topics table has predefined taxonomy
  - Test signal_topics association works correctly
  - Test entities table stores canonical names
  - Test pgvector extension is enabled
  - _Requirements: 11.2, 12.2_

### 16. Implement language detection

- [ ] 16.1 Create language detection utility function
  - Add lingua-js or similar language detection library
  - Implement function to detect language from Signal_Item content
  - Return ISO 639-1 language code and confidence score
  - Mark language as 'unknown' if confidence below 80%
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 16.2 Integrate language detection into enrichment worker
  - Update Signal_Item record with detected language_code and language_confidence
  - Handle errors gracefully and mark enrichment_status as 'failed' on error
  - _Requirements: 10.1, 10.2_

- [ ]* 16.3 Write property test for language detection and storage
  - **Property 22: Language Detection and Storage**
  - **Validates: Requirements 10.1, 10.2**

- [ ]* 16.4 Write property test for low confidence language marking
  - **Property 23: Low Confidence Language Marking**
  - **Validates: Requirements 10.3**

- [ ]* 16.5 Write unit tests for language detection
  - Test detection returns valid ISO 639-1 codes
  - Test detection marks unknown for low confidence
  - Test detection handles empty content gracefully
  - _Requirements: 10.1, 10.2, 10.3_

### 17. Implement topic extraction and tagging

- [ ] 17.1 Create topic extraction utility function
  - Implement keyword matching against predefined topic taxonomy
  - Implement classification logic for topic assignment
  - Return array of matching topics with confidence scores
  - Support multi-topic assignment for signals matching multiple topics
  - _Requirements: 11.1, 11.3, 11.4_

- [ ] 17.2 Integrate topic extraction into enrichment worker
  - Extract topics from Signal_Item title and content
  - Create Signal_Topic association records for each matched topic
  - Store confidence scores in association records
  - _Requirements: 11.1, 11.2, 11.4_

- [ ]* 17.3 Write property test for topic extraction and association
  - **Property 25: Topic Extraction and Association**
  - **Validates: Requirements 11.1, 11.2**

- [ ]* 17.4 Write property test for multi-topic association
  - **Property 26: Multi-Topic Association**
  - **Validates: Requirements 11.4**

- [ ]* 17.5 Write unit tests for topic extraction
  - Test extraction identifies correct topics from content
  - Test extraction creates Signal_Topic associations
  - Test extraction handles multiple topics correctly
  - _Requirements: 11.1, 11.2, 11.4_


### 18. Implement named entity extraction

- [ ] 18.1 Create entity extraction utility function
  - Add compromise-js or similar lightweight NER library
  - Implement function to extract person, organization, location entities
  - Implement entity name normalization to canonical forms
  - Return array of entities with types and mention counts
  - _Requirements: 12.1, 12.3_

- [ ] 18.2 Integrate entity extraction into enrichment worker
  - Extract entities from Signal_Item title and content
  - Create or retrieve Entity records with canonical names
  - Create Signal_Entity association records with mention counts
  - _Requirements: 12.1, 12.2_

- [ ]* 18.3 Write property test for entity extraction and association
  - **Property 27: Entity Extraction and Association**
  - **Validates: Requirements 12.1, 12.2**

- [ ]* 18.4 Write property test for entity name normalization
  - **Property 28: Entity Name Normalization**
  - **Validates: Requirements 12.3**

- [ ]* 18.5 Write unit tests for entity extraction
  - Test extraction identifies person, organization, location entities
  - Test extraction normalizes entity name variations
  - Test extraction creates Entity and Signal_Entity records
  - _Requirements: 12.1, 12.2, 12.3_

### 19. Implement summary generation

- [ ] 19.1 Create summary generation utility function
  - Add OpenAI API client or similar summarization API
  - Implement function to generate 200-character summaries
  - Only generate summaries for content exceeding 1000 characters
  - Respect license policy restrictions (only summarize permitted content)
  - _Requirements: 13.1, 13.3_

- [ ] 19.2 Integrate summary generation into enrichment worker
  - Check content length and license policy before generating summary
  - Call summarization API and store result in Signal_Item summary field
  - Handle API errors gracefully with retry logic
  - _Requirements: 13.1, 13.2, 13.3_

- [ ]* 19.3 Write property test for conditional summary generation
  - **Property 29: Conditional Summary Generation**
  - **Validates: Requirements 13.1, 13.2, 13.3**

- [ ]* 19.4 Write unit tests for summary generation
  - Test summary generated for content > 1000 chars
  - Test summary not generated for content < 1000 chars
  - Test summary respects license policy restrictions
  - Test summary length is 200 characters or fewer
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 19.5 Update feed exporter to include summaries
  - Add summary field to JSON feed format
  - Include summaries in all feed exports (index, monthly, topic, entity)
  - _Requirements: 13.4_

- [ ]* 19.6 Write property test for summary inclusion in exports
  - **Property 30: Summary Inclusion in Exports**
  - **Validates: Requirements 13.4**

### 20. Implement embeddings computation

- [ ] 20.1 Create embeddings computation utility function
  - Add OpenAI API client for text-embedding-3-small model
  - Implement function to compute 1536-dimension embeddings
  - Only compute embeddings for sources with embeddings enabled
  - Respect license policy restrictions (only embed permitted content)
  - _Requirements: 14.1, 14.4_

- [ ] 20.2 Integrate embeddings into enrichment worker
  - Check source configuration and license policy before computing embeddings
  - Call embedding API and store result in Signal_Item embedding column (pgvector)
  - Handle API errors gracefully with retry logic
  - _Requirements: 14.1, 14.2, 14.4_

- [ ]* 20.3 Write property test for conditional embedding computation
  - **Property 31: Conditional Embedding Computation**
  - **Validates: Requirements 14.1, 14.2, 14.4**

- [ ]* 20.4 Write unit tests for embeddings computation
  - Test embeddings computed for enabled sources
  - Test embeddings not computed for disabled sources
  - Test embeddings respect license policy restrictions
  - Test embeddings stored as pgvector type
  - _Requirements: 14.1, 14.2, 14.4_


### 21. Implement near-duplicate clustering

- [ ] 21.1 Create similarity computation utility function
  - Implement function to compute similarity score between Signal_Items
  - Use embedding vector distance for semantic similarity (if embeddings available)
  - Use text-based similarity (e.g., Jaccard, cosine) as fallback
  - Return similarity score between 0.0 and 1.0
  - _Requirements: 9.1_

- [ ] 21.2 Integrate near-duplicate clustering into enrichment worker
  - Compute similarity scores against recent Signal_Items of same type
  - Create or update Cluster record when similarity exceeds 85%
  - Create Cluster_Member records linking similar items to cluster
  - Set earliest Signal_Item as canonical representative
  - Only cluster items that passed hard duplicate detection
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ]* 21.3 Write property test for near-duplicate similarity computation
  - **Property 19: Near-Duplicate Similarity Computation**
  - **Validates: Requirements 9.1**

- [ ]* 21.4 Write property test for clustering by similarity threshold
  - **Property 20: Clustering by Similarity Threshold**
  - **Validates: Requirements 9.2, 9.3**

- [ ]* 21.5 Write property test for canonical cluster representative
  - **Property 21: Canonical Cluster Representative**
  - **Validates: Requirements 9.4**

- [ ]* 21.6 Write unit tests for near-duplicate clustering
  - Test similarity computation returns scores in [0.0, 1.0]
  - Test clustering creates Cluster and Cluster_Member records
  - Test clustering only occurs when similarity > 85%
  - Test canonical representative is earliest item
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

### 22. Implement enrichment worker Edge Function

- [x] 22.1 Create Edge Function for enrichment orchestration
  - Implement `enrich-signals` Edge Function with request/response interface
  - Query unenriched Signal_Items (enrichment_status='pending') in batches
  - Update enrichment_status to 'in_progress' before processing
  - Invoke language detection, topic extraction, entity extraction, summary generation, embeddings
  - Update enrichment_status to 'completed' and set enriched_at timestamp
  - Handle errors and mark enrichment_status as 'failed' on failure
  - _Requirements: 10.1, 11.1, 12.1, 13.1, 14.1_

- [ ] 22.2 Add enrichment worker to cron schedule
  - Write SQL using pg_cron to schedule enrichment worker every 5 minutes
  - Configure cron job to invoke Edge Function with batch_size parameter
  - _Requirements: 16.2_

- [ ]* 22.3 Write unit tests for enrichment worker
  - Test worker queries unenriched signals in batches
  - Test worker updates enrichment_status correctly
  - Test worker handles errors and marks failed enrichments
  - Test worker sets enriched_at timestamp on completion
  - _Requirements: 10.1, 11.1, 12.1, 13.1, 14.1_

### 23. Update feed exporter to support topic and entity filtering

- [ ] 23.1 Implement topic-filtered feed generation
  - Create function to query Signal_Items by Topic via Signal_Topic associations
  - Generate topic-{topic_name}.json files for each topic
  - Apply license policy restrictions to topic feeds
  - Upload topic feed files to public-feeds/topics/ folder
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ]* 23.2 Write property test for topic feed filtering
  - **Property 43: Topic Feed Filtering**
  - **Validates: Requirements 19.3**

- [ ] 23.3 Implement entity-filtered feed generation
  - Create function to query Signal_Items by Entity via Signal_Entity associations
  - Generate entity-{entity_id}.json files for high-frequency entities (>= 10 mentions)
  - Apply license policy restrictions to entity feeds
  - Upload entity feed files to public-feeds/entities/ folder
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ]* 23.4 Write property test for entity feed filtering
  - **Property 44: Entity Feed Filtering**
  - **Validates: Requirements 20.3**

- [ ]* 23.5 Write property test for high-frequency entity feed generation
  - **Property 45: High-Frequency Entity Feed Generation**
  - **Validates: Requirements 20.5**

- [ ]* 23.6 Write unit tests for filtered feed generation
  - Test topic feeds include only signals with that topic
  - Test entity feeds include only signals mentioning that entity
  - Test entity feeds only generated for entities with >= 10 mentions
  - _Requirements: 19.3, 20.3, 20.5_


### 24. Implement observability metrics

- [ ] 24.1 Create database migration for metrics tables
  - Write SQL migration creating metrics table for daily counters
  - Add columns for ingestion_count, duplicate_count, enrichment_count, export_count
  - Add indexes for querying by source_endpoint_id and date
  - _Requirements: 24.1, 24.2, 24.3, 24.4_

- [ ] 24.2 Implement metrics tracking in connectors and workers
  - Add metrics increment calls in RSS connector for ingestion_count
  - Add metrics increment calls in deduplication engine for duplicate_count
  - Add metrics increment calls in enrichment worker for enrichment_count
  - Add metrics increment calls in feed exporter for export_count
  - _Requirements: 24.1, 24.2, 24.3, 24.4_

- [ ]* 24.3 Write property test for metrics counter increments
  - **Property 52: Metrics Counter Increments**
  - **Validates: Requirements 24.1, 24.2, 24.3, 24.4**

- [ ] 24.3 Implement metrics query endpoint
  - Create Edge Function or database function to query metrics by date range
  - Calculate average enrichment time from ingested_at to enriched_at
  - Return aggregated statistics summing daily counters
  - Expose metrics endpoint for observability tools integration
  - _Requirements: 24.5, 24.6, 24.7_

- [ ]* 24.4 Write property test for enrichment time calculation
  - **Property 53: Enrichment Time Calculation**
  - **Validates: Requirements 24.5**

- [ ]* 24.5 Write property test for metrics date range aggregation
  - **Property 54: Metrics Date Range Aggregation**
  - **Validates: Requirements 24.6**

- [ ]* 24.6 Write unit tests for metrics tracking
  - Test metrics counters increment correctly
  - Test metrics query returns aggregated statistics
  - Test enrichment time calculation is accurate
  - _Requirements: 24.1, 24.5, 24.6_

### 25. Checkpoint - Phase 3 validation

- [ ] 25.1 Ensure all Phase 3 tests pass
  - Run all unit tests and verify passing
  - Run all property tests and verify passing
  - Verify enrichment pipeline works end-to-end
  - Verify topic and entity feeds generate correctly
  - Ask the user if questions arise

- [ ] 25.2 Perform end-to-end enrichment test
  - Ingest test signals through RSS connector
  - Verify enrichment worker processes signals
  - Verify language detection, topics, entities, summaries, embeddings added
  - Verify near-duplicate clustering creates clusters
  - Verify topic and entity feeds include enriched signals
  - _Requirements: 10.1, 11.1, 12.1, 13.1, 14.1, 9.2, 19.3, 20.3_

## Additional Implementation Tasks

### 26. Implement News API connector

- [ ] 26.1 Create Edge Function for News API ingestion
  - Implement `ingest-news-api` Edge Function with request/response interface
  - Add News API authentication using API key from auth_config
  - Implement streaming mode (recent articles) and backfill mode (historical archives)
  - Parse News API responses into News_Item structure
  - Store raw API response in raw-artifacts bucket
  - Handle rate limiting with Retry-After header respect
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 26.2 Write unit tests for News API connector
  - Test API authentication with valid credentials
  - Test streaming mode fetches recent articles
  - Test backfill mode fetches historical archives
  - Test rate limiting retry logic
  - Test error handling for API failures
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

### 27. Implement semantic similarity search

- [ ] 27.1 Create database function for vector similarity search
  - Write SQL function using pgvector to query by embedding similarity
  - Use vector distance (cosine, L2, or inner product) for ranking
  - Return Signal_Items ordered by similarity score (closest first)
  - Add index on embedding column for performance (ivfflat or hnsw)
  - _Requirements: 14.3_

- [ ] 27.2 Create Edge Function or API endpoint for similarity search
  - Implement endpoint accepting query text or signal_id
  - Compute embedding for query text if provided
  - Query database using vector similarity function
  - Return ranked results with similarity scores
  - _Requirements: 14.3_

- [ ]* 27.3 Write property test for semantic similarity query
  - **Property 32: Semantic Similarity Query**
  - **Validates: Requirements 14.3**

- [ ]* 27.4 Write unit tests for similarity search
  - Test search returns results ordered by similarity
  - Test search handles query text and signal_id inputs
  - Test search respects RLS policies
  - _Requirements: 14.3_


### 28. Implement query filtering by attributes

- [ ] 28.1 Create database functions for attribute filtering
  - Write SQL function to query Signal_Items by language_code
  - Write SQL function to query Signal_Items by Topic via Signal_Topic join
  - Write SQL function to query Signal_Items by Entity via Signal_Entity join
  - Add indexes for efficient filtering queries
  - _Requirements: 10.4, 11.5, 12.4_

- [ ] 28.2 Create Edge Function or API endpoints for filtered queries
  - Implement endpoint for language filtering
  - Implement endpoint for topic filtering
  - Implement endpoint for entity filtering
  - Support combining multiple filters
  - _Requirements: 10.4, 11.5, 12.4_

- [ ]* 28.3 Write property test for query filtering by attributes
  - **Property 24: Query Filtering by Attributes**
  - **Validates: Requirements 10.4, 11.5, 12.4**

- [ ]* 28.4 Write unit tests for attribute filtering
  - Test language filtering returns only signals with specified language
  - Test topic filtering returns only signals with specified topic
  - Test entity filtering returns only signals mentioning specified entity
  - Test combined filters work correctly
  - _Requirements: 10.4, 11.5, 12.4_

### 29. Implement license policy audit and validation

- [ ] 29.1 Add license policy recording to provenance
  - Update Provenance_Record creation to include applied license_policy
  - Store license policy snapshot at ingestion time for audit trail
  - _Requirements: 7.5_

- [ ]* 29.2 Write property test for license policy audit recording
  - **Property 16: License Policy Recorded for Audit**
  - **Validates: Requirements 7.5**

- [ ] 29.3 Implement license policy validation
  - Create validation function to check License_Policy structure
  - Reject Source creation if policy doesn't specify exactly one mode
  - Return descriptive error messages for invalid policies
  - _Requirements: 1.2_

- [ ]* 29.4 Write property test for license policy validation
  - **Property 2: License Policy Validation**
  - **Validates: Requirements 1.2**

- [ ]* 29.5 Write unit tests for license policy validation
  - Test validation rejects policy with no mode specified
  - Test validation rejects policy with multiple modes
  - Test validation accepts policy with exactly one mode
  - _Requirements: 1.2_

### 30. Implement source configuration update

- [ ] 30.1 Create Edge Function or database function for source updates
  - Implement function to update Source fields (name, description, license_policy)
  - Implement function to update Source_Endpoint fields (endpoint_url, auth_config, polling_schedule)
  - Ensure updates preserve all other fields unchanged
  - Update updated_at timestamp on changes
  - _Requirements: 1.5_

- [ ]* 30.2 Write property test for source configuration update preserves data
  - **Property 3: Source Configuration Update Preserves Data**
  - **Validates: Requirements 1.5**

- [ ]* 30.3 Write unit tests for source updates
  - Test updating specific fields preserves other fields
  - Test updated_at timestamp changes on update
  - Test updates handle validation errors correctly
  - _Requirements: 1.5_

### 31. Implement manual ingestion trigger

- [ ] 31.1 Add manual trigger support to orchestrator
  - Update orchestrator to accept manual trigger requests
  - Support triggering ingestion for specific Source_Endpoint outside schedule
  - Support triggering ingestion for all endpoints
  - Return Ingest_Run ID for tracking
  - _Requirements: 16.5_

- [ ]* 31.2 Write unit tests for manual trigger
  - Test manual trigger starts ingestion immediately
  - Test manual trigger for specific endpoint works
  - Test manual trigger for all endpoints works
  - _Requirements: 16.5_

### 32. Implement cron schedule validation

- [ ] 32.1 Create cron schedule validation utility
  - Implement function to validate cron expression syntax
  - Support hourly, daily, and weekly schedule patterns
  - Return descriptive error messages for invalid expressions
  - _Requirements: 16.3_

- [ ]* 32.2 Write property test for cron schedule configuration
  - **Property 35: Cron Schedule Configuration**
  - **Validates: Requirements 16.1**

- [ ]* 32.3 Write unit tests for cron validation
  - Test validation accepts valid cron expressions
  - Test validation rejects invalid cron expressions
  - Test validation supports hourly, daily, weekly patterns
  - _Requirements: 16.3_


### 33. Implement ingest run query filtering

- [ ] 33.1 Create database function for ingest run queries
  - Write SQL function to query Ingest_Run by Source_Endpoint
  - Write SQL function to query Ingest_Run by date range
  - Write SQL function to query Ingest_Run by status
  - Support combining multiple filters
  - _Requirements: 15.5_

- [ ]* 33.2 Write property test for ingest run query filtering
  - **Property 34: Ingest Run Query Filtering**
  - **Validates: Requirements 15.5**

- [ ]* 33.3 Write unit tests for ingest run queries
  - Test filtering by Source_Endpoint returns correct runs
  - Test filtering by date range returns correct runs
  - Test filtering by status returns correct runs
  - Test combined filters work correctly
  - _Requirements: 15.5_

### 34. Implement JSON feed schema validation

- [ ] 34.1 Create JSON feed schema definition
  - Define JSON schema for feed format
  - Include required fields (id, type, title, url, published_at)
  - Include optional fields (content_snippet, summary, topics, entities)
  - _Requirements: 22.2_

- [ ] 34.2 Implement JSON feed validation
  - Create validation function using JSON schema
  - Return descriptive errors indicating failure location
  - Reject invalid feeds with detailed error messages
  - _Requirements: 22.2, 22.3_

- [ ]* 34.3 Write property test for JSON feed schema validation
  - **Property 49: JSON Feed Schema Validation**
  - **Validates: Requirements 22.2, 22.3**

- [ ]* 34.4 Write unit tests for JSON validation
  - Test validation accepts valid JSON feeds
  - Test validation rejects feeds with missing required fields
  - Test validation rejects feeds with invalid field types
  - Test validation returns descriptive error messages
  - _Requirements: 22.2, 22.3_

### 35. Implement high error rate alerting

- [ ] 35.1 Create error rate monitoring function
  - Calculate error rate as (items_error / items_processed) for each Ingest_Run
  - Check if error rate exceeds 10% threshold
  - Send alert notification when threshold exceeded
  - _Requirements: 23.5_

- [ ] 35.2 Integrate error rate monitoring into orchestrator
  - Check error rate after each Ingest_Run completes
  - Send alerts via email, Slack, or Discord webhook
  - Include Source_Endpoint details and error summary in alert
  - _Requirements: 23.5_

- [ ]* 35.3 Write property test for high error rate alerting
  - **Property 51: High Error Rate Alerting**
  - **Validates: Requirements 23.5**

- [ ]* 35.4 Write unit tests for error rate alerting
  - Test alert sent when error rate > 10%
  - Test no alert sent when error rate <= 10%
  - Test alert includes correct endpoint and error details
  - _Requirements: 23.5_

### 36. Implement phased delivery feature flags

- [ ] 36.1 Create configuration table for feature flags
  - Write SQL migration creating feature_flags table
  - Add flags for phase-specific features (patents_enabled, literature_enabled, enrichment_enabled)
  - Seed table with default values based on deployment phase
  - _Requirements: 25.5_

- [ ] 36.2 Implement feature flag checks in connectors and workers
  - Check patents_enabled flag before invoking patent connector
  - Check literature_enabled flag before invoking literature connector
  - Check enrichment_enabled flag before invoking enrichment worker
  - Skip disabled features gracefully
  - _Requirements: 25.5_

- [ ]* 36.3 Write property test for feature flag control
  - **Property 56: Feature Flag Control**
  - **Validates: Requirements 25.5**

- [ ]* 36.4 Write unit tests for feature flags
  - Test disabled features are skipped
  - Test enabled features are executed
  - Test feature flags can be toggled without code changes
  - _Requirements: 25.5_

### 37. Implement backward compatibility validation

- [ ] 37.1 Create database migration compatibility tests
  - Test Phase 1 data remains accessible after Phase 2 migration
  - Test Phase 2 data remains accessible after Phase 3 migration
  - Verify no breaking schema changes between phases
  - _Requirements: 25.4_

- [ ]* 37.2 Write property test for phase backward compatibility
  - **Property 55: Phase Backward Compatibility**
  - **Validates: Requirements 25.4**

- [ ]* 37.3 Write integration tests for phase transitions
  - Test Phase 1 signals work correctly in Phase 2
  - Test Phase 2 signals work correctly in Phase 3
  - Test feed exports include signals from all phases
  - _Requirements: 25.4_


### 38. Implement feed file naming conventions validation

- [ ] 38.1 Create feed file naming utility
  - Implement function to generate monthly archive filenames (YYYY-MM.json)
  - Implement function to generate topic feed filenames (topic-{topic_name}.json)
  - Implement function to generate entity feed filenames (entity-{entity_id}.json)
  - Validate generated filenames match required format
  - _Requirements: 18.2, 19.2, 20.2_

- [ ]* 38.2 Write property test for feed file naming conventions
  - **Property 41: Feed File Naming Conventions**
  - **Validates: Requirements 18.2, 19.2, 20.2**

- [ ]* 38.3 Write unit tests for feed naming
  - Test monthly archive names match YYYY-MM.json format
  - Test topic feed names match topic-{name}.json format
  - Test entity feed names match entity-{id}.json format
  - _Requirements: 18.2, 19.2, 20.2_

### 39. Implement public storage upload validation

- [ ] 39.1 Create storage upload validation utility
  - Verify files uploaded to public-feeds bucket have public-read permissions
  - Verify files uploaded to raw-artifacts bucket are private
  - Verify appropriate cache headers set on public files
  - _Requirements: 17.3, 18.5, 19.5_

- [ ]* 39.2 Write property test for public storage upload
  - **Property 38: Public Storage Upload**
  - **Validates: Requirements 17.3, 18.5, 19.5**

- [ ]* 39.3 Write unit tests for storage upload
  - Test public-feeds files have public-read permissions
  - Test raw-artifacts files are private
  - Test cache headers set correctly on public files
  - _Requirements: 17.3, 18.5_

### 40. Implement feed index generation validation

- [ ] 40.1 Create feed index generation utility
  - Generate index.json with all available feed metadata
  - Include title, description, item count, last updated timestamp for each feed
  - Only include feeds with policy-compliant signals
  - _Requirements: 17.1, 17.2, 17.4_

- [ ]* 40.2 Write property test for feed index generation
  - **Property 37: Feed Index Generation**
  - **Validates: Requirements 17.1, 17.2**

- [ ]* 40.3 Write unit tests for feed index
  - Test index.json includes all available feeds
  - Test index.json includes correct metadata for each feed
  - Test index.json excludes feeds with no compliant signals
  - _Requirements: 17.1, 17.2, 17.4_

### 41. Final integration and deployment

- [ ] 41.1 Create deployment documentation
  - Document Supabase project setup steps
  - Document environment variable configuration
  - Document database migration execution order
  - Document Edge Function deployment process
  - Document cron job setup and verification

- [ ] 41.2 Create operational runbook
  - Document monitoring and alerting setup
  - Document common troubleshooting procedures
  - Document backup and recovery procedures
  - Document scaling considerations

- [ ] 41.3 Perform full system integration test
  - Deploy all components to staging environment
  - Configure test sources for RSS, News API, patents, literature
  - Trigger full ingestion, enrichment, and export cycle
  - Verify all feeds generated correctly
  - Verify RLS policies enforce access control
  - Verify metrics tracking works end-to-end
  - Verify error handling and alerting works

- [ ] 41.4 Final checkpoint - Production readiness validation
  - Ensure all unit tests pass (80%+ coverage)
  - Ensure all 56 property tests pass (100 iterations each)
  - Ensure all integration tests pass
  - Verify performance meets requirements (1000 items/min ingestion, 500 items/min enrichment)
  - Verify observability metrics and alerts configured
  - Ask the user if questions arise before production deployment

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at phase boundaries
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation uses TypeScript for Supabase Edge Functions (Deno runtime)
- Database uses Postgres 15+ with pgvector extension for embeddings
- All external API calls (OpenAI, News APIs, Patent APIs) require error handling and retry logic
- License policies must be enforced at every stage (ingestion, enrichment, export)
- RLS policies provide defense-in-depth for data access control
