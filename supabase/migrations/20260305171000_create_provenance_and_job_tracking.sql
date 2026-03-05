-- Create provenance and job tracking tables
-- Phase 1: provenance_records, ingest_runs, ingest_item_events

-- Table: provenance_records
-- Tracks origin and ingestion metadata for each signal
CREATE TABLE provenance_records (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  signal_item_id UUID NOT NULL REFERENCES signal_items(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id),
  source_endpoint_id UUID REFERENCES source_endpoints(id),
  ingest_run_id UUID,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by TEXT,
  raw_artifact_path TEXT,
  license_policy_applied JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provenance_signal_id ON provenance_records(signal_item_id);
CREATE INDEX idx_provenance_source_id ON provenance_records(source_id);
CREATE INDEX idx_provenance_endpoint_id ON provenance_records(source_endpoint_id);

COMMENT ON TABLE provenance_records IS 'Tracks origin and ingestion metadata for each signal';
COMMENT ON COLUMN provenance_records.uploaded_by IS 'User identifier for manual uploads';
COMMENT ON COLUMN provenance_records.raw_artifact_path IS 'Path to raw artifact in Storage bucket';
COMMENT ON COLUMN provenance_records.license_policy_applied IS 'Snapshot of license policy at ingestion time for audit';

-- Table: ingest_runs
-- Tracks ingestion job execution
CREATE TABLE ingest_runs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  source_endpoint_id UUID REFERENCES source_endpoints(id),
  mode TEXT NOT NULL CHECK (mode IN ('streaming', 'backfill')),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'partial', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_created INTEGER NOT NULL DEFAULT 0,
  items_duplicate INTEGER NOT NULL DEFAULT 0,
  items_error INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingest_runs_endpoint_id ON ingest_runs(source_endpoint_id);
CREATE INDEX idx_ingest_runs_status ON ingest_runs(status);
CREATE INDEX idx_ingest_runs_started_at ON ingest_runs(started_at DESC);

COMMENT ON TABLE ingest_runs IS 'Tracks ingestion job execution';
COMMENT ON COLUMN ingest_runs.mode IS 'streaming for recent items, backfill for historical archives';

-- Table: ingest_item_events
-- Event log for each item processed during ingestion
CREATE TABLE ingest_item_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  ingest_run_id UUID NOT NULL REFERENCES ingest_runs(id) ON DELETE CASCADE,
  signal_item_id UUID REFERENCES signal_items(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'duplicate', 'error', 'skipped')),
  item_identifier TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingest_events_run_id ON ingest_item_events(ingest_run_id);
CREATE INDEX idx_ingest_events_signal_id ON ingest_item_events(signal_item_id);
CREATE INDEX idx_ingest_events_type ON ingest_item_events(event_type);

COMMENT ON TABLE ingest_item_events IS 'Event log for each item processed during ingestion';
COMMENT ON COLUMN ingest_item_events.item_identifier IS 'URL, DOI, or other external identifier';

-- Add foreign key constraint for ingest_run_id in provenance_records
-- (deferred to avoid circular dependency)
ALTER TABLE provenance_records
  ADD CONSTRAINT fk_provenance_ingest_run
  FOREIGN KEY (ingest_run_id) REFERENCES ingest_runs(id);
