-- Create enrichment tables for topics, entities, and embeddings
-- Phase 3: topics, signal_topics, entities, signal_entities, pgvector

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Add embedding column to signal_items
ALTER TABLE signal_items
ADD COLUMN embedding extensions.vector(1536);

-- Create index for vector similarity search
CREATE INDEX idx_signal_items_embedding ON signal_items 
USING ivfflat (embedding extensions.vector_cosine_ops)
WITH (lists = 100);

-- Table: topics
-- Predefined taxonomy of subject areas
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES topics(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topics_slug ON topics(slug);
CREATE INDEX idx_topics_parent ON topics(parent_id);

COMMENT ON TABLE topics IS 'Predefined taxonomy of subject areas';

-- Table: signal_topics
-- Associates signals with topics
CREATE TABLE signal_topics (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  signal_item_id UUID NOT NULL REFERENCES signal_items(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  confidence FLOAT,
  assigned_by TEXT NOT NULL DEFAULT 'rule' CHECK (assigned_by IN ('rule', 'model', 'human')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(signal_item_id, topic_id)
);

CREATE INDEX idx_signal_topics_signal_id ON signal_topics(signal_item_id);
CREATE INDEX idx_signal_topics_topic_id ON signal_topics(topic_id);

COMMENT ON TABLE signal_topics IS 'Associates signals with topics';

-- Table: entities
-- Named entities extracted from content
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'organization', 'location', 'company', 'regulator', 'cannabinoid', 'terpene', 'product')),
  aliases JSONB,
  external_ids JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(canonical_name, entity_type)
);

CREATE INDEX idx_entities_canonical_name ON entities(canonical_name);
CREATE INDEX idx_entities_type ON entities(entity_type);

COMMENT ON TABLE entities IS 'Named entities extracted from content';

-- Table: signal_entities
-- Associates signals with entities
CREATE TABLE signal_entities (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  signal_item_id UUID NOT NULL REFERENCES signal_items(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  mention_count INTEGER NOT NULL DEFAULT 1,
  salience FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(signal_item_id, entity_id)
);

CREATE INDEX idx_signal_entities_signal_id ON signal_entities(signal_item_id);
CREATE INDEX idx_signal_entities_entity_id ON signal_entities(entity_id);

COMMENT ON TABLE signal_entities IS 'Associates signals with entities';

-- Seed predefined topics
INSERT INTO topics (slug, name, description) VALUES
  ('ai', 'Artificial Intelligence', 'AI, machine learning, and automation'),
  ('climate', 'Climate Change', 'Climate change, environment, and sustainability'),
  ('healthcare', 'Healthcare', 'Medicine, health, and medical research'),
  ('energy', 'Energy', 'Energy production, storage, and sustainability'),
  ('finance', 'Finance', 'Financial markets, economics, and fintech'),
  ('technology', 'Technology', 'General technology and innovation'),
  ('science', 'Science', 'General scientific research'),
  ('cannabis', 'Cannabis', 'Cannabis industry, research, and regulation'),
  ('cbd', 'CBD', 'Cannabidiol products and research'),
  ('thc', 'THC', 'Tetrahydrocannabinol products and research'),
  ('medical-cannabis', 'Medical Cannabis', 'Medical marijuana and therapeutic applications'),
  ('cannabis-regulation', 'Cannabis Regulation', 'Cannabis laws, policies, and compliance'),
  ('cannabis-cultivation', 'Cannabis Cultivation', 'Growing, farming, and production'),
  ('cannabis-research', 'Cannabis Research', 'Scientific studies on cannabis'),
  ('psychedelics', 'Psychedelics', 'Psychedelic substances and research');

-- Enable RLS on enrichment tables
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_entities ENABLE ROW LEVEL SECURITY;

-- RLS policies for enrichment tables
CREATE POLICY "Public read access to topics" ON topics FOR SELECT TO anon USING (true);
CREATE POLICY "Service role access to topics" ON topics FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to topics" ON topics FOR ALL TO authenticated USING (true);

CREATE POLICY "Public read access to signal_topics" ON signal_topics FOR SELECT TO anon USING (true);
CREATE POLICY "Service role access to signal_topics" ON signal_topics FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to signal_topics" ON signal_topics FOR ALL TO authenticated USING (true);

CREATE POLICY "Public read access to entities" ON entities FOR SELECT TO anon USING (true);
CREATE POLICY "Service role access to entities" ON entities FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to entities" ON entities FOR ALL TO authenticated USING (true);

CREATE POLICY "Public read access to signal_entities" ON signal_entities FOR SELECT TO anon USING (true);
CREATE POLICY "Service role access to signal_entities" ON signal_entities FOR ALL TO service_role USING (true);
CREATE POLICY "Authenticated access to signal_entities" ON signal_entities FOR ALL TO authenticated USING (true);
