-- Create type-specific tables for news, patents, and papers
-- Phase 1: news_items, patent_items, paper_items

-- Table: news_items
-- Type-specific data for news articles
CREATE TABLE news_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  signal_item_id UUID NOT NULL REFERENCES signal_items(id) ON DELETE CASCADE,
  author TEXT,
  source_name TEXT,
  content_full TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_news_items_signal_id ON news_items(signal_item_id);

COMMENT ON TABLE news_items IS 'Type-specific data for news articles';
COMMENT ON COLUMN news_items.content_full IS 'Full article content - only stored if license allows';

-- Table: patent_items
-- Type-specific data for patents
CREATE TABLE patent_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  signal_item_id UUID NOT NULL REFERENCES signal_items(id) ON DELETE CASCADE,
  application_number TEXT NOT NULL,
  patent_family_id TEXT,
  abstract TEXT,
  claims TEXT,
  inventors TEXT[],
  assignees TEXT[],
  filing_date DATE,
  grant_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patent_items_signal_id ON patent_items(signal_item_id);
CREATE INDEX idx_patent_items_application_number ON patent_items(application_number);
CREATE INDEX idx_patent_items_family_id ON patent_items(patent_family_id);

COMMENT ON TABLE patent_items IS 'Type-specific data for patents';
COMMENT ON COLUMN patent_items.patent_family_id IS 'Patent family identifier for clustering related patents';

-- Table: paper_items
-- Type-specific data for scientific literature
CREATE TABLE paper_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  signal_item_id UUID NOT NULL REFERENCES signal_items(id) ON DELETE CASCADE,
  doi TEXT,
  abstract TEXT,
  authors TEXT[],
  journal TEXT,
  citation_count INTEGER,
  is_open_access BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paper_items_signal_id ON paper_items(signal_item_id);
CREATE INDEX idx_paper_items_doi ON paper_items(doi);

COMMENT ON TABLE paper_items IS 'Type-specific data for scientific literature';
COMMENT ON COLUMN paper_items.is_open_access IS 'Whether the paper is available as open access';
