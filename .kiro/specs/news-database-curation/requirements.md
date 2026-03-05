# Requirements Document

## Introduction

The News Database Curation System (Formul8 Signals) is a comprehensive multi-source ingestion platform that collects, normalizes, deduplicates, enriches, and publishes news articles, patents, and scientific literature. The system uses Supabase (Postgres + Storage + Edge Functions) as the canonical system of record, enforces per-source license policies, and exports policy-safe public feeds for consumption by GitHub Pages and other downstream systems.

## Glossary

- **Curation_System**: The multi-source ingestion and curation platform being specified
- **Signal_Item**: Canonical record representing a news article, patent, or scientific paper
- **News_Item**: Type-specific record for news articles with source, title, content, and publication metadata
- **Patent_Item**: Type-specific record for patents with application number, family ID, abstract, and claims
- **Paper_Item**: Type-specific record for scientific literature with DOI, abstract, authors, and journal metadata
- **Source**: Configuration record defining an ingestion source (RSS feed, API endpoint, manual upload)
- **Source_Endpoint**: Specific endpoint or feed URL within a Source
- **Postgres_DB**: Supabase Postgres database serving as the system of record
- **Storage_Bucket**: Supabase storage for raw artifacts and normalized text files
- **Edge_Function**: Supabase serverless function for ingestion orchestration, connectors, and exporters
- **Ingest_Run**: Job record tracking a single ingestion execution for a Source_Endpoint
- **Ingest_Item_Event**: Event log entry for each item processed during an Ingest_Run
- **Signal_Fingerprint**: Hash-based record for hard duplicate detection
- **Cluster**: Group of near-duplicate Signal_Items linked by similarity
- **Cluster_Member**: Association record linking a Signal_Item to a Cluster
- **License_Policy**: Per-source policy defining storage permissions (store_full_text_allowed, snippet_only, link_only)
- **Topic**: Categorization tag (e.g., AI, Climate, Healthcare)
- **Entity**: Named entity extracted from content (person, organization, location)
- **Signal_Topic**: Association linking a Signal_Item to a Topic
- **Signal_Entity**: Association linking a Signal_Item to an Entity
- **Enrich_Job**: Background job for enrichment tasks (language detection, summarization, embeddings)
- **Public_Feed**: Policy-safe JSON export for consumption by GitHub Pages
- **RLS_Policy**: Row-level security policy enforcing separation between internal and public data
- **Dedupe_Engine**: Component performing hard duplicate detection and near-duplicate clustering
- **Enrichment_Pipeline**: Component orchestrating language detection, topic tagging, entity extraction, and summarization
- **Feed_Exporter**: Component generating Public_Feed JSON files from policy-compliant Signal_Items
- **Ingestion_Mode**: Operating mode for ingestion (streaming for recent items, backfill for archives)
- **Provenance_Record**: Metadata tracking the origin, ingestion timestamp, and source endpoint for each Signal_Item

## Requirements

### Requirement 1: Configure Multi-Source Ingestion

**User Story:** As a system administrator, I want to configure multiple ingestion sources, so that the system can collect signals from diverse providers.

#### Acceptance Criteria

1. THE Curation_System SHALL support creating Source records with name, type (RSS, News_API, Patent_API, Literature_API, Manual), and License_Policy
2. WHEN a Source is created, THE Curation_System SHALL validate that the License_Policy specifies storage permissions (store_full_text_allowed, snippet_only, or link_only)
3. THE Curation_System SHALL support creating Source_Endpoint records linked to a Source with endpoint URL, authentication credentials, and polling schedule
4. THE Curation_System SHALL persist Source and Source_Endpoint configurations in Postgres_DB
5. THE Curation_System SHALL support updating Source and Source_Endpoint configurations without data loss

### Requirement 2: Ingest News from RSS and Atom Feeds

**User Story:** As a content curator, I want to ingest news from RSS and Atom feeds, so that recent articles are automatically collected.

#### Acceptance Criteria

1. WHEN an RSS or Atom feed URL is configured as a Source_Endpoint, THE Edge_Function SHALL poll the feed according to the polling schedule
2. WHEN the Edge_Function retrieves feed content, THE Curation_System SHALL parse RSS 2.0 and Atom 1.0 formats into News_Item records
3. THE Curation_System SHALL extract title, link, publication date, author, description, and content from feed entries
4. WHEN a News_Item is parsed, THE Curation_System SHALL create a Signal_Item record with type set to news and a Provenance_Record linking to the Source_Endpoint
5. IF feed parsing fails, THEN THE Curation_System SHALL log the error with the feed URL and continue processing other feeds
6. THE Curation_System SHALL provide a feed formatter that converts News_Item objects back to RSS 2.0 format
7. FOR ALL valid News_Item objects, parsing then formatting then parsing SHALL produce an equivalent object (round-trip property)

### Requirement 3: Ingest News from News APIs

**User Story:** As a content curator, I want to ingest news from News APIs, so that I can access premium content sources.

#### Acceptance Criteria

1. WHERE a News_API Source_Endpoint is configured, THE Edge_Function SHALL authenticate using the provided API credentials
2. WHEN the Edge_Function queries a News_API, THE Curation_System SHALL support both streaming mode (recent articles) and backfill mode (historical archives)
3. THE Curation_System SHALL normalize News_API responses into News_Item records with title, URL, publication date, author, content, and source metadata
4. WHEN a News_Item is created from a News_API, THE Curation_System SHALL store the raw API response in Storage_Bucket for audit purposes
5. IF a News_API request fails with a rate limit error, THEN THE Edge_Function SHALL retry after the rate limit reset time

### Requirement 4: Ingest Patents from Patent APIs

**User Story:** As a researcher, I want to ingest patents from Patent APIs, so that I can track innovation signals.

#### Acceptance Criteria

1. WHERE a Patent_API Source_Endpoint is configured, THE Edge_Function SHALL query patent databases using the configured search criteria
2. WHEN the Edge_Function retrieves patent data, THE Curation_System SHALL parse patent records into Patent_Item records with application number, title, abstract, claims, inventors, assignees, and filing date
3. THE Curation_System SHALL extract patent family identifiers and create Cluster records linking related patents
4. WHEN a Patent_Item is created, THE Curation_System SHALL create a Signal_Item record with type set to patent and a Provenance_Record
5. THE Curation_System SHALL store patent metadata and abstracts in Postgres_DB according to the License_Policy

### Requirement 5: Ingest Scientific Literature from Literature APIs

**User Story:** As a researcher, I want to ingest scientific papers from Literature APIs, so that I can track research signals.

#### Acceptance Criteria

1. WHERE a Literature_API Source_Endpoint is configured, THE Edge_Function SHALL query literature databases using the configured search criteria
2. WHEN the Edge_Function retrieves paper metadata, THE Curation_System SHALL parse records into Paper_Item records with DOI, title, abstract, authors, journal, publication date, and citation count
3. WHERE a paper is available as open access and the License_Policy allows full text storage, THE Curation_System SHALL download and store the full text in Storage_Bucket
4. WHERE the License_Policy restricts storage to snippet_only, THE Curation_System SHALL store only the abstract and metadata
5. WHEN a Paper_Item is created, THE Curation_System SHALL create a Signal_Item record with type set to paper and a Provenance_Record

### Requirement 6: Support Manual Signal Upload

**User Story:** As a content curator, I want to manually upload signals, so that I can add items not available through automated sources.

#### Acceptance Criteria

1. THE Curation_System SHALL provide an Edge_Function endpoint accepting manual uploads of News_Item, Patent_Item, or Paper_Item records
2. WHEN a manual upload is received, THE Curation_System SHALL validate required fields based on the item type
3. THE Curation_System SHALL create a Source record with type Manual for tracking manual uploads
4. WHEN a manually uploaded item is accepted, THE Curation_System SHALL create a Signal_Item with a Provenance_Record indicating manual upload and the uploading user
5. THE Curation_System SHALL support batch manual uploads of multiple items in a single request

### Requirement 7: Enforce License Policy at Ingestion

**User Story:** As a compliance officer, I want license policies enforced at ingestion time, so that the system never stores restricted content.

#### Acceptance Criteria

1. WHEN a Signal_Item is ingested, THE Curation_System SHALL retrieve the License_Policy from the associated Source
2. WHERE the License_Policy specifies store_full_text_allowed, THE Curation_System SHALL store the complete content in Storage_Bucket
3. WHERE the License_Policy specifies snippet_only, THE Curation_System SHALL store only the first 500 characters of content and the complete metadata
4. WHERE the License_Policy specifies link_only, THE Curation_System SHALL store only the URL and metadata without any content
5. THE Curation_System SHALL record the applied License_Policy in the Signal_Item record for audit purposes

### Requirement 8: Detect Hard Duplicates

**User Story:** As a content curator, I want to detect exact duplicates, so that the database contains only unique signals.

#### Acceptance Criteria

1. WHEN a Signal_Item is ingested, THE Dedupe_Engine SHALL compute a content fingerprint using SHA-256 hash of normalized text
2. THE Dedupe_Engine SHALL create a Signal_Fingerprint record with the computed hash and Signal_Item identifier
3. WHEN a Signal_Fingerprint matches an existing fingerprint, THE Dedupe_Engine SHALL mark the Signal_Item as a duplicate and link it to the original
4. IF a hard duplicate is detected, THEN THE Curation_System SHALL skip storage of the duplicate content and increment a duplicate counter
5. THE Curation_System SHALL log all duplicate detection events in Ingest_Item_Event records

### Requirement 9: Cluster Near-Duplicate Signals

**User Story:** As a content curator, I want to identify near-duplicate signals, so that related items can be grouped for analysis.

#### Acceptance Criteria

1. WHEN a Signal_Item is ingested and passes hard duplicate detection, THE Dedupe_Engine SHALL compute a similarity score against recent Signal_Items of the same type
2. WHERE the similarity score exceeds 85 percent, THE Dedupe_Engine SHALL create or update a Cluster record
3. THE Dedupe_Engine SHALL create Cluster_Member records linking the Signal_Item and similar items to the Cluster
4. THE Curation_System SHALL designate the earliest Signal_Item in a Cluster as the canonical representative
5. THE Curation_System SHALL persist Cluster and Cluster_Member records in Postgres_DB

### Requirement 10: Detect Language

**User Story:** As a content curator, I want automatic language detection, so that signals can be filtered by language.

#### Acceptance Criteria

1. WHEN a Signal_Item is created, THE Enrichment_Pipeline SHALL detect the language of the content
2. THE Enrichment_Pipeline SHALL store the detected language code (ISO 639-1 format) in the Signal_Item record
3. WHERE language detection confidence is below 80 percent, THE Enrichment_Pipeline SHALL mark the language as unknown
4. THE Curation_System SHALL support querying Signal_Items by detected language

### Requirement 11: Extract and Tag Topics

**User Story:** As a researcher, I want signals tagged with topics, so that I can filter by subject area.

#### Acceptance Criteria

1. WHEN a Signal_Item is enriched, THE Enrichment_Pipeline SHALL extract topics from the title and content
2. THE Enrichment_Pipeline SHALL create Topic records for new topics and Signal_Topic association records
3. THE Curation_System SHALL support a predefined taxonomy of topics including AI, Climate, Healthcare, Energy, and Finance
4. WHERE a Signal_Item matches multiple topics, THE Enrichment_Pipeline SHALL create multiple Signal_Topic associations
5. THE Curation_System SHALL support querying Signal_Items by Topic

### Requirement 12: Extract and Tag Named Entities

**User Story:** As a researcher, I want signals tagged with named entities, so that I can track mentions of specific organizations and people.

#### Acceptance Criteria

1. WHEN a Signal_Item is enriched, THE Enrichment_Pipeline SHALL extract named entities of types person, organization, and location
2. THE Enrichment_Pipeline SHALL create Entity records for new entities and Signal_Entity association records
3. THE Enrichment_Pipeline SHALL normalize entity names to canonical forms (e.g., "IBM" and "International Business Machines" map to the same Entity)
4. THE Curation_System SHALL support querying Signal_Items by Entity

### Requirement 13: Generate Summaries

**User Story:** As a content curator, I want automatic summaries generated, so that users can quickly understand signal content.

#### Acceptance Criteria

1. WHERE a Signal_Item contains more than 1000 characters of content, THE Enrichment_Pipeline SHALL generate a summary of 200 characters or fewer
2. THE Enrichment_Pipeline SHALL store the generated summary in the Signal_Item record
3. WHERE the License_Policy restricts content storage, THE Enrichment_Pipeline SHALL generate summaries only from permitted content
4. THE Curation_System SHALL include summaries in Public_Feed exports

### Requirement 14: Compute Embeddings

**User Story:** As a researcher, I want semantic embeddings computed, so that I can perform similarity search.

#### Acceptance Criteria

1. WHERE embeddings are enabled for a Source, THE Enrichment_Pipeline SHALL compute vector embeddings from Signal_Item content
2. THE Enrichment_Pipeline SHALL store embeddings in Postgres_DB using pgvector extension
3. THE Curation_System SHALL support querying Signal_Items by semantic similarity using vector distance
4. WHERE the License_Policy restricts content storage, THE Enrichment_Pipeline SHALL compute embeddings only from permitted content

### Requirement 15: Track Ingestion Jobs

**User Story:** As a system administrator, I want to track ingestion job execution, so that I can monitor system health.

#### Acceptance Criteria

1. WHEN an Edge_Function begins ingestion from a Source_Endpoint, THE Curation_System SHALL create an Ingest_Run record with start timestamp and status
2. WHEN the Edge_Function processes each item, THE Curation_System SHALL create an Ingest_Item_Event record with item identifier, event type (created, duplicate, error), and timestamp
3. WHEN an Ingest_Run completes, THE Curation_System SHALL update the Ingest_Run record with end timestamp, status (success, partial, failed), and counts of items processed, created, and skipped
4. THE Curation_System SHALL persist Ingest_Run and Ingest_Item_Event records in Postgres_DB
5. THE Curation_System SHALL support querying Ingest_Run records by Source_Endpoint, date range, and status

### Requirement 16: Schedule Periodic Ingestion

**User Story:** As a system administrator, I want ingestion to run on a schedule, so that signals are collected automatically.

#### Acceptance Criteria

1. THE Curation_System SHALL support configuring cron schedules for each Source_Endpoint
2. WHEN a scheduled time is reached, THE Curation_System SHALL invoke the appropriate Edge_Function for the Source_Endpoint
3. THE Curation_System SHALL support cron expressions for hourly, daily, and weekly schedules
4. WHERE an Ingest_Run is still executing when the next scheduled time arrives, THE Curation_System SHALL skip the scheduled run and log a warning
5. THE Curation_System SHALL support manual triggering of ingestion outside the schedule

### Requirement 17: Export Public Feed Index

**User Story:** As a public user, I want to access a feed index, so that I can discover available signals.

#### Acceptance Criteria

1. THE Feed_Exporter SHALL generate an index.json file listing all available Public_Feed exports
2. THE Feed_Exporter SHALL include feed metadata (title, description, item count, last updated timestamp) in index.json
3. THE Feed_Exporter SHALL upload index.json to Storage_Bucket in a public-readable location
4. WHEN index.json is generated, THE Feed_Exporter SHALL include only feeds containing policy-compliant Signal_Items
5. THE Feed_Exporter SHALL update index.json on a daily schedule

### Requirement 18: Export Monthly Archive Feeds

**User Story:** As a public user, I want to access signals by month, so that I can retrieve historical data.

#### Acceptance Criteria

1. THE Feed_Exporter SHALL generate monthly archive JSON files containing Signal_Items published in each month
2. THE Feed_Exporter SHALL name archive files using the format YYYY-MM.json
3. THE Feed_Exporter SHALL include only Signal_Items that comply with the License_Policy for public distribution
4. WHEN a Signal_Item has a License_Policy of link_only, THE Feed_Exporter SHALL include only the URL, title, and metadata without content
5. THE Feed_Exporter SHALL upload monthly archive files to Storage_Bucket in a public-readable location

### Requirement 19: Export Topic-Filtered Feeds

**User Story:** As a public user, I want to access signals filtered by topic, so that I can focus on specific subject areas.

#### Acceptance Criteria

1. THE Feed_Exporter SHALL generate topic-specific JSON files for each Topic in the system
2. THE Feed_Exporter SHALL name topic files using the format topic-{topic_name}.json
3. THE Feed_Exporter SHALL include only Signal_Items associated with the Topic via Signal_Topic records
4. THE Feed_Exporter SHALL apply License_Policy restrictions when exporting topic feeds
5. THE Feed_Exporter SHALL upload topic feed files to Storage_Bucket in a public-readable location

### Requirement 20: Export Entity-Filtered Feeds

**User Story:** As a public user, I want to access signals mentioning specific entities, so that I can track organizations and people.

#### Acceptance Criteria

1. THE Feed_Exporter SHALL generate entity-specific JSON files for high-frequency entities
2. THE Feed_Exporter SHALL name entity files using the format entity-{entity_id}.json
3. THE Feed_Exporter SHALL include only Signal_Items associated with the Entity via Signal_Entity records
4. THE Feed_Exporter SHALL apply License_Policy restrictions when exporting entity feeds
5. THE Feed_Exporter SHALL generate entity feeds only for entities mentioned in at least 10 Signal_Items

### Requirement 21: Enforce RLS Policies

**User Story:** As a security administrator, I want row-level security enforced, so that internal and public data are strictly separated.

#### Acceptance Criteria

1. THE Curation_System SHALL define RLS_Policy rules in Postgres_DB restricting access to Signal_Items based on License_Policy
2. THE RLS_Policy SHALL prevent public queries from accessing Signal_Items with License_Policy snippet_only or link_only full content
3. THE RLS_Policy SHALL allow internal queries to access all Signal_Items regardless of License_Policy
4. WHEN a public API query is executed, THE Postgres_DB SHALL enforce RLS_Policy automatically
5. THE Curation_System SHALL validate that RLS_Policy rules are active on all Signal_Item tables

### Requirement 22: Parse and Format JSON Feeds

**User Story:** As a developer, I want to parse and format JSON feeds, so that feed data can be normalized and exported.

#### Acceptance Criteria

1. WHEN a JSON feed is provided, THE Curation_System SHALL parse it into Signal_Item objects
2. THE Curation_System SHALL validate JSON feed structure against a defined schema
3. IF JSON parsing fails, THEN THE Curation_System SHALL return a descriptive error indicating the parsing failure location
4. THE Feed_Exporter SHALL provide a formatter that converts Signal_Item objects to JSON feed format
5. FOR ALL valid Signal_Item objects, parsing then formatting then parsing SHALL produce an equivalent object (round-trip property)

### Requirement 23: Handle Ingestion Errors Gracefully

**User Story:** As a system administrator, I want ingestion errors handled gracefully, so that temporary failures do not stop the pipeline.

#### Acceptance Criteria

1. IF an Edge_Function encounters a network timeout when fetching from a Source_Endpoint, THEN THE Curation_System SHALL retry up to 3 times with exponential backoff
2. IF all retries fail, THEN THE Curation_System SHALL log the error in the Ingest_Run record and continue processing other Source_Endpoints
3. IF Postgres_DB is unavailable, THEN THE Edge_Function SHALL return an error and the scheduled job SHALL retry on the next schedule
4. WHEN an individual Signal_Item fails validation, THE Curation_System SHALL log the error in Ingest_Item_Event and continue processing other items
5. THE Curation_System SHALL send alert notifications when error rates exceed 10 percent for any Source_Endpoint

### Requirement 24: Provide Observability Metrics

**User Story:** As a system administrator, I want observability metrics, so that I can monitor system performance.

#### Acceptance Criteria

1. THE Curation_System SHALL track the count of Signal_Items ingested per Source_Endpoint per day
2. THE Curation_System SHALL track the count of duplicates detected per day
3. THE Curation_System SHALL track the count of enrichment jobs completed per day
4. THE Curation_System SHALL track the count of Public_Feed exports generated per day
5. THE Curation_System SHALL calculate the average time from ingestion to enrichment completion
6. WHEN metrics are queried for a date range, THE Curation_System SHALL return aggregated statistics
7. THE Curation_System SHALL expose metrics via a monitoring endpoint for integration with observability tools

### Requirement 25: Support Phased Delivery

**User Story:** As a product manager, I want phased delivery, so that the system can be deployed incrementally.

#### Acceptance Criteria

1. WHERE Phase 1 is deployed, THE Curation_System SHALL support RSS ingestion, basic normalization, hard duplicate detection, and Public_Feed export
2. WHERE Phase 2 is deployed, THE Curation_System SHALL add Patent_API and Literature_API connectors
3. WHERE Phase 3 is deployed, THE Curation_System SHALL add Enrichment_Pipeline capabilities including topic tagging, entity extraction, and clustering
4. THE Curation_System SHALL maintain backward compatibility when transitioning between phases
5. THE Curation_System SHALL support enabling and disabling phase-specific features via configuration flags
