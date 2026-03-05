-- Create deduplication tables
-- Phase 1: signal_fingerprints, clusters, cluster_members

-- Table: signal_fingerprints
-- Stores content hashes for hard duplicate detection
CREATE TABLE signal_fingerprints (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  signal_item_id UUID NOT NULL REFERENCES signal_items(id) ON DELETE CASCADE,
  fingerprint_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fingerprint_hash)
);

CREATE INDEX idx_fingerprints_hash ON signal_fingerprints(fingerprint_hash);
CREATE INDEX idx_fingerprints_signal_id ON signal_fingerprints(signal_item_id);

COMMENT ON TABLE signal_fingerprints IS 'Content hashes for hard duplicate detection';
COMMENT ON COLUMN signal_fingerprints.fingerprint_hash IS 'SHA-256 hash of normalized content';

-- Table: clusters
-- Groups near-duplicate signals
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  canonical_signal_id UUID NOT NULL REFERENCES signal_items(id),
  cluster_type TEXT NOT NULL CHECK (cluster_type IN ('near_duplicate', 'patent_family', 'topic_group')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clusters_canonical_signal ON clusters(canonical_signal_id);

COMMENT ON TABLE clusters IS 'Groups near-duplicate signals';
COMMENT ON COLUMN clusters.canonical_signal_id IS 'Earliest signal in the cluster (canonical representative)';

-- Table: cluster_members
-- Associates signals with clusters
CREATE TABLE cluster_members (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  signal_item_id UUID NOT NULL REFERENCES signal_items(id) ON DELETE CASCADE,
  similarity_score FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cluster_id, signal_item_id)
);

CREATE INDEX idx_cluster_members_cluster_id ON cluster_members(cluster_id);
CREATE INDEX idx_cluster_members_signal_id ON cluster_members(signal_item_id);

COMMENT ON TABLE cluster_members IS 'Associates signals with clusters';
COMMENT ON COLUMN cluster_members.similarity_score IS 'Similarity score between 0.0 and 1.0';

-- Trigger to auto-update updated_at for clusters
CREATE TRIGGER update_clusters_updated_at
  BEFORE UPDATE ON clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
