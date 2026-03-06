-- Add arXiv-specific fields to paper_items table

ALTER TABLE paper_items
ADD COLUMN IF NOT EXISTS arxiv_id TEXT,
ADD COLUMN IF NOT EXISTS arxiv_categories TEXT[];

-- Create index for arXiv ID lookups
CREATE INDEX IF NOT EXISTS idx_paper_items_arxiv_id ON paper_items(arxiv_id);

-- Add comment
COMMENT ON COLUMN paper_items.arxiv_id IS 'arXiv identifier (e.g., 2103.12345)';
COMMENT ON COLUMN paper_items.arxiv_categories IS 'arXiv subject categories (e.g., cs.AI, cs.LG)';
