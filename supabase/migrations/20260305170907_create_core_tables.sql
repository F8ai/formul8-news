-- Create core tables for Formul8 News Database Curation System
-- Phase 1: sources, source_endpoints, signal_items

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" SCHEMA extensions;

-- Table: sources
-- Stores configuration for ingestion sources
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('RSS', 'News_API', 'Patent_API', 'Literature_API', 'Manual')),
  description TEXT,
  license_policy JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sources_type ON sources(type);

COMMENT ON TABLE sources IS 'Configuration for ingestion sources with license policies';
COMMENT ON COLUMN sources.license_policy IS 'JSON structure: {mode: "store_full_text_allowed"|"snippet_only"|"link_only", snippet_length: 500, attribution_required: bool, redistribution_allowed: bool}';

-- Table: source_endpoints
-- Stores specific endpoints or feeds within a source
CREATE TABLE source_endpoints (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  auth_config JSONB,
  polling_schedule TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_ingested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_source_endpoints_source_id ON source_endpoints(source_id);
CREATE INDEX idx_source_endpoints_active ON source_endpoints(is_active) WHERE is_active = true;

COMMENT ON TABLE source_endpoints IS 'Specific endpoints or feeds within a source';
COMMENT ON COLUMN source_endpoints.auth_config IS 'JSON structure: {type: "api_key"|"oauth", credentials: {...}}';
COMMENT ON COLUMN source_endpoints.polling_schedule IS 'Cron expression for scheduled ingestion';

-- Table: signal_items
-- Canonical record for all signals (news, patents, papers)
CREATE TABLE signal_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('news', 'patent', 'paper')),
  title TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMPTZ,
  content_snippet TEXT,
  summary TEXT,
  language_code TEXT,
  language_confidence FLOAT,
  enrichment_status TEXT NOT NULL DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'in_progress', 'completed', 'failed')),
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signal_items_type ON signal_items(type);
CREATE INDEX idx_signal_items_published_at ON signal_items(published_at DESC);
CREATE INDEX idx_signal_items_enrichment_status ON signal_items(enrichment_status) WHERE enrichment_status = 'pending';

COMMENT ON TABLE signal_items IS 'Canonical records for all signals (news, patents, papers)';
COMMENT ON COLUMN signal_items.content_snippet IS 'First 500 chars or full content based on license policy';
COMMENT ON COLUMN signal_items.language_code IS 'ISO 639-1 language code';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_source_endpoints_updated_at
  BEFORE UPDATE ON source_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signal_items_updated_at
  BEFORE UPDATE ON signal_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
